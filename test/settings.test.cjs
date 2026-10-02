'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');const S=require('../extension/core/settings.js');
test('site scopes use scheme and host, exclude browser/file schemes and ignore ports',()=>{
  assert.equal(S.siteKey('https://example.com:8443/path'),'https://example.com');assert.equal(S.siteKey('chrome://extensions'),null);assert.equal(S.siteKey('file:///tmp/x'),null);assert.equal(S.siteKey('garbage'),null);
});
test('settings are bounded, deduplicated and exclude unrecognized fields',()=>{
  assert.deepEqual(S.normalizeSettings({enabled:false,sites:['https://example.com/a','https://example.com/b','chrome://x'],radius:100,mode:'evil',doubleGuard:false,password:'x'}),{enabled:false,sites:['https://example.com'],radius:32,mode:'stable',doubleGuard:false});
});
test('null and malformed stored settings fall back to a usable default',()=>{
  for(const input of [null,'bad',123,[]])assert.deepEqual(S.normalizeSettings(input),S.normalizeSettings());
});
