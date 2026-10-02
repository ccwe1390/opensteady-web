/* Shared browser/Node replay. This is a geometry and gesture model, not a browser. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const S = node ? require('../extension/core/selector.js') : root.OpenSteadySelect;
  const P = node ? require('../extension/core/policy.js') : root.OpenSteadyPolicy;
  const R = node ? require('./robot.js') : root.OpenSteadyRobot;
  const modes = ['off','nearest','stable','adaptive'];
  function hit(targets, x, y) {
    const inside = targets.filter(r => S.distToRect(x,y,r) === 0);
    return inside.length === 1 ? inside[0].id : null;
  }
  function selectorFor(mode, opts = {}) {
    if (mode === 'nearest') return new S.NearestSelector(opts);
    return new S.StableSelector({ ...opts, adaptive: mode === 'adaptive' });
  }
  function validateTrace(data) {
    const bad = reason => { throw new Error('Invalid trace: ' + reason); };
    if (!data || data.schemaVersion !== 1 || !['synthetic','lab-recording'].includes(data.source)) bad('schemaVersion/source');
    if (!Array.isArray(data.trials) || data.trials.length < 1 || data.trials.length > 10000) bad('trial count');
    let total = 0;
    for (const trial of data.trials) {
      if (!Array.isArray(trial.targets) || trial.targets.length < 1 || trial.targets.length > 500) bad('targets');
      const ids = new Set();
      for (const r of trial.targets) {
        if (!S.validRect(r) || [r.x,r.y,r.w,r.h].some(v => Math.abs(v) > 100000)) bad('rectangle');
        if (!((typeof r.id === 'number' && Number.isFinite(r.id)) || (typeof r.id === 'string' && r.id.length <= 128))) bad('target id');
        if (ids.has(r.id)) bad('duplicate target id'); ids.add(r.id);
      }
      if (!ids.has(trial.intendedId)) bad('intended target');
      if (!Array.isArray(trial.samples) || trial.samples.length < 2 || trial.samples.length > 20000) bad('samples');
      total += trial.samples.length; if (total > 2000000) bad('too many samples');
      let last = -Infinity, downs = 0, ups = 0, downAt = null;
      for (const sample of trial.samples) {
        if (![sample.t,sample.x,sample.y].every(Number.isFinite) || sample.t < 0 || sample.t > 600 || Math.abs(sample.x) > 100000 || Math.abs(sample.y) > 100000) bad('sample values');
        if (sample.t < last || !['move','down','up'].includes(sample.type)) bad('sample order/type'); last = sample.t;
        if (sample.type === 'down') { downs++; downAt = sample.t; }
        if (sample.type === 'up') { ups++; if (downs !== 1 || sample.t < downAt) bad('release before press'); }
      }
      if (downs !== 1 || ups !== 1) bad('exactly one press/release per trial');
    }
    return data;
  }
  function replayTrial(trial, mode, opts = {}) {
    const selector = selectorFor(mode, opts), policy = new P.ClickPolicy({ doubleGuard: false });
    let selected = null, previewSince = 0, previous = null, selectedAtDown = null, downHit = null, upHit = null, switches = 0, redirects = 0;
    let final = null, callbackMs = [], abstentions = 0, updates = 0;
    const pressT = trial.samples.find(s => s.type === 'down').t;
    for (const e of trial.samples) {
      const physical = hit(trial.targets,e.x,e.y);
      if (e.type !== 'up' && !policy.press) {
        const began = performance.now();
        selected = mode === 'off' ? physical : selector.update(e.t,e.x,e.y,trial.targets);
        callbackMs.push(performance.now() - began); updates++;
        if (selected === null) abstentions++;
        if (selected !== previous) { if (e.t >= pressT - 0.3) switches++; previewSince = e.t; previous = selected; }
      }
      if (e.type === 'down') {
        selectedAtDown = selected; downHit = physical;
        policy.down({ ...e, button: 0, pointerType: 'mouse', pointerId: 1, hitId: physical, selectedId: selected,
          canRedirect: mode !== 'off', previewAge: e.t - previewSince });
      } else if (e.type === 'move') policy.move(e);
      else {
        upHit = physical;
        policy.up({ ...e, pointerId: 1, hitId: physical });
        const native = downHit !== null && downHit === upHit ? downHit : null;
        if (mode === 'off') final = native;
        else {
          const choice = policy.click({ ...e, t: e.t + 0.001, button: 0, detail: 1, pointerType: 'mouse', hitId: native,
            bypass: false, canRedirect: true, safe: true });
          final = choice.action === 'redirect' ? choice.id : native;
          if (choice.action === 'redirect') redirects++;
        }
      }
    }
    const outcome = id => id === null ? 'miss' : id === trial.intendedId ? 'correct' : 'wrong';
    return { policyOutcome: outcome(final), selectorOutcome: outcome(selectedAtDown), final, selectedAtDown, switches, redirects, callbackMs, abstentions, updates };
  }
  function percentile(values, p) { if (!values.length) return 0; const sorted = [...values].sort((a,b) => a-b); return sorted[Math.min(sorted.length-1,Math.floor(p*sorted.length))]; }
  function wilson(success, n) {
    if (!n) return [0,0]; const z = 1.96, p = success/n, den = 1+z*z/n;
    const mid=(p+z*z/(2*n))/den, width=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
    return [mid-width,mid+width];
  }
  function summarize(trials, mode, opts = {}) {
    const policy = { correct:0, wrong:0, miss:0 }, selector = { correct:0, wrong:0, miss:0 };
    let switches = 0, redirects = 0, abstentions = 0, updates = 0, timings = [];
    const outcomes = [];
    for (const trial of trials) {
      const r = replayTrial(trial,mode,opts); policy[r.policyOutcome]++; selector[r.selectorOutcome]++;
      switches += r.switches; redirects += r.redirects; abstentions += r.abstentions; updates += r.updates;
      timings.push(...r.callbackMs); outcomes.push(r.policyOutcome);
    }
    const n = trials.length;
    return { mode, n, policy, selector, policyCorrect95CI: wilson(policy.correct,n), policyWrong95CI: wilson(policy.wrong,n),
      lateSelectionChangesPerTrial:switches/n, redirects, sampleAbstentionRate:abstentions/updates,
      timingMs:{ median:percentile(timings,.5), p99:percentile(timings,.99), max:timings.reduce((a,b)=>Math.max(a,b),0) }, outcomes };
  }
  function layout() {
    const targets=[]; let id=0;
    for(let i=0;i<6;i++) targets.push({id:id++,x:80+i*32,y:100,w:28,h:28});
    for(let i=0;i<6;i++) targets.push({id:id++,x:90+i*36,y:205,w:20,h:20});
    for(let i=0;i<8;i++) targets.push({id:id++,x:400,y:85+i*22,w:120,h:18});
    targets.push({id:id++,x:80,y:350,w:160,h:48},{id:id++,x:260,y:350,w:160,h:48});
    return targets;
  }
  function generate(seed, count, rms, targets = layout(), bounds = {w:800,h:500}) {
    const rand = R.rng(seed), trials=[];
    for(let i=0;i<count;i++) {
      const intended = targets[Math.floor(rand()*targets.length)], trial = R.makeTrial(intended,rms,rand,bounds);
      trials.push({id:i,intendedId:intended.id,targets:targets.map(r=>({...r})),samples:trial.samples.slice(0,trial.up+1).map((s,j)=>({...s,type:j===trial.down?'down':j===trial.up?'up':'move'}))});
    }
    return {schemaVersion:1,source:'synthetic',meta:{generator:'minimum-jerk-plus-sinusoid-v1',seed,count,rms,bounds},trials};
  }
  const api = { modes, hit, selectorFor, validateTrace, replayTrial, summarize, generate, layout, percentile, wilson };
  if(node) module.exports=api; else root.OpenSteadyReplay=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
