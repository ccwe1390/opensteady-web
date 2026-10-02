(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({ enabled: true, sites: [], mode: 'stable', doubleGuard: true, radius: 24 });
  function siteKey(url) {
    try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.protocol + '//' + u.hostname : null; } catch { return null; }
  }
  function normalizeSettings(value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) value = {};
    return {
      enabled: value.enabled !== false,
      sites: [...new Set((Array.isArray(value.sites) ? value.sites : []).map(siteKey).filter(Boolean))].sort().slice(0, 200),
      mode: value.mode === 'nearest' ? 'nearest' : 'stable',
      doubleGuard: value.doubleGuard !== false,
      radius: Math.max(8, Math.min(32, Number.isFinite(value.radius) ? value.radius : 24))
    };
  }
  const api = { DEFAULTS, normalizeSettings, siteKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadySettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
