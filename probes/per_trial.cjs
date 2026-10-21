// Per-trial detail: where do "extension off" and "defaults" differ, and is a text selection present at the press?
// Written by Claude (AI assistant), 2026-10-02.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const R=require('../benchmark/robot.js');
const extension=path.resolve(__dirname,'../extension'),here=__dirname;const trials=Number(process.argv[2]??66),rms=Number(process.argv[3]??8);
const FILES=JSON.parse(fs.readFileSync(path.join(extension,'background.js'),'utf8').match(/const FILES = (\[[^\]]*\])/)[1].replace(/'/g,'"'));
const server=http.createServer((req,res)=>{const f=path.join(here,decodeURIComponent(new URL(req.url,'http://l').pathname));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html');res.end(d);});});
const sleepUntil=async t=>{const d=t-performance.now();if(d>1)await new Promise(r=>setTimeout(r,d-1));while(performance.now()<t){}};
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ospt-'));const fx=path.join(profile,'ext');fs.cpSync(extension,fx,{recursive:true});
  const m=JSON.parse(fs.readFileSync(path.join(fx,'manifest.json'),'utf8'));m.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(fx,'manifest.json'),JSON.stringify(m));
  const ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1100,height:800},args:[`--disable-extensions-except=${fx}`,`--load-extension=${fx}`]});
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const page=await ctx.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/page.html');
  const tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('/page.html')).id;});
  const configure=async(enabled)=>{await worker.evaluate(async({tabId,FILES,enabled})=>{
      const config={enabled,mode:'stable',doubleGuard:true,radius:24,dwellEnabled:false,dwellMs:900,dragGuard:true};
      await chrome.storage.local.set({settings:{...config,enabled:true,sites:[]}});await chrome.storage.session.set({['tab:'+tabId]:{site:'http://127.0.0.1',enabled}});
      await chrome.scripting.executeScript({target:{tabId},files:FILES});await chrome.tabs.sendMessage(tabId,{type:'configure',config,resume:true},{frameId:0});
    },{tabId,FILES,enabled});await page.waitForTimeout(300);};
  const status=async()=>await worker.evaluate(async id=>await chrome.tabs.sendMessage(id,{type:'status'},{frameId:0}),tabId);
  await page.evaluate(()=>{window.sel=[];window.drags=[];window.addEventListener('pointerdown',()=>{const s=getSelection();window.sel.push(!!s&&!s.isCollapsed);},true);window.addEventListener('dragstart',e=>{setTimeout(()=>window.drags.push(e.defaultPrevented?'cancelled':'native'),0);},true);});
  const rects=await page.evaluate(()=>[...document.querySelectorAll('.t')].map(e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height};}));
  const out={};
  for(const enabled of [false,true]){
    await configure(enabled);await page.evaluate(()=>{getSelection().removeAllRanges();});
    const rand=R.rng(20261002+rms);const rowsOut=[];let prev=enabled?(await status()).counters:null;
    for(let k=0;k<trials;k++){
      const idx=k%rects.length,tr=R.makeTrial(rects[idx],rms,rand,{w:1100,h:800});
      await page.evaluate(()=>{window.clicks=[];window.sel=[];window.drags=[];});
      await page.mouse.move(tr.samples[0].x,tr.samples[0].y);await page.waitForTimeout(700);
      const t0=performance.now();
      for(let i=0;i<=tr.up;i++){if(i%2===1&&i!==tr.down&&i!==tr.up)continue;await sleepUntil(t0+tr.samples[i].t*1000);const s=tr.samples[i];await page.mouse.move(s.x,s.y);if(i===tr.down)await page.mouse.down();if(i===tr.up)await page.mouse.up();}
      await page.waitForTimeout(60);
      const {clicks,sel,drags}=await page.evaluate(()=>({clicks:window.clicks,sel:window.sel,drags:window.drags}));
      const inside=(s,r)=>s.x>=r.x&&s.x<=r.x+r.w&&s.y>=r.y&&s.y<=r.y+r.h;
      let delta=null,press=null;if(enabled){const st=await status(),c=st.counters;press={...st.lastPress,decision:st.lastDecision};delta={guarded:c.guarded-prev.guarded,redirects:c.redirects-prev.redirects,errors:c.errors-prev.errors};prev=c;}
      let excursion=0;for(let i=tr.down;i<=tr.up;i++)excursion=Math.max(excursion,Math.hypot(tr.samples[i].x-tr.samples[tr.down].x,tr.samples[i].y-tr.samples[tr.down].y));
      const which=s=>rects.findIndex(r=>inside(s,r));
      rowsOut.push({k,idx,drag:drags[0]??null,ok:clicks.length>0&&clicks[0].i===idx,wrong:clicks.length>0&&clicks[0].i!==idx,clicked:clicks[0]?.i??null,trusted:clicks[0]?.trusted??null,nClicks:clicks.length,selAtPress:sel[0]??null,press,excursion:Math.round(excursion*10)/10,pressOn:which(tr.samples[tr.down]),releaseOn:which(tr.samples[tr.up]),downIn:inside(tr.samples[tr.down],rects[idx]),upIn:inside(tr.samples[tr.up],rects[idx]),delta});
    }
    out[enabled?'on':'off']=rowsOut;
  }
  const diff=out.off.filter((r,i)=>r.ok!==out.on[i].ok).map(r=>({off:r,on:out.on[r.k]}));
  console.log(`rms ${rms}: correct off=${out.off.filter(r=>r.ok).length} on=${out.on.filter(r=>r.ok).length}; trials that differ: ${diff.length}`);
  for(const d of diff)console.log(JSON.stringify(d));
  const why=r=>r.pressOn!==-1&&r.pressOn!==r.idx?'pressed on a neighboring control':r.drag==='native'?'the browser started its own drag':r.press&&(r.excursion>r.press.slipLimitPx||r.press.decision?.ruledOut==='press-not-a-click')?'wandered past the allowed distance':r.pressOn===-1&&r.releaseOn!==-1&&r.releaseOn!==r.idx?'near miss released on another control':r.pressOn===-1&&r.releaseOn===r.idx&&r.press?.outlined&&r.press.decision?.reason==='no-safe-correction'?'pressed beside the target while the outline was on a neighbor':'other';
  const tallyWhy={};for(const r of out.on.filter(r=>!r.ok&&!r.wrong)){const k=why(r);tallyWhy[k]=(tallyWhy[k]||0)+1;}
  console.log('misses with the extension on, by cause:',JSON.stringify(tallyWhy));
  for(const r of out.on.filter(r=>!r.ok&&!r.wrong&&why(r)==='other'))console.log('OTHER',JSON.stringify(r));
  for(const cond of ['off','on'])for(const r of out[cond].filter(r=>r.wrong))console.log('WRONG ('+cond+')',JSON.stringify(r));
  console.log(`wrong clicks: off ${out.off.filter(r=>r.wrong).length}, on ${out.on.filter(r=>r.wrong).length}`);
  console.log(`selection present at the press: off ${out.off.filter(r=>r.selAtPress).length}/${trials}, on ${out.on.filter(r=>r.selAtPress).length}/${trials}`);
  await ctx.close();server.close();fs.rmSync(profile,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1);});
