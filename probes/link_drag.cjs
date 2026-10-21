// Does a real browser turn a shaking press on a link into a drag? Extension not involved.
// Written by Claude (AI assistant), 2026-10-02.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const R=require('../benchmark/robot.js');const here=__dirname;
const server=http.createServer((req,res)=>{const f=path.join(here,decodeURIComponent(new URL(req.url,'http://l').pathname));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.html')?'text/html':'text/javascript');res.end(d);});});
const sleepUntil=async t=>{const d=t-performance.now();if(d>1)await new Promise(r=>setTimeout(r,d-1));while(performance.now()<t){}};
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1100,height:800}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/page.html');
  await page.evaluate(()=>{window.drags=0;window.addEventListener('dragstart',()=>window.drags++,true);});
  const rects=await page.evaluate(()=>[...document.querySelectorAll('.t')].map(e=>{const r=e.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height,tag:e.tagName};}));
  const rand=R.rng(77);const by={BUTTON:{n:0,onOn:0,clicked:0,drag:0},A:{n:0,onOn:0,clicked:0,drag:0}};
  for(let k=0;k<88;k++){
    const idx=k%rects.length,tr=R.makeTrial(rects[idx],8,rand,{w:1100,h:800});
    await page.evaluate(()=>{window.clicks=[];window.drags=0;});
    await page.mouse.move(tr.samples[0].x,tr.samples[0].y);await page.waitForTimeout(150);
    const t0=performance.now();
    for(let i=0;i<=tr.up;i++){if(i%2===1&&i!==tr.down&&i!==tr.up)continue;await sleepUntil(t0+tr.samples[i].t*1000);const s=tr.samples[i];await page.mouse.move(s.x,s.y);if(i===tr.down)await page.mouse.down();if(i===tr.up)await page.mouse.up();}
    await page.waitForTimeout(50);
    const inside=(s)=>{const r=rects[idx];return s.x>=r.x&&s.x<=r.x+r.w&&s.y>=r.y&&s.y<=r.y+r.h;};
    const both=inside(tr.samples[tr.down])&&inside(tr.samples[tr.up]);
    const {clicks,drags}=await page.evaluate(()=>({clicks:window.clicks,drags:window.drags}));
    const g=by[rects[idx].tag];g.n++;if(both){g.onOn++;if(clicks.some(c=>c.i===idx))g.clicked++;if(drags)g.drag++;}
  }
  for(const [tag,g] of Object.entries(by))console.log(`${tag}: ${g.n} trials; press and release both on the target in ${g.onOn}; of those, click delivered in ${g.clicked}, browser started a drag in ${g.drag}`);
  await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
