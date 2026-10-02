'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const S=require('../extension/core/selector.js'), R=require('../benchmark/robot.js');
const targets=[{id:'a',x:10,y:10,w:20,h:20},{id:'b',x:40,y:10,w:20,h:20}];
test('rectangle geometry, corners, inside, and invalid input',()=>{
  assert.equal(S.distToRect(20,20,targets[0]),0);assert.equal(S.distToRect(0,20,targets[0]),10);
  assert.ok(Math.abs(S.distToRect(0,0,targets[0])-Math.sqrt(200))<1e-9);
  assert.equal(S.nearestWithinRadius(targets,100,100,24),null);assert.equal(S.nearestWithinRadius(targets,NaN,20,24),null);
  assert.equal(S.nearestWithinRadius([{...targets[0],risky:true}],20,20,24),null);
});
test('probability is symmetric, finite, and rewards an interior point',()=>{
  assert.ok(Math.abs(S.normalCDF(0)-.5)<1e-7);
  for(let x=-6;x<=6;x+=.1)assert.ok(Math.abs(S.normalCDF(x)+S.normalCDF(-x)-1)<1e-7);
  assert.ok(S.rectProbability(20,20,4,targets[0])>.97);
  assert.ok(S.rectProbability(100,100,4,targets[0])<1e-8);
  assert.equal(S.rectProbability(20,20,0,targets[0]),0);
});
test('selection waits for preview acquisition and abstains in a symmetric gap',()=>{
  const s=new S.StableSelector();assert.equal(s.update(0,20,20,targets),null);
  for(let i=1;i<=8;i++)s.update(i*.01,20,20,targets);assert.equal(s.current,'a');
  s.reset();for(let i=0;i<30;i++)assert.equal(s.update(i*.01,35,20,targets),null);
});
test('hysteresis rejects oscillation and switches after a deliberate move',()=>{
  const s=new S.StableSelector();for(let i=0;i<30;i++)s.update(i*.01,20,20,targets);
  let changes=0,last=s.current;
  for(let i=30;i<130;i++){const id=s.update(i*.01,29+8*Math.sin(i*.4),20,targets);if(id!==last){changes++;last=id;}}
  assert.ok(changes<=2,'excessive switching: '+changes);
  for(let i=130;i<180;i++)s.update(i*.01,50,20,targets);assert.equal(s.current,'b');
});
test('gaps, backwards time, disappeared targets, and invalid samples reset memory',()=>{
  const s=new S.StableSelector();for(let i=0;i<20;i++)s.update(i*.01,20,20,targets);
  assert.equal(s.current,'a');assert.equal(s.update(.2,20,20,[]),null);
  s.update(.3,20,20,targets);assert.equal(s.update(2,50,20,targets),null);
  assert.equal(s.update(1,20,20,targets),null);assert.equal(s.update(NaN,20,20,targets),null);
});
test('spatial index equals full scan for 5,000 random rectangles and boundary queries',()=>{
  const rand=R.rng(420), rects=Array.from({length:5000},(_,id)=>({id,x:rand()*6000-1000,y:rand()*4000-1000,w:1+rand()*200,h:1+rand()*100}));
  rects.push({id:5000,x:-10000,y:-10000,w:20000,h:20000});
  const grid=new S.SpatialIndex();grid.rebuild(rects);
  for(let i=0;i<100;i++){const x=rand()*6000-1000,y=rand()*4000-1000,r=rand()*80;
    const actual=grid.near(x,y,r).map(x=>x.id).sort((a,b)=>a-b),expected=rects.filter(q=>S.distToRect(x,y,q)<=r).map(x=>x.id).sort((a,b)=>a-b);
    assert.deepEqual(actual,expected);
  }assert.deepEqual(grid.near(0,0,Infinity),[]);
});
test('random pointer paths return only eligible candidate IDs or null',()=>{
  const rand=R.rng(123),s=new S.StableSelector({adaptive:true});
  for(let i=0;i<2000;i++){const id=s.update(i*.01,rand()*100,rand()*50,targets);assert.ok(id===null||targets.some(r=>r.id===id));}
});
