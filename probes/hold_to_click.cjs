// How long does hold to click take to fire while the pointer jitters?  node probes/hold_to_click.cjs [jitter px] [moves per second]
// Written by Claude (AI assistant), 2026-10-02.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),extension=path.join(root,'extension');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://l').pathname));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(f)]||'text/plain');res.end(d);});});
const FILES=JSON.parse(fs.readFileSync(path.join(extension,'background.js'),'utf8').match(/const FILES = (\[[^\]]*\])/)[1].replace(/'/g,'"'));
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'osprobe-'));const fx=path.join(profile,'ext');fs.cpSync(extension,fx,{recursive:true});
  const m=JSON.parse(fs.readFileSync(path.join(fx,'manifest.json'),'utf8'));m.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(fx,'manifest.json'),JSON.stringify(m));
  const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),viewport:{width:1200,height:1000},args:[`--disable-extensions-except=${fx}`,`--load-extension=${fx}`]});
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const page=await ctx.newPage();await page.goto(base+'/lab/fixtures.html');
  const tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('/lab/fixtures.html')).id;});
  await worker.evaluate(async({tabId,FILES})=>{
    await chrome.storage.local.set({settings:{enabled:true,sites:[],mode:'stable',doubleGuard:true,radius:24,dwellEnabled:true,dwellMs:900}});
    await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled:true}});
    await chrome.scripting.executeScript({target:{tabId},files:FILES});
    await chrome.tabs.sendMessage(tabId,{type:'configure',config:{enabled:true,mode:'stable',doubleGuard:true,radius:24,dwellEnabled:true,dwellMs:900},resume:true},{frameId:0});
  },{tabId,FILES});
  await page.waitForTimeout(300);
  await page.evaluate(()=>{const b=document.createElement('button');b.id='dwell-small';b.type='button';b.setAttribute('aria-label','Open detail');b.textContent='•';b.style.cssText='position:absolute;left:650px;top:80px;width:20px;height:20px;padding:0;';window.dwellCount=0;window.dwellAt=null;b.addEventListener('click',()=>{window.dwellCount++;window.dwellAt=performance.now();});document.getElementById('testbed').append(b);});
  const r=await page.locator('#dwell-small').boundingBox();
  const status=async()=>await worker.evaluate(async id=>await chrome.tabs.sendMessage(id,{type:'status'},{frameId:0}),tabId);
  const jitter=Number(process.argv[2]??4), hz=Number(process.argv[3]??100), reps=Number(process.argv[4]??6), limit=6000;
  const times=[];
  for(let k=0;k<reps;k++){
    await page.mouse.move(r.x+120,r.y+60);await page.waitForTimeout(450);           // rearm: away 32 px for 250 ms
    await page.evaluate(()=>{window.dwellAt=null;});
    const start=await page.evaluate(()=>performance.now());let got=null;
    for(let i=0;;i++){
      await page.mouse.move(r.x+10+jitter*Math.sin(i*0.9),r.y+10+jitter*Math.cos(i*0.9));await page.waitForTimeout(1000/hz);
      const at=await page.evaluate(()=>window.dwellAt);if(at){got=at-start;break;}
      if(await page.evaluate(()=>performance.now())-start>limit)break;
    }
    times.push(got===null?null:Math.round(got));
  }
  const s=await status();
  console.log(`jitter ${jitter}px at ${hz} moves/s  ms to activation (null = none in 6 s): ${JSON.stringify(times)}`);
  await ctx.close();server.close();fs.rmSync(profile,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1);});
