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
test('a press may wander past the base limit only when shake was measured, it was short, and the outline agreed',()=>{
  const wide={hitId:'a',selectedId:'a',slipLimit:30},off={hitId:null,x:45},click={hitId:null};
  assert.deepEqual(gesture(new ClickPolicy(),wide,off,click),{action:'redirect',id:'a',reason:'slip'});
  assert.equal(gesture(new ClickPolicy(),{hitId:'a',selectedId:'a'},off,click).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{...wide,selectedId:'b'},off,click).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{...wide,selectedId:null},off,click).action,'pass');
  assert.equal(gesture(new ClickPolicy(),wide,{...off,t:1.8},{...click,t:1.801}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),wide,{hitId:null,x:55},click).action,'pass');
});
test('a measured limit below the base never shrinks the base, and junk values are ignored',()=>{
  for(const slipLimit of [5,0,-1,NaN,Infinity,'30',undefined]){
    const r=gesture(new ClickPolicy(),{hitId:'a',slipLimit},{hitId:null,x:30},{hitId:null});assert.equal(r.reason,'slip',String(slipLimit));
    assert.equal(gesture(new ClickPolicy(),{hitId:'a',selectedId:'a',slipLimit},{hitId:null,x:45},{hitId:null}).action,'pass',String(slipLimit));
  }
});
test('a near miss released on the outlined target itself is delivered; on any other control it is not',()=>{
  assert.deepEqual(gesture(new ClickPolicy(),{hitId:null},{hitId:'a'},{hitId:null}),{action:'redirect',id:'a',reason:'near-miss'});
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{hitId:'b'},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:null,canRedirect:false},{hitId:'a'},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:null},{hitId:'a'},{hitId:null,canRedirect:false}).action,'pass');
});
test('a slip onto another control goes to the pressed target only when the outline agreed and no control gets a native click',()=>{
  assert.deepEqual(gesture(new ClickPolicy(),{hitId:'a',selectedId:'a'},{hitId:'b'},{hitId:null}),{action:'redirect',id:'a',reason:'slip'});
  assert.equal(gesture(new ClickPolicy(),{hitId:'a',selectedId:'b'},{hitId:'b'},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:'a',selectedId:null},{hitId:'b'},{hitId:null}).action,'pass');
  assert.equal(gesture(new ClickPolicy(),{hitId:'a',selectedId:'a'},{hitId:'b'},{hitId:'b'}).action,'pass');
  const pressedWrong=gesture(new ClickPolicy(),{hitId:'b',selectedId:'a',slipLimit:30},{hitId:null,x:45},{hitId:null});
  assert.equal(pressedWrong.action,'pass');
});
test('past the allowed distance nothing is redirected, but a release on the pressed control is still its own click',()=>{
  const p=new ClickPolicy();p.down(event({hitId:'a'}));p.move(event({x:50}));p.up(event({t:1.1,hitId:'a'}));
  assert.deepEqual(p.click(event({t:1.101,detail:1,hitId:'a',safe:true})),{action:'pass',id:'a',reason:'native'});
  const q=new ClickPolicy();q.down(event({hitId:'a'}));q.move(event({x:50}));q.up(event({t:1.1,hitId:null}));
  assert.equal(q.click(event({t:1.101,detail:1,hitId:null})).action,'pass');
  const r=new ClickPolicy();r.down(event({hitId:null}));r.move(event({x:50}));r.up(event({t:1.1,hitId:null}));
  assert.equal(r.click(event({t:1.101,detail:1,hitId:null})).reason,'no-safe-correction');
  const far=new ClickPolicy();far.down(event({hitId:'a'}));far.move(event({x:120}));far.up(event({t:1.1,hitId:'a'}));
  assert.equal(far.released,null);assert.equal(far.click(event({t:1.101,detail:1,hitId:'a'})).reason,'not-mouse-gesture');
});
test('when the browser\'s own click already reaches the pressed control, that trusted click is kept, not replaced',()=>{
  // A card that is itself a control, with a button nested inside it. Press on the card, release on the inner button:
  // the browser delivers the click to the card. The policy must pass it, and still count it for the repeat guard.
  const p=new ClickPolicy();const r=gesture(p,{hitId:'card',selectedId:'card'},{hitId:'inner',x:29},{hitId:'card'});
  assert.deepEqual(r,{action:'pass',id:'card',reason:'native'});
  assert.equal(gesture(p,{hitId:'card',selectedId:'card',t:1.2},{hitId:'card',t:1.25},{hitId:'card',t:1.251}).action,'suppress','the kept click feeds the repeat guard');
  // The same slip with no native click on the card is still redirected.
  const q=new ClickPolicy();assert.equal(gesture(q,{hitId:'card',selectedId:'card'},{hitId:'inner',x:29},{hitId:null}).action,'redirect');
});
test('the measured limit is clamped to the same-target bound',()=>{
  const p=new ClickPolicy();p.down(event({slipLimit:1000}));assert.equal(p.press.slipLimit,48);
  const q=new ClickPolicy({sameTargetPx:30});q.down(event({slipLimit:1000}));assert.equal(q.press.slipLimit,30);
  // So a 380 px press is never a slip, whatever limit is passed in.
  const r=new ClickPolicy();r.down(event({hitId:'a',slipLimit:1000}));r.move({x:400,y:20});r.up(event({t:1.1,hitId:null,x:400}));
  assert.equal(r.click(event({t:1.101,detail:1,hitId:null,safe:true})).action,'pass');
});
