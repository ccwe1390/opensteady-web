#!/usr/bin/env node
// Do the unit tests notice when a rule is broken? Each entry below breaks one rule by changing a single
// piece of the extension's code. The unit tests are run against every broken copy. A fault that no test
// notices is reported as SURVIVED. Written by Claude (AI assistant), 2026-10-02, for OpenSteady Web 0.1.4. Two target faults added for 0.1.5.
// Usage, from the project folder: node tools/mutation_check.cjs
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const T='extension/targets.js',C='extension/content.js',P='extension/core/policy.js',J='extension/core/jitter.js',L='extension/core/link-drag.js';
// A control: this changes only a comment, so no test can notice it. It must be reported as SURVIVED.
// If it is reported as caught, this script is misreading the test output, and every other verdict is void.
const control=['control: a comment changed, nothing else',C,'// A drag of selected text starts on a text node, so look at its parent element.','// (comment changed by the fault check)'];
const faults=[
 ['targets: consequential action labels are no longer excluded',T,'if (RISK.test(label) || ACTION.test(actionLabel(el))) return false;','if (RISK.test(label)) return false;'],
 ['targets: action words are also matched in link addresses',T,"el.getAttribute('title'), el.textContent?.slice(0, 240)].filter(Boolean)","el.getAttribute('title'), el.textContent?.slice(0, 240), el.getAttribute('href')].filter(Boolean)"],
 ['policy: a native click on another control no longer wins',P,'id !== null && free && e.canRedirect','id !== null && e.canRedirect'],
 ['policy: a press past its allowed distance can be redirected',P,'!nativeCorrect && !p.sameOnly &&','!nativeCorrect &&'],
 ['policy: the wide limit also applies to long presses',P,'age <= this.quickSeconds ? p.slipLimit : this.slipPx','p.slipLimit'],
 ['policy: a near miss may be released on any control',P,'p.hitId === null && p.canRedirect && (p.upHitId === null || p.upHitId === id)','p.hitId === null && p.canRedirect'],
 ['policy: a wide slip onto empty space needs no outline agreement',P,'(p.upHitId === null ? (!p.wide || agreed) : agreed)','(p.upHitId === null ? true : agreed)'],
 ['policy: a slip onto another control needs no outline agreement',P,'(p.upHitId === null ? (!p.wide || agreed) : agreed)','(p.upHitId === null ? (!p.wide || agreed) : true)'],
 ['policy: same-control recognition reaches 480 px',P,'opts.sameTargetPx ?? 48','opts.sameTargetPx ?? 480'],
 ['policy: the 1.2 s maximum is ignored',P,'|| age < 0 || age > this.holdSeconds) return;','|| age < 0) return;'],
 ['policy: a working native click is replaced by a synthetic one',P,'const keepNative = nativeCorrect || nativeId === id;','const keepNative = nativeCorrect;'],
 ['policy: a passed-in limit is not clamped',P,'Math.min(this.sameTargetPx, Math.max(this.slipPx, e.slipLimit))','Math.max(this.slipPx, e.slipLimit)'],
 ['jitter: the test for a travelling pointer is removed',J,'if (travel > this.settleBase + this.settleGain * value) return 0;',''],
 ['jitter: the variance divides by n instead of n minus 3',J,'sum / Math.max(1, n - 3)','sum / n'],
 ['jitter: the limit is capped at 480 px',J,'opts.max ?? 48','opts.max ?? 480'],
 ['jitter: the steady line for selected text moves to 5 px',J,'opts.below ?? 2','opts.below ?? 5'],
 ['jitter: an unknown measurement counts as not steady',J,'return !Number.isFinite(jitter) || jitter < below;','return Number.isFinite(jitter) && jitter > 0 && jitter < below;'],
 ['drag record: the quick window becomes 1.2 s',L,'opts.quickSeconds??0.5','opts.quickSeconds??1.2'],
 ['drag record: abort forgets a cancelled drag',L,'abort() { if(!this.press?.cancelled)this.reset(); }','abort() { this.reset(); }'],
 ['drag record: a modifier key during the press is ignored',L,'bypass() { if(this.press)this.press.bypassed=true; }','bypass() { }'],
 ['drag record: keeps the last distance, not the furthest',L,'p.maxDistance=Math.max(p.maxDistance,Math.hypot(x-p.x,y-p.y))','p.maxDistance=Math.hypot(x-p.x,y-p.y)'],
 ['drag guard: outline agreement is dropped',C,'!!p && !!agreed && sameStart','!!p && sameStart'],
 ['drag guard: the drag may start anywhere',C,'!!agreed && sameStart &&','!!agreed &&'],
 ['drag guard: a drag starting on something sensitive is cancelled',C,'!!p && !!node && !D.sensitive(node) && (','!!p && !!node && ('],
 ['drag guard: the target is not checked at the drag',C,'linkDrag.canCancel(stamp(e), p.id) && !!index.validate(p.id, frozen.rect)','linkDrag.canCancel(stamp(e), p.id)'],
 ['drag guard: modifier keys are ignored',C,'config.dragGuard && !bypass(e) && !!p','config.dragGuard && !!p'],
 ['drag guard: a text node target is not resolved to its parent',C,'e.target instanceof Element ? e.target : e.target?.parentElement','e.target'],
 ['drag guard: acts even when the page cancelled the drag later',C,'const { cancel } = pendingDrag; pendingDrag = null;\n    if (e.defaultPrevented) { linkDrag.reset(); return; }','const { cancel } = pendingDrag; pendingDrag = null;'],
 ['drag guard: a drag that really starts does not end the press',C,'counters.preventedLinkDrags++; return; }\n    clear();','counters.preventedLinkDrags++; return; }'],
 ['drag guard: a page cancellation seen late still ends the press',C,'const { cancel } = pendingDrag; pendingDrag = null;\n    if (e.defaultPrevented) { linkDrag.reset(); return; }','const { cancel } = pendingDrag; pendingDrag = null;\n    if (e.defaultPrevented && cancel) { linkDrag.reset(); return; }\n    if (e.defaultPrevented) { clear(); return; }'],
 ['drag guard: not moved after the page\'s window listeners',C,"window.removeEventListener('dragstart', actOnDrag, false); window.addEventListener('dragstart', actOnDrag, false);",''],
 ['drag guard: beside the target it acts for a steady hand too',C,'(control ? frozen.id === id : !steady)','(control ? frozen.id === id : true)'],
 ['selected text: a steady press on it is never blocked',C,'pressBlocked = steady && selectionCovers','pressBlocked = false && selectionCovers'],
 ['selected text: blocks a hand that is not steady as well',C,'pressBlocked = steady && selectionCovers','pressBlocked = selectionCovers'],
 ['selected text: blocks a press on a link or button as well',C,'selectionCovers(e.clientX, e.clientY) && !(control && D.eligible(control));','selectionCovers(e.clientX, e.clientY);'],
 ['selected text: a steady press that selects text is still corrected',C,'pressMadeSelection = pressSteady && !pressOnControl','pressMadeSelection = false && !pressOnControl'],
 ['selected text: the selection rule applies to a hand that is not steady',C,'pressMadeSelection = pressSteady && !pressOnControl','pressMadeSelection = !pressOnControl'],
 ['selected text: the selection rule applies on a control',C,'pressMadeSelection = pressSteady && !pressOnControl','pressMadeSelection = pressSteady'],
 ['selected text: a selection with no visible text counts',C,"    return String(s).trim() !== '';",'    return true;'],
 ['selected text: never removed after a correction',C,'if (selectionPresent() && !sameMark(selectionMark(), selectionAtPress)) document.getSelection().removeAllRanges();',''],
 ['selected text: an older selection is removed too',C,'if (selectionPresent() && !sameMark(selectionMark(), selectionAtPress)) document','if (selectionPresent()) document'],
 ['selected text: removed before the last check of the target',C,'      if (index.validate(target.rect.id, target.rect)) {\n        // Text this same press selected is part of the slip. Remove it before the click lands.\n        if (selectionPresent() && !sameMark(selectionMark(), selectionAtPress)) document.getSelection().removeAllRanges();','      if (selectionPresent() && !sameMark(selectionMark(), selectionAtPress)) document.getSelection().removeAllRanges();\n      if (index.validate(target.rect.id, target.rect)) {'],
 ['selected text: offsets of a partial selection are ignored',C,'const from = g.startContainer === text ? g.startOffset : 0, to = g.endContainer === text ? g.endOffset : text.length;','const from = 0, to = text.length;'],
 ['selected text: only the character after the caret is measured',C,'const a = Math.max(from, caret.offset - 1)','const a = Math.max(from, caret.offset)'],
 ['selected text: a caret outside text counts as covered',C,'if (!text || text.nodeType !== 3) return false;','if (!text || text.nodeType !== 3) return true;'],
 ['selected text: a giant text node is measured',C,'if (text.length > 1000000) return true;',''],
 ['selected text: no caret support means not covered',C,'if (caret === undefined) return true;','if (caret === undefined) return false;'],
 ['selected text: hold to click ignores it',C,'if (selectionCovers(x, y) && !(native && D.eligible(native))) {','if (false) {'],
 ['click: the release may be as far as the whole limit',C,'> config.radius + (p.slipLimit - policy.slipPx)','> config.radius + p.slipLimit'],
 ['click: the release allowance never widens',C,'> config.radius + (p.slipLimit - policy.slipPx)','> config.radius'],
 ['click: a cancelled drag that went too far is not stopped',C,"const tooFar = drag.maxDistance > policy.sameTargetPx || ended - drag.t > policy.holdSeconds;","const tooFar = false;"],
 ['click: a cancelled drag is judged without its duration',C,'|| ended - drag.t > policy.holdSeconds;',';'],
 ['click: a stray click on a containing control is let through',C,'stray = index.idFor(native) !== drag.id;','stray = false;'],
 ['click: only a recognized control can receive a stray click',C,'stray = index.idFor(native) !== drag.id;','stray = !!native && index.idFor(native) !== drag.id;'],
 ['selected text: blank text in one node counts as text',C,"return g.startContainer.data.slice(g.startOffset, g.endOffset).trim() !== '';","return true;"],
 ['drag guard: a page cancellation seen early still resets the press',C,'as an ordinary press.\n    if (e.defaultPrevented) { linkDrag.reset(); return; }','as an ordinary press.\n    if (e.defaultPrevented) { clear(); return; }'],
 ['click: keyboard clicks after a cancelled drag are stopped too',C,"const native = hit(e), plain = e.detail !== 0 && !bypass(e);","const native = hit(e), plain = !bypass(e);"],
 ['click: modifier clicks after a cancelled drag are stopped too',C,"const native = hit(e), plain = e.detail !== 0 && !bypass(e);","const native = hit(e), plain = e.detail !== 0;"],
 ['pointer: the drag record is not fed with movement',C,'if (e.buttons !== 0) linkDrag.move(e.clientX, e.clientY);',''],
 ['pointer: shake is sampled during a press',C,'if (active() && e.buttons === 0) jitter.add(','if (active()) jitter.add('],
 ['pointer: shake is sampled while paused',C,'if (active() && e.buttons === 0) jitter.add(','if (e.buttons === 0) jitter.add('],
 ['pointer: the shake history survives a scroll',C,'linkDrag.abort(); jitter.reset(); }','linkDrag.abort(); }'],
 ['errors: three internal errors no longer pause the page',C,'if (counters.errors >= 3) { paused = true; index.stop(); }',''],
];
const work=fs.mkdtempSync(path.join(os.tmpdir(),'opensteady-faults-'));
const skip=/[\/\\](node_modules|results|dist|release|\.git|probes|docs)([\/\\]|$)/;
// Run the unit tests in a copy, optionally with one change applied. Returns the number of failing tests,
// or null when the result cannot be read. The TAP reporter is requested explicitly: from Node 24 the
// default output is a different format even when it is not shown on a screen.
function runTests(change){
  fs.rmSync(path.join(work,'copy'),{recursive:true,force:true});
  fs.cpSync(root,path.join(work,'copy'),{recursive:true,filter:p=>!skip.test(path.relative(root,p)?'/'+path.relative(root,p):'')});
  if(change){
    const [,file,from,to]=change,f=path.join(work,'copy',file),text=fs.readFileSync(f,'utf8');
    if(!text.includes(from))return 'not-applied';
    if(text.split(from).length>2)return 'ambiguous';
    fs.writeFileSync(f,text.replace(from,to));
  }
  const tests=fs.readdirSync(path.join(work,'copy','test')).filter(n=>n.endsWith('.test.cjs')).map(n=>path.join('test',n));
  const r=spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd:path.join(work,'copy'),encoding:'utf8'});
  const total=r.stdout.match(/^# tests (\d+)$/m),failed=r.stdout.match(/^# fail (\d+)$/m);
  if(!total||!failed||Number(total[1])===0)return null;
  return Number(failed[1]);
}
const lines=[];let survived=0,applied=0,unreadable=0;
// 1. The unchanged code must pass, or nothing below means anything.
const baseline=runTests(null);
if(baseline!==0){fs.rmSync(work,{recursive:true,force:true});console.log(baseline===null?'Could not read the test results for the unchanged code. Stopping.':`The unchanged code already fails ${baseline} tests. Stopping.`);process.exit(1);}
lines.push('baseline     the unchanged code passes every test');
// 2. The control must survive.
const c=runTests(control);
const controlOk=c===0;
lines.push((controlOk?'SURVIVED     ':'WRONG        ')+control[0]+(controlOk?' (as it should)':` (reported as ${c===null?'unreadable':c+' failing'}: this script is misreading the results)`));
// 3. The real faults.
for(const fault of faults){
  const name=fault[0],failed=runTests(fault);
  if(failed==='not-applied'){lines.push('NOT APPLIED  '+name);continue;}
  if(failed==='ambiguous'){lines.push('AMBIGUOUS    '+name+' (the pattern appears more than once)');continue;}
  applied++;
  if(failed===null){unreadable++;lines.push('UNREADABLE   '+name);}
  else if(failed===0){survived++;lines.push('SURVIVED     '+name);}
  else lines.push(`caught (${failed} failing)  `.padEnd(22)+name);
}
fs.rmSync(work,{recursive:true,force:true});
for(const l of lines)console.log(l);
console.log(`\n${faults.length} faults listed, ${applied} applied, ${applied-survived-unreadable} caught by the unit tests, ${survived} survived`+(unreadable?`, ${unreadable} unreadable`:'')+'.');
console.log(`Checked with Node ${process.version}. The control fault ${controlOk?'survived, as it should':'was misreported, so these results cannot be trusted'}.`);
if(!controlOk||applied!==faults.length||survived||unreadable)process.exitCode=1;
