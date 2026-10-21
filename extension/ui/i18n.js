'use strict';
// Fills elements marked data-i18n from _locales. The English text in the HTML stays as the fallback.
// [[Key]] in a message is shown as <kbd>Key</kbd>; text is never parsed as HTML.
(function (root) {
  const get = (key, subs = []) => (root.chrome?.i18n?.getMessage?.(key, [].concat(subs).map(String))) || '';
  const t = (key, subs, fallback = key) => get(key, subs) || fallback;
  function render(el, text) {
    el.replaceChildren();
    for (const part of text.split(/(\[\[[^\]]+\]\])/)) {
      const key = /^\[\[([^\]]+)\]\]$/.exec(part);
      if (key) { const kbd = el.ownerDocument.createElement('kbd'); kbd.textContent = key[1]; el.append(kbd); }
      else if (part) el.append(part);
    }
  }
  function apply(doc = root.document) {
    const html = doc.documentElement;
    html.lang = get('langTag') || html.lang; html.dir = get('@@bidi_dir') || 'ltr';
    for (const el of doc.querySelectorAll('[data-i18n]')) { const text = get(el.dataset.i18n); if (text) render(el, text); }
  }
  const api = { t, render, apply };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.OpenSteadyI18n = api; apply(); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
