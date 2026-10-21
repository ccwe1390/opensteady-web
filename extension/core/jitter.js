/*
 * How much is the pointer shaking right now? Pure code: no DOM, no browser APIs.
 *
 * estimate(t) looks at the pointer samples from the last `window` seconds,
 * removes smooth motion (a quadratic trend fitted to each axis), and returns
 * the root mean square of what is left, in pixels. A steady hand gives a value
 * near zero. A shaking hand gives roughly the size of the shake. While the
 * pointer is still travelling toward something the answer is 0, meaning unknown.
 *
 * limitFor(jitter) turns that into the distance a press may wander and still
 * count as a click. It never goes below the fixed base limit. isSteady(jitter)
 * says whether the hand counts as steady for the rules about selected text.
 *
 * Known limits. The pointer has to hover for roughly 0.2 seconds before the
 * press, or the answer is "unknown". Shake slower than about 4 cycles a second
 * is mostly read as travel, so it is under-measured or not measured at all.
 *
 * Written by Claude (AI assistant), 2026-10-02, for OpenSteady Web 0.1.4.
 */
(function (root) {
  'use strict';
  // Least squares fit of y = a + b*u + c*u^2 and the variance of its residuals.
  function residualVariance(us, ys) {
    const n = us.length;
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0, y0 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
      const u = us[i], u2 = u * u, y = ys[i];
      s1 += u; s2 += u2; s3 += u2 * u; s4 += u2 * u2; y0 += y; y1 += u * y; y2 += u2 * y;
    }
    // Normal equations, solved with Cramer's rule.
    const det = n * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return 0;
    const a = (y0 * (s2 * s4 - s3 * s3) - s1 * (y1 * s4 - s3 * y2) + s2 * (y1 * s3 - s2 * y2)) / det;
    const b = (n * (y1 * s4 - s3 * y2) - y0 * (s1 * s4 - s3 * s2) + s2 * (s1 * y2 - y1 * s2)) / det;
    const c = (n * (s2 * y2 - y1 * s3) - s1 * (s1 * y2 - y1 * s2) + y0 * (s1 * s3 - s2 * s2)) / det;
    let sum = 0;
    for (let i = 0; i < n; i++) { const e = ys[i] - (a + b * us[i] + c * us[i] * us[i]); sum += e * e; }
    return sum / Math.max(1, n - 3);
  }
  class JitterMeter {
    constructor(opts = {}) {
      this.window = opts.window ?? 0.3;          // seconds of history used
      this.minSamples = opts.minSamples ?? 8;    // fewer than this: no estimate
      this.minSpan = opts.minSpan ?? 0.12;       // seconds the samples must cover
      this.settleBase = opts.settleBase ?? 6;    // pixels of travel allowed across the window...
      this.settleGain = opts.settleGain ?? 1.5;  // ...plus this many times the measured shake
      this.reset();
    }
    reset() { this.samples = []; }
    add(t, x, y) {
      if (![t, x, y].every(Number.isFinite)) return;
      const last = this.samples[this.samples.length - 1];
      if (last && t < last.t) this.samples = [];             // time went backwards: start again
      if (last && t === last.t) { last.x = x; last.y = y; return; }
      this.samples.push({ t, x, y });
      const keepFrom = t - this.window * 2;
      while (this.samples.length > 512 || (this.samples.length && this.samples[0].t < keepFrom)) this.samples.shift();
    }
    /** Shake in pixels (root mean square, both axes together) just before time t. 0 when unknown. */
    estimate(t) {
      const recent = this.samples.filter(s => s.t <= t && s.t >= t - this.window);
      if (recent.length < this.minSamples) return 0;
      const t0 = recent[0].t, span = recent[recent.length - 1].t - t0;
      if (span < this.minSpan) return 0;
      const us = recent.map(s => (s.t - t0) / span);
      const value = Math.sqrt(residualVariance(us, recent.map(s => s.x)) + residualVariance(us, recent.map(s => s.y)));
      if (!Number.isFinite(value)) return 0;
      // Trust the figure only once the pointer has roughly settled. During a reach the
      // curve of a steady hand slowing down can look like shake, so report "unknown".
      const third = Math.max(1, Math.floor(recent.length / 3));
      const mean = (list, key) => list.reduce((sum, s) => sum + s[key], 0) / list.length;
      const head = recent.slice(0, third), tail = recent.slice(-third);
      const travel = Math.hypot(mean(tail, 'x') - mean(head, 'x'), mean(tail, 'y') - mean(head, 'y'));
      if (travel > this.settleBase + this.settleGain * value) return 0;
      return value;
    }
  }
  /** Distance in pixels a press may wander and still count as a click: three times the shake, from 12 up to 48. */
  function limitFor(jitter, opts = {}) {
    const base = opts.base ?? 12, gain = opts.gain ?? 3, max = opts.max ?? 48;
    if (!Number.isFinite(jitter) || jitter <= 0) return base;
    return Math.max(base, Math.min(max, gain * jitter));
  }
  /**
   * Does this hand count as steady for the rules about selected text? A hand that hovers still reads well
   * under a pixel. Shake of `below` pixels or more does not count as steady. An unknown measurement (0)
   * counts as steady, which is the cautious choice: selected text is then treated as the person's own.
   */
  function isSteady(jitter, opts = {}) {
    const below = opts.below ?? 2;
    return !Number.isFinite(jitter) || jitter < below;
  }
  const api = { JitterMeter, limitFor, isSteady, residualVariance };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadyJitter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
