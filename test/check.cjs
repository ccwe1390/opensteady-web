'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),extension=path.join(root,'extension');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
let scripts=0;
for(const file of files(root).filter(p=>!p.includes('node_modules')&&/\.(c?js)$/.test(p))){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);scripts++;
}
const m=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
assert.equal(m.manifest_version,3);assert.deepEqual(m.permissions,['activeTab','scripting','storage']);assert.equal(m.host_permissions,undefined);
for(const p of [m.background.service_worker,m.action.default_popup,m.options_page,...Object.values(m.icons)])assert.ok(fs.existsSync(path.join(extension,p)),p);
for(const file of files(extension).filter(p=>p.endsWith('.js'))){
  const s=fs.readFileSync(file,'utf8');assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|eval)\s*\(/.test(s),'Network/eval surface: '+file);
}
for(const html of files(root).filter(p=>p.endsWith('.html'))){
  const text=fs.readFileSync(html,'utf8');
  for(const match of text.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync(path.resolve(path.dirname(html),match[1])),html+' -> '+match[1]);
}
console.log(`Syntax and package checks passed (${scripts} JavaScript files). Runtime extension has no network/eval calls and no mandatory host grants.`);
