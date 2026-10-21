'use strict';
// Integration of the actual content controller and gesture policy with a small DOM adapter.
// This is explicitly a mocked environment, not a substitute for test:browser.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const S=require('../extension/core/selector.js'),P=require('../extension/core/policy.js'),Settings=require('../extension/core/settings.js'),Dwell=require('../extension/core/dwell.js'),LinkDrag=require('../extension/core/link-drag.js'),Jitter=require('../extension/core/jitter.js');
function harness(){
  const handlers=new Map(), timers=new Map(), clicks=[], elements=new Map(), rectangles=new Map();let index, clock=1000;
  class Element {
    constructor(id=null){this.id=id;this.style={};this.children=[];this.childNodes=[];this.shadowRoot=null;this.control=false;this.safe=true;this.sensitive=false;this.isConnected=true;}
    attachShadow(){return new Element();}appendChild(el){this.children.push(el);}setAttribute(){}contains(el){return el===this||this.children.includes(el);}matches(){return false;}focus(){}
    click(){clicks.push(this.id);dispatch('click',{target:this,isTrusted:false,detail:0});}remove(){}
  }
  const root=new Element(),background=new Element('background'),a=new Element('a'),b=new Element('b');a.control=true;b.control=true;
  elements.set('a',a);elements.set('b',b);rectangles.set('a',{id:'a',x:100,y:100,w:40,h:40});rectangles.set('b',{id:'b',x:180,y:100,w:40,h:40});
  const api={idFor:el=>el?.control?el.id:null,validate:(id,old)=>{const el=elements.get(id),rect=rectangles.get(id);return el?.isConnected&&el.safe&&(!old||D.sameRect(old,rect))?{el,rect}:null;},near:(x,y,r)=>[...rectangles.values()].filter(q=>S.distToRect(x,y,q)<=r).map(q=>({...q,risky:!elements.get(q.id).safe})),start(){},stop(){},invalidate(){},dispose(){},stats:{targets:2},rects:rectangles};
  const D={TargetIndex:class{constructor(){index=api;return api;}},actualControl:el=>el?.control?el:null,eligible:el=>!!el?.control&&el.safe&&el.isConnected,sensitive:el=>el?.sensitive??false,sameRect:(a,b)=>['x','y','w','h'].every(k=>a[k]===b[k])};
  // Listeners keep their phase. A dispatch runs capture listeners, then an optional page handler, then bubble listeners,
  // each read afresh when its phase starts, as a browser does.
  const phase=c=>c===true||c?.capture===true;
  const win={addEventListener(type,fn,capture){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push({fn,capture:phase(capture)});},
    removeEventListener(type,fn,capture){const list=handlers.get(type)||[],i=list.findIndex(h=>h.fn===fn&&h.capture===phase(capture));if(i>=0)list.splice(i,1);}};
  const document={documentElement:root,createElement:()=>new Element(),getSelection:()=>({isCollapsed:true}),caretRangeFromPoint:()=>null,hasFocus:()=>true,elementFromPoint:()=>background,addEventListener:win.addEventListener.bind(win),removeEventListener(){},hidden:false};
  const context={globalThis:null,window:win,document,Element,OpenSteadySelect:S,OpenSteadyPolicy:P,OpenSteadyDOM:D,OpenSteadySettings:Settings,OpenSteadyDwell:Dwell,OpenSteadyLinkDrag:LinkDrag,OpenSteadyJitter:Jitter,performance:{now:()=>clock},setInterval:(fn,ms)=>{timers.set(ms,fn);return ms;},clearInterval(){},setTimeout,clearTimeout};context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/content.js'),'utf8'),context);
  const controller=context.__openSteadyController;controller.configure({enabled:true});
  function dispatch(type,extra={},page=null){clock=extra.now??extra.timeStamp??clock;const event={isTrusted:true,timeStamp:clock,pointerType:'mouse',pointerId:1,button:0,buttons:0,clientX:92,clientY:120,detail:1,target:background,altKey:false,metaKey:false,ctrlKey:false,shiftKey:false,defaultPrevented:false,stopped:false,composedPath(){return[this.target];},preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const h of [...(handlers.get(type)||[])])if(h.capture)h.fn(event);if(page)page(event);for(const h of [...(handlers.get(type)||[])])if(!h.capture)h.fn(event);return event;}
  function preview(){for(let i=0;i<20;i++)dispatch('pointermove',{timeStamp:1000+i*10});}
  function gesture(down={},up={},click={}){dispatch('pointerdown',{timeStamp:1300,...down});dispatch('pointerup',{timeStamp:1380,...up});return dispatch('click',{timeStamp:1381,...click});}
  return{dispatch,preview,gesture,clicks,a,b,background,controller,index,document,rectangles,window:win,tick:(now)=>{clock=now;timers.get(40)();}};
}
test('controller redirects one trusted previewed near miss; synthetic events cannot opt in',()=>{
  const h=harness();h.preview();const e=h.gesture();assert.deepEqual(h.clicks,['a']);assert.ok(e.defaultPrevented&&e.stopped);
  const j=harness();j.preview();const synthetic=j.gesture({isTrusted:false},{isTrusted:false},{isTrusted:false});assert.equal(j.clicks.length,0);assert.equal(synthetic.defaultPrevented,false);
});
test('controller leaves a native click and modifier clicks unchanged',()=>{
  const h=harness();h.preview();const e=h.gesture({target:h.a,clientX:120},{target:h.a,clientX:120},{target:h.a,clientX:120});assert.equal(h.clicks.length,0);assert.equal(e.stopped,false);
  for(const modifier of ['altKey','metaKey','ctrlKey','shiftKey']){const j=harness();j.preview();const e=j.gesture({[modifier]:true},{[modifier]:true},{[modifier]:true});assert.equal(j.clicks.length,0);assert.equal(e.defaultPrevented,false);}
});
// A mocked selection. The browser says the character nearest the pointer is at offset `caret` of a
// ten-character text node, and that node's measured characters occupy `rect`. By default the whole node
// is selected. `from` and `to` select only part of it. `touches:false` puts the selection in other text.
// The state records whether the selection was cleared.
function selection(h,rect,state={cleared:false},part={}){
  const text={nodeType:3,length:10,data:'words word'},mark={};
  h.document.caretRangeFromPoint=()=>({startContainer:text,startOffset:part.caret??3});
  h.document.createRange=()=>{const r={a:0,b:0,setStart(n,o){r.a=o;},setEnd(n,o){r.b=o;},getClientRects:()=>r.b>r.a?[rect]:[]};return r;};
  const range={startContainer:part.from===undefined?mark:text,startOffset:part.from??0,endContainer:part.to===undefined?mark:text,endOffset:part.to??0,
    intersectsNode:n=>n===text&&part.touches!==false};
  const api=()=>state.cleared?{isCollapsed:true,rangeCount:0}:{isCollapsed:false,rangeCount:1,anchorNode:mark,anchorOffset:0,focusNode:mark,focusOffset:state.focusOffset??5,
    getRangeAt:()=>range,removeAllRanges(){state.cleared=true;}};
  h.document.getSelection=api;return{state,api};
}
// Shake the pointer just left of target a (which starts at x = 100), so the outline settles on a.
function shakeBeside(h){for(let i=0;i<=40;i++)h.dispatch('pointermove',{timeStamp:900+i*10,clientX:96+8*Math.sin(2*Math.PI*6*i/100),clientY:120});}
test('controller never delivers on a drag, a press on selected text, sensitive start, or lost focus',()=>{
  const h=harness();h.preview();h.dispatch('pointerdown',{timeStamp:1300});h.dispatch('pointermove',{timeStamp:1310,clientX:500,clientY:500,buttons:1});h.dispatch('pointerup',{timeStamp:1380});h.dispatch('click',{timeStamp:1381});assert.equal(h.clicks.length,0);
  const j=harness();j.preview();const under=selection(j,{left:80,right:98,top:110,bottom:130});j.gesture();assert.equal(j.clicks.length,0);assert.equal(under.state.cleared,false);
  const k=harness();k.preview();k.background.sensitive=true;k.gesture();assert.equal(k.clicks.length,0);
  const m=harness();m.preview();m.dispatch('pointerdown',{timeStamp:1300});m.dispatch('blur',{target:m.window});m.dispatch('pointerup',{timeStamp:1380});m.dispatch('click',{timeStamp:1381});assert.equal(m.clicks.length,0);
});
test('removed or moving targets and occluded adapter targets are not activated',()=>{
  for(const change of [h=>{h.a.isConnected=false;},h=>h.rectangles.set('a',{id:'a',x:140,y:100,w:40,h:40}),h=>{h.a.safe=false;}]){
    const h=harness();h.preview();h.dispatch('pointerdown',{timeStamp:1300});change(h);h.dispatch('pointerup',{timeStamp:1380});const e=h.dispatch('click',{timeStamp:1381});assert.equal(h.clicks.length,0);assert.equal(e.defaultPrevented,false);
  }
});
test('Escape pauses, configure resumes, and global off blocks assistance',()=>{
  const h=harness();h.preview();h.dispatch('keydown',{key:'Escape'});h.gesture();assert.equal(h.clicks.length,0);assert.equal(h.controller.status().paused,true);
  h.controller.configure({enabled:true},false);assert.equal(h.controller.status().paused,true);
  h.controller.configure({enabled:true});h.preview();h.gesture();assert.equal(h.clicks.length,1);
  h.controller.configure({enabled:false});h.preview();h.gesture();assert.equal(h.clicks.length,1);
});
test('small native slip is corrected and repeat guard stops the second click only',()=>{
  const h=harness();const first=h.gesture({target:h.a,clientX:102},{clientX:95},{clientX:95});assert.equal(first.stopped,true);assert.deepEqual(h.clicks,['a']);
  const j=harness();j.gesture({target:j.a,clientX:120},{target:j.a,clientX:120},{target:j.a,clientX:120});
  j.dispatch('pointerdown',{timeStamp:1450,target:j.a,clientX:120});j.dispatch('pointerup',{timeStamp:1490,target:j.a,clientX:120});const second=j.dispatch('click',{timeStamp:1491,target:j.a,clientX:120,detail:2});assert.equal(second.stopped,true);assert.equal(j.controller.status().counters.guarded,1);
});
test('Alt released outside the window cannot leave bypass stuck after blur',()=>{
  const h=harness();h.dispatch('keydown',{key:'Alt'});h.dispatch('blur',{target:h.window});h.preview();h.gesture();assert.deepEqual(h.clicks,['a']);
});
test('element blur during normal focus change must not cancel a near miss',()=>{
  const h=harness();h.preview();h.dispatch('pointerdown',{timeStamp:1300});h.dispatch('blur',{target:h.a});h.dispatch('pointerup',{timeStamp:1380});h.dispatch('click',{timeStamp:1381});assert.deepEqual(h.clicks,['a']);
});
test('delayed event timestamps cannot reset dwell acquisition between timer ticks',()=>{
  const h=harness();h.controller.configure({enabled:true,dwellEnabled:true,dwellMs:900});
  for(let i=0;i<180;i++){
    const now=1000+i*10;
    h.dispatch('pointermove',{now,timeStamp:now-20,clientX:92+Math.sin(i)*.2,clientY:120});
    if(i%4===0)h.tick(now+1);
  }
  assert.deepEqual(h.clicks,['a']);assert.equal(h.controller.status().counters.dwellClicks,1);
});
test('hold to click stops over selected text, and carries on when the selected text is somewhere else',()=>{
  const hover=setup=>{const h=harness();h.controller.configure({enabled:true,dwellEnabled:true,dwellMs:900});setup(h);
    for(let i=0;i<180;i++){const now=1000+i*10;h.dispatch('pointermove',{now,timeStamp:now,clientX:92+Math.sin(i)*.2,clientY:120});if(i%4===0)h.tick(now+1);}return h;};
  assert.deepEqual(hover(h=>selection(h,{left:400,right:520,top:300,bottom:318})).clicks,['a']);
  assert.equal(hover(h=>selection(h,{left:80,right:98,top:110,bottom:130})).clicks.length,0);
});
test('the quick drag guard is on by default, can be switched off, and preserves a valid native click',()=>{
  const d=harness();d.a.tagName='A';d.dispatch('pointerdown',{timeStamp:1300,target:d.a,clientX:120});
  assert.equal(d.dispatch('dragstart',{timeStamp:1320,target:d.a,clientX:130}).defaultPrevented,true);
  for(const enabled of [false,true]){
    const h=harness();h.a.tagName='A';h.controller.configure({enabled:true,dragGuard:enabled});
    h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:120});
    h.dispatch('pointermove',{timeStamp:1310,target:h.a,clientX:130,buttons:1});
    const drag=h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:130});
    assert.equal(drag.defaultPrevented,enabled);
    h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:120});const click=h.dispatch('click',{timeStamp:1381,target:h.a,clientX:120});
    assert.equal(click.defaultPrevented,false);assert.equal(h.controller.status().counters.preservedLinkClicks,enabled?1:0);
  }
});
test('after a prevented link drag, a large returning drag cannot induce activation',()=>{
  const h=harness();h.a.tagName='A';h.controller.configure({enabled:true,dragGuard:true});
  h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:120});h.dispatch('dragstart',{timeStamp:1310,target:h.a,clientX:130});
  h.dispatch('pointermove',{timeStamp:1320,clientX:500,buttons:1});h.dispatch('pointermove',{timeStamp:1340,target:h.a,clientX:120,buttons:1});
  h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:120});const e=h.dispatch('click',{timeStamp:1381,target:h.a,clientX:120});
  assert.equal(e.stopped,true);assert.equal(h.controller.status().counters.rejectedLinkClicks,1);
});
test('selected text elsewhere on the page does not switch assistance off',()=>{
  const h=harness();h.preview();const far=selection(h,{left:400,right:520,top:300,bottom:318});
  h.gesture();assert.deepEqual(h.clicks,['a']);assert.equal(far.state.cleared,false,'a selection that was already there is left alone');
  // Selected text that is not the text under the pointer is never measured, wherever its rectangle is said to be.
  const j=harness();j.preview();selection(j,{left:80,right:98,top:110,bottom:130},{cleared:false},{touches:false});
  j.gesture();assert.deepEqual(j.clicks,['a']);assert.equal(j.controller.status().lastPress.blockedBySelection,false);
  // Only part of the text under the pointer is selected, and the pointer is on the part that is not.
  const k=harness();k.preview();selection(k,{left:80,right:98,top:110,bottom:130},{cleared:false},{from:0,to:2,caret:6});
  k.gesture();assert.deepEqual(k.clicks,['a']);assert.equal(k.controller.status().lastPress.blockedBySelection,false);
  // The same partial selection with the pointer on the selected part does block a steady press.
  const m=harness();m.preview();selection(m,{left:80,right:98,top:110,bottom:130},{cleared:false},{from:0,to:8,caret:6});
  m.gesture();assert.equal(m.clicks.length,0);assert.equal(m.controller.status().lastPress.blockedBySelection,true);
  // A browser that cannot say which character is under the pointer: any selection is treated as in the way.
  const n=harness();n.preview();selection(n,{left:400,right:520,top:300,bottom:318});n.document.caretRangeFromPoint=undefined;
  n.gesture();assert.equal(n.clicks.length,0);assert.equal(n.controller.status().lastPress.blockedBySelection,true);
});
test('text selected by a shaking press is removed when that press is delivered; a steady press that selects text is a selection',()=>{
  // Shaking hand: the selection the press made is part of the slip. It is removed and the click is delivered.
  const h=harness();shakeBeside(h);const made=selection(h,{left:300,right:360,top:300,bottom:318},{cleared:true});
  h.dispatch('pointerdown',{timeStamp:1300,clientX:96});made.state.cleared=false;
  h.dispatch('pointerup',{timeStamp:1380,clientX:96});h.dispatch('click',{timeStamp:1381,clientX:96});
  assert.deepEqual(h.clicks,['a']);assert.equal(made.state.cleared,true);
  // Steady hand: a press beside the target that selects text is someone selecting text. Nothing is clicked.
  const st=harness();st.preview();const own=selection(st,{left:300,right:360,top:300,bottom:318},{cleared:true});
  st.dispatch('pointerdown',{timeStamp:1300});own.state.cleared=false;
  st.dispatch('pointerup',{timeStamp:1380});const e=st.dispatch('click',{timeStamp:1381});
  assert.equal(st.clicks.length,0);assert.equal(e.stopped,false);assert.equal(own.state.cleared,false);
  assert.equal(st.controller.status().lastDecision.ruledOut,'press-selected-text');
  // A selection that was already there and did not change is not "made by the press".
  const pre=harness();pre.preview();const old=selection(pre,{left:300,right:360,top:300,bottom:318});
  pre.gesture();assert.deepEqual(pre.clicks,['a']);assert.equal(old.state.cleared,false);
  // A real drag by a shaking hand keeps the text it selected.
  const j=harness();shakeBeside(j);const kept=selection(j,{left:300,right:360,top:300,bottom:318},{cleared:true});
  j.dispatch('pointerdown',{timeStamp:1300,clientX:96});kept.state.cleared=false;j.dispatch('pointermove',{timeStamp:1310,clientX:500,buttons:1});
  j.dispatch('pointerup',{timeStamp:1380,clientX:500});j.dispatch('click',{timeStamp:1381,clientX:500});
  assert.equal(j.clicks.length,0);assert.equal(kept.state.cleared,false,'a real drag keeps the text it selected');
});
test('a press on selected text inside a link or button is still treated as a click on it',()=>{
  const h=harness();selection(h,{left:100,right:140,top:100,bottom:140});
  const e=h.gesture({target:h.a,clientX:102},{clientX:95},{clientX:95});assert.equal(e.stopped,true);assert.deepEqual(h.clicks,['a']);
});
// Shake the pointer on target a for 0.4 s at 6 Hz, so the meter has something to measure.
function shake(h,amplitude){for(let i=0;i<=40;i++)h.dispatch('pointermove',{timeStamp:900+i*10,target:h.a,clientX:120+amplitude*Math.sin(2*Math.PI*6*i/100),clientY:120});}
test('a wide slip is rescued only when shake was measured just before the press',()=>{
  const wide=h=>h.gesture({target:h.a,clientX:132},{clientX:148},{clientX:148});
  const shaky=harness();shake(shaky,10);const e=wide(shaky);
  assert.deepEqual(shaky.clicks,['a']);assert.equal(e.stopped,true);
  const press=shaky.controller.status().lastPress;assert.ok(press.shakePx>4&&press.shakePx<9,JSON.stringify(press));assert.ok(press.slipLimitPx>16&&press.slipLimitPx<=27);
  const steady=harness();for(let i=0;i<=40;i++)steady.dispatch('pointermove',{timeStamp:900+i*10,target:steady.a,clientX:120,clientY:120});
  const f=wide(steady);assert.equal(steady.clicks.length,0);assert.equal(f.stopped,false);assert.equal(steady.controller.status().lastPress.slipLimitPx,12);
});
test('a shaky press that goes too far, lasts too long, or lands on another control natively is left alone',()=>{
  const far=harness();shake(far,10);far.gesture({target:far.a,clientX:132},{clientX:190},{clientX:190});assert.equal(far.clicks.length,0);
  const slow=harness();shake(slow,10);slow.dispatch('pointerdown',{timeStamp:1300,target:slow.a,clientX:132});slow.dispatch('pointerup',{timeStamp:2000,clientX:148});slow.dispatch('click',{timeStamp:2001,clientX:148});assert.equal(slow.clicks.length,0);
  // The outline is on a, and the press and release are both on b: b's own click stands and nothing goes to a.
  const other=harness();shake(other,10);assert.equal(other.controller.status().outlineReady,true);
  const e=other.gesture({target:other.b,clientX:185},{target:other.b,clientX:190},{target:other.b,clientX:190});assert.equal(other.clicks.length,0);assert.equal(e.stopped,false);
});
test('press, wait, then drag is left to the browser; so is a drag with a modifier key',()=>{
  const h=harness();h.a.tagName='A';h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:120});
  const late=h.dispatch('dragstart',{timeStamp:2000,target:h.a,clientX:130});assert.equal(late.defaultPrevented,false);assert.equal(h.controller.status().counters.preventedLinkDrags,0);
  const j=harness();j.a.tagName='A';j.dispatch('pointerdown',{timeStamp:1300,target:j.a,clientX:120});
  assert.equal(j.dispatch('dragstart',{timeStamp:1320,target:j.a,clientX:130,shiftKey:true}).defaultPrevented,false);
});
test('a quick drag from a button is cancelled too, and a cancelled drag released off the control becomes a slip click',()=>{
  const h=harness();h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:102});
  assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:104}).defaultPrevented,true);
  h.dispatch('pointerup',{timeStamp:1380,clientX:95});const e=h.dispatch('click',{timeStamp:1381,clientX:95});
  assert.deepEqual(h.clicks,['a']);assert.equal(e.stopped,true);assert.equal(h.controller.status().counters.rejectedLinkClicks,0);
});
test('a quick drag is not cancelled on a control that is not eligible for assistance',()=>{
  const h=harness();h.a.safe=false;h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:120});
  assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:130}).defaultPrevented,false);
});
test('a quick drag is left alone when the outline was on a different target than the one pressed',()=>{
  const h=harness();h.a.tagName='A';for(let i=0;i<20;i++)h.dispatch('pointermove',{timeStamp:1000+i*10,clientX:175,clientY:120});
  assert.equal(h.controller.status().outlineReady,true);
  h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:120});
  assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:130}).defaultPrevented,false);
  assert.equal(h.controller.status().counters.preventedLinkDrags,0);
});
test('beside the outlined target, a quick drag is cancelled only for a shaking hand, and never when it starts on a control',()=>{
  const near=h=>{h.dispatch('pointerdown',{timeStamp:1300,clientX:96});return h.dispatch('dragstart',{timeStamp:1320,clientX:97});};
  const steady=harness();for(let i=0;i<20;i++)steady.dispatch('pointermove',{timeStamp:1000+i*10,clientX:96});
  assert.equal(steady.controller.status().outlineReady,true);assert.equal(near(steady).defaultPrevented,false);
  const shaky=harness();shakeBeside(shaky);assert.equal(shaky.controller.status().outlineReady,true);
  assert.equal(near(shaky).defaultPrevented,true);
  shaky.dispatch('pointerup',{timeStamp:1380,clientX:99});const e=shaky.dispatch('click',{timeStamp:1381,clientX:99});
  assert.deepEqual(shaky.clicks,['a']);assert.equal(e.stopped,true);
  const onOther=harness();shakeBeside(onOther);onOther.dispatch('pointerdown',{timeStamp:1300,clientX:96});
  assert.equal(onOther.dispatch('dragstart',{timeStamp:1320,target:onOther.b,clientX:97}).defaultPrevented,false);
  const sensitive=harness();shakeBeside(sensitive);sensitive.dispatch('pointerdown',{timeStamp:1300,clientX:96});
  const field=new sensitive.background.constructor('field');field.sensitive=true;
  assert.equal(sensitive.dispatch('dragstart',{timeStamp:1320,target:field,clientX:97}).defaultPrevented,false);
  const late=harness();shakeBeside(late);late.dispatch('pointerdown',{timeStamp:1300,clientX:96});
  assert.equal(late.dispatch('dragstart',{timeStamp:2000,clientX:97}).defaultPrevented,false);
});
test('for a shaking hand, a press on selected text beside the outlined target is still delivered',()=>{
  const h=harness();shakeBeside(h);selection(h,{left:80,right:99,top:110,bottom:130});
  h.gesture({clientX:96},{clientX:96},{clientX:96});assert.deepEqual(h.clicks,['a']);
  assert.equal(h.controller.status().lastPress.blockedBySelection,false);
  const steady=harness();for(let i=0;i<20;i++)steady.dispatch('pointermove',{timeStamp:1000+i*10,clientX:96});
  selection(steady,{left:80,right:99,top:110,bottom:130});
  steady.gesture({clientX:96},{clientX:96},{clientX:96});assert.equal(steady.clicks.length,0);
  assert.equal(steady.controller.status().lastPress.blockedBySelection,true);
});
// ---- Added after the independent review of 0.1.4 ----
const linkPress=(h,x=120)=>{h.a.tagName='A';h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:x});};
test('a page that cancels the drag itself is left alone: its click is never stopped, however far the press goes',()=>{
  // Without the extension this page gets a click, because it prevents the drag. The guard must not change that.
  const h=harness();linkPress(h);
  const drag=h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124,defaultPrevented:true});
  assert.equal(drag.defaultPrevented,true);assert.equal(h.controller.status().counters.preventedLinkDrags,0,'the guard did not act');
  h.dispatch('pointermove',{timeStamp:1340,target:h.a,clientX:200,buttons:1});
  h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:200});const click=h.dispatch('click',{timeStamp:1381,target:h.a,clientX:200});
  assert.equal(click.stopped,false);assert.equal(h.clicks.length,0);assert.equal(h.controller.status().counters.rejectedLinkClicks,0);
  // The same page with a long hold.
  const j=harness();linkPress(j);j.dispatch('dragstart',{timeStamp:1320,target:j.a,clientX:124,defaultPrevented:true});
  j.dispatch('pointerup',{timeStamp:2800,target:j.a,clientX:124});
  assert.equal(j.dispatch('click',{timeStamp:2801,target:j.a,clientX:124}).stopped,false);
});
test('after a cancelled drag, a scroll or lost focus during the press does not cost the click',()=>{
  for(const interruption of ['scroll','wheel']){
    const h=harness();linkPress(h);assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124}).defaultPrevented,true);
    h.dispatch(interruption,{timeStamp:1330});
    h.dispatch('pointermove',{timeStamp:1340,target:h.a,clientX:128,buttons:1});
    h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:128});const click=h.dispatch('click',{timeStamp:1381,target:h.a,clientX:128});
    assert.equal(click.stopped,false,interruption);assert.equal(h.controller.status().counters.preservedLinkClicks,1,interruption);
  }
  // The interruption does not excuse a press that went too far: that is still a drag, and nothing is clicked.
  const far=harness();linkPress(far);far.dispatch('dragstart',{timeStamp:1320,target:far.a,clientX:124});far.dispatch('scroll',{timeStamp:1330});
  far.dispatch('pointermove',{timeStamp:1340,clientX:300,buttons:1});far.dispatch('pointermove',{timeStamp:1360,target:far.a,clientX:124,buttons:1});
  far.dispatch('pointerup',{timeStamp:1380,target:far.a,clientX:124});
  assert.equal(far.dispatch('click',{timeStamp:1381,target:far.a,clientX:124}).stopped,true);assert.equal(far.controller.status().counters.rejectedLinkClicks,1);
  // Nor one that lasted too long.
  const slow=harness();linkPress(slow);slow.dispatch('dragstart',{timeStamp:1320,target:slow.a,clientX:124});slow.dispatch('scroll',{timeStamp:1330});
  slow.dispatch('pointerup',{timeStamp:2800,target:slow.a,clientX:124});
  assert.equal(slow.dispatch('click',{timeStamp:2801,target:slow.a,clientX:124}).stopped,true);
});
test('after a cancelled drag that went too far, a plain mouse click is stopped wherever it lands; modifier and keyboard clicks are not',()=>{
  const tooFar=h=>{linkPress(h);h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124});h.dispatch('pointermove',{timeStamp:1340,clientX:300,buttons:1});};
  // Without the guard the browser would have dragged and sent no click anywhere, so none is let through.
  const other=harness();tooFar(other);other.dispatch('pointerup',{timeStamp:1380,target:other.b,clientX:190});
  assert.equal(other.dispatch('click',{timeStamp:1381,target:other.b,clientX:190}).stopped,true);assert.equal(other.controller.status().counters.rejectedLinkClicks,1);
  const empty=harness();tooFar(empty);empty.dispatch('pointerup',{timeStamp:1380,clientX:300});
  assert.equal(empty.dispatch('click',{timeStamp:1381,clientX:300}).stopped,true);
  // A modifier key went down during the press: the click is left to the browser, as the popup says.
  const mod=harness();tooFar(mod);mod.dispatch('pointerup',{timeStamp:1380,target:mod.a,clientX:124,ctrlKey:true});
  assert.equal(mod.dispatch('click',{timeStamp:1381,target:mod.a,clientX:124,ctrlKey:true}).stopped,false);
  // A keyboard click on the same link is never stopped.
  const key=harness();tooFar(key);assert.equal(key.dispatch('click',{timeStamp:1400,target:key.a,detail:0}).stopped,false);
  assert.equal(key.controller.status().counters.rejectedLinkClicks,0);
});
test('after a cancelled drag, a click that reaches a control containing the pressed one is not that control\'s click',()=>{
  // The browser sends the click to the innermost element containing both press and release. Here that is a card
  // (a control) that contains link a. Without the guard there would have been a drag and no click.
  const card=h=>{const c=new h.background.constructor('card');c.control=true;return c;};
  // A slip of 8 px off the link onto the card, with the outline on the link: the link gets the click, the card does not.
  const h=harness();for(let i=0;i<20;i++)h.dispatch('pointermove',{timeStamp:1000+i*10,target:h.a,clientX:136});linkPress(h,136);
  assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:139}).defaultPrevented,true);
  const c=card(h);h.dispatch('pointermove',{timeStamp:1340,target:c,clientX:144,buttons:1});h.dispatch('pointerup',{timeStamp:1380,target:c,clientX:144});
  const e=h.dispatch('click',{timeStamp:1381,target:c,clientX:144});
  assert.equal(e.stopped,true,'the card does not receive the click');assert.deepEqual(h.clicks,['a'],'the link does');
  // The same slip released on the card after the gesture was reset by a scroll: stopped, and nothing is clicked.
  const j=harness();linkPress(j);j.dispatch('dragstart',{timeStamp:1320,target:j.a,clientX:124});j.dispatch('scroll',{timeStamp:1330});
  const d=card(j);j.dispatch('pointerup',{timeStamp:1380,target:d,clientX:128});
  assert.equal(j.dispatch('click',{timeStamp:1381,target:d,clientX:128}).stopped,true);assert.equal(j.clicks.length,0);
  // No outline agreement (outline elsewhere): the card's click is still stopped, and nothing is clicked.
  const k=harness();linkPress(k);k.dispatch('dragstart',{timeStamp:1320,target:k.a,clientX:124});
  const f=card(k);k.dispatch('pointermove',{timeStamp:1340,target:f,clientX:128,buttons:1});k.dispatch('pointerup',{timeStamp:1380,target:f,clientX:128});
  assert.equal(k.dispatch('click',{timeStamp:1381,target:f,clientX:128}).stopped,true);assert.equal(k.clicks.length,0);
  assert.equal(k.controller.status().counters.rejectedLinkClicks,1);
});
test('a page listener on the window that cancels the drag is seen, even one added after the extension',()=>{
  const h=harness();h.window.addEventListener('dragstart',e=>e.preventDefault(),false);linkPress(h);
  h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124});assert.equal(h.controller.status().counters.preventedLinkDrags,0);
  h.dispatch('pointermove',{timeStamp:1340,target:h.a,clientX:200,buttons:1});h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:200});
  assert.equal(h.dispatch('click',{timeStamp:1381,target:h.a,clientX:200}).stopped,false,'the page expects its click');
  // A handler on the element itself (between the extension's two listeners) is seen too.
  const j=harness();linkPress(j);j.dispatch('dragstart',{timeStamp:1320,target:j.a,clientX:124},e=>e.preventDefault());
  assert.equal(j.controller.status().counters.preventedLinkDrags,0);
  // Without any page handler the guard acts, once.
  const k=harness();linkPress(k);assert.equal(k.dispatch('dragstart',{timeStamp:1320,target:k.a,clientX:124}).defaultPrevented,true);
  assert.equal(k.controller.status().counters.preventedLinkDrags,1);
});
test('a drag is cancelled only while the target is still where it was, and never when it starts on something marked draggable',()=>{
  const moved=harness();linkPress(moved);moved.rectangles.set('a',{id:'a',x:100,y:160,w:40,h:40});
  assert.equal(moved.dispatch('dragstart',{timeStamp:1320,target:moved.a,clientX:124}).defaultPrevented,false);
  // A handle marked draggable inside the pressed link belongs to the same control but is the page's own drag.
  const h=harness();linkPress(h);const handle=new h.background.constructor('a');handle.control=true;handle.sensitive=true;
  assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:handle,clientX:124}).defaultPrevented,false);
  assert.equal(h.controller.status().counters.preventedLinkDrags,0);
  // A drag of selected text starts on a text node. Its parent element decides.
  const text=harness();linkPress(text);assert.equal(text.dispatch('dragstart',{timeStamp:1320,target:{parentElement:text.a},clientX:124}).defaultPrevented,true);
});
test('a control nested inside the pressed control: the browser\'s own trusted click is kept',()=>{
  // Press on a, release on something nested in a. The browser's click already lands on a.
  const h=harness();for(let i=0;i<20;i++)h.dispatch('pointermove',{timeStamp:1000+i*10,target:h.a,clientX:120});
  const inner=new h.background.constructor('inner');inner.control=true;
  const e=h.gesture({target:h.a,clientX:120},{target:inner,clientX:129},{target:h.a,clientX:129});
  assert.equal(e.stopped,false);assert.equal(h.clicks.length,0,'no synthetic click replaces it');
});
test('for a steady hand the release must also be within the radius; measured shake widens that by the same amount as the press limit',()=>{
  // Outline on a (hover 8 px left of it), press 22 px left of it, release 28 px left of it: 6 px of travel.
  const steady=harness();steady.preview();
  steady.gesture({clientX:78},{clientX:72},{clientX:72});
  assert.equal(steady.clicks.length,0);assert.equal(steady.controller.status().lastDecision.ruledOut,'release-too-far-from-target');
  // Released 23 px away instead: inside the radius, delivered.
  const inside=harness();inside.preview();inside.gesture({clientX:78},{clientX:77},{clientX:77});assert.deepEqual(inside.clicks,['a']);
  // The same far release after measured shake is delivered.
  const shaky=harness();shakeBeside(shaky);shaky.gesture({clientX:78},{clientX:72},{clientX:72});
  assert.deepEqual(shaky.clicks,['a'],JSON.stringify(shaky.controller.status().lastPress));
});
test('measured shake is forgotten after a scroll, and is not gathered during a press or while assistance is off',()=>{
  const wide=h=>h.gesture({target:h.a,clientX:132},{clientX:148},{clientX:148});
  const scrolled=harness();shake(scrolled,10);scrolled.dispatch('scroll',{timeStamp:1295});wide(scrolled);
  assert.equal(scrolled.clicks.length,0);assert.equal(scrolled.controller.status().lastPress.slipLimitPx,12);
  // Wild movement with the button held (here during a press left to the browser) is not hand shake.
  const held=harness();for(let i=0;i<=40;i++)held.dispatch('pointermove',{timeStamp:600+i*10,target:held.a,clientX:120,clientY:120});
  held.dispatch('pointerdown',{timeStamp:1010,target:held.a,clientX:120,shiftKey:true});
  for(let i=0;i<28;i++)held.dispatch('pointermove',{timeStamp:1020+i*10,target:held.a,clientX:120+10*Math.sin(2*Math.PI*6*i/100),clientY:120,buttons:1});
  held.dispatch('pointerup',{timeStamp:1298,target:held.a,clientX:120});wide(held);
  assert.equal(held.controller.status().lastPress.slipLimitPx,12);assert.equal(held.clicks.length,0);
  // Paused with Escape: nothing is gathered, so a press straight after resuming has no shake to go on.
  const paused=harness();paused.dispatch('keydown',{key:'Escape'});shake(paused,10);paused.controller.configure({enabled:true});wide(paused);
  assert.equal(paused.controller.status().lastPress.slipLimitPx,12);
});
test('an internal error fails open, and the third one pauses assistance on the page',()=>{
  const h=harness();h.preview();const near=h.index.near;h.index.near=()=>{throw new Error('boom');};
  for(let i=0;i<3;i++)h.dispatch('pointermove',{timeStamp:1200+i*10});
  const status=h.controller.status();assert.equal(status.counters.errors,3);assert.equal(status.paused,true);assert.equal(status.enabled,false);
  h.index.near=near;h.preview();const e=h.gesture();assert.equal(h.clicks.length,0);assert.equal(e.stopped,false,'clicks pass through untouched while paused');
});
test('a steady press on a link that happens to select some of its text is still that link\'s click',()=>{
  // After the guard cancels a drag, the browser may select text as the pointer moves. On a control that is not a text selection.
  const h=harness();linkPress(h);const made=selection(h,{left:100,right:140,top:100,bottom:140},{cleared:true});
  assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124}).defaultPrevented,true);made.state.cleared=false;
  h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:126});const click=h.dispatch('click',{timeStamp:1381,target:h.a,clientX:126});
  assert.equal(click.stopped,false);assert.equal(h.controller.status().counters.preservedLinkClicks,1);assert.equal(h.controller.status().counters.rejectedLinkClicks,0);
});
test('a steady slip off a button is still rescued when the slip selected some text, and that text is deselected',()=>{
  const h=harness();const made=selection(h,{left:300,right:360,top:300,bottom:318},{cleared:true});
  h.dispatch('pointerdown',{timeStamp:1300,target:h.a,clientX:102});made.state.cleared=false;
  h.dispatch('pointerup',{timeStamp:1380,clientX:95});const e=h.dispatch('click',{timeStamp:1381,clientX:95});
  assert.deepEqual(h.clicks,['a']);assert.equal(e.stopped,true);assert.equal(made.state.cleared,true);
});
test('no pointer positions are kept for the shake measurement while assistance is paused or switched off',()=>{
  const add=Jitter.JitterMeter.prototype.add;let calls=0;Jitter.JitterMeter.prototype.add=function(...args){calls++;return add.apply(this,args);};
  try{
    const h=harness();h.preview();assert.ok(calls>0,'positions are gathered while assistance is on');
    h.dispatch('keydown',{key:'Escape'});calls=0;for(let i=0;i<20;i++)h.dispatch('pointermove',{timeStamp:1300+i*10});assert.equal(calls,0,'paused');
    h.controller.configure({enabled:false});for(let i=0;i<20;i++)h.dispatch('pointermove',{timeStamp:1600+i*10});assert.equal(calls,0,'switched off');
  }finally{Jitter.JitterMeter.prototype.add=add;}
});
test('a scroll or a pointer capture during a press cancels the correction',()=>{
  for(const interruption of ['scroll','gotpointercapture','wheel']){
    const h=harness();h.preview();h.dispatch('pointerdown',{timeStamp:1300});h.dispatch(interruption,{timeStamp:1320});
    h.dispatch('pointerup',{timeStamp:1380});const e=h.dispatch('click',{timeStamp:1381});
    assert.equal(h.clicks.length,0,interruption);assert.equal(e.stopped,false,interruption);
  }
});
// Mild shake just left of target a: reads about 3 px, so the press limit stays at 12 px but the hand is not steady.
function shakeMildBeside(h){for(let i=0;i<=40;i++)h.dispatch('pointermove',{timeStamp:900+i*10,clientX:96+4.5*Math.sin(2*Math.PI*6*i/100),clientY:120});}
test('a mild tremor (not steady, limit still 12 px) gets help on text: a press that selects text, or lands on selected text, is a near miss',()=>{
  const h=harness();shakeMildBeside(h);const made=selection(h,{left:300,right:360,top:300,bottom:318},{cleared:true});
  h.dispatch('pointerdown',{timeStamp:1300,clientX:96});made.state.cleared=false;
  const press=h.controller.status().lastPress;assert.ok(press.shakePx>=2&&press.shakePx<4,JSON.stringify(press));assert.equal(press.slipLimitPx,12);assert.equal(press.steady,false);
  h.dispatch('pointerup',{timeStamp:1380,clientX:97});h.dispatch('click',{timeStamp:1381,clientX:97});
  assert.deepEqual(h.clicks,['a']);assert.equal(made.state.cleared,true,'the letters the slip selected are deselected');
  const j=harness();shakeMildBeside(j);selection(j,{left:80,right:99,top:110,bottom:130});
  j.gesture({clientX:96},{clientX:96},{clientX:96});assert.deepEqual(j.clicks,['a']);assert.equal(j.controller.status().lastPress.blockedBySelection,false);
  // A quick drag of the selected text beside the target is cancelled for this hand too.
  const k=harness();shakeMildBeside(k);k.dispatch('pointerdown',{timeStamp:1300,clientX:96});
  assert.equal(k.dispatch('dragstart',{timeStamp:1320,clientX:97}).defaultPrevented,true);
});
test('a selection that holds no visible text is not counted as the press selecting text',()=>{
  const h=harness();h.preview();const made=selection(h,{left:300,right:360,top:300,bottom:318},{cleared:true});
  h.dispatch('pointerdown',{timeStamp:1300});made.state.cleared=false;
  const api=h.document.getSelection;h.document.getSelection=()=>{const s=api();s.toString=()=>'\n';return s;};
  h.dispatch('pointerup',{timeStamp:1380});h.dispatch('click',{timeStamp:1381});assert.deepEqual(h.clicks,['a']);
});
test('the selected-text check measures the characters on both sides of the caret, and nothing else',()=>{
  // Letters 0 to 3 are selected and the pointer is on the right half of letter 3, so the caret is after it, at 4.
  const right=harness();right.preview();selection(right,{left:80,right:98,top:110,bottom:130},{cleared:false},{from:0,to:4,caret:4});
  right.gesture();assert.equal(right.controller.status().lastPress.blockedBySelection,true);assert.equal(right.clicks.length,0);
  // The caret is in something that is not text (between elements): not on selected text.
  const el=harness();el.preview();selection(el,{left:80,right:98,top:110,bottom:130});el.document.caretRangeFromPoint=()=>({startContainer:el.a,startOffset:0});
  el.gesture();assert.equal(el.controller.status().lastPress.blockedBySelection,false);assert.deepEqual(el.clicks,['a']);
  // A text node of more than a million characters is not measured at all: it is assumed to be in the way.
  const big=harness();big.preview();const huge={nodeType:3,length:2000000};
  big.document.getSelection=()=>({isCollapsed:false,rangeCount:1,anchorNode:huge,anchorOffset:0,focusNode:huge,focusOffset:9,
    getRangeAt:()=>({startContainer:huge,startOffset:0,endContainer:huge,endOffset:2000000,intersectsNode:n=>n===huge}),removeAllRanges(){}});
  big.document.caretRangeFromPoint=()=>({startContainer:huge,startOffset:500});big.document.createRange=()=>{throw new Error('measured a giant text node');};
  big.gesture();const st=big.controller.status();assert.equal(st.lastPress.blockedBySelection,true);assert.equal(st.counters.errors,0);
});
test('if the target fails its last check, the selection is left as it was and nothing is clicked',()=>{
  const h=harness();shakeBeside(h);const made=selection(h,{left:300,right:360,top:300,bottom:318},{cleared:true});
  h.dispatch('pointerdown',{timeStamp:1300,clientX:96});made.state.cleared=false;h.dispatch('pointerup',{timeStamp:1380,clientX:96});
  // Focusing the target makes the page move it.
  h.a.focus=()=>h.rectangles.set('a',{id:'a',x:100,y:300,w:40,h:40});
  const e=h.dispatch('click',{timeStamp:1381,clientX:96});
  assert.equal(h.clicks.length,0);assert.equal(made.state.cleared,false);assert.equal(e.stopped,false);
});
test('after a cancelled drag, losing window focus during the press does not cost the click',()=>{
  const h=harness();linkPress(h);assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124}).defaultPrevented,true);
  h.dispatch('blur',{timeStamp:1330,target:h.window});h.dispatch('pointerup',{timeStamp:1380,target:h.a,clientX:126});
  assert.equal(h.dispatch('click',{timeStamp:1381,target:h.a,clientX:126}).stopped,false);assert.equal(h.controller.status().counters.preservedLinkClicks,1);
});
test('after a cancelled drag, a container that only has a script listening for clicks gets no click either',()=>{
  // A card around the link that is not marked as a control in any way: the extension does not see it as one.
  const plainCard=h=>new h.background.constructor('script-card');
  // Released 20 px away on the card: more than a steady hand's 12 px, so not a slip. Without the guard: a drag, no click.
  const h=harness();linkPress(h);assert.equal(h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:124}).defaultPrevented,true);
  const c=plainCard(h);h.dispatch('pointermove',{timeStamp:1340,target:c,clientX:140,buttons:1});h.dispatch('pointerup',{timeStamp:1380,target:c,clientX:140});
  const e=h.dispatch('click',{timeStamp:1381,target:c,clientX:140});assert.equal(e.stopped,true);assert.equal(h.clicks.length,0);
  assert.equal(h.controller.status().lastDecision.reason,'stray-click-after-cancelled-drag');
  // An 8 px slip onto the same card, with the outline on the link, still goes to the link.
  const j=harness();for(let i=0;i<20;i++)j.dispatch('pointermove',{timeStamp:1000+i*10,target:j.a,clientX:136});linkPress(j,136);
  j.dispatch('dragstart',{timeStamp:1320,target:j.a,clientX:139});const d=plainCard(j);
  j.dispatch('pointermove',{timeStamp:1340,target:d,clientX:144,buttons:1});j.dispatch('pointerup',{timeStamp:1380,target:d,clientX:144});
  assert.equal(j.dispatch('click',{timeStamp:1381,target:d,clientX:144}).stopped,true);assert.deepEqual(j.clicks,['a']);
});
test('a page that cancelled the drag before the extension saw it: the press carries on as an ordinary press',()=>{
  // A 7 px slip off link a, on a page whose own earlier listener cancels every drag. The slip is still corrected.
  const h=harness();for(let i=0;i<20;i++)h.dispatch('pointermove',{timeStamp:1000+i*10,target:h.a,clientX:102});linkPress(h,102);
  h.dispatch('dragstart',{timeStamp:1320,target:h.a,clientX:104,defaultPrevented:true});
  assert.equal(h.controller.status().counters.preventedLinkDrags,0);
  h.dispatch('pointermove',{timeStamp:1340,clientX:95,buttons:1});h.dispatch('pointerup',{timeStamp:1380,clientX:95});
  h.dispatch('click',{timeStamp:1381,clientX:95});assert.deepEqual(h.clicks,['a']);
});
test('a selection inside one text node is checked for visible text without converting the whole selection',()=>{
  // Only spaces were selected: that is not a text selection, so the steady near miss is corrected.
  const blank=harness();blank.preview();const t={nodeType:3,length:9,data:'ab    cd '};const mark={};let marks=0;
  blank.document.getSelection=()=>marks===0?{isCollapsed:true,rangeCount:0}:{isCollapsed:false,rangeCount:1,anchorNode:t,anchorOffset:2,focusNode:t,focusOffset:6,
    getRangeAt:()=>({startContainer:t,startOffset:2,endContainer:t,endOffset:6,intersectsNode:()=>false}),toString(){throw new Error('converted the whole selection');},removeAllRanges(){}};
  blank.dispatch('pointerdown',{timeStamp:1300});marks=1;blank.dispatch('pointerup',{timeStamp:1380});blank.dispatch('click',{timeStamp:1381});
  assert.deepEqual(blank.clicks,['a']);assert.equal(blank.controller.status().counters.errors,0);
  // Two letters were selected: a steady hand selecting text. Nothing is clicked.
  const word=harness();word.preview();let on=0;
  word.document.getSelection=()=>on===0?{isCollapsed:true,rangeCount:0}:{isCollapsed:false,rangeCount:1,anchorNode:t,anchorOffset:0,focusNode:t,focusOffset:2,
    getRangeAt:()=>({startContainer:t,startOffset:0,endContainer:t,endOffset:2,intersectsNode:()=>false}),toString(){throw new Error('converted the whole selection');},removeAllRanges(){}};
  word.dispatch('pointerdown',{timeStamp:1300});on=1;word.dispatch('pointerup',{timeStamp:1380});word.dispatch('click',{timeStamp:1381});
  assert.equal(word.clicks.length,0);assert.equal(word.controller.status().lastDecision.ruledOut,'press-selected-text');
});
test('whenever the page cancels a drag, early or late, the press carries on; a drag that really starts ends it',()=>{
  // A steady near miss on a picture beside the target. The guard does not act for a steady hand beside the target.
  const nearMiss=(page,setup=h=>{})=>{const h=harness();setup(h);h.preview();h.dispatch('pointerdown',{timeStamp:1300});
    h.dispatch('dragstart',{timeStamp:1310,clientX:93},page);h.dispatch('pointerup',{timeStamp:1380});h.dispatch('click',{timeStamp:1381});return h;};
  assert.deepEqual(nearMiss(e=>e.preventDefault()).clicks,['a'],'the page cancelled it on the picture');
  assert.equal(nearMiss(null).clicks.length,0,'the browser dragged the picture: nothing is corrected');
  // The guard switched off makes no difference to this.
  assert.deepEqual(nearMiss(e=>e.preventDefault(),h=>h.controller.configure({enabled:true,dragGuard:false})).clicks,['a']);
  assert.equal(nearMiss(null,h=>h.controller.configure({enabled:true,dragGuard:false})).clicks.length,0);
});
