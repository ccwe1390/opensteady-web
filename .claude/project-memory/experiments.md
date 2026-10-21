# experiments - OpenSteady Web

All scripted hand, Linux, Chromium. Not people.

## 0.1.4 (2026-10-03, Chromium 141) - results/0.1.4/
- real_input 66 trials: 8 px off/defaults/guard-off = 38/63/41; 16 px = 13/48/28. No wrong-target clicks.
- 0.1.3 on same paths (earlier review, not kept): 36 and 13 with defaults.
- Largest remaining miss cause at 16 px: press lands on a neighboring control (per-trial-16px.txt).
- Unit 108/108, browser 41/41, controller-only 41/41, mutation 61/61.

## 0.1.5 (2026-10-21) - results/
- Same Chromium 141.0.7390.37 (cloud container). real_input identical to 0.1.4 in every row; per-trial, benchmark accuracy, policy-variants, press-delay, meter-check identical.
- Unit 121/121, browser 44/44, controller-only 41/41, mutation 63/63.
- review-links guard-off 1/32 vs 0/32 and hold-to-click 1.05-1.13 s: timing noise.
