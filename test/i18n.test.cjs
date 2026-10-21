'use strict';
// Message catalog consistency. Chrome implements getMessage; this checks the catalog and its users agree.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ext=path.join(__dirname,'../extension'),read=p=>fs.readFileSync(path.join(ext,p),'utf8');
const en=JSON.parse(read('_locales/en/messages.json')),manifest=JSON.parse(read('manifest.json'));
const keysIn=(text,re)=>[...text.matchAll(re)].map(m=>m[1]);
// Chrome semantics: $NAME$ names a placeholder whose content refers to substitution $1..$9.
function getMessage(key,subs=[]){
  const entry=en[key];if(!entry)return'';
  return entry.message.replace(/\$([A-Za-z0-9_]+)\$/g,(_,name)=>{const ph=entry.placeholders?.[name.toLowerCase()];assert.ok(ph,`${key}: undefined placeholder ${name}`);return ph.content.replace(/\$(\d)/g,(__,n)=>String(subs[n-1]??''));});
}
test('every message key used by the manifest, pages and scripts exists',()=>{
  const used=new Set([...keysIn(JSON.stringify(manifest),/__MSG_(\w+)__/g),
    ...['ui/popup.html','ui/options.html'].flatMap(f=>keysIn(read(f),/data-i18n="(\w+)"/g)),
    ...['ui/popup.js','ui/options.js','background.js'].flatMap(f=>keysIn(read(f),/\bt\('(\w+)'/g))]);
  assert.ok(used.size>50);for(const key of used)assert.ok(en[key],'missing message '+key);
});
test('placeholders are defined, numbered in order, and substitute',()=>{
  for(const [key,entry] of Object.entries(en)){
    const named=keysIn(entry.message,/\$([A-Za-z0-9_]+)\$/g).map(n=>n.toLowerCase());
    assert.deepEqual(named.sort(),Object.keys(entry.placeholders||{}).sort(),key);
  }
  assert.equal(getMessage('statsCounts',['3','1']),'Corrections: 3 · Repeat clicks blocked: 1');
  assert.equal(getMessage('statusOn',['https://example.com']),'On · https://example.com');
});
test('page fallback text matches the catalog, so a missing chrome.i18n changes nothing',()=>{
  for(const f of ['ui/popup.html','ui/options.html']){
    for(const m of read(f).matchAll(/<(\w+)[^>]*?data-i18n="(\w+)"[^>]*>(.*?)<\/\1>/gs)){
      const shown=m[3].replace(/<kbd>(.*?)<\/kbd>/g,'[[$1]]').replace(/&amp;/g,'&');
      assert.equal(shown,en[m[2]].message,`${f}: ${m[2]}`);
    }
  }
});
test('manifest strings fit Chrome Web Store limits and no unused message remains',()=>{
  assert.ok(getMessage('extDescription').length<=132);assert.ok(getMessage('extName').length<=75);
  const all=['manifest.json','ui/popup.html','ui/options.html','ui/popup.js','ui/options.js','ui/i18n.js','background.js'].map(read).join('\n');
  for(const key of Object.keys(en))assert.ok(all.includes(`'${key}'`)||all.includes(`"${key}"`)||all.includes(`__MSG_${key}__`)||/^optDwell\d+$/.test(key)&&all.includes(key),'unused message '+key);
});
test('the i18n helper renders [[Key]] as kbd without parsing HTML',()=>{
  const I=require('../extension/ui/i18n.js');
  const made=[];const doc={createElement:tag=>{const el={tag,textContent:''};made.push(el);return el;}};
  const el={ownerDocument:doc,children:[],replaceChildren(){this.children=[];},append(x){this.children.push(x);}};
  I.render(el,'Press [[Escape]] then <b>x</b>');
  assert.equal(el.children.length,3);assert.equal(el.children[1].tag,'kbd');assert.equal(el.children[1].textContent,'Escape');assert.equal(el.children[2],' then <b>x</b>');
  assert.equal(I.t('anything',[],'fallback'),'fallback');
});
