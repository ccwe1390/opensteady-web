// Earlier builds told people to hold Alt to bypass assistance. What does Chrome itself do with Alt + click on a link?
// No extension involved. Written by Claude (AI assistant), 2026-10-02.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const here=__dirname;
const server=http.createServer((req,res)=>{const f=path.join(here,decodeURIComponent(new URL(req.url,'http://l').pathname));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html');res.end(d);});});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const b=await chromium.launch({headless:true});const ctx=await b.newContext({acceptDownloads:true});const page=await ctx.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/page.html');
  await page.evaluate(()=>{const a=document.createElement('a');a.id='real';a.href='page.html?x=1';a.textContent='A real link';a.style.cssText='position:fixed;left:600px;top:40px';document.body.append(a);});
  let downloads=0;page.on('download',()=>downloads++);
  const r=await page.locator('#real').boundingBox();
  await page.keyboard.down('Alt');await page.mouse.click(r.x+10,r.y+8);await page.keyboard.up('Alt');await page.waitForTimeout(1500);
  console.log('Alt + click on a link: downloads started =',downloads,'| navigated =',page.url().includes('x=1'));
  await b.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
