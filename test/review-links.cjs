'use strict';
// Paired replay of supplied review geometry with trusted browser input.
// Controller-only mode cannot verify installed-extension permission/messaging flows.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const R=require('../benchmark/robot.js');
const root=path.resolve(__dirname,'..'),extension=path.join(root,'extension'),files=['core/selector.js','core/policy.js','core/dwell.js','core/link-drag.js','core/jitter.js','core/settings.js','targets.js','content.js'];
const controllerOnly=process.env.BROWSER_CONTROLLER_ONLY==='1';
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(__dirname,'review-page.html')));});
let browser,context,profile;
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/review-page.html';
 let worker,tabId;
 if(controllerOnly){browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox']});context=await browser.newContext({viewport:{width:1100,height:800}});}
 else{
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'opensteady-review-links-'));const fx=path.join(profile,'extension');fs.cpSync(extension,fx,{recursive:true});
  const manifest=JSON.parse(fs.readFileSync(path.join(fx,'manifest.json'),'utf8'));manifest.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(fx,'manifest.json'),JSON.stringify(manifest));
  context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',executablePath:process.env.CHROME_EXECUTABLE,viewport:{width:1100,height:800},args:[`--disable-extensions-except=${fx}`,`--load-extension=${fx}`]});
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 }
 const page=await context.newPage();await page.goto(url);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let cdp,executionContextId;
 if(controllerOnly){
  cdp=await context.newCDPSession(page);const {frameTree}=await cdp.send('Page.getFrameTree');({executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'opensteady-review'}));
  for(const file of files){const r=await cdp.send('Runtime.evaluate',{expression:fs.readFileSync(path.join(extension,file),'utf8'),contextId:executionContextId});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);}
 }else tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('review-page.html')).id;});
 async function configure(dragGuard){
  const config={enabled:true,mode:'stable',doubleGuard:false,radius:24,dwellEnabled:false,dwellMs:900,dragGuard};
  if(controllerOnly)await cdp.send('Runtime.evaluate',{expression:`globalThis.__openSteadyController.configure(${JSON.stringify(config)})`,contextId:executionContextId});
  else await worker.evaluate(async({tabId,config,files})=>{await chrome.storage.local.set({settings:{...config,sites:[]}});await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled:true}});await chrome.scripting.executeScript({target:{tabId},files});await chrome.tabs.sendMessage(tabId,{type:'configure',config,resume:true},{frameId:0});},{tabId,config,files});
  await page.waitForTimeout(300);
 }
 const rects=await page.evaluate(()=>[...document.querySelectorAll('.t')].map(e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height,tag:e.tagName};}));
 const rand=R.rng(77),trials=[];
 for(let k=0;k<88;k++){const id=k%rects.length,rect=rects[id],tr=R.makeTrial(rect,8,rand,{w:1100,h:800});if(rect.tag==='A')trials.push({id,rect,...tr});}
 const rows=[];
 for(const guard of [false,true]){
  await configure(guard);let correct=0,wrong=0,miss=0,onOn=0,onOnCorrect=0;const outcomes=[];
  for(const tr of trials){
   await page.evaluate(()=>{window.clicks=[];document.getSelection()?.removeAllRanges();});
   await page.mouse.move(tr.samples[0].x,tr.samples[0].y);await page.waitForTimeout(150);const began=performance.now();
   for(let i=0;i<=tr.up;i++){
    if(i%2===1&&i!==tr.down&&i!==tr.up)continue;const s=tr.samples[i],remaining=began+s.t*1000-performance.now();if(remaining>0)await new Promise(r=>setTimeout(r,remaining));
    await page.mouse.move(s.x,s.y);if(i===tr.down)await page.mouse.down();if(i===tr.up)await page.mouse.up();
   }
   await page.waitForTimeout(50);const clicks=await page.evaluate(()=>window.clicks),first=clicks[0];
   const outcome=!first?'miss':first.i===tr.id?'correct':'wrong';if(outcome==='miss')miss++;else if(outcome==='correct')correct++;else wrong++;
   const inside=s=>s.x>=tr.rect.x&&s.x<=tr.rect.x+tr.rect.w&&s.y>=tr.rect.y&&s.y<=tr.rect.y+tr.rect.h;
   const both=inside(tr.samples[tr.down])&&inside(tr.samples[tr.up]);if(both){onOn++;if(outcome==='correct')onOnCorrect++;}
   outcomes.push({intended:tr.id,outcome,pressAndReleaseInside:both,clicks});
  }
  const row={dragGuard:guard,n:trials.length,correct,wrong,miss,pressAndReleaseInside:onOn,correctInside:onOnCorrect,outcomes};rows.push(row);console.log(JSON.stringify({...row,outcomes:undefined}));
 }
 const result={generatedAt:new Date().toISOString(),browser:context.browser().version(),mode:controllerOnly?'isolated-controller-only':'extension-localhost-fixture',seed:77,syntheticRmsPx:8,rows,errors,limits:['Scripted input, not participant data.','Review geometry only; native wrong-target clicks are never reassigned.',...(controllerOnly?['Installed-extension integration was not exercised.']:['Fixture-only host grant bypasses native permission prompts.'])]};
 fs.writeFileSync(path.join(root,'results/review-links.json'),JSON.stringify(result,null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(context)await context.close();if(browser)await browser.close();server.close();if(profile)fs.rmSync(profile,{recursive:true,force:true});});
