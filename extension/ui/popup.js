'use strict';
const $ = id => document.getElementById(id);
const t = (key, subs, fallback) => OpenSteadyI18n.t(key, subs, fallback);
let tab, state, settings;
async function request(message) { const result = await chrome.runtime.sendMessage(message); if (result?.error) throw new Error(result.error); return result; }
async function refresh() {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true }); tab = current;
  ({ settings } = await request({ type: 'get-settings' }));
  $('global').disabled = false; $('global').textContent = settings.enabled ? t('btnPauseAll', [], 'Pause everywhere') : t('btnResumeAll', [], 'Resume everywhere');
  $('dwell').disabled = false; $('dwell').textContent = settings.dwellEnabled ? t('btnDwellOff', [], 'Turn off hold to click') : t('btnDwellOn', [], 'Turn on hold to click');
  state = await request({ type: 'tab-status', tabId: tab.id });
  const on = state.status ? state.status.enabled : state.config.enabled;
  $('status').textContent = on ? t('statusOn', [state.site], 'On · ' + state.site) : t('statusOff', [state.site], 'Off · ' + state.site);
  if (state.status?.paused) $('status').textContent = t('statusPausedPage', [state.site], 'Paused on this page · ' + state.site);
  if (!settings.enabled) $('status').textContent = t('statusPausedAll', [], 'Paused everywhere');
  $('toggle').textContent = on ? t('btnDisableTab', [], 'Turn off on this tab') : t('btnEnableTab', [], 'Enable on this tab');
  $('toggle').disabled = !settings.enabled;
  $('remember').textContent = state.remembered ? t('btnForget', [], 'Turn off & forget this site') : t('btnRemember', [], 'Always enable on this site');
  $('remember').disabled = !settings.enabled;
  const c = state.status?.counters;
  $('stats').textContent = c ? t('statsCounts', [c.redirects, c.guarded], `Corrections: ${c.redirects} · Repeat clicks blocked: ${c.guarded}`) + '\n' +
    t('statsDwell', [c.dwellClicks || 0, c.errors], `Hold to click activations: ${c.dwellClicks || 0} · Internal errors on this page: ${c.errors}`) : '';
  if (c?.preventedLinkDrags) $('stats').textContent += '\n' + t('statsDrags', [c.preventedLinkDrags, c.preservedLinkClicks || 0, c.rejectedLinkClicks || 0],
    `Quick drags cancelled: ${c.preventedLinkDrags} · Ended as the browser's own click: ${c.preservedLinkClicks || 0} · Clicks stopped because the press went too far, lasted too long, or did not reach the pressed control: ${c.rejectedLinkClicks || 0}`);
  if (state.status?.index.capped) $('stats').textContent += '\n' + t('statsCapped', [], 'Page is too complex; target assistance is paused.');
}
async function showShortcut() {
  const command = (await chrome.commands?.getAll?.() || []).find(c => c.name === 'toggle-tab');
  $('shortcut').textContent = command?.shortcut ? t('popupShortcutHelp', [command.shortcut], 'Keyboard shortcut for this tab: ' + command.shortcut + '. Change it at chrome://extensions/shortcuts.')
    : t('popupNoShortcut', [], 'No keyboard shortcut is set. Add one at chrome://extensions/shortcuts.');
}
function action(id, fn) { $(id).addEventListener('click', async () => {
  $('error').textContent = ''; $(id).disabled = true;
  try { await fn(); await refresh(); } catch (e) { $('error').textContent = e.message; $(id).disabled = false; }
}); }
action('toggle', () => request({ type: 'set-tab', tabId: tab.id, enabled: !(state.status ? state.status.enabled : state.config.enabled) }));
action('remember', async () => {
  const enabled = !state.remembered;
  if (enabled && !await chrome.permissions.request({ origins: [state.site + '/*'] })) throw new Error(t('errDeclined', [], 'Permission declined. You can still enable just this tab.'));
  await request({ type: 'remember-site', tabId: tab.id, enabled });
});
action('global', () => request({ type: 'save-settings', settings: { enabled: !settings.enabled } }));
action('dwell', () => request({ type: 'save-settings', settings: { dwellEnabled: !settings.dwellEnabled } }));
showShortcut().catch(() => {});
refresh().catch(e => { $('status').textContent = t('errOpenWebpage', [], 'Open a regular webpage to use OpenSteady.'); $('error').textContent = e.message; });
