'use strict';
const $ = id => document.getElementById(id);
let tab, state, settings;
async function request(message) { const result = await chrome.runtime.sendMessage(message); if (result?.error) throw new Error(result.error); return result; }
async function refresh() {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true }); tab = current;
  ({ settings } = await request({ type: 'get-settings' }));
  $('global').disabled = false; $('global').textContent = settings.enabled ? 'Pause everywhere' : 'Resume everywhere';
  state = await request({ type: 'tab-status', tabId: tab.id });
  const on = state.status ? state.status.enabled : state.config.enabled;
  $('status').textContent = (on ? 'On · ' : 'Off · ') + state.site;
  if (state.status?.paused) $('status').textContent = 'Paused on this page · ' + state.site;
  if (!settings.enabled) $('status').textContent = 'Paused everywhere';
  $('toggle').textContent = on ? 'Turn off on this tab' : 'Enable on this tab';
  $('toggle').disabled = !settings.enabled;
  $('remember').textContent = state.remembered ? 'Turn off & forget this site' : 'Always enable on this site';
  $('remember').disabled = !settings.enabled;
  const c = state.status?.counters;
  $('stats').textContent = c ? `${c.redirects} corrections · ${c.guarded} repeat clicks blocked\n${c.errors} internal errors on this page` : '';
  if (state.status?.index.capped) $('stats').textContent += '\nPage is too complex; target assistance is paused.';
}
function action(id, fn) { $(id).addEventListener('click', async () => {
  $('error').textContent = ''; $(id).disabled = true;
  try { await fn(); await refresh(); } catch (e) { $('error').textContent = e.message; $(id).disabled = false; }
}); }
action('toggle', () => request({ type: 'set-tab', tabId: tab.id, enabled: !(state.status ? state.status.enabled : state.config.enabled) }));
action('remember', async () => {
  const enabled = !state.remembered;
  if (enabled && !await chrome.permissions.request({ origins: [state.site + '/*'] })) throw new Error('Permission declined. You can still enable just this tab.');
  await request({ type: 'remember-site', tabId: tab.id, enabled });
});
action('global', () => request({ type: 'save-settings', settings: { ...settings, enabled: !settings.enabled } }));
refresh().catch(e => { $('status').textContent = 'Open a regular webpage to use OpenSteady.'; $('error').textContent = e.message; });
