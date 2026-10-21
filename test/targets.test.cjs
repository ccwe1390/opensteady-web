'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
class Element {
  constructor(name='div',parent=null){this.localName=name;this.tagName=name.toUpperCase();this.parentElement=parent;this.isConnected=true;this.shadowRoot=null;this.textContent='Open panel';this.attrs={};}
  closest(selector){for(let p=this;p;p=p.parentElement){if(selector.includes('form')&&p.localName==='form')return p;if(selector.includes('[data-opensteady-no-assist]')&&p.attrs['data-opensteady-no-assist']!==undefined)return p;}return null;}
  matches(){return false;}getAttribute(name){return this.attrs[name]??null;}hasAttribute(name){return name in this.attrs;}
}
const context={globalThis:null,Element};context.globalThis=context;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/targets.js'),'utf8'),context);
const D=context.OpenSteadyDOM;
test('form gaps and explicit no-assist subtrees are sensitive',()=>{
  const gap=new Element('div',new Element('form'));assert.equal(D.sensitive(gap),true);
  const wrapper=new Element();wrapper.attrs['data-opensteady-no-assist']='';
  assert.equal(D.eligible(new Element('button',wrapper)),false);
  assert.equal(D.eligible(new Element('button')),true);
});
test('opaque custom elements and exposed shadow hosts keep descendants native',()=>{
  const custom=new Element('opaque-control');assert.equal(D.sensitive(custom),true);
  assert.equal(D.eligible(new Element('button',custom)),false);
  const host=new Element();host.shadowRoot={};assert.equal(D.sensitive(new Element('span',host)),true);
});
