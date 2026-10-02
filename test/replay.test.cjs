'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const R=require('../benchmark/replay.js');
test('identical seeds generate byte-identical motions; changed seeds change paths',()=>{
  assert.deepEqual(R.generate(12,5,8),R.generate(12,5,8));assert.notDeepEqual(R.generate(12,5,8),R.generate(13,5,8));
});
test('generated traces validate; every mode accounts for every trial',()=>{
  const data=R.validateTrace(R.generate(12,15,8));for(const mode of R.modes){const row=R.summarize(data.trials,mode);assert.equal(Object.values(row.policy).reduce((a,b)=>a+b),15);assert.equal(Object.values(row.selector).reduce((a,b)=>a+b),15);assert.equal(row.outcomes.length,15);}
});
test('no-tremor simulation preserves all native clicks under every mode',()=>{
  const data=R.generate(12,100,0);for(const mode of R.modes)assert.equal(R.summarize(data.trials,mode).policy.correct,100);
});
test('bad imports reject missing release, invalid geometry, order and intended ID',()=>{
  for(const change of [d=>d.trials[0].samples.pop(),d=>d.trials[0].targets[0].w=-1,d=>d.trials[0].samples[2].t=-1,d=>d.trials[0].intendedId='nope',d=>d.trials[0].samples[1].x=Infinity]){const d=R.generate(12,1,8);change(d);assert.throws(()=>R.validateTrace(d),/Invalid trace/);}
});
test('selection result is separate from delivered result',()=>{
  const targets=[{id:'a',x:0,y:0,w:20,h:20},{id:'b',x:30,y:0,w:20,h:20}];
  const trial={intendedId:'a',targets,samples:[{t:0,x:10,y:10,type:'move'},{t:.1,x:10,y:10,type:'move'},{t:.2,x:25,y:10,type:'down'},{t:.3,x:40,y:10,type:'up'}]};
  const r=R.replayTrial(trial,'stable');assert.equal(r.policyOutcome,'miss');
});
