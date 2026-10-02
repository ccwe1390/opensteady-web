'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {ClickPolicy}=require('../extension/core/policy.js');
const event=(extra={})=>({t:1,x:20,y:20,pointerType:'mouse',pointerId:1,button:0,hitId:'a',selectedId:'a',canRedirect:true,previewAge:.2,...extra});
function gesture(p,down={},up={},click={}){p.down(event(down));p.up(event({t:1.1,...up}));return p.click(event({t:1.101,detail:1,safe:true,...click}));}
test('native click is untouched; a clear near miss and small slip redirect once',()=>{
  const p=new ClickPolicy();assert.equal(gesture(p).action,'pass');p.reset();
  assert.deepEqual(gesture(p,{hitId:null},{hitId:null},{hitId:null}),{action:'redirect',id:'a',reason:'near-miss'});p.reset();
  assert.equal(gesture(p,{hitId:'a'},{hitId:null,x:25},{hitId:null}).reason,'slip');
  assert.equal(p.click(event({t:1.102,detail:1})).action,'pass');
});
test('400 px drag and drag returning to start never redirect',()=>{
  const p=new ClickPolicy();assert.equal(gesture(p,{hitId:null},{hitId:null,x:420,y:420},{hitId:null}).action,'pass');
  p.down(event({hitId:null}));p.move(event({x:500,y:500}));p.move(event());p.up(event({t:1.1,hitId:null}));
  assert.equal(p.click(event({t:1.101,hitId:null,detail:1})).action,'pass');
});
test('a different native control is never reassigned, even if selector prefers a',()=>{
  const p=new ClickPolicy();const r=gesture(p,{hitId:'b'},{hitId:'b'},{hitId:'b'});assert.equal(r.action,'pass');assert.equal(r.id,'b');
  p.reset();assert.equal(gesture(p,{hitId:null},{hitId:'b'},{hitId:'b'}).action,'pass');
  p.reset();assert.equal(gesture(p,{hitId:'a'},{hitId:null},{hitId:'b'}).action,'pass');
});
test('bypass, modifiers represented by bypass, touch, keyboard, and long hold pass',()=>{
  for(const down of [{bypass:true},{pointerType:'touch'},{pointerType:'pen'},{button:2}]){
    assert.equal(gesture(new ClickPolicy(),{hitId:null,...down},{hitId:null},{hitId:null}).action,'pass');
  }
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{hitId:null,bypass:true},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{hitId:null},{hitId:null,detail:0}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{t:3,hitId:null},{t:3.001,hitId:null}).action,'pass');
});
test('unpreviewed, cancelled, stale and wrong-pointer gestures abstain',()=>{
  assert.equal(gesture(new ClickPolicy(),{hitId:null,previewAge:.01},{hitId:null},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{hitId:null,pointerId:2},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{hitId:null},{hitId:null,t:2}).action,'pass');
  const p=new ClickPolicy();p.down(event());p.cancel();p.up(event({t:1.1}));assert.equal(p.click(event({t:1.101,detail:1})).action,'pass');
});
test('repeat guard affects only a second nearby safe mouse gesture',()=>{
  const p=new ClickPolicy();assert.equal(gesture(p).action,'pass');
  assert.equal(gesture(p,{t:1.2},{t:1.25},{t:1.251}).action,'suppress');assert.ok(p.suppressDoubleEvent(1.252,'a'));
  assert.equal(gesture(p,{t:1.4,hitId:'b'},{t:1.45,hitId:'b'},{t:1.451,hitId:'b'}).action,'pass');
  p.reset();gesture(p);assert.equal(gesture(p,{t:1.2},{t:1.25},{t:1.251,safe:false}).action,'pass');
  p.reset();gesture(p);assert.equal(gesture(p,{t:1.2},{t:1.25},{t:1.251,detail:0}).action,'pass');
});
test('repeat guard is configurable and never suppresses far-away clicks on a large target',()=>{
  const p=new ClickPolicy({doubleGuard:false});gesture(p);assert.equal(gesture(p,{t:1.2},{t:1.25},{t:1.251}).action,'pass');
  const q=new ClickPolicy();gesture(q);assert.equal(gesture(q,{t:1.2,x:80},{t:1.25,x:80},{t:1.251,x:80}).action,'pass');
});
