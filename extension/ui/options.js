'use strict';
const $ = id => document.getElementById(id);
let current;
async function request(message) { const r = await chrome.runtime.sendMessage(message); if (r?.error) throw new Error(r.error); return r; }
async function load() {
  ({ settings: current } = await request({ type: 'get-settings' }));
  for (const id of ['enabled','doubleGuard','dwellEnabled','dragGuard']) $(id).checked = current[id];
  $('dwellMs').value = String(current.dwellMs);
  $('mode').value = current.mode; $('sites').replaceChildren();
  for (const site of current.sites) { const li = document.createElement('li'); li.textContent = site; $('sites').appendChild(li); }
  if (!current.sites.length) { const li = document.createElement('li'); li.textContent = 'No remembered sites.'; $('sites').appendChild(li); }
}
$('save').addEventListener('click', async () => {
  $('error').textContent = '';
    try { await request({ type: 'save-settings', settings: { enabled: $('enabled').checked, doubleGuard: $('doubleGuard').checked, mode: $('mode').value, dwellEnabled: $('dwellEnabled').checked, dwellMs: Number($('dwellMs').value), dragGuard: $('dragGuard').checked } }); await load(); $('status').textContent = 'Saved.'; }
  catch (e) { $('error').textContent = e.message; }
});
$('clear').addEventListener('click', async () => {
  try { await request({ type: 'clear-settings' }); await load(); $('status').textContent = 'Cleared. No sites are enabled.'; } catch (e) { $('error').textContent = e.message; }
});
load().catch(e => { $('error').textContent = e.message; });
