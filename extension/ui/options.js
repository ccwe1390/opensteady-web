'use strict';
const $ = id => document.getElementById(id);
const t = (key, subs, fallback) => OpenSteadyI18n.t(key, subs, fallback);
let current;
async function request(message) { const r = await chrome.runtime.sendMessage(message); if (r?.error) throw new Error(r.error); return r; }
async function load() {
  ({ settings: current } = await request({ type: 'get-settings' }));
  for (const id of ['enabled','doubleGuard','dwellEnabled','dragGuard']) $(id).checked = current[id];
  $('dwellMs').value = String(current.dwellMs); $('outline').value = current.outline;
  $('mode').value = current.mode; $('sites').replaceChildren();
  for (const site of current.sites) { const li = document.createElement('li'); li.textContent = site; $('sites').appendChild(li); }
  if (!current.sites.length) { const li = document.createElement('li'); li.textContent = t('optNoSites', [], 'No remembered sites.'); $('sites').appendChild(li); }
}
const version = chrome.runtime.getManifest().version;
$('version').textContent = t('optVersion', [version], `Version ${version} · Early release for desktop Chrome. Not yet tested in Edge.`);
$('save').addEventListener('click', async () => {
  $('error').textContent = '';
    try { await request({ type: 'save-settings', settings: { enabled: $('enabled').checked, doubleGuard: $('doubleGuard').checked, mode: $('mode').value, dwellEnabled: $('dwellEnabled').checked, dwellMs: Number($('dwellMs').value), dragGuard: $('dragGuard').checked, outline: $('outline').value } }); await load(); $('status').textContent = t('saved', [], 'Saved.'); }
  catch (e) { $('error').textContent = e.message; }
});
$('clear').addEventListener('click', async () => {
  try { await request({ type: 'clear-settings' }); await load(); $('status').textContent = t('cleared', [], 'Cleared. No sites are enabled.'); } catch (e) { $('error').textContent = e.message; }
});
load().catch(e => { $('error').textContent = e.message; });
