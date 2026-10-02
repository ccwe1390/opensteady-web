'use strict';
// Integration of the actual content controller and gesture policy with a small DOM adapter.
// This is explicitly a mocked environment, not a substitute for test:browser.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const S=require('../extension/core/selector.js'),P=require('../extension/core/policy.js'),Settings=require('../extension/core/settings.js');
function harness(){
  const handlers=new Map(), clicks=[], elements=new Map(), rectangles=new Map();let index, clock=1000;
  class Element {
    constructor(id=null){this.id=id;this.style={};this.children=[];this.shadowRoot=null;this.control=false;this.safe=true;this.sensitive=false;this.isConnected=true;}
    attachShadow(){return new Element();}appendChild(el){this.children.push(el);}setAttribute(){}contains(el){return el===this||this.children.includes(el);}matches(){return false;}focus(){}
    click(){clicks.push(this.id);dispatch('click',{target:this,isTrusted:false,detail:0});}remove(){}
  }
  const root=new Element(),background=new Element('background'),a=new Element('a'),b=new Element('b');a.control=true;b.control=true;
  elements.set('a',a);elements.set('b',b);rectangles.set('a',{id:'a',x:100,y:100,w:40,h:40});rectangles.set('b',{id:'b',x:180,y:100,w:40,h:40});
  const api={idFor:el=>el?.control?el.id:null,validate:(id,old)=>{const el=elements.get(id),rect=rectangles.get(id);return el?.isConnected&&el.safe&&(!old||D.sameRect(old,rect))?{el,rect}:null;},near:(x,y,r)=>[...rectangles.values()].filter(q=>S.distToRect(x,y,q)<=r).map(q=>({...q,risky:!elements.get(q.id).safe})),start(){},stop(){},invalidate(){},dispose(){},stats:{targets:2},rects:rectangles};
  const D={TargetIndex:class{constructor(){index=api;return api;}},actualControl:el=>el?.control?el:null,eligible:el=>!!el?.control&&el.safe&&el.isConnected,sensitive:el=>el?.sensitive??false,sameRect:(a,b)=>['x','y','w','h'].every(k=>a[k]===b[k])};
  const win={addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);},removeEventListener(){}};
  const document={documentElement:root,createElement:()=>new Element(),getSelection:()=>({isCollapsed:true}),addEventListener:win.addEventListener.bind(win),removeEventListener(){},hidden:false};
  const context={globalThis:null,window:win,document,Element,OpenSteadySelect:S,OpenSteadyPolicy:P,OpenSteadyDOM:D,OpenSteadySettings:Settings,performance:{now:()=>clock},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout};context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/content.js'),'utf8'),context);
  const controller=context.__openSteadyController;controller.configure({enabled:true});
  function dispatch(type,extra={}){clock=extra.timeStamp??clock;const event={isTrusted:true,timeStamp:clock,pointerType:'mouse',pointerId:1,button:0,buttons:0,clientX:92,clientY:120,detail:1,target:background,altKey:false,metaKey:false,ctrlKey:false,shiftKey:false,defaultPrevented:false,stopped:false,composedPath(){return[this.target];},preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of handlers.get(type)||[])fn(event);return event;}
  function preview(){for(let i=0;i<20;i++)dispatch('pointermove',{timeStamp:1000+i*10});}
  function gesture(down={},up={},click={}){dispatch('pointerdown',{timeStamp:1300,...down});dispatch('pointerup',{timeStamp:1380,...up});return dispatch('click',{timeStamp:1381,...click});}
  return{dispatch,preview,gesture,clicks,a,b,background,controller,index,document,rectangles,window:win};
}
test('controller redirects one trusted previewed near miss; synthetic events cannot opt in',()=>{
  const h=harness();h.preview();const e=h.gesture();assert.deepEqual(h.clicks,['a']);assert.ok(e.defaultPrevented&&e.stopped);
  const j=harness();j.preview();const synthetic=j.gesture({isTrusted:false},{isTrusted:false},{isTrusted:false});assert.equal(j.clicks.length,0);assert.equal(synthetic.defaultPrevented,false);
});
test('controller leaves a native click and modifier clicks unchanged',()=>{
  const h=harness();h.preview();const e=h.gesture({target:h.a,clientX:120},{target:h.a,clientX:120},{target:h.a,clientX:120});assert.equal(h.clicks.length,0);assert.equal(e.stopped,false);
  for(const modifier of ['altKey','metaKey','ctrlKey','shiftKey']){const j=harness();j.preview();const e=j.gesture({[modifier]:true},{[modifier]:true},{[modifier]:true});assert.equal(j.clicks.length,0);assert.equal(e.defaultPrevented,false);}
});
test('controller never delivers on a drag, text selection, sensitive start, or lost focus',()=>{
  const h=harness();h.preview();h.dispatch('pointerdown',{timeStamp:1300});h.dispatch('pointermove',{timeStamp:1310,clientX:500,clientY:500,buttons:1});h.dispatch('pointerup',{timeStamp:1380});h.dispatch('click',{timeStamp:1381});assert.equal(h.clicks.length,0);
  const j=harness();j.preview();j.document.getSelection=()=>({isCollapsed:false});j.gesture();assert.equal(j.clicks.length,0);
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
