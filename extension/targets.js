/* DOM discovery, conservative eligibility, and viewport spatial indexing. */
(function (root) {
  'use strict';
  const CLICKABLE = 'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[onclick]';
  const EDITABLE = 'input:not([type="checkbox"]):not([type="radio"]),textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],canvas,video,audio,[draggable="true"]';
  const RISK = /\b(delete|remove|erase|discard|destroy|buy|purchase|pay|payment|checkout|order|donate|transfer|send|submit|confirm|approve|authorize|sign|cancel|unsubscribe|logout|log\s*out|reset|download|upload)\b|刪除|删除|付款|支付|購買|购买|轉帳|转账|送出|提交|確認|确认|取消|刪|删除|\b(supprimer|acheter|payer|enviar|eliminar|comprar|pagar|löschen|kaufen|bezahlen)\b/i;
  function blocked(el) {
    return !el || !el.isConnected || el.closest('[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]') || el.matches(':disabled');
  }
  function riskLabel(el) {
    const label = [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent?.slice(0, 240), el.getAttribute('href')].filter(Boolean).join(' ').slice(0, 600);
    return label;
  }
  function eligible(el) {
    if (blocked(el) || el.closest(EDITABLE)) return false;
    const tag = el.tagName;
    if (el.closest('form')) return false;
    if (tag === 'LABEL' || tag === 'SELECT' || tag === 'TEXTAREA') return false;
    if (tag === 'INPUT' && !['checkbox', 'radio'].includes(el.type)) return false;
    if (tag === 'A') {
      const href = el.getAttribute('href') || '';
      if (el.hasAttribute('download') || !/^(https?:|\/|#|\.\/|\.\.\/)/i.test(href)) return false;
    }
    if (!['A', 'BUTTON', 'INPUT', 'SUMMARY'].includes(tag) && !['button', 'link'].includes(el.getAttribute('role'))) return false;
    const label = riskLabel(el);
    if (RISK.test(label)) return false;
    if (tag !== 'INPUT' && !label.trim()) return false;
    return true;
  }
  function sensitive(el) {
    if (!(el instanceof Element)) return true;
    return !!el.closest(EDITABLE + ',label,[role="slider"],[role="combobox"],[role="listbox"],[role="menu"],[role="grid"],svg,iframe');
  }
  function actualControl(node) {
    if (!(node instanceof Element)) return null;
    let el = node.closest(CLICKABLE);
    if (el?.tagName === 'LABEL') el = el.control || el;
    return el;
  }
  function sameRect(a, b, tolerance = 1) {
    return ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= tolerance);
  }
  class TargetIndex {
    constructor(host, onError) {
      this.host = host; this.onError = onError; this.ids = new WeakMap(); this.nextId = 1;
      this.elements = new Map(); this.rects = new Map(); this.grid = new OpenSteadySelect.SpatialIndex();
      this.dirty = true; this.frame = null; this.lastMeasured = 0; this.lastActive = 0; this.enabled = false;
      this.stats = { targets: 0, measureMs: 0, capped: false };
      this.observer = new MutationObserver(records => {
        if (records.some(r => r.target !== this.host && !this.host.contains(r.target))) this.invalidate();
      });
      this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.invalidate()) : null;
      this.timer = setInterval(() => {
        if (this.enabled && performance.now() - this.lastActive < 1200) this.invalidate(false);
      }, 250);
    }
    start() {
      if (this.enabled) return;
      this.enabled = true;
      this.observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ['class','style','hidden','disabled','inert','aria-hidden','aria-disabled','href','type','role','aria-label','title'] });
      this.resizeObserver?.observe(document.documentElement);
      this.invalidate();
    }
    stop() {
      this.enabled = false; this.observer.disconnect(); this.resizeObserver?.disconnect();
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null; this.dirty = true; this.grid.rebuild([]); this.elements.clear(); this.rects.clear();
    }
    dispose() { this.stop(); clearInterval(this.timer); }
    invalidate(block = true) {
      if (block) this.dirty = true;
      if (!this.enabled || this.frame !== null) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        try { this.measure(); } catch (error) { this.onError(error); }
      });
    }
    idFor(el) {
      if (!el) return null;
      if (!this.ids.has(el)) this.ids.set(el, this.nextId++);
      return this.ids.get(el);
    }
    measure() {
      if (!this.enabled) return;
      const began = performance.now(), nodes = document.querySelectorAll(CLICKABLE);
      const targets = []; this.elements.clear(); this.rects.clear();
      this.stats.capped = nodes.length > 6000;
      if (!this.stats.capped) for (const el of nodes) {
        if (this.host.contains(el) || blocked(el)) continue;
        const style = getComputedStyle(el);
        if (style.visibility !== 'visible' || Number(style.opacity) < 0.1 || style.pointerEvents === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
        // Wrapped links have several rectangles. Never assist their bounding-box gaps.
        if (el.getClientRects().length !== 1) continue;
        const id = this.idFor(el), target = { id, x: r.left, y: r.top, w: r.width, h: r.height };
        targets.push(target); this.elements.set(id, el); this.rects.set(id, target);
      }
      this.grid.rebuild(targets); this.dirty = false; this.lastMeasured = performance.now();
      this.stats.targets = targets.length; this.stats.measureMs = performance.now() - began;
    }
    near(x, y, radius) {
      this.lastActive = performance.now();
      if (this.dirty) return [];
      return this.grid.near(x, y, radius).map(r => ({ ...r, risky: !eligible(this.elements.get(r.id)) }));
    }
    exposed(el, r) {
      const positions = [[r.x + r.w / 2, r.y + r.h / 2], [r.x + Math.min(3, r.w / 2), r.y + Math.min(3, r.h / 2)], [r.x + r.w - Math.min(3, r.w / 2), r.y + r.h - Math.min(3, r.h / 2)]];
      return positions.some(([x,y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && el.contains(document.elementFromPoint(x,y)));
    }
    validate(id, oldRect = null) {
      const el = this.elements.get(id);
      if (!eligible(el)) return null;
      const rect = el.getBoundingClientRect(), r = { id, x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      const style = getComputedStyle(el);
      if (r.w < 1 || r.h < 1 || style.visibility !== 'visible' || Number(style.opacity) < 0.1 || style.pointerEvents === 'none') return null;
      if (oldRect && !sameRect(oldRect, r)) return null;
      if (!this.exposed(el, r)) return null;
      // Transparent ancestors also make a target unsuitable.
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.visibility !== 'visible' || Number(s.opacity) < 0.1) return null;
      }
      return { el, rect: r };
    }
  }
  root.OpenSteadyDOM = { TargetIndex, eligible, sensitive, actualControl, sameRect, RISK };
})(globalThis);
