/*
 * A scripted hand. It reaches for a target along a smooth path, with synthetic
 * tremor added, then presses and releases.
 *
 * THIS IS NOT A PERSON. The tremor is a sum of sine waves with a slowly
 * changing amplitude. It exists so that changes to the selector can be compared
 * on identical input. It says nothing about whether real people benefit.
 */
(function (root) {
  'use strict';

  function rng(seed) {                       // mulberry32: small, seedable, repeatable
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rand) {
    return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  }

  /** One trial: returns samples [{t, x, y}] at 100 Hz plus press and release sample indexes. */
  function makeTrial(rect, rmsPx, rand, bounds) {
    const HZ = 100;
    const aimX = rect.x + rect.w / 2 + gauss(rand) * rect.w * 0.12;
    const aimY = rect.y + rect.h / 2 + gauss(rand) * rect.h * 0.12;
    const ang = rand() * 2 * Math.PI;
    const dist = 150 + rand() * 250;
    const sx = Math.min(bounds.w - 5, Math.max(5, aimX + Math.cos(ang) * dist));
    const sy = Math.min(bounds.h - 5, Math.max(5, aimY + Math.sin(ang) * dist));
    const reach = 0.5 + rand() * 0.4;        // seconds moving
    const dwell = 0.3 + rand() * 0.3;        // seconds settling before the press
    const hold = 0.08 + rand() * 0.08;       // seconds the button is down
    const f = 4 + rand() * 3;                // tremor frequency, 4 to 7 Hz
    const split = 0.3 + rand() * 0.4;        // share of tremor power on the x axis
    const ax = rmsPx * Math.sqrt(2 * split);
    const ay = rmsPx * Math.sqrt(2 * (1 - split));
    const p = [0, 1, 2, 3].map(() => rand() * 2 * Math.PI);
    const n = Math.round((reach + dwell + hold + 0.1) * HZ);
    const samples = [];
    for (let i = 0; i < n; i++) {
      const t = i / HZ;
      const u = Math.min(1, t / reach);
      const s = 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;          // minimum jerk
      const env = 1 + 0.3 * Math.sin(2 * Math.PI * 0.4 * t + p[2]);
      const tx = ax * env * Math.sin(2 * Math.PI * f * t + p[0]);
      const ty = ay * env * Math.sin(2 * Math.PI * f * t + p[1]);
      samples.push({ t, x: sx + (aimX - sx) * s + tx, y: sy + (aimY - sy) * s + ty });
    }
    const down = Math.round((reach + dwell) * HZ);
    const up = Math.round((reach + dwell + hold) * HZ);
    return { samples, down, up };
  }

  const api = { rng, gauss, makeTrial };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpenSteadyRobot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
