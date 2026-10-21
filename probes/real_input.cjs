// Drive the INSTALLED extension with trusted mouse input (sent through the browser's automation interface)
// along scripted tremor paths, in real time.
// Usage: node probes/real_input.cjs [trials per condition] [amplitudes]   e.g.  node probes/real_input.cjs 66 8,16
// Prints one JSON line per condition. Written by Claude (AI assistant), 2026-10-02.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const R=require('../benchmark/robot.js');
const extension=path.resolve(__dirname,'../extension');const trials=Number(process.argv[2]??44);const amps=(process.argv[3]??'8,16').split(',').map(Number);
const here=__dirname;
const server=http.createServer((req,res)=>{const f=path.join(here,decodeURIComponent(new URL(req.url,'http://l').pathname));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.html')?'text/html':'text/javascript');res.end(d);});});
const sleepUntil=async t=>{const d=t-performance.now();if(d>1)await new Promise(r=>setTimeout(r,d-1));while(performance.now()<t){}};
const FILES=JSON.parse(fs.readFileSync(path.join(extension,'background.js'),'utf8').match(/const FILES = (\[[^\]]*\])/)[1].replace(/'/g,'"'));
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'osreal-'));const fx=path.join(profile,'ext');fs.cpSync(extension,fx,{recursive:true});
  const m=JSON.parse(fs.readFileSync(path.join(fx,'manifest.json'),'utf8'));m.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(fx,'manifest.json'),JSON.stringify(m));
  const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1100,height:800},args:[`--disable-extensions-except=${fx}`,`--load-extension=${fx}`]});
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const page=await ctx.newPage();await page.goto(base+'/page.html');
  const tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('/page.html')).id;});
  const configure=async(enabled,dragGuard=true)=>{await worker.evaluate(async({tabId,enabled,FILES,dragGuard})=>{
      await chrome.storage.local.set({settings:{enabled:true,sites:[],mode:'stable',doubleGuard:true,radius:24,dwellEnabled:false,dwellMs:900,dragGuard}});
      await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled}});
      await chrome.scripting.executeScript({target:{tabId},files:FILES});
      await chrome.tabs.sendMessage(tabId,{type:'configure',config:{enabled,mode:'stable',doubleGuard:true,radius:24,dwellEnabled:false,dwellMs:900,dragGuard},resume:true},{frameId:0});
    },{tabId,enabled,FILES,dragGuard});await page.waitForTimeout(300);};
  const status=async()=>await worker.evaluate(async id=>await chrome.tabs.sendMessage(id,{type:'status'},{frameId:0}),tabId);
  const rects=await page.evaluate(()=>[...document.querySelectorAll('.t')].map(e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height};}));
  const rows=[];const holds=[],lags=[],planned=[];const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  for(const rms of amps){
    for(const [cond,enabled,guard] of [['extension off',false,true],['defaults',true,true],['quick drag guard switched off',true,false]]){
      await configure(enabled,guard);const before=enabled?(await status()).counters:null;
      const rand=R.rng(20261002+rms);const tally={correct:0,wrong:0,miss:0,untrustedDelivered:0,linkCorrect:0,linkN:0,buttonCorrect:0,buttonN:0};
      for(let k=0;k<trials;k++){
        const idx=k%rects.length;const tr=R.makeTrial(rects[idx],rms,rand,{w:1100,h:800});
        await page.evaluate(()=>{window.clicks=[];});
        await page.mouse.move(tr.samples[0].x,tr.samples[0].y);await page.waitForTimeout(700);   // rest, so the selector starts fresh
        const t0=performance.now();
        let downAt=0;
        for(let i=0;i<=tr.up;i++){
          if(i%2===1&&i!==tr.down&&i!==tr.up)continue;                 // 50 moves a second keeps the schedule honest
          await sleepUntil(t0+tr.samples[i].t*1000);
          const s=tr.samples[i];await page.mouse.move(s.x,s.y);
          if(i===tr.down){await page.mouse.down();downAt=performance.now();}
          if(i===tr.up){await page.mouse.up();holds.push(performance.now()-downAt);lags.push(performance.now()-(t0+tr.samples[i].t*1000));planned.push((tr.samples[tr.up].t-tr.samples[tr.down].t)*1000);}
        }
        await page.waitForTimeout(60);
        const clicks=await page.evaluate(()=>window.clicks);
        if(!clicks.length)tally.miss++;else{if(clicks[0].i===idx)tally.correct++;else tally.wrong++;if(!clicks[0].trusted)tally.untrustedDelivered++;}const isLink=idx>=12&&idx<=19;if(isLink)tally.linkN++;else tally.buttonN++;if(clicks.length&&clicks[0].i===idx){if(isLink)tally.linkCorrect++;else tally.buttonCorrect++;}
      }
      const after=enabled?(await status()).counters:null;
      rows.push({rms,cond,...tally,redirects:after?after.redirects-before.redirects:0,preventedDrags:after?(after.preventedLinkDrags||0)-(before.preventedLinkDrags||0):0,rejected:after?(after.rejectedLinkClicks||0)-(before.rejectedLinkClicks||0):0});
      console.log(JSON.stringify(rows[rows.length-1]));
    }
  }
  console.log(`timing: planned hold ${mean(planned).toFixed(0)} ms, actual hold ${mean(holds).toFixed(0)} ms, schedule lag at release ${mean(lags).toFixed(0)} ms`);
  console.log('browser: '+(await page.evaluate(()=>navigator.userAgent)).match(/Chrome\/[\d.]+/)?.[0]+', '+process.platform+', '+trials+' trials per condition');
  await ctx.close();server.close();fs.rmSync(profile,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1);});
