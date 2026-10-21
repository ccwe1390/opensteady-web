'use strict';
importScripts('core/settings.js');
const { normalizeSettings, siteKey } = OpenSteadySettings;
const FILES = ['core/selector.js','core/policy.js','core/dwell.js','core/link-drag.js','core/jitter.js','core/settings.js','targets.js','content.js'];
let queue = Promise.resolve();
// User-facing errors are translated when the browser provides chrome.i18n; tests and old builds fall back to English.
const t = (key, fallback) => (globalThis.chrome?.i18n?.getMessage?.(key) || fallback);
function ordered(task) { const next = queue.then(task, task); queue = next.catch(() => {}); return next; }
async function settings() { return normalizeSettings((await chrome.storage.local.get('settings')).settings); }
async function sessionFor(tabId) { return (await chrome.storage.session.get('tab:' + tabId))['tab:' + tabId] || null; }
async function effective(tabId, url) {
  const s = await settings(), site = siteKey(url), session = await sessionFor(tabId);
  const explicit = session?.site === site ? session.enabled : null;
  const permitted = site && await chrome.permissions.contains({ origins: [site + '/*'] });
  const siteOn = !!site && (explicit === null ? s.sites.includes(site) && permitted : explicit);
  return { ...s, sites: undefined, enabled: s.enabled && siteOn };
}
async function inject(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: FILES, world: 'ISOLATED' });
}
async function sendConfig(tabId, url, ensure = false, resume = false) {
  const config = await effective(tabId, url);
  if (ensure && config.enabled) await inject(tabId);
  try { await chrome.tabs.sendMessage(tabId, { type: 'configure', config, resume }, { frameId: 0 }); } catch { /* no script on an off page */ }
  await chrome.action.setBadgeText({ tabId, text: config.enabled ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#087b63' });
}
async function synchronize() {
  const s = await settings(), allowed = [];
  for (const site of s.sites) if (await chrome.permissions.contains({ origins: [site + '/*'] })) allowed.push(site + '/*');
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const ids = registered.filter(r => r.id.startsWith('opensteady-')).map(r => r.id);
  if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
  if (s.enabled && allowed.length) await chrome.scripting.registerContentScripts([{
    id: 'opensteady-opted-sites', matches: allowed, js: FILES, allFrames: false, runAt: 'document_idle',
    world: 'ISOLATED', persistAcrossSessions: true
  }]);
  for (const tab of await chrome.tabs.query({})) {
    // tabs.query may omit URLs without host access. Existing scripts still get a fresh config through storage changes.
    if (tab.id !== undefined && tab.url) await sendConfig(tab.id, tab.url, true).catch(() => {});
  }
}
async function reconcileRevokedSites() {
  const s = await settings(), revoked = [];
  for (const site of s.sites) if (!await chrome.permissions.contains({ origins: [site + '/*'] })) revoked.push(site);
  if (revoked.length) {
    const sessions = await chrome.storage.session.get(null), disabled = {};
    for (const [key, value] of Object.entries(sessions)) {
      if (key.startsWith('tab:') && revoked.includes(value?.site)) disabled[key] = { ...value, enabled: false };
    }
    if (Object.keys(disabled).length) await chrome.storage.session.set(disabled);
    s.sites = s.sites.filter(site => !revoked.includes(site));
    await chrome.storage.local.set({ settings: s });
  }
  await synchronize();
}
async function saveSettings(requested) {
  const old = await settings();
  const patch = {};
  for (const key of ['enabled','mode','doubleGuard','radius','dwellEnabled','dwellMs','dragGuard','outline']) {
    if (requested && Object.prototype.hasOwnProperty.call(requested,key)) patch[key] = requested[key];
  }
  const updated = normalizeSettings({ ...old, ...patch });
  await chrome.storage.local.set({ settings: updated }); await synchronize(); return updated;
}
async function setTab(tab, site, enabled) {
  // Validate actual injection before storing an enabled state; protected pages may reject access.
  if (enabled) await inject(tab.id);
  await chrome.storage.session.set({ ['tab:' + tab.id]: { site, enabled } });
  await sendConfig(tab.id, tab.url, false, true);
}
async function tabIsOn(tab) {
  let status = null;
  try { status = await chrome.tabs.sendMessage(tab.id, { type: 'status' }, { frameId: 0 }); } catch {}
  return status ? status.enabled : (await effective(tab.id, tab.url)).enabled;
}
// Keyboard shortcuts (chrome://extensions/shortcuts). Pressing one grants activeTab exactly as opening the popup does,
// so toggling the current tab needs no extra permission. Both are no-ops on pages the extension cannot run on.
async function runCommand(command, tab) {
  if (command === 'pause-everywhere') { const s = await settings(); await saveSettings({ enabled: !s.enabled }); return; }
  if (command !== 'toggle-tab') return;
  if (!tab?.id) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const site = tab && siteKey(tab.url);
  if (!site || !(await settings()).enabled) return;
  // A page paused with Escape reports enabled false, so the shortcut resumes it, like the popup's enable button.
  await setTab(tab, site, !await tabIsOn(tab));
}
async function handle(message, sender) {
  if (sender.id !== chrome.runtime.id) throw new Error('Unsupported sender.');
  if (message.type === 'content-config') {
    if (!sender.tab || sender.frameId !== 0) throw new Error('Top-level pages only.');
    return { config: await effective(sender.tab.id, sender.url || sender.tab.url) };
  }
  // Control messages must originate from an extension page, never from a content script.
  if (!sender.url?.startsWith(chrome.runtime.getURL('ui/'))) throw new Error('Open the extension controls.');
  if (message.type === 'get-settings') return { settings: await settings() };
  if (message.type === 'save-settings') return { settings: await saveSettings(message.settings) };
  if (message.type === 'clear-settings') {
    const granted = await chrome.permissions.getAll();
    await chrome.storage.local.clear(); await chrome.storage.session.clear();
    const hosts = (granted.origins || []).filter(origin => /^https?:\/\//.test(origin));
    if (hosts.length) await chrome.permissions.remove({ origins: hosts });
    await synchronize(); return { ok: true };
  }
  const tab = await chrome.tabs.get(message.tabId), site = siteKey(tab.url);
  if (!site) throw new Error(t('errRegularPage', 'Open a regular http or https webpage.'));
  if (message.type === 'tab-status') {
    let status = null;
    try { status = await chrome.tabs.sendMessage(tab.id, { type: 'status' }, { frameId: 0 }); } catch {}
    const s = await settings();
    return { site, remembered: s.sites.includes(site), config: await effective(tab.id, tab.url), status };
  }
  if (message.type === 'set-tab') { await setTab(tab, site, message.enabled === true); return { ok: true }; }
  if (message.type === 'remember-site') {
    const s = await settings();
    if (message.enabled === true) {
      if (!await chrome.permissions.contains({ origins: [site + '/*'] })) throw new Error(t('errNotGranted', 'Site permission was not granted.'));
      await inject(tab.id);
      s.sites = [...new Set([...s.sites, site])];
    } else {
      s.sites = s.sites.filter(x => x !== site);
      const sessions = await chrome.storage.session.get(null);
      const disabled = {};
      for (const [key,value] of Object.entries(sessions)) if (key.startsWith('tab:') && value?.site === site) disabled[key] = { site, enabled: false };
      if (Object.keys(disabled).length) await chrome.storage.session.set(disabled);
    }
    await chrome.storage.local.set({ settings: normalizeSettings(s) });
    await chrome.storage.session.set({ ['tab:' + tab.id]: { site, enabled: message.enabled === true } });
    if (!message.enabled) await chrome.permissions.remove({ origins: [site + '/*'] });
    await synchronize(); await sendConfig(tab.id, tab.url, true, true); return { ok: true };
  }
  throw new Error('Unknown request.');
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  ordered(() => handle(message || {}, sender)).then(reply, error => reply({ error: error.message }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => ordered(async () => {
  await chrome.storage.local.set({ settings: await settings() }); await synchronize();
}).catch(() => {}));
chrome.commands?.onCommand.addListener((command, tab) => ordered(() => runCommand(command, tab)).catch(() => {}));
chrome.runtime.onStartup.addListener(() => ordered(synchronize).catch(() => {}));
chrome.permissions.onRemoved.addListener(() => ordered(reconcileRevokedSites).catch(() => {}));
chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove('tab:' + tabId).catch(() => {}));
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'complete' && tab.url) ordered(() => sendConfig(tabId, tab.url, true)).catch(() => {});
});
