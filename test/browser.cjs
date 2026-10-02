#!/usr/bin/env node
'use strict';
/* Actual Chromium fixture tests. Fail if a browser cannot launch; never turn that into a pass. */
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),extension=path.join(root,'extension');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const requested=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!requested.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(requested,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(requested)]||'text/plain');res.end(data);});
});
let context,profile,fixtureExtension,browser;const results=[];
const controllerOnly=process.env.BROWSER_CONTROLLER_ONLY==='1';
async function run(name,fn){await fn();results.push({name,status:'passed'});console.log('PASS '+name);}
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'opensteady-browser-'));
  fixtureExtension=path.join(profile,'fixture-extension');fs.cpSync(extension,fixtureExtension,{recursive:true});
  const manifest=JSON.parse(fs.readFileSync(path.join(fixtureExtension,'manifest.json'),'utf8'));
  manifest.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(fixtureExtension,'manifest.json'),JSON.stringify(manifest,null,2));
  const options={headless:process.env.HEADED!=='1',channel:'chromium',viewport:{width:1200,height:1000},args:[`--disable-extensions-except=${fixtureExtension}`,`--load-extension=${fixtureExtension}`]};
  if(process.env.CHROME_EXECUTABLE)options.executablePath=process.env.CHROME_EXECUTABLE;
  let worker,extensionId=null;
  if(controllerOnly){
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox']});
    context=await browser.newContext({viewport:{width:1200,height:1000}});
  }else{
    context=await chromium.launchPersistentContext(profile,options);
    worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');extensionId=new URL(worker.url()).host;
  }
  const page=await context.newPage();await page.goto(base+'/lab/fixtures.html');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // UI control activates activeTab and injects the isolated-world production scripts.
  // The test runner uses extension APIs in its service worker instead of bypassing the input gate.
  async function configure(enabled=true,mode='stable',doubleGuard=true){
    if(controllerOnly){
      const cdp=await context.newCDPSession(page);
      const {frameTree}=await cdp.send('Page.getFrameTree');
      const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'opensteady-fixture'});
      for(const file of ['core/selector.js','core/policy.js','core/settings.js','targets.js','content.js']){
        const expression=fs.readFileSync(path.join(extension,file),'utf8');
        const r=await cdp.send('Runtime.evaluate',{expression,contextId:executionContextId});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);
      }
      await cdp.send('Runtime.evaluate',{expression:`globalThis.__openSteadyController.configure(${JSON.stringify({enabled,mode,doubleGuard,radius:24})})`,contextId:executionContextId});
      await cdp.detach();await page.waitForTimeout(300);return;
    }
    const pages=await worker.evaluate(async()=>await chrome.tabs.query({}));
    const tab=pages.find(t=>t.url?.includes('/lab/fixtures.html'));
    const tabId=tab?.id || await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>!t.url?.startsWith('chrome-extension:'))?.id;});
    // Automatic input tests use a temporary manifest with only a localhost host grant.
    // Production permission flows are tested independently; its manifest is never edited.
    if(!tabId)throw Error('Fixture tab not found.');
    await worker.evaluate(async({tabId,enabled,mode,doubleGuard})=>{
      await chrome.storage.local.set({settings:{enabled:true,sites:[],mode,doubleGuard,radius:24}});
      await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled}});
      await chrome.scripting.executeScript({target:{tabId},files:['core/selector.js','core/policy.js','core/settings.js','targets.js','content.js']});
      await chrome.tabs.sendMessage(tabId,{type:'configure',config:{enabled,mode,doubleGuard,radius:24},resume:true},{frameId:0});
    },{tabId,enabled,mode,doubleGuard});
    await page.waitForTimeout(300);
  }
  const box=async id=>await page.locator('#'+id).boundingBox();
  async function pointNear(id){const r=await box(id);const x=r.x-6,y=r.y+r.height/2;for(let i=0;i<55;i++){await page.mouse.move(x+(i%2)*.2,y+(i%3)*.1);await page.waitForTimeout(10);if(i>=20&&i%5===0){const status=await controllerStatus();if(status?.outlineReady&&status.outlineAgeMs>=80)break;}}return{x,y};}
  const count=async id=>await page.evaluate(id=>window.fixtureCounts[id]||0,id);
  async function controllerStatus(){
    if(!controllerOnly){const tabs=await worker.evaluate(async()=>await chrome.tabs.query({}));const tab=tabs.find(t=>t.url?.includes('/lab/fixtures.html'));return await worker.evaluate(async id=>await chrome.tabs.sendMessage(id,{type:'status'},{frameId:0}),tab.id);}
    const cdp=await context.newCDPSession(page);const {frameTree}=await cdp.send('Page.getFrameTree');
    const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'opensteady-fixture'});
    const result=await cdp.send('Runtime.evaluate',{contextId:executionContextId,returnByValue:true,expression:'globalThis.__openSteadyController?.status()'});
    await cdp.detach();return result.result.value;
  }
  await run('first native click preserves trusted event sequence',async()=>{
    await configure(false);await page.locator('#safe').click();const off=await page.evaluate(()=>fixtureLog.filter(e=>e.id==='safe').map(({type,trusted,detail})=>({type,trusted,detail})));
    await page.evaluate(()=>{fixtureLog.length=0;});await configure(true);await page.locator('#safe').click();const on=await page.evaluate(()=>fixtureLog.filter(e=>e.id==='safe').map(({type,trusted,detail})=>({type,trusted,detail})));assert.deepEqual(on,off);
  });
  await run('previewed near miss delivers exactly one click',async()=>{const before=await count('safe');const p=await pointNear('safe');const status=await controllerStatus();assert.ok(status.outlineReady&&status.outlineAgeMs>=60);await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),before+1);});
  await run('near-miss drag never activates selected target',async()=>{const before=await count('safe'),p=await pointNear('safe');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+200,p.y+160,{steps:20});await page.mouse.up();assert.equal(await count('safe'),before);});
  await run('synthetic page events cannot trigger assistance',async()=>{const before=await count('safe');await pointNear('safe');await page.evaluate(()=>{for(const type of ['pointerdown','pointerup','click'])document.body.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:1,clientY:1,pointerType:'mouse',button:0,detail:1}));});assert.equal(await count('safe'),before);});
  await run('modifier near miss remains an ordinary miss',async()=>{const before=await count('safe'),p=await pointNear('safe');await page.keyboard.down('Control');await page.mouse.click(p.x,p.y);await page.keyboard.up('Control');assert.equal(await count('safe'),before);});
  await run('risky and covered targets receive no redirected click',async()=>{for(const id of ['risk','covered']){const before=await count(id),p=await pointNear(id);await page.mouse.click(p.x,p.y);assert.equal(await count(id),before);}});
  await run('target movement during a press cancels correction',async()=>{const before=await count('moving'),p=await pointNear('moving');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.evaluate(()=>document.getElementById('moving').style.left='330px');await page.mouse.up();assert.equal(await count('moving'),before);});
  await run('small slip off a directly pressed button is rescued',async()=>{const before=await count('safe'),r=await box('safe');await page.mouse.move(r.x+2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x-5,r.y+r.height/2);await page.mouse.up();assert.equal(await count('safe'),before+1);});
  await run('repeat guard blocks only second activation; disabling restores both',async()=>{await configure(true,'stable',true);let before=await count('safe');await page.locator('#safe').dblclick({delay:70});assert.equal(await count('safe'),before+1);await configure(true,'stable',false);before=await count('safe');await page.locator('#safe').dblclick({delay:70});assert.equal(await count('safe'),before+2);});
  await run('keyboard activation and text editing remain native',async()=>{await configure(true);let before=await count('safe');await page.locator('#safe').focus();await page.keyboard.press('Enter');assert.equal(await count('safe'),before+1);await page.locator('#edit').fill('Editing works');assert.equal(await page.locator('#edit').inputValue(),'Editing works');});
  await run('Escape pauses page, explicit enable resumes',async()=>{await configure(true);await page.keyboard.press('Escape');let before=await count('safe'),p=await pointNear('safe');await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),before);await configure(true);p=await pointNear('safe');await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),before+1);});
  await run('trusted-only control demonstrates redirect limitation',async()=>{await configure(true);const before=await page.evaluate(()=>trustedOnlyCount),p=await pointNear('trusted');await page.mouse.click(p.x,p.y);assert.equal(await page.evaluate(()=>trustedOnlyCount),before);await page.locator('#trusted').click();assert.equal(await page.evaluate(()=>trustedOnlyCount),before+1);});
  await run('native checkbox, nested label, and iframe clicks work',async()=>{await configure(true);await page.locator('#check').check();assert.equal(await page.locator('#check').isChecked(),true);const before=await count('nested');await page.locator('#nested span').click();assert.equal(await count('nested'),before+1);await page.frameLocator('#frame').locator('#inside').click();assert.equal(await page.frameLocator('#frame').locator('#count').textContent(),'1');});
  await run('a removed target and an unlabeled control receive no correction',async()=>{
    await configure(true);let p=await pointNear('dynamic');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.evaluate(()=>document.getElementById('dynamic').remove());await page.mouse.up();assert.equal(await count('dynamic'),0);
    p=await pointNear('blank');await page.mouse.click(p.x,p.y);assert.equal(await count('blank'),0);
  });
  await run('double-click text selection is preserved',async()=>{await page.locator('#edit').dblclick();const selected=await page.locator('#edit').evaluate(el=>el.selectionEnd-el.selectionStart);assert.ok(selected>0);});
  await run('5,000-link indexing preserves native clicks; 6,000-control cap abstains',async()=>{
    await page.locator('#stress').click();await page.waitForTimeout(350);const before=await count('safe');await page.locator('#safe').click();assert.equal(await count('safe'),before+1);
    await page.evaluate(()=>{const f=document.createDocumentFragment();for(let i=0;i<1100;i++){const a=document.createElement('a');a.href='#destination';a.textContent='Extra '+i;f.appendChild(a);}document.getElementById('stressfield').appendChild(f);});await page.waitForTimeout(350);
    const p=await pointNear('safe'),n=await count('safe');await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),n);
  });
  await run('lab simulation and recording exports run without page errors',async()=>{await page.goto(base+'/lab/index.html');await page.locator('#trials').selectOption('100');await page.locator('#run').click();await page.waitForFunction(()=>document.getElementById('progress').textContent.startsWith('Done'),undefined,{timeout:60000});assert.equal(await page.locator('#results tr').count(),16);await page.locator('#record').click();await page.locator('.target.intended').click();await page.waitForTimeout(250);await page.locator('#stop').click();const downloadPromise=page.waitForEvent('download');await page.locator('#exportTrace').click();const download=await downloadPromise;const saved=await download.path();const trace=JSON.parse(fs.readFileSync(saved,'utf8'));assert.equal(trace.source,'lab-recording');require('../benchmark/replay.js').validateTrace(trace);});
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(root,'results/lab.png'),fullPage:true});
  fs.writeFileSync(path.join(root,controllerOnly?'results/browser-controller.json':'results/browser.json'),JSON.stringify({generatedAt:new Date().toISOString(),browser:context.browser()?.version()||'Chromium',mode:controllerOnly?'isolated-controller-only':'extension-localhost-fixture',extensionId,results,errors,limits:controllerOnly?['No extension installation, permission, messaging, or service-worker integration exercised.']:['Localhost fixture manifest has a test-only host permission.']},null,2)+'\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;fs.mkdirSync(path.join(root,'results'),{recursive:true});fs.writeFileSync(path.join(root,controllerOnly?'results/browser-controller.json':'results/browser.json'),JSON.stringify({status:'failed-or-blocked',error:error.message,results},null,2)+'\n');}).finally(async()=>{if(context)await context.close();if(browser)await browser.close();server.close();if(profile)fs.rmSync(profile,{recursive:true,force:true});});
