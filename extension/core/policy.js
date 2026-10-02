/* Pure mouse gesture policy. It never generates events; DOM delivery is separate. */
(function (root) {
  'use strict';
  class ClickPolicy {
    constructor(opts = {}) {
      this.slipPx = opts.slipPx ?? 12;
      this.holdSeconds = opts.holdSeconds ?? 1.2;
      this.doubleSeconds = opts.doubleSeconds ?? 0.3;
      this.previewSeconds = opts.previewSeconds ?? 0.06;
      this.doubleGuard = opts.doubleGuard ?? true;
      this.reset();
    }
    reset() { this.press = null; this.released = null; this.lastClick = null; this.lastSuppressed = null; }
    cancel() { this.press = null; this.released = null; }
    down(e) {
      this.cancel();
      if (e.bypass || e.button !== 0 || e.pointerType !== 'mouse' || ![e.t, e.x, e.y].every(Number.isFinite)) return;
      const hit = e.hitId ?? null;
      const candidate = hit !== null ? hit : (e.canRedirect && e.previewAge >= this.previewSeconds ? e.selectedId ?? null : null);
      this.press = { ...e, hitId: hit, candidate, maxDistance: 0 };
    }
    move(e) {
      if (!this.press) return;
      if (e.bypass) { this.cancel(); return; }
      this.press.maxDistance = Math.max(this.press.maxDistance, Math.hypot(e.x - this.press.x, e.y - this.press.y));
    }
    up(e) {
      if (!this.press) return;
      this.move(e);
      if (!this.press) return;
      const p = this.press; this.press = null;
      const age = e.t - p.t;
      if (e.bypass || e.pointerId !== p.pointerId || p.maxDistance > this.slipPx || age < 0 || age > this.holdSeconds) return;
      this.released = { ...p, upT: e.t, upHitId: e.hitId ?? null, upX: e.x, upY: e.y };
    }
    click(e) {
      const p = this.released; this.released = null;
      if (!p || e.bypass || e.t < p.upT || e.t - p.upT > 0.12 || e.button !== 0 || e.detail === 0 || e.pointerType !== 'mouse') return { action: 'pass', reason: 'not-mouse-gesture' };
      const nativeId = e.hitId ?? null;
      // A real click on any other control always wins over the selector.
      const nativeCorrect = nativeId !== null && p.hitId === nativeId && p.upHitId === nativeId;
      const id = nativeCorrect ? nativeId : p.candidate;
      const redirect = !nativeCorrect && id !== null && (nativeId === null || nativeId === id) && p.upHitId === null && e.canRedirect &&
        (p.hitId === id || (p.hitId === null && p.canRedirect));
      if (!nativeCorrect && !redirect) return { action: 'pass', reason: 'no-safe-correction' };
      if (this.doubleGuard && e.safe && this.lastClick?.id === id && e.t - this.lastClick.t >= 0 &&
          e.t - this.lastClick.t <= this.doubleSeconds && Math.hypot(p.x - this.lastClick.x, p.y - this.lastClick.y) <= this.slipPx) {
        this.lastSuppressed = { id, t: e.t };
        return { action: 'suppress', id, reason: 'double-guard' };
      }
      this.lastClick = { id, t: e.t, x: p.x, y: p.y };
      return redirect ? { action: 'redirect', id, reason: p.hitId === null ? 'near-miss' : 'slip' } : { action: 'pass', id, reason: 'native' };
    }
    suppressDoubleEvent(t, id) { return this.doubleGuard && this.lastSuppressed?.id === id && t - this.lastSuppressed.t >= 0 && t - this.lastSuppressed.t < 0.15; }
  }
  const api = { ClickPolicy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadyPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
