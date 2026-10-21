'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict');const S=require('../extension/core/settings.js');
test('the quick drag guard is on unless switched off, and the 0.1.3 key is ignored',()=>{
  assert.equal(S.normalizeSettings().dragGuard,true);assert.equal(S.normalizeSettings({dragGuard:false}).dragGuard,false);assert.equal(S.normalizeSettings({dragGuard:'no'}).dragGuard,true);
  const old=S.normalizeSettings({linkDragGuard:false});assert.equal(old.dragGuard,true);assert.equal('linkDragGuard' in old,false);
});
test('dwell is opt-in and its countdown is bounded',()=>{
  assert.equal(S.normalizeSettings().dwellEnabled,false);
  assert.equal(S.normalizeSettings({dwellEnabled:'yes'}).dwellEnabled,false);
  assert.equal(S.normalizeSettings({dwellEnabled:true,dwellMs:1}).dwellMs,500);
  assert.equal(S.normalizeSettings({dwellMs:Infinity}).dwellMs,900);
  assert.equal(S.normalizeSettings({dwellMs:9000}).dwellMs,2000);
});
test('site scopes use scheme and host, exclude browser/file schemes and ignore ports',()=>{
  assert.equal(S.siteKey('https://example.com:8443/path'),'https://example.com');assert.equal(S.siteKey('chrome://extensions'),null);assert.equal(S.siteKey('file:///tmp/x'),null);assert.equal(S.siteKey('garbage'),null);
});
test('settings are bounded, deduplicated and exclude unrecognized fields',()=>{
  assert.deepEqual(S.normalizeSettings({enabled:false,sites:['https://example.com/a','https://example.com/b','chrome://x'],radius:100,mode:'evil',doubleGuard:false,password:'x'}),{enabled:false,sites:['https://example.com'],radius:32,mode:'stable',doubleGuard:false,dwellEnabled:false,dwellMs:900,dragGuard:true,outline:'standard'});
});
test('null and malformed stored settings fall back to a usable default',()=>{
  for(const input of [null,'bad',123,[]])assert.deepEqual(S.normalizeSettings(input),S.normalizeSettings());
});
test('outline style is appearance only, one of three named styles',()=>{
  assert.equal(S.normalizeSettings().outline,'standard');assert.equal(S.normalizeSettings({outline:'contrast'}).outline,'contrast');
  assert.equal(S.normalizeSettings({outline:'bold'}).outline,'bold');assert.equal(S.normalizeSettings({outline:'red;display:none'}).outline,'standard');
  assert.deepEqual([...S.OUTLINES],['standard','bold','contrast']);
});
