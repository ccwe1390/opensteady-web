'use strict';
window.fixtureLog=[];window.fixtureCounts={};window.trustedOnlyCount=0;
for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','dblclick','dragstart'])document.addEventListener(type,e=>{
  const id=e.target.closest?.('[id]')?.id||e.target.tagName;
  window.fixtureLog.push({type,id,trusted:e.isTrusted,detail:e.detail,meta:e.metaKey,ctrl:e.ctrlKey});
  if(window.fixtureLog.length>150)window.fixtureLog.shift();
  document.getElementById('events').textContent=window.fixtureLog.map(r=>JSON.stringify(r)).join('\n');
  if(type==='click'&&e.target.closest('#testbed button,#testbed a,#testbed input,#testbed summary')){
    const el=e.target.closest('button,a,input,summary');window.fixtureCounts[el.id||el.tagName]=(window.fixtureCounts[el.id||el.tagName]||0)+1;
    document.getElementById('summary').textContent=JSON.stringify(window.fixtureCounts);
  }
},false);
document.getElementById('form').addEventListener('submit',e=>e.preventDefault());
document.getElementById('trusted').addEventListener('click',e=>{if(e.isTrusted)window.trustedOnlyCount++;});
document.getElementById('moveTarget').addEventListener('click',()=>{const el=document.getElementById('moving');el.style.left=el.style.left==='230px'?'280px':'230px';});
document.getElementById('replaceTarget').addEventListener('click',()=>{const old=document.getElementById('dynamic');const fresh=old.cloneNode(true);fresh.textContent='Replacement target';old.replaceWith(fresh);});
document.getElementById('stress').addEventListener('click',()=>{const f=document.createDocumentFragment();for(let i=0;i<5000;i++){const a=document.createElement('a');a.href='#destination';a.textContent='Item '+i;a.style.cssText='display:inline-block;width:70px;margin:4px';f.appendChild(a);}document.getElementById('stressfield').replaceChildren(f);});
const shadow=document.getElementById('shadowhost').attachShadow({mode:'open'});const b=document.createElement('button');b.textContent='Shadow control';shadow.appendChild(b);
