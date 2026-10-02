'use strict';
const $ = id => document.getElementById(id), R = OpenSteadyReplay;
const targets = [...document.querySelectorAll('.target')];
let report = null, recording = null, current = null, recorded = [], active = false, releaseTimer = null, busy = false;
let intendedOrder = [], recordingStart = 0;
function rectangles() {
  return targets.map(el => { const r=el.getBoundingClientRect(); return {id:Number(el.dataset.id),x:r.left,y:r.top,w:r.width,h:r.height}; });
}
function download(name, value) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(rows) {
  $('results').replaceChildren();
  for(const row of rows) {
    const tr=document.createElement('tr'), pct=n=>(100*n/row.n).toFixed(1)+'%';
    for(const value of [row.rms??'trace',row.mode,row.n,pct(row.policy.correct),pct(row.policy.wrong),pct(row.policy.miss),pct(row.selector.correct),pct(row.selector.wrong)]) {
      const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);
    } $('results').appendChild(tr);
  }
}
$('run').addEventListener('click',async()=>{
  if(active || busy) return; busy=true;$('run').disabled=true;
  try {
    const seed=Number($('seed').value), count=Number($('trials').value);
    if(!Number.isInteger(seed)||seed<0||seed>4294967295) throw new Error('Seed must be an integer from 0 to 4294967295.');
    $('field').scrollIntoView({block:'center'});
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const geometry=rectangles();
    if(geometry.some(r=>r.y<0||r.y+r.h>innerHeight||r.x<0||r.x+r.w>innerWidth)) throw new Error('Keep the entire pointing field visible, then run again.');
    report={schemaVersion:1,source:'synthetic',generatedAt:new Date().toISOString(),browser:navigator.userAgent,seed,count,geometry,rows:[],limits:['Geometry/gesture replay only; no browser events dispatched.','No participant benefit or competing extension was measured.']};
    for(const rms of [0,4,8,16]) {
      const data=R.generate(seed,count,rms,geometry,{w:innerWidth,h:innerHeight});
      for(const mode of R.modes) {
        $('progress').textContent=`Computing ${rms} px, ${mode}…`;
        await new Promise(resolve=>setTimeout(resolve,0));
        report.rows.push({rms,seed,...R.summarize(data.trials,mode)});render(report.rows);
      }
    }
    $('progress').textContent='Done. These are simulated results.';$('exportResults').disabled=false;
  }catch(e){$('progress').textContent=e.message;}finally{busy=false;$('run').disabled=false;}
});
$('exportResults').addEventListener('click',()=>{if(report)download('opensteady-synthetic-results.json',report);});
function nextTrial() {
  targets.forEach(el=>el.classList.remove('intended'));
  if(recorded.length>=intendedOrder.length){stopRecording();$('prompt').textContent='Recording finished. Export it or discard it.';return;}
  const intendedId=intendedOrder[recorded.length], el=targets.find(el=>Number(el.dataset.id)===intendedId);
  el.classList.add('intended');
  current={id:recorded.length,intendedId,targets:rectangles(),samples:[],observedClickedIds:[],t0:performance.now()/1000,conditionLabel:$('condition').value};
  $('prompt').textContent=`Trial ${recorded.length+1} of ${intendedOrder.length}: click ${el.getAttribute('aria-label')||el.textContent}.`;
}
function stopRecording() {
  active=false;current=null;clearTimeout(releaseTimer);releaseTimer=null;
  targets.forEach(el=>el.classList.remove('intended'));
  $('record').disabled=false;$('stop').disabled=true;$('run').disabled=false;$('condition').disabled=false;
  $('exportTrace').disabled=recorded.length===0;$('discard').disabled=recorded.length===0;
}
$('record').addEventListener('click',async()=>{
  if(busy)return;
  if(recorded.length){$('prompt').textContent='Export or discard the existing recording before starting another.';return;}
  $('field').scrollIntoView({block:'center'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  recorded=[];active=true;recordingStart=performance.now()/1000;
  intendedOrder=targets.map(el=>Number(el.dataset.id));
  const random=OpenSteadyRobot.rng(20261002);for(let i=intendedOrder.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[intendedOrder[i],intendedOrder[j]]=[intendedOrder[j],intendedOrder[i]];}
  recording={schemaVersion:1,source:'lab-recording',meta:{conditionLabel:$('condition').value,conditionVerified:false,browser:navigator.userAgent,viewport:{w:innerWidth,h:innerHeight},purpose:'single-attempt pointing task',recordedAt:new Date().toISOString()},trials:recorded};
  $('record').disabled=true;$('stop').disabled=false;$('run').disabled=true;$('condition').disabled=true;nextTrial();
});
$('stop').addEventListener('click',()=>{stopRecording();$('prompt').textContent='Stopped. Completed trials remain in memory.';});
$('discard').addEventListener('click',()=>{stopRecording();recorded=[];recording=null;$('exportTrace').disabled=true;$('discard').disabled=true;$('prompt').textContent='Recording discarded.';});
$('exportTrace').addEventListener('click',()=>{if(recorded.length){R.validateTrace(recording);download('opensteady-lab-trace.json',recording);}});
function sample(e,type){
  if(!active||!current||!e.isTrusted||e.pointerType!=='mouse'||releaseTimer)return;
  const time=performance.now()/1000-current.t0;
  if(time>600||current.samples.length>=20000){stopRecording();$('prompt').textContent='Recording stopped at the size/time limit.';return;}
  if(type==='down'&&current.samples.some(s=>s.type==='down'))return;
  if(type==='up'&&!current.samples.some(s=>s.type==='down'))return;
  current.samples.push({t:time,x:e.clientX,y:e.clientY,type});
  if(type==='up'){
    const completed=current;
    releaseTimer=setTimeout(()=>{
      releaseTimer=null;if(!active)return;
      if(completed.samples.some(s=>s.type==='down'))recorded.push({...completed,t0:undefined});
      nextTrial();
    },180);
  }
}
window.addEventListener('pointermove',e=>sample(e,'move'),true);
window.addEventListener('pointerdown',e=>{if(e.button===0&&document.getElementById('field').contains(e.target))sample(e,'down');},true);
window.addEventListener('pointerup',e=>{if(e.button===0)sample(e,'up');},true);
targets.forEach(el=>el.addEventListener('click',e=>{
  e.preventDefault();const id=Number(el.dataset.id);$('hit').textContent='Activated: '+(el.getAttribute('aria-label')||el.textContent);
  el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),200);
  if(active&&current&&current.samples.some(s=>s.type==='down'))current.observedClickedIds.push(id);
}));
for(const event of ['resize','scroll'])window.addEventListener(event,()=>{if(active){stopRecording();$('prompt').textContent='Stopped because the field moved. Export completed trials, then start a fresh recording.';}},true);
$('importTrace').addEventListener('change',async()=>{
  const file=$('importTrace').files[0];if(!file)return;
  try{
    if(file.size>25*1024*1024)throw new Error('Maximum trace size is 25 MiB.');
    const data=R.validateTrace(JSON.parse(await file.text()));
    report={schemaVersion:1,source:'trace-replay',traceSource:data.source,browser:navigator.userAgent,rows:[]};
    for(const mode of R.modes){await new Promise(resolve=>setTimeout(resolve,0));report.rows.push(R.summarize(data.trials,mode));}
    render(report.rows);$('exportResults').disabled=false;$('importStatus').textContent=`Replayed ${data.trials.length} trials locally. Observed clicks and counterfactual model outputs are different measures.`;
  }catch(e){$('importStatus').textContent=e.message;}
});
