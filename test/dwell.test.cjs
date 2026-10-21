'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {DwellPolicy}=require('../extension/core/dwell.js');
test('a stable target activates once despite small ongoing movements',()=>{
  const d=new DwellPolicy(),actions=[];
  for(let i=0;i<150;i++){const r=d.update(i*.04,100+6*Math.sin(i),100+6*Math.cos(i),'a');if(r.action==='activate')actions.push(r.id);}
  assert.deepEqual(actions,['a']);
});
test('switches, cancellation, and missing candidates restart the full countdown',()=>{
  const d=new DwellPolicy();d.update(0,0,0,'a');d.update(.2,0,0,'a');d.update(.4,0,0,'b');
  assert.equal(d.update(.6,0,0,'b').action,'wait');d.cancel();
  d.update(.8,0,0,'b');d.update(1,0,0,null);d.update(1.2,0,0,'b');
  for(let t=1.4;t<2;t+=.2)assert.equal(d.update(t,0,0,'b').action,'wait');
  assert.equal(d.update(2.1,0,0,'b').action,'activate');
});
test('rearming requires sustained movement away, preventing repeated or chained clicks',()=>{
  const d=new DwellPolicy({delay:.5});for(let i=0;i<=5;i++)d.update(i*.1,100,100,'a');
  d.update(.6,150,100,'b');d.update(.7,100,100,'b');
  for(let i=8;i<=15;i++)assert.equal(d.update(i*.1,100,100,'b').action,'wait');
  d.update(1.6,150,100,'b');d.update(1.8,150,100,'b');d.update(1.9,150,100,'b');
  d.update(2,150,100,'b');for(let t=2.1;t<2.5;t+=.1)assert.equal(d.update(t,150,100,'b').action,'wait');
  assert.equal(d.update(2.5,150,100,'b').action,'activate');
});
test('manual presses lock dwell and timer interruptions never complete an old countdown',()=>{
  const d=new DwellPolicy({delay:.5});d.update(0,100,100,'a');d.update(.2,100,100,'a');d.block(.3,100,100);
  for(let i=4;i<=15;i++)assert.equal(d.update(i*.1,100,100,'a').action,'wait');
  const j=new DwellPolicy({delay:.5});j.update(0,100,100,'a');j.update(.2,100,100,'a');assert.equal(j.update(4,100,100,'a').progress,0);
  assert.equal(j.update(NaN,100,100,'a').action,'wait');assert.equal(j.update(4.2,100,100,'a').progress,0);
});
