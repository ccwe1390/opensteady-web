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
let context,profile,fixtureExtension,browser;const results=[],measurements={};
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
  // Controller-only mode keeps one isolated world per document. Some Chromium versions hand back a fresh
  // world for a repeated name, which would leave a second controller running, so remember the first.
  let fixtureWorld=null;
  async function world(cdp){
    if(fixtureWorld!==null){const alive=await cdp.send('Runtime.evaluate',{expression:'1',contextId:fixtureWorld}).catch(()=>null);if(alive&&!alive.exceptionDetails)return fixtureWorld;}
    const {frameTree}=await cdp.send('Page.getFrameTree');
    ({executionContextId:fixtureWorld}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'opensteady-fixture'}));
    return fixtureWorld;
  }
  async function configure(enabled=true,mode='stable',doubleGuard=true,dwellEnabled=false,dwellMs=900,dragGuard=true){
    if(controllerOnly){
      const cdp=await context.newCDPSession(page);
      const executionContextId=await world(cdp);
      for(const file of ['core/selector.js','core/policy.js','core/dwell.js','core/link-drag.js','core/jitter.js','core/settings.js','targets.js','content.js']){
        const expression=fs.readFileSync(path.join(extension,file),'utf8');
        const r=await cdp.send('Runtime.evaluate',{expression,contextId:executionContextId});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);
      }
      await cdp.send('Runtime.evaluate',{expression:`globalThis.__openSteadyController.configure(${JSON.stringify({enabled,mode,doubleGuard,radius:24,dwellEnabled,dwellMs,dragGuard})})`,contextId:executionContextId});
      await cdp.detach();await page.waitForTimeout(300);return;
    }
    const pages=await worker.evaluate(async()=>await chrome.tabs.query({}));
    const tab=pages.find(t=>t.url?.includes('/lab/fixtures.html'));
    const tabId=tab?.id || await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>!t.url?.startsWith('chrome-extension:'))?.id;});
    // Automatic input tests use a temporary manifest with only a localhost host grant.
    // Production permission flows are tested independently; its manifest is never edited.
    if(!tabId)throw Error('Fixture tab not found.');
    await worker.evaluate(async({tabId,enabled,mode,doubleGuard,dwellEnabled,dwellMs,dragGuard})=>{
      await chrome.storage.local.set({settings:{enabled:true,sites:[],mode,doubleGuard,radius:24,dwellEnabled,dwellMs,dragGuard}});
      await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled}});
      await chrome.scripting.executeScript({target:{tabId},files:['core/selector.js','core/policy.js','core/dwell.js','core/link-drag.js','core/jitter.js','core/settings.js','targets.js','content.js']});
      await chrome.tabs.sendMessage(tabId,{type:'configure',config:{enabled,mode,doubleGuard,radius:24,dwellEnabled,dwellMs,dragGuard},resume:true},{frameId:0});
    },{tabId,enabled,mode,doubleGuard,dwellEnabled,dwellMs,dragGuard});
    await page.waitForTimeout(300);
  }
  const box=async id=>await page.locator('#'+id).boundingBox();
  async function pointNear(id){const r=await box(id);const x=r.x-6,y=r.y+r.height/2;for(let i=0;i<55;i++){await page.mouse.move(x+(i%2)*.2,y+(i%3)*.1);await page.waitForTimeout(10);if(i>=20&&i%5===0){const status=await controllerStatus();if(status?.outlineReady&&status.outlineAgeMs>=80)break;}}return{x,y};}
  const count=async id=>await page.evaluate(id=>window.fixtureCounts[id]||0,id);
  async function controllerStatus(){
    if(!controllerOnly){const tabs=await worker.evaluate(async()=>await chrome.tabs.query({}));const tab=tabs.find(t=>t.url?.includes('/lab/fixtures.html'));return await worker.evaluate(async id=>await chrome.tabs.sendMessage(id,{type:'status'},{frameId:0}),tab.id);}
    const cdp=await context.newCDPSession(page);const executionContextId=await world(cdp);
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
  await run('form gaps and closed custom-element controls never redirect to a neighboring button',async()=>{
    for(const kind of ['form','opaque-control']){
      await configure(true);const p=await pointNear('safe'),before=await count('safe');
      await page.evaluate(({kind,p})=>{
        const el=document.createElement(kind);el.id='opaque-gap';
        el.style.cssText=`position:fixed;left:${p.x-3}px;top:${p.y-10}px;width:6px;height:20px;margin:0;padding:0;z-index:100;`;
        if(kind==='opaque-control'){
          const shadow=el.attachShadow({mode:'closed'}),button=document.createElement('button');
          button.style.cssText='width:6px;height:20px;padding:0;border:0';button.textContent='';
          button.addEventListener('click',()=>window.opaqueCount=(window.opaqueCount||0)+1);shadow.append(button);
        }
        document.body.append(el);
      },{kind,p});
      await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),before);
      if(kind==='opaque-control')assert.equal(await page.evaluate(()=>window.opaqueCount),1);
      await page.locator('#opaque-gap').evaluate(el=>el.remove());
    }
  });
  await run('explicit no-assist target keeps native clicks but receives no near-miss correction',async()=>{
    await configure(true);await page.locator('#safe').evaluate(el=>el.setAttribute('data-opensteady-no-assist',''));
    const before=await count('safe'),p=await pointNear('safe');await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),before);
    await page.locator('#safe').click();assert.equal(await count('safe'),before+1);
    await page.locator('#safe').evaluate(el=>el.removeAttribute('data-opensteady-no-assist'));
  });
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
  await run('hold to click activates a small target with ongoing jitter only once',async()=>{
    await page.evaluate(()=>{
      document.activeElement?.blur();document.getSelection()?.removeAllRanges();
      const b=document.createElement('button');b.id='dwell-small';b.type='button';b.setAttribute('aria-label','Open detail');b.textContent='•';
      b.style.cssText='position:absolute;left:650px;top:80px;width:20px;height:20px;padding:0;';
      window.dwellCount=0;window.dwellAt=null;b.addEventListener('click',()=>{window.dwellCount++;window.dwellAt=performance.now();});document.getElementById('testbed').append(b);
    });
    await page.locator('#dwell-small').scrollIntoViewIfNeeded();
    await configure(true,'stable',true,true,900);const r=await box('dwell-small');
    for(let i=0;i<60;i++){await page.mouse.move(r.x+10+4*Math.sin(i),r.y+10+4*Math.cos(i));await page.waitForTimeout(30);}
    assert.equal(await page.evaluate(()=>window.dwellCount),1,JSON.stringify({status:await controllerStatus(),page:await page.evaluate(()=>({focused:document.hasFocus(),selection:document.getSelection()?.isCollapsed}))}));
    await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.dwellCount),1);
    const status=await controllerStatus();assert.equal(status.counters.dwellClicks,1);
    await page.mouse.move(r.x+80,r.y+10);await page.waitForTimeout(350);
    await page.mouse.move(r.x+10,r.y+10);await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(()=>window.dwellCount),2);
  });
  await run('100-Hz requested mouse jitter completes six dwell countdowns',async()=>{
    const r=await box('dwell-small'),times=[];
    await configure(true,'stable',true,true,900);
    for(let k=0;k<6;k++){
      await page.mouse.move(r.x+100,r.y+10);await page.waitForTimeout(400);await page.evaluate(()=>window.dwellAt=null);
      const start=await page.evaluate(()=>performance.now());let elapsed=null;
      for(let i=0;i<600;i++){
        await page.mouse.move(r.x+10+4*Math.sin(i*.9),r.y+10+4*Math.cos(i*.9));await page.waitForTimeout(10);
        const at=await page.evaluate(()=>window.dwellAt);if(at!==null){elapsed=Math.round(at-start);break;}
        if(await page.evaluate(()=>performance.now())-start>6000)break;
      }
      times.push(elapsed);
    }
    measurements.highRateDwell={requestedMovesPerSecond:100,jitterPx:4,repetitions:6,activationMs:times};
    assert.ok(times.every(t=>t!==null&&t>=900&&t<3000),JSON.stringify(times));
  });
  await run('manual clicks and Escape prevent later dwell activation on the same aim',async()=>{
    await configure(true,'stable',true,true,900);const r=await box('dwell-small');
    const before=await page.evaluate(()=>window.dwellCount);await page.mouse.move(r.x+10,r.y+10);await page.waitForTimeout(250);
    await page.mouse.click(r.x+10,r.y+10);await page.mouse.move(r.x+11,r.y+10);await page.waitForTimeout(1400);
    assert.equal(await page.evaluate(()=>window.dwellCount),before+1);
    await configure(true,'stable',true,true,900);await page.mouse.move(r.x+9,r.y+10);await page.waitForTimeout(250);
    await page.keyboard.press('Escape');await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.dwellCount),before+1);
  });
  await run('hold to click respects form, risky, and explicit no-assist exclusions',async()=>{
    await configure(true,'stable',true,true,500);
    const before=await count('risk');const r=await box('risk');await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(900);assert.equal(await count('risk'),before);
    await page.locator('#dwell-small').evaluate(el=>el.setAttribute('data-opensteady-no-assist',''));const n=await page.evaluate(()=>window.dwellCount),b=await box('dwell-small');
    await page.mouse.move(b.x+10,b.y+10);await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.dwellCount),n);
    const f=await box('form');await page.mouse.move(f.x+1,f.y+1);await page.waitForTimeout(900);assert.equal((await controllerStatus()).outlineReady,false);
    await configure(true);await page.locator('#dwell-small').evaluate(el=>el.remove());
  });
  async function linkPress(returning=false){
    await page.locator('#link').scrollIntoViewIfNeeded();await page.evaluate(()=>document.getSelection()?.removeAllRanges());
    const r=await box('link'),x=r.x+r.width/2,y=r.y+r.height/2;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y+5,{steps:3});
    if(returning){await page.mouse.move(x+200,y+100,{steps:10});await page.mouse.move(x,y,{steps:10});}
    else for(let i=0;i<15;i++){await page.mouse.move(x+8*Math.sin(i),y+6*Math.cos(i));await page.waitForTimeout(10);}
    await page.mouse.move(x,y);await page.mouse.up();
  }
  await run('the quick drag guard, on by default, preserves a shaking same-link press',async()=>{
    await configure(true,'stable',true,false,900,true);const before=await count('link');const initial=await controllerStatus();
    await linkPress();assert.equal(await count('link'),before+1);
    const after=await controllerStatus();assert.ok(after.counters.preventedLinkDrags>initial.counters.preventedLinkDrags);assert.ok(after.counters.preservedLinkClicks>initial.counters.preservedLinkClicks);
  });
  await run('cancelled large returning link drag produces no induced click',async()=>{
    await configure(true,'stable',true,false,900,true);const before=await count('link');await linkPress(true);assert.equal(await count('link'),before);
    assert.ok((await controllerStatus()).counters.rejectedLinkClicks>0);
  });
  await run('switching the guard off, or holding a modifier key, leaves a link drag to the browser',async()=>{
    for(const guard of [false,true]){
      await configure(true,'stable',true,false,900,guard);const old=(await controllerStatus()).counters.preventedLinkDrags;
      if(guard)await page.keyboard.down('Shift');await linkPress();if(guard)await page.keyboard.up('Shift');
      assert.equal((await controllerStatus()).counters.preventedLinkDrags,old);
    }
    await configure(true);
  });
  // Shake the pointer about a point for a little over half a second: about 7 px RMS at 6 Hz.
  async function shakeAt(x,y){const start=Date.now();for(;;){const t=(Date.now()-start)/1000;if(t>.55)break;await page.mouse.move(x+8*Math.sin(2*Math.PI*6*t),y+6*Math.sin(2*Math.PI*6*t+1));await page.waitForTimeout(8);}}
  const dragStarts=async()=>await page.evaluate(()=>fixtureLog.filter(e=>e.type==='dragstart'&&e.id==='link').length);
  await run('press, wait, then drag still drags a link; a quick long drag is cancelled and clicks nothing',async()=>{
    await configure(true);await page.locator('#link').scrollIntoViewIfNeeded();await page.evaluate(()=>{document.getSelection()?.removeAllRanges();fixtureLog.length=0;});
    const r=await box('link'),x=r.x+r.width/2,y=r.y+r.height/2;let before=await count('link'),old=(await controllerStatus()).counters.preventedLinkDrags;
    await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.move(x+200,y+120,{steps:12});await page.mouse.up();await page.waitForTimeout(100);
    assert.equal((await controllerStatus()).counters.preventedLinkDrags,old,'a drag that starts after the wait is not cancelled');
    assert.ok(await dragStarts()>=1,'the browser started its own drag');assert.equal(await count('link'),before);
    await page.mouse.move(x-150,y-60);await page.waitForTimeout(100);await page.evaluate(()=>{fixtureLog.length=0;});
    before=await count('link');old=(await controllerStatus()).counters.preventedLinkDrags;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+200,y+120,{steps:12});await page.mouse.up();await page.waitForTimeout(100);
    assert.equal((await controllerStatus()).counters.preventedLinkDrags,old+1,'a drag that starts at once is cancelled');
    assert.equal(await count('link'),before,'and it must not turn into a click');
  });
  await run('a press on a link whose own text is selected still clicks it',async()=>{
    await configure(true);const before=await count('link');
    await page.locator('#link').scrollIntoViewIfNeeded();
    const r=await box('link'),x=r.x+r.width/2,y=r.y+r.height/2;
    await page.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.getElementById('link'));const s=document.getSelection();s.removeAllRanges();s.addRange(range);});
    await page.mouse.move(x-60,y+40);await page.mouse.move(x,y,{steps:4});await page.mouse.down();
    for(let i=0;i<10;i++){await page.mouse.move(x+6*Math.sin(i),y+4*Math.cos(i));await page.waitForTimeout(10);}
    await page.mouse.move(x,y);await page.mouse.up();await page.waitForTimeout(100);
    assert.equal(await count('link'),before+1);await page.evaluate(()=>document.getSelection()?.removeAllRanges());
  });
  await run('selected text elsewhere on the page does not stop a near miss',async()=>{
    await configure(true);await page.locator('#safe').scrollIntoViewIfNeeded();
    await page.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('h1'));const s=document.getSelection();s.removeAllRanges();s.addRange(range);});
    const before=await count('safe'),p=await pointNear('safe');await page.mouse.click(p.x,p.y);
    assert.equal(await count('safe'),before+1);await page.evaluate(()=>document.getSelection()?.removeAllRanges());
    // With the whole page selected, a press in an empty gap is still not a press on selected text.
    await page.mouse.move(p.x+200,p.y+200);await page.waitForTimeout(700);
    await page.evaluate(()=>document.getSelection().selectAllChildren(document.body));
    const q=await pointNear('safe');await page.mouse.click(q.x,q.y);const all=await controllerStatus();
    assert.equal(all.lastPress.blockedBySelection,false,JSON.stringify(all.lastPress));assert.equal(await count('safe'),before+2);
    await page.evaluate(()=>document.getSelection()?.removeAllRanges());
  });
  await run('a near miss released on the outlined target itself is delivered once',async()=>{
    await configure(true);const before=await count('safe'),p=await pointNear('safe');
    await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+9,p.y,{steps:3});await page.mouse.up();await page.waitForTimeout(80);
    assert.equal(await count('safe'),before+1);
  });
  // Shake the pointer on a control in real time so the shake meter has something to measure.
  async function shakeOn(id,amplitude,ms=520){const r=await box(id),cx=r.x+r.width/2,cy=r.y+r.height/2,start=Date.now();
    for(;;){const t=(Date.now()-start)/1000;if(t*1000>ms)break;await page.mouse.move(cx+amplitude*Math.sin(2*Math.PI*6*t),cy+amplitude*.5*Math.sin(2*Math.PI*6*t+1));await page.waitForTimeout(8);}
    return r;}
  await run('a wide slip off a pressed button is rescued after measured shake, and not for a steady hand',async()=>{
    await configure(true,'stable',false);await page.locator('#safe').scrollIntoViewIfNeeded();
    let before=await count('safe');let r=await shakeOn('safe',9);
    await page.mouse.move(r.x+5,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x-14,r.y+r.height/2,{steps:3});await page.mouse.up();await page.waitForTimeout(80);
    const shaky=(await controllerStatus()).lastPress;
    assert.equal(await count('safe'),before+1,JSON.stringify(shaky));assert.ok(shaky.slipLimitPx>19,JSON.stringify(shaky));
    await page.mouse.move(r.x+300,r.y+200);await page.waitForTimeout(700);
    before=await count('safe');await page.mouse.move(r.x+5,r.y+r.height/2,{steps:5});
    for(let i=0;i<45;i++){await page.mouse.move(r.x+5+(i%2)*.2,r.y+r.height/2);await page.waitForTimeout(10);}
    await page.mouse.down();await page.mouse.move(r.x-14,r.y+r.height/2,{steps:3});await page.mouse.up();await page.waitForTimeout(80);
    const steady=(await controllerStatus()).lastPress;
    assert.equal(await count('safe'),before,JSON.stringify(steady));assert.equal(steady.slipLimitPx,12);
    await configure(true);
  });
  await run('a press on selected text beside the outlined target is delivered for a shaking hand, and left alone for a steady one',async()=>{
    await configure(true,'stable',false);await page.locator('#safe').scrollIntoViewIfNeeded();
    await page.evaluate(()=>{const s=document.createElement('span');s.id='bait';s.textContent='words words words';s.style.cssText='position:absolute;left:8px;top:90px;width:70px;height:20px;white-space:nowrap;overflow:hidden;font:14px/20px sans-serif';document.getElementById('testbed').append(s);});
    const selectBait=()=>page.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.getElementById('bait'));const s=document.getSelection();s.removeAllRanges();s.addRange(range);});
    const r=await box('safe'),x=r.x-6,y=r.y+r.height/2;
    const press=async()=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-10,y+2,{steps:3});await page.mouse.move(x,y,{steps:2});await page.mouse.up();await page.waitForTimeout(100);};
    // Shaking hand: jitter about the press point for half a second, then press on the selected words.
    await selectBait();let before=await count('safe');
    const drags=(await controllerStatus()).counters.preventedLinkDrags;
    await shakeAt(x,y);await press();const shaky=await controllerStatus();
    assert.equal(await count('safe'),before+1,JSON.stringify(shaky.lastPress));assert.equal(shaky.lastPress.blockedBySelection,false);
    assert.ok(shaky.lastPress.slipLimitPx>12,'the hand was measured as shaking: '+JSON.stringify(shaky.lastPress));
    assert.equal(shaky.counters.preventedLinkDrags,drags+1,'the browser began to drag the selected words and the guard cancelled it');
    // Steady hand: same press, same selected words. The browser's own behaviour is kept.
    await page.mouse.move(x+300,y+250);await page.waitForTimeout(700);await selectBait();before=await count('safe');
    for(let i=0;i<50;i++){await page.mouse.move(x+(i%2)*.2,y);await page.waitForTimeout(10);}
    await press();const steady=await controllerStatus();
    assert.equal(await count('safe'),before,JSON.stringify(steady.lastPress));assert.equal(steady.lastPress.blockedBySelection,true);
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();document.getElementById('bait').remove();});await configure(true);
  });
  await run('a steady drag that selects text beside the outlined target is a selection; the same drag by a shaking hand is a slip',async()=>{
    await configure(true,'stable',false);await page.locator('#safe').scrollIntoViewIfNeeded();
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();const s=document.createElement('span');s.id='bait';s.textContent='words words words';s.style.cssText='position:absolute;left:8px;top:90px;width:70px;height:20px;white-space:nowrap;overflow:hidden;font:14px/20px sans-serif';document.getElementById('testbed').append(s);});
    const r=await box('safe'),x=r.x-6,y=r.y+r.height/2;
    const dragSelect=async()=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-10,y,{steps:5});await page.mouse.up();await page.waitForTimeout(100);};
    const selected=async()=>await page.evaluate(()=>String(document.getSelection()).length);
    // Steady: hover until the outline shows, then select a few letters.
    await pointNear('safe');let before=await count('safe');await dragSelect();const steady=await controllerStatus();
    assert.equal(await count('safe'),before,JSON.stringify(steady.lastDecision));assert.ok(await selected()>0,'the selection is kept');
    assert.equal(steady.lastDecision.ruledOut,'press-selected-text');
    // Shaking: the same motion is a slip. The click is delivered and the letters it selected are deselected.
    await page.evaluate(()=>document.getSelection()?.removeAllRanges());await page.mouse.move(x+300,y+250);await page.waitForTimeout(700);
    before=await count('safe');await shakeAt(x,y);await dragSelect();const shaky=await controllerStatus();
    assert.equal(await count('safe'),before+1,JSON.stringify(shaky.lastPress)+JSON.stringify(shaky.lastDecision));assert.equal(await selected(),0,'the selection the slip made is removed');
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();document.getElementById('bait').remove();});await configure(true);
  });
  await run('only the selected part of the text under the pointer counts as selected',async()=>{
    await configure(true,'stable',false);await page.locator('#safe').scrollIntoViewIfNeeded();
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();const s=document.createElement('span');s.id='bait';s.textContent='words words words';s.style.cssText='position:absolute;left:8px;top:90px;width:70px;height:20px;white-space:nowrap;overflow:hidden;font:14px/20px sans-serif';document.getElementById('testbed').append(s);});
    const r=await box('safe'),x=r.x-6,y=r.y+r.height/2;
    const offset=await page.evaluate(({x,y})=>{const c=document.caretRangeFromPoint(x,y);return c.startContainer.parentElement.id==='bait'?c.startOffset:-1;},{x,y});
    assert.ok(offset>=4,'the press point is on the bait text, at offset '+offset);
    const select=(from,to)=>page.evaluate(({from,to})=>{const t=document.getElementById('bait').firstChild,range=document.createRange();range.setStart(t,from);range.setEnd(t,to);const s=document.getSelection();s.removeAllRanges();s.addRange(range);},{from,to});
    // The first letters are selected. The press lands further along, on letters that are not.
    await select(0,offset-2);let p=await pointNear('safe');let before=await count('safe');await page.mouse.click(p.x,p.y);let status=await controllerStatus();
    assert.equal(status.lastPress.blockedBySelection,false,JSON.stringify(status.lastPress));assert.equal(await count('safe'),before+1);
    // Now the letters under the press are the selected ones.
    await page.mouse.move(x+300,y+250);await page.waitForTimeout(700);
    await select(offset-1,offset+1);p=await pointNear('safe');before=await count('safe');await page.mouse.click(p.x,p.y);status=await controllerStatus();
    assert.equal(status.lastPress.blockedBySelection,true,JSON.stringify(status.lastPress));assert.equal(await count('safe'),before);
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();document.getElementById('bait').remove();});await configure(true);
  });
  await run('a link whose page cancels dragging itself keeps its clicks, however the press wanders or lingers',async()=>{
    await configure(true);
    await page.evaluate(()=>{const a=document.createElement('a');a.id='nodrag';a.href='#destination';a.textContent='A wide link that its page will not let you drag';a.style.cssText='left:80px;top:770px;width:330px;height:30px';a.addEventListener('dragstart',e=>e.preventDefault());a.addEventListener('click',e=>e.preventDefault());document.getElementById('testbed').append(a);});
    await page.locator('#nodrag').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    for(const [dx,hold] of [[80,0],[6,1400]]){
      const r=await box('nodrag'),x=r.x+30,y=r.y+r.height/2;await page.mouse.move(x+120,y+70);await page.waitForTimeout(500);
      const before=await count('nodrag'),old=(await controllerStatus()).counters;
      await page.mouse.move(x,y);await page.waitForTimeout(150);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:6});if(hold)await page.waitForTimeout(hold);await page.mouse.up();await page.waitForTimeout(120);
      const now=(await controllerStatus()).counters;
      assert.equal(await count('nodrag'),before+1,`moved ${dx} px, held ${hold} ms`);
      assert.equal(now.preventedLinkDrags,old.preventedLinkDrags);assert.equal(now.rejectedLinkClicks,old.rejectedLinkClicks);
    }
    // The same with a window listener that the page adds after the extension is already running.
    await page.evaluate(()=>{const a=document.getElementById('nodrag');a.id='nodrag2';const fresh=a.cloneNode(true);a.replaceWith(fresh);fresh.addEventListener('click',e=>e.preventDefault());
      window.addEventListener('dragstart',e=>{if(e.target.closest?.('#nodrag2'))e.preventDefault();});});
    {const r=await box('nodrag2'),x=r.x+30,y=r.y+r.height/2;await page.mouse.move(x+120,y+70);await page.waitForTimeout(500);
      const before=await count('nodrag2'),old=(await controllerStatus()).counters;
      await page.mouse.move(x,y);await page.waitForTimeout(150);await page.mouse.down();await page.mouse.move(x+80,y,{steps:6});await page.mouse.up();await page.waitForTimeout(120);
      const now=(await controllerStatus()).counters;assert.equal(await count('nodrag2'),before+1,'window listener added later');
      assert.equal(now.preventedLinkDrags,old.preventedLinkDrags);assert.equal(now.rejectedLinkClicks,old.rejectedLinkClicks);}
    await page.evaluate(()=>document.getElementById('nodrag2').remove());
  });
  await run('a handle marked draggable inside a link is dragged by the page, not cancelled by the guard',async()=>{
    await configure(true);
    await page.evaluate(()=>{const a=document.createElement('a');a.id='handlelink';a.href='#destination';a.style.cssText='left:80px;top:770px;width:260px;height:30px';a.addEventListener('click',e=>e.preventDefault());
      const grip=document.createElement('span');grip.id='grip';grip.draggable=true;grip.textContent='Grip';grip.style.cssText='display:inline-block;width:60px;height:26px;background:#cde';window.gripDrags=[];grip.addEventListener('dragstart',e=>setTimeout(()=>window.gripDrags.push(e.defaultPrevented),0));a.append(grip,' Card title');document.getElementById('testbed').append(a);});
    await page.locator('#handlelink').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    const g=await box('grip'),x=g.x+g.width/2,y=g.y+g.height/2,old=(await controllerStatus()).counters.preventedLinkDrags;
    await page.mouse.move(x,y);await page.waitForTimeout(150);await page.mouse.down();await page.mouse.move(x+60,y+40,{steps:8});await page.mouse.up();await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>window.gripDrags),[false],'the browser began the drag and nothing cancelled it');
    assert.equal((await controllerStatus()).counters.preventedLinkDrags,old);
    await page.evaluate(()=>document.getElementById('handlelink').remove());
  });
  await run('a control nested inside the pressed control: the page receives one trusted click, not a synthetic one',async()=>{
    await configure(true,'stable',false);
    await page.evaluate(()=>{const card=document.createElement('div');card.id='card';card.setAttribute('role','link');card.tabIndex=0;card.style.cssText='left:80px;top:770px;width:240px;height:44px;background:#eef';
      const title=document.createElement('span');title.textContent='Open the reading list';title.style.cssText='position:absolute;left:6px;top:12px';
      const inner=document.createElement('button');inner.id='inner';inner.type='button';inner.textContent='Share';inner.style.cssText='position:absolute;left:150px;top:7px;width:80px;height:30px';
      window.cardClicks=[];card.addEventListener('click',e=>window.cardClicks.push({trusted:e.isTrusted,onCard:e.target===card}));card.append(title,inner);document.getElementById('testbed').append(card);});
    await page.locator('#card').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    const b=await box('inner'),x=b.x-5,y=b.y+b.height/2;
    for(let i=0;i<45;i++){await page.mouse.move(x+(i%2)*.2,y+(i%3)*.1);await page.waitForTimeout(10);}
    await page.mouse.down();await page.mouse.move(x+9,y,{steps:3});await page.mouse.up();await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>window.cardClicks),[{trusted:true,onCard:true}]);
    await page.evaluate(()=>document.getElementById('card').remove());await configure(true);
  });
  await run('after a cancelled drag, a scroll event during the press does not cost the click',async()=>{
    await configure(true);await page.locator('#link').scrollIntoViewIfNeeded();await page.waitForTimeout(300);await page.evaluate(()=>document.getSelection()?.removeAllRanges());
    const r=await box('link'),x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x+150,y+80);await page.waitForTimeout(500);
    const before=await count('link'),old=(await controllerStatus()).counters;
    await page.mouse.move(x,y);await page.waitForTimeout(150);await page.mouse.down();await page.mouse.move(x+8,y+2,{steps:4});
    assert.equal((await controllerStatus()).counters.preventedLinkDrags,old.preventedLinkDrags+1,'the quick drag was cancelled');
    await page.evaluate(()=>document.getElementById('events').dispatchEvent(new Event('scroll')));
    await page.mouse.up();await page.waitForTimeout(120);const now=(await controllerStatus()).counters;
    assert.equal(await count('link'),before+1);assert.equal(now.rejectedLinkClicks,old.rejectedLinkClicks);assert.equal(now.preservedLinkClicks,old.preservedLinkClicks+1);
  });
  await run('after a cancelled drag, a link inside a clickable card: the card never gets a click the browser would not have sent',async()=>{
    await configure(true);
    // Two kinds of card: one marked as a link, and one that only has a script listening for clicks.
    for(const marked of [true,false]){
      await page.evaluate(marked=>{const card=document.createElement('div');card.id='card2';if(marked){card.setAttribute('role','link');card.tabIndex=0;}card.style.cssText='left:80px;top:770px;width:300px;height:44px;background:#eef';
        const a=document.createElement('a');a.id='cardlink';a.href='#destination';a.textContent='Read the review';a.style.cssText='position:absolute;left:8px;top:12px';
        window.cardLog=[];card.addEventListener('click',e=>{window.cardLog.push(e.target===card?'card':'link');e.preventDefault();});card.append(a);document.getElementById('testbed').append(card);},marked);
      await page.locator('#card2').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
      const r=await box('cardlink'),x=r.x+r.width-4,y=r.y+r.height/2;
      const press=async(dx)=>{await page.mouse.move(x-150,y+60);await page.waitForTimeout(400);await page.evaluate(()=>{window.cardLog.length=0;});
        for(let i=0;i<30;i++){await page.mouse.move(x+(i%2)*.2,y);await page.waitForTimeout(10);}
        await page.mouse.down();await page.mouse.move(x+dx,y,{steps:Math.max(3,Math.round(dx/10))});await page.mouse.up();await page.waitForTimeout(120);return await page.evaluate(()=>window.cardLog.slice());};
      const label=marked?'card marked as a link':'card with only a script';
      const old=(await controllerStatus()).counters.preventedLinkDrags;
      // A quick 120 px drag from the link, released on the card: without the guard, a drag and no click at all.
      assert.deepEqual(await press(120),[],label+': nothing is clicked');assert.ok((await controllerStatus()).counters.preventedLinkDrags>old,label+': the drag was cancelled');
      // A 20 px slide off the link onto the card: too far for a steady slip, so nothing is clicked.
      assert.deepEqual(await press(20),[],label+': 20 px');
      // A 9 px slip onto the card. The card never gets the click. Where the outline was on the link (the card with only
      // a script is not a control, so nothing competes with the link), the slip goes to the link. Where the card is
      // itself a control, the two overlap, no outline forms, and nothing is clicked.
      const slip=await press(9),why=await controllerStatus();
      assert.deepEqual(slip,marked?[]:['link'],label+': 9 px '+JSON.stringify({press:why.lastPress,decision:why.lastDecision}));
      await page.evaluate(()=>document.getElementById('card2').remove());
    }
  });
  await run('a mild tremor that leaves the press limit at 12 px still gets help beside a target on text',async()=>{
    // Words that end just left of a button, as in a sentence followed by a control. The hand shakes by 4 px
    // before and during each press, which measures about 3 px: not steady, but the press limit stays 12 px.
    await configure(true,'stable',false);
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();
      const p=document.createElement('p');p.id='words';p.textContent='some ordinary words sit beside this';p.style.cssText='left:20px;top:830px;width:236px;height:20px;margin:0;text-align:right;white-space:nowrap;font:14px/20px sans-serif';
      const b=document.createElement('button');b.id='beside';b.type='button';b.textContent='Open panel';b.style.cssText='left:260px;top:820px;width:100px;height:40px';
      document.getElementById('testbed').append(p,b);});
    await page.locator('#beside').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    const r=await box('beside'),cx=r.x-6,cy=r.y+r.height/2;let delivered=0;const presses=[];
    // Twelve attempts in a row, as a person would make them. The selection is not cleared between attempts.
    for(let k=0;k<12;k++){
      await page.mouse.move(cx+400,cy-300);await page.waitForTimeout(600);const before=await count('beside');
      const start=Date.now(),phase=k*Math.PI/3+0.4;let down=false,upAt=0;
      for(;;){const t=(Date.now()-start)/1000;await page.mouse.move(cx+4*Math.sin(2*Math.PI*6*t+phase),cy+2*Math.sin(2*Math.PI*6*t+phase+1));
        if(!down&&t>0.65){await page.mouse.down();down=true;upAt=t+0.1;}else if(down&&t>=upAt){await page.mouse.up();break;}
        await page.waitForTimeout(8);}
      await page.waitForTimeout(120);const st=await controllerStatus();presses.push({shake:st.lastPress?.shakePx,limit:st.lastPress?.slipLimitPx,ruledOut:st.lastDecision?.ruledOut});
      if(await count('beside')===before+1)delivered++;
    }
    assert.ok(presses.filter(p=>p.shake>=2&&p.limit===12).length>=9,'measured as mild shake: '+JSON.stringify(presses));
    assert.ok(delivered>=10,`delivered ${delivered} of 12: `+JSON.stringify(presses));
    await page.evaluate(()=>{document.getSelection()?.removeAllRanges();document.getElementById('words').remove();document.getElementById('beside').remove();});await configure(true);
  });
  await run('5,000-link indexing preserves native clicks; 6,000-control cap abstains',async()=>{
    await page.locator('#stress').click();await page.waitForTimeout(350);const before=await count('safe');await page.locator('#safe').click();assert.equal(await count('safe'),before+1);
    await page.evaluate(()=>{const f=document.createDocumentFragment();for(let i=0;i<1100;i++){const a=document.createElement('a');a.href='#destination';a.textContent='Extra '+i;f.appendChild(a);}document.getElementById('stressfield').appendChild(f);});await page.waitForTimeout(350);
    const p=await pointNear('safe'),n=await count('safe');await page.mouse.click(p.x,p.y);assert.equal(await count('safe'),n);
  });
  await run('lab simulation and recording exports run without page errors',async()=>{await page.goto(base+'/lab/index.html');await page.locator('#trials').selectOption('100');await page.locator('#run').click();await page.waitForFunction(()=>document.getElementById('progress').textContent.startsWith('Done'),undefined,{timeout:60000});assert.equal(await page.locator('#results tr').count(),16);await page.locator('#record').click();await page.locator('.target.intended').click();await page.waitForTimeout(250);await page.locator('#stop').click();const downloadPromise=page.waitForEvent('download');await page.locator('#exportTrace').click();const download=await downloadPromise;const saved=await download.path();const trace=JSON.parse(fs.readFileSync(saved,'utf8'));assert.equal(trace.source,'lab-recording');require('../benchmark/replay.js').validateTrace(trace);});
  await run('press/release recording stops on activation without a physical mouse press',async()=>{
    await page.locator('#discard').click();await page.locator('#record').click();
    await page.locator('.target.intended').focus();await page.keyboard.press('Enter');
    assert.match(await page.locator('#prompt').textContent(),/activation without a mouse press/);
    assert.equal(await page.locator('#stop').isDisabled(),true);assert.equal(await page.locator('#exportTrace').isDisabled(),true);
  });
  if(!controllerOnly){
    // 0.1.5: catalog-driven pages, keyboard shortcuts, outline style and dark mode, in the installed extension.
    await run('keyboard shortcuts are registered with their catalog descriptions',async()=>{
      const commands=await worker.evaluate(async()=>await chrome.commands.getAll());
      const toggle=commands.find(c=>c.name==='toggle-tab'),pause=commands.find(c=>c.name==='pause-everywhere');
      assert.equal(toggle.description,'Turn assistance on or off on this tab');assert.equal(toggle.shortcut,'Alt+Shift+S');
      assert.equal(pause.description,'Pause or resume assistance everywhere');assert.equal(pause.shortcut,'');
    });
    await run('settings page renders from the catalog, shows the manifest version, and saves the outline style',async()=>{
      const ui=await context.newPage();const uiErrors=[];ui.on('pageerror',e=>uiErrors.push(e.message));
      await ui.goto(`chrome-extension://${extensionId}/ui/options.html`);await ui.waitForFunction(()=>document.getElementById('dwellMs').value!=='');
      assert.equal(await ui.title(),'OpenSteady settings');assert.equal(await ui.locator('html').getAttribute('lang'),'en');
      const version=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8')).version;
      assert.match(await ui.locator('#version').textContent(),new RegExp('^Version '+version.replace(/\./g,'\\.')+' '));
      assert.equal(await ui.locator('#outline option').count(),3);assert.equal(await ui.locator('kbd').first().textContent(),'Escape');
      await ui.locator('#outline').selectOption('contrast');await ui.locator('#save').click();await ui.waitForFunction(()=>document.getElementById('status').textContent==='Saved.');
      assert.equal((await worker.evaluate(async()=>(await chrome.storage.local.get('settings')).settings)).outline,'contrast');
      await ui.emulateMedia({colorScheme:'dark'});assert.equal(await ui.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor),'rgb(16, 26, 30)');
      await ui.locator('#outline').selectOption('standard');await ui.locator('#save').click();await ui.waitForFunction(()=>document.getElementById('status').textContent==='Saved.');
      assert.deepEqual(uiErrors,[]);await ui.close();
    });
    await run('popup opened outside a webpage explains itself and shows the tab shortcut',async()=>{
      const ui=await context.newPage();const uiErrors=[];ui.on('pageerror',e=>uiErrors.push(e.message));
      await ui.goto(`chrome-extension://${extensionId}/ui/popup.html`);
      await ui.waitForFunction(()=>document.getElementById('shortcut').textContent!=='');
      assert.match(await ui.locator('#shortcut').textContent(),/Alt\+Shift\+S/);
      await ui.waitForFunction(()=>document.getElementById('status').textContent!=='Checking this page…');
      assert.equal(await ui.locator('#status').textContent(),'Open a regular webpage to use OpenSteady.');
      assert.deepEqual(uiErrors,[]);await ui.close();
    });
  }
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(root,'results/lab.png'),fullPage:true});
  fs.writeFileSync(path.join(root,controllerOnly?'results/browser-controller.json':'results/browser.json'),JSON.stringify({generatedAt:new Date().toISOString(),browser:context.browser()?.version()||'Chromium',mode:controllerOnly?'isolated-controller-only':'extension-localhost-fixture',extensionId,results,measurements,errors,limits:controllerOnly?['No extension installation, permission, messaging, or service-worker integration exercised.']:['Localhost fixture manifest has a test-only host permission.']},null,2)+'\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;fs.mkdirSync(path.join(root,'results'),{recursive:true});fs.writeFileSync(path.join(root,controllerOnly?'results/browser-controller.json':'results/browser.json'),JSON.stringify({status:'failed-or-blocked',error:error.message,results},null,2)+'\n');}).finally(async()=>{if(context)await context.close();if(browser)await browser.close();server.close();if(profile)fs.rmSync(profile,{recursive:true,force:true});});
