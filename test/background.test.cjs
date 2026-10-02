'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Settings=require('../extension/core/settings.js');
function mock(){
  const local={},session={},origins=new Set(),registered=[],injected=[],configs=[];
  const event=()=>({callbacks:[],addListener(fn){this.callbacks.push(fn);}});
  const store=data=>({async get(key){return key===null?{...data}:{[key]:data[key]};},async set(value){Object.assign(data,value);},async remove(key){delete data[key];},async clear(){for(const k of Object.keys(data))delete data[k];}});
  const tab={id:1,url:'https://example.com/path'};
  const chrome={runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,onMessage:event(),onInstalled:event(),onStartup:event()},
    storage:{local:store(local),session:store(session)},permissions:{async getAll(){return{origins:[...origins],permissions:['activeTab','scripting','storage']};},async contains({origins:wanted}){return wanted.every(x=>origins.has(x));},async remove({origins:wanted}){wanted.forEach(x=>origins.delete(x));return true;},onRemoved:event()},
    scripting:{async executeScript(args){injected.push(args);},async getRegisteredContentScripts(){return registered;},async unregisterContentScripts(){registered.length=0;},async registerContentScripts(values){registered.push(...values);}},
    tabs:{async query(){return[tab];},async get(id){if(id!==1)throw Error('Missing tab');return tab;},async sendMessage(id,m){configs.push(m);return null;},onRemoved:event(),onUpdated:event()},
    action:{async setBadgeText(){},async setBadgeBackgroundColor(){}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8'),{chrome,OpenSteadySettings:Settings,importScripts(){},URL,console,Promise});
  const sender={id:'test',url:'chrome-extension://test/ui/popup.html'};
  const send=(m,s=sender)=>new Promise(resolve=>chrome.runtime.onMessage.callbacks[0](m,s,resolve));
  return{send,local,session,origins,registered,injected,configs,tab,chrome};
}
test('default has no access; current-tab activation is temporary and top-level',async()=>{
  const h=mock();let r=await h.send({type:'tab-status',tabId:1});assert.equal(r.config.enabled,false);
  assert.equal((await h.send({type:'set-tab',tabId:1,enabled:true})).ok,true);r=await h.send({type:'tab-status',tabId:1});assert.equal(r.config.enabled,true);
  assert.equal(h.registered.length,0);assert.equal(h.injected[0].target.tabId,1);assert.equal(h.injected[0].world,'ISOLATED');
  h.tab.url='https://different.com';r=await h.send({type:'tab-status',tabId:1});assert.equal(r.config.enabled,false);
});
test('remembered access needs a grant; forgetting removes permission and scripts',async()=>{
  const h=mock();assert.match((await h.send({type:'remember-site',tabId:1,enabled:true})).error,/not granted/);
  h.origins.add('https://example.com/*');assert.equal((await h.send({type:'remember-site',tabId:1,enabled:true})).ok,true);
  assert.equal(h.registered.length,1);assert.equal(h.registered[0].allFrames,false);assert.deepEqual(Array.from(h.registered[0].matches),['https://example.com/*']);
  await h.send({type:'remember-site',tabId:1,enabled:false});assert.equal(h.origins.size,0);assert.equal(h.registered.length,0);assert.equal((await h.send({type:'tab-status',tabId:1})).config.enabled,false);
});
test('global pause overrides sessions and clear removes all settings/access',async()=>{
  const h=mock();await h.send({type:'set-tab',tabId:1,enabled:true});await h.send({type:'save-settings',settings:{enabled:false}});
  assert.equal((await h.send({type:'tab-status',tabId:1})).config.enabled,false);
  await h.send({type:'clear-settings'});assert.equal(Object.keys(h.session).length,0);assert.equal((await h.send({type:'tab-status',tabId:1})).config.enabled,false);
});
test('content scripts can obtain their own config but cannot mutate controls',async()=>{
  const h=mock(),content={id:'test',tab:{id:1,url:h.tab.url},frameId:0,url:h.tab.url};
  assert.equal((await h.send({type:'content-config'},content)).config.enabled,false);
  assert.match((await h.send({type:'set-tab',tabId:1,enabled:true},content)).error,/extension controls/);
  assert.match((await h.send({type:'content-config'},{...content,frameId:1})).error,/Top-level/);
  assert.match((await h.send({type:'get-settings'},{id:'other'})).error,/Unsupported sender/);
});
test('options pages opened in a tab can control settings; partial updates preserve pause',async()=>{
  const h=mock();await h.send({type:'save-settings',settings:{enabled:false}});
  const sender={id:'test',url:'chrome-extension://test/ui/options.html',tab:{id:2}};
  const r=await h.send({type:'save-settings',settings:{mode:'nearest'}},sender);assert.equal(r.settings.enabled,false);assert.equal(r.settings.mode,'nearest');
});
test('a protected page injection failure never stores a misleading enabled state',async()=>{
  const h=mock();h.chrome.scripting.executeScript=async()=>{throw Error('Protected page');};
  assert.match((await h.send({type:'set-tab',tabId:1,enabled:true})).error,/Protected/);
  assert.equal((await h.send({type:'tab-status',tabId:1})).config.enabled,false);assert.equal(Object.keys(h.session).length,0);
});
test('clear revokes unused optional grants and forgetting switches off other tabs on that site',async()=>{
  const h=mock();h.origins.add('https://unused.com/*');await h.send({type:'clear-settings'});assert.equal(h.origins.size,0);
  h.origins.add('https://example.com/*');await h.send({type:'remember-site',tabId:1,enabled:true});h.session['tab:3']={site:'https://example.com',enabled:true};
  await h.send({type:'remember-site',tabId:1,enabled:false});assert.equal(h.session['tab:3'].enabled,false);
});
