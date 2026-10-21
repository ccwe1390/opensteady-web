// What does the quick drag guard do to a deliberate long drag of a link?
// Written by Claude (AI assistant), 2026-10-02.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const extension=path.resolve(__dirname,'../extension'),here=__dirname;
const FILES=JSON.parse(fs.readFileSync(path.join(extension,'background.js'),'utf8').match(/const FILES = (\[[^\]]*\])/)[1].replace(/'/g,'"'));
const server=http.createServer((req,res)=>{const f=path.join(here,decodeURIComponent(new URL(req.url,'http://l').pathname));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html');res.end(d);});});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'osdrag-'));const fx=path.join(profile,'ext');fs.cpSync(extension,fx,{recursive:true});
  const m=JSON.parse(fs.readFileSync(path.join(fx,'manifest.json'),'utf8'));m.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(fx,'manifest.json'),JSON.stringify(m));
  const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1100,height:800},args:[`--disable-extensions-except=${fx}`,`--load-extension=${fx}`]});
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const page=await ctx.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/page.html');
  const tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('/page.html')).id;});
  const configure=async(dragGuard)=>{await worker.evaluate(async({tabId,FILES,dragGuard})=>{
      const config={enabled:true,mode:'stable',doubleGuard:true,radius:24,dwellEnabled:false,dwellMs:900,dragGuard};
      await chrome.storage.local.set({settings:{...config,sites:[]}});await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled:true}});
      await chrome.scripting.executeScript({target:{tabId},files:FILES});await chrome.tabs.sendMessage(tabId,{type:'configure',config,resume:true},{frameId:0});
    },{tabId,FILES,dragGuard});await page.waitForTimeout(300);};
  await page.evaluate(()=>{window.ev=[];for(const t of ['dragstart','dragend'])document.addEventListener(t,e=>{const i=window.ev.push(t)-1;setTimeout(()=>{if(e.defaultPrevented)window.ev[i]=t+'(cancelled)';},0);});});
  const r=await page.locator('.links a').nth(2).boundingBox();
  const drag=async(label,waitMs)=>{
    await page.evaluate(()=>{window.ev=[];window.clicks=[];});
    await page.mouse.move(r.x+20,r.y+r.height/2);await page.waitForTimeout(200);
    await page.mouse.down();await page.waitForTimeout(waitMs);await page.mouse.move(r.x+320,r.y+220,{steps:25});await page.waitForTimeout(150);await page.mouse.up();
    await page.waitForTimeout(150);
    const out=await page.evaluate(()=>({ev:window.ev,clicks:window.clicks.length}));
    console.log(label.padEnd(58),'events:',JSON.stringify(out.ev),' clicks on the link:',out.clicks);
  };
  await configure(false);await drag('guard off: drag a link 370 px at once',0);
  await configure(true); await drag('guard on:  drag a link 370 px at once',0);
  await drag('guard on:  press, wait 0.7 s, then drag a link 370 px',700);
  await ctx.close();server.close();fs.rmSync(profile,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1);});
