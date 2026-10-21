/* Optional dwell activation. Times are seconds; no events are generated here. */
(function (root) {
  'use strict';
  class DwellPolicy {
    constructor(opts = {}) {
      this.delay = opts.delay ?? 0.9;
      this.rearmPx = opts.rearmPx ?? 32;
      this.rearmSeconds = opts.rearmSeconds ?? 0.25;
      this.reset();
    }
    reset() { this.lock = null; this.lastT = null; this.cancel(); }
    cancel() { this.id = null; this.since = null; this.progress = 0; if (this.lock) this.lock.awayAt = null; }
    block(t, x, y) {
      this.cancel();
      if ([t,x,y].every(Number.isFinite)) this.lock = { x, y, awayAt: null };
    }
    update(t, x, y, id) {
      if (![t,x,y].every(Number.isFinite)) { this.cancel(); return { action: 'wait', progress: 0 }; }
      if (this.lastT !== null && (t < this.lastT || t - this.lastT > 0.3)) this.cancel();
      this.lastT = t;
      if (this.lock) {
        if (Math.hypot(x - this.lock.x, y - this.lock.y) < this.rearmPx) this.lock.awayAt = null;
        else {
          if (this.lock.awayAt === null) this.lock.awayAt = t;
          if (t - this.lock.awayAt + 1e-9 >= this.rearmSeconds) { this.lock = null; this.cancel(); }
        }
        return { action: 'wait', progress: 0 };
      }
      if (id === null || id === undefined) { this.cancel(); return { action: 'wait', progress: 0 }; }
      if (id !== this.id) { this.id = id; this.since = t; }
      this.progress = Math.min(1, Math.max(0, (t - this.since) / this.delay));
      if (t - this.since + 1e-9 < this.delay) return { action: 'wait', progress: this.progress };
      this.block(t,x,y);
      return { action: 'activate', id, progress: 1 };
    }
  }
  const api = { DwellPolicy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadyDwell = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
