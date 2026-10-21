'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');
const{LinkDragPolicy}=require('../extension/core/link-drag.js');
const begin={t:10,id:'a',pointerId:1,x:100,y:100};
test('a drag that starts quickly on the pressed control can be cancelled, once',()=>{
  const p=new LinkDragPolicy();p.begin(begin);
  assert.equal(p.canCancel(10.05,'a'),true);assert.equal(p.canCancel(10.5,'a'),true);
  p.markCancelled();assert.equal(p.canCancel(10.06,'a'),false);
  const taken=p.take();assert.equal(taken.cancelled,true);assert.equal(taken.id,'a');assert.equal(p.take(),null);
});
test('press, wait, then drag is left to the browser',()=>{
  const p=new LinkDragPolicy();p.begin(begin);
  assert.equal(p.canCancel(10.51,'a'),false);assert.equal(p.canCancel(11.2,'a'),false);
  const q=new LinkDragPolicy({quickSeconds:.2});q.begin(begin);assert.equal(q.canCancel(10.19,'a'),true);assert.equal(q.canCancel(10.21,'a'),false);
});
test('another control, time running backwards, a modifier key, and no press are never cancelled',()=>{
  const p=new LinkDragPolicy();assert.equal(p.canCancel(10.05,'a'),false);
  p.begin(begin);assert.equal(p.canCancel(10.05,'b'),false);assert.equal(p.canCancel(9.9,'a'),false);assert.equal(p.canCancel(NaN,'a'),false);
  p.bypass();assert.equal(p.canCancel(10.05,'a'),false);
  for(const bad of [{...begin,id:null},{...begin,id:undefined},{...begin,t:NaN},{...begin,x:undefined}]){const q=new LinkDragPolicy();q.begin(bad);assert.equal(q.press,null);}
});
test('abort forgets an ordinary press but keeps one whose drag was cancelled',()=>{
  const p=new LinkDragPolicy();p.begin(begin);p.abort();assert.equal(p.take(),null);
  p.begin(begin);p.markCancelled();p.abort();assert.equal(p.take().cancelled,true);
  p.begin(begin);p.markCancelled();p.begin({...begin,t:20,id:'b'});assert.equal(p.take().cancelled,false);
});
test('a press beside the target is remembered as near, and is cancelled on the same terms',()=>{
  const p=new LinkDragPolicy();p.begin({...begin,near:true});assert.equal(p.press.near,true);assert.equal(p.canCancel(10.1,'a'),true);
  const q=new LinkDragPolicy();q.begin(begin);assert.equal(q.press.near,false);assert.equal(q.canCancel(10.1,null),false);
});
test('the record keeps its own account of how far the press went and when it ended',()=>{
  const p=new LinkDragPolicy();p.begin(begin);assert.equal(p.press.maxDistance,0);assert.equal(p.press.upT,null);
  p.move(103,104);assert.equal(p.press.maxDistance,5);p.move(160,100);p.move(100,100);assert.equal(p.press.maxDistance,60,'the furthest point counts, not the last');
  p.move(NaN,100);assert.equal(p.press.maxDistance,60);
  p.release(10.4,100,180);assert.equal(p.press.maxDistance,80);assert.equal(p.press.upT,10.4);
  const q=new LinkDragPolicy();q.move(1,1);q.release(1,1,1);assert.equal(q.press,null,'nothing to track without a press');
});
