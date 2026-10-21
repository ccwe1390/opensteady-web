(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({ enabled: true, sites: [], mode: 'stable', doubleGuard: true, radius: 24, dwellEnabled: false, dwellMs: 900, dragGuard: true, outline: 'standard' });
  const OUTLINES = Object.freeze(['standard', 'bold', 'contrast']);
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
      radius: Math.max(8, Math.min(32, Number.isFinite(value.radius) ? value.radius : 24)),
      dwellEnabled: value.dwellEnabled === true,
      // On unless switched off. Named dragGuard since 0.1.4; the 0.1.3 key linkDragGuard is ignored.
      dragGuard: value.dragGuard !== false,
      dwellMs: Math.max(500, Math.min(2000, Number.isFinite(value.dwellMs) ? value.dwellMs : 900)),
      // Appearance only. Added in 0.1.5; never changes which target is chosen or when.
      outline: OUTLINES.includes(value.outline) ? value.outline : 'standard'
    };
  }
  const api = { DEFAULTS, OUTLINES, normalizeSettings, siteKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadySettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
