/* Pure mouse gesture policy. It never generates events; DOM delivery is separate. */
(function (root) {
  'use strict';
  class ClickPolicy {
    constructor(opts = {}) {
      this.slipPx = opts.slipPx ?? 12;              // a press may always wander this far
      this.quickSeconds = opts.quickSeconds ?? 0.6; // a wider, shake-scaled limit applies only to presses this short
      this.sameTargetPx = opts.sameTargetPx ?? 48;  // a press released on the control it started on may wander this far
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
      // slipLimit comes from the shake measured just before the press. It never shrinks the base limit
      // and never exceeds the same-target bound.
      const slipLimit = Number.isFinite(e.slipLimit) ? Math.min(this.sameTargetPx, Math.max(this.slipPx, e.slipLimit)) : this.slipPx;
      this.press = { ...e, hitId: hit, candidate, selectedId: e.selectedId ?? null, slipLimit, maxDistance: 0 };
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
      // A long press gets only the base limit: it looks like a deliberate drag, however shaky the hand.
      const allowed = age <= this.quickSeconds ? p.slipLimit : this.slipPx;
      if (e.bypass || e.pointerId !== p.pointerId || age < 0 || age > this.holdSeconds) return;
      // Past the allowed distance nothing is ever redirected. The press is still remembered, up to a
      // larger bound, so that a release on the control it started on is recognised as that control's click.
      const sameOnly = p.maxDistance > allowed;
      if (sameOnly && p.maxDistance > this.sameTargetPx) return;
      this.released = { ...p, upT: e.t, upHitId: e.hitId ?? null, upX: e.x, upY: e.y, wide: p.maxDistance > this.slipPx, sameOnly };
    }
    click(e) {
      const p = this.released; this.released = null;
      if (!p || e.bypass || e.t < p.upT || e.t - p.upT > 0.12 || e.button !== 0 || e.detail === 0 || e.pointerType !== 'mouse') return { action: 'pass', reason: 'not-mouse-gesture' };
      const nativeId = e.hitId ?? null;
      // A real click on any other control always wins over the selector.
      const nativeCorrect = nativeId !== null && p.hitId === nativeId && p.upHitId === nativeId;
      const id = nativeCorrect ? nativeId : p.candidate;
      const free = nativeId === null || nativeId === id;   // the browser's own click reaches no other control
      // Near miss: pressed on nothing, beside the outlined target; released on nothing or on that target.
      const nearMiss = p.hitId === null && p.canRedirect && (p.upHitId === null || p.upHitId === id);
      // Slip: pressed on the target itself and came off it before release. Past the base limit, or when
      // the release lands on another control, the outline must also have been on the pressed target.
      const agreed = p.selectedId === id;
      const slip = p.hitId !== null && p.hitId === id && p.upHitId !== id && (p.upHitId === null ? (!p.wide || agreed) : agreed);
      const redirect = !nativeCorrect && !p.sameOnly && id !== null && free && e.canRedirect && (nearMiss || slip);
      if (!nativeCorrect && !redirect) return { action: 'pass', reason: 'no-safe-correction' };
      // When the browser's own click already reaches the chosen control (the release landed on something
      // nested inside it), keep that trusted click. Never replace it with a synthetic one.
      const keepNative = nativeCorrect || nativeId === id;
      if (this.doubleGuard && e.safe && this.lastClick?.id === id && e.t - this.lastClick.t >= 0 &&
          e.t - this.lastClick.t <= this.doubleSeconds && Math.hypot(p.x - this.lastClick.x, p.y - this.lastClick.y) <= this.slipPx) {
        this.lastSuppressed = { id, t: e.t };
        return { action: 'suppress', id, reason: 'double-guard' };
      }
      this.lastClick = { id, t: e.t, x: p.x, y: p.y };
      return keepNative ? { action: 'pass', id, reason: 'native' } : { action: 'redirect', id, reason: p.hitId === null ? 'near-miss' : 'slip' };
    }
    suppressDoubleEvent(t, id) { return this.doubleGuard && this.lastSuppressed?.id === id && t - this.lastSuppressed.t >= 0 && t - this.lastSuppressed.t < 0.15; }
  }
  const api = { ClickPolicy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadyPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
