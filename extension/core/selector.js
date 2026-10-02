/* Pure selection algorithms. Times are seconds, coordinates are viewport pixels. */
(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function distToRect(x, y, r) {
    return Math.hypot(Math.max(r.x - x, 0, x - r.x - r.w), Math.max(r.y - y, 0, y - r.y - r.h));
  }
  function validRect(r) {
    return r && [r.x, r.y, r.w, r.h].every(Number.isFinite) && r.w > 0 && r.h > 0;
  }
  function nearestWithinRadius(targets, x, y, radius) {
    let best = null, distance = Infinity;
    if (![x, y, radius].every(Number.isFinite) || radius < 0) return null;
    for (const r of targets) {
      if (!validRect(r) || r.risky) continue;
      const d = distToRect(x, y, r);
      if (d < distance) { distance = d; best = r.id; }
    }
    return distance <= radius ? best : null;
  }
  // Abramowitz-Stegun erf approximation; absolute error about 1.5e-7.
  function normalCDF(x) {
    const sign = x < 0 ? -1 : 1;
    const z = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * z);
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return 0.5 * (1 + sign * erf);
  }
  function rectProbability(x, y, sigma, r) {
    if (!validRect(r) || ![x, y, sigma].every(Number.isFinite) || sigma <= 0) return 0;
    return Math.max(0, normalCDF((r.x + r.w - x) / sigma) - normalCDF((r.x - x) / sigma)) *
      Math.max(0, normalCDF((r.y + r.h - y) / sigma) - normalCDF((r.y - y) / sigma));
  }
  class NearestSelector {
    constructor(opts = {}) { this.radius = opts.radius ?? 24; }
    reset() {}
    update(t, x, y, targets) { return nearestWithinRadius(targets, x, y, this.radius); }
  }
  class StableSelector {
    constructor(opts = {}) {
      this.radius = opts.radius ?? 24;
      this.tau = opts.tau ?? 0.075;
      this.sigma = opts.sigma ?? 6;
      this.adaptive = opts.adaptive ?? false;
      this.acquireSeconds = opts.acquireSeconds ?? 0.06;
      this.switchSeconds = opts.switchSeconds ?? 0.08;
      this.ratio = opts.ratio ?? 1.6;
      this.minimumScore = opts.minimumScore ?? 0.06;
      this.reset();
    }
    reset() {
      this.current = null; this.pending = null; this.pendingAt = 0;
      this.lastT = null; this.x = 0; this.y = 0; this.speed = 0; this.variance = 0;
      this.diagnostics = { sigma: this.sigma, score: 0, reason: 'reset' };
    }
    update(t, x, y, targets) {
      if (![t, x, y].every(Number.isFinite)) { this.reset(); return null; }
      if (this.lastT !== null && (t < this.lastT || t - this.lastT > 0.6)) this.reset();
      const dt = this.lastT === null ? 0 : t - this.lastT;
      if (this.lastT === null) { this.x = x; this.y = y; }
      else if (dt > 0) {
        const elapsed = Math.min(dt, 0.1);
        // Low-pass derivative prevents tremor alone from opening the cutoff fully.
        const instantaneous = Math.hypot(x - this.x, y - this.y) / Math.max(this.tau, elapsed);
        const da = 1 - Math.exp(-elapsed / 0.15);
        this.speed += da * (instantaneous - this.speed);
        const effectiveTau = this.tau / (1 + Math.max(0, this.speed - 160) / 500);
        const a = 1 - Math.exp(-elapsed / effectiveTau);
        this.x += a * (x - this.x); this.y += a * (y - this.y);
        const residual = Math.min(30 ** 2, ((x - this.x) ** 2 + (y - this.y) ** 2) / 2);
        this.variance += (1 - Math.exp(-elapsed / 0.8)) * (residual - this.variance);
      }
      this.lastT = t;
      const sigma = this.adaptive ? clamp(Math.sqrt(this.variance), 4, 12) : this.sigma;
      const scores = [];
      for (const r of targets) {
        if (!validRect(r) || r.risky || distToRect(x, y, r) > this.radius || distToRect(this.x, this.y, r) > this.radius) continue;
        scores.push({ id: r.id, score: rectProbability(this.x, this.y, sigma, r) });
      }
      scores.sort((a, b) => b.score - a.score);
      const best = scores[0], second = scores[1];
      const current = scores.find(r => r.id === this.current);
      this.diagnostics = { sigma, score: best?.score ?? 0, reason: 'uncertain' };
      if (!best || best.score < this.minimumScore) {
        this.current = null; this.pending = null; return null;
      }
      // A current selection has a smaller exit threshold than an unselected target.
      if (current && current.score >= this.minimumScore && best.score < current.score * this.ratio) {
        this.pending = null; this.diagnostics.reason = 'held'; return this.current;
      }
      if (!current) this.current = null;
      if (second && best.score < second.score * this.ratio) {
        this.pending = null;
        return current && current.score >= this.minimumScore ? this.current : null;
      }
      if (best.id === this.current) { this.pending = null; return this.current; }
      if (this.pending !== best.id) { this.pending = best.id; this.pendingAt = t; }
      const dwell = this.current === null ? this.acquireSeconds : this.switchSeconds;
      if (t - this.pendingAt + 1e-9 >= dwell) {
        this.current = best.id; this.pending = null; this.diagnostics.reason = 'selected';
      }
      return this.current;
    }
  }
  // Bounds-aware grid: giant elements are kept separately, never replicated in millions of cells.
  class SpatialIndex {
    constructor(cellSize = 64) { this.cellSize = cellSize; this.cells = new Map(); this.large = []; }
    rebuild(targets) {
      this.cells.clear(); this.large = [];
      for (const r of targets) {
        if (!validRect(r)) continue;
        const x0 = Math.floor(r.x / this.cellSize), x1 = Math.floor((r.x + r.w) / this.cellSize);
        const y0 = Math.floor(r.y / this.cellSize), y1 = Math.floor((r.y + r.h) / this.cellSize);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) > 256) { this.large.push(r); continue; }
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
          const key = x + ',' + y;
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(r);
        }
      }
    }
    near(x, y, radius) {
      if (![x, y, radius].every(Number.isFinite) || radius < 0 || radius > 1024) return [];
      const found = new Map();
      for (const r of this.large) if (distToRect(x, y, r) <= radius) found.set(r.id, r);
      for (let cx = Math.floor((x - radius) / this.cellSize); cx <= Math.floor((x + radius) / this.cellSize); cx++) {
        for (let cy = Math.floor((y - radius) / this.cellSize); cy <= Math.floor((y + radius) / this.cellSize); cy++) {
          for (const r of this.cells.get(cx + ',' + cy) || []) if (distToRect(x, y, r) <= radius) found.set(r.id, r);
        }
      }
      return [...found.values()];
    }
  }
  const api = { distToRect, validRect, nearestWithinRadius, normalCDF, rectProbability, NearestSelector, StableSelector, SpatialIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadySelect = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
