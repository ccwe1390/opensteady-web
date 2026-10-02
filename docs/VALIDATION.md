# Validation of 0.1.0

Date: October 2, 2026. Development runtime: Linux x64, Node 24.19.0, Python 3.12.14, Playwright 1.62.1. Actual headless Chromium controller tests used Chrome for Testing 151.0.7922.34.

## What passed

- **37 Node tests**, zero failures/skips. Geometry/probability, selection memory, 5,000-rectangle grid equivalence, seeded replay/import validation, conservative gesture invariants, mocked content-controller integration, and mocked service-worker/permission lifecycle. Exact TAP output: `results/unit.tap`.
- **17 real Chromium controller checks**, zero page errors. The actual production controller ran in a CDP-created isolated world with trusted mouse/keyboard input. Checks include native event preservation, near-miss delivery, large-drag rejection, synthetic input rejection, modifiers, risk/occlusion, moving/removed/unlabeled targets, slip correction, repeat guards, native text selection, keyboard editing, Escape recovery, trusted-only handler limitations, checkbox/nested/iframe native input, 5,000-link stress/cap behavior, lab simulation, and a valid recording export. Report: `results/browser-controller.json`; console: `results/browser-controller-console.txt`.
- JavaScript syntax, manifest/file references, bundled assets, and runtime network/eval surface checks passed. No mandatory website grants. Report: `results/package-check.txt`.
- Python files compiled and the analysis command ran against the generated benchmark.
- The rendered local lab was visually inspected; `results/lab.png` is a real browser capture, not a mockup.

## Browser integration limit

The full extension-profile suite was attempted but blocked before it could test installation: this environment forbids the Unix socket Chrome's process singleton needs. The original Playwright browser download also failed; a directly downloaded headless-shell binary provided real controller testing without that singleton. The blocked extension attempt is retained in `results/browser.json`.

The 17 controller passes **do not test** actual extension installation, native permission prompts, Chrome runtime messaging, popup-to-worker integration, dynamic registration, or restart behavior. Those have mocked checks and a manual checklist, not a real installed-extension pass. Run the default `npm run test:browser` and complete the production popup/permission checks on your Mac before distributing this to testers.

Optional controller-only reproduction, if a headless-shell executable is available:

```sh
BROWSER_CONTROLLER_ONLY=1 CHROME_EXECUTABLE=/absolute/path/to/chrome-headless-shell npm run test:browser
```

This is a separate scope of verification, not a substitute that silently passes the full extension suite. Real-site compatibility, macOS/Windows behavior, Firefox, clinical benefit, and long-term adoption are unverified.

## Synthetic benchmark

Three fixed **development** seeds × 600 trials × four amplitudes = 7,200 motions, replayed under four modes (28,800 mode/trial evaluations). Geometry, generator, parameters, per-trial outcomes, and source hashes are in `results/benchmark.json`; all rows are in `results/benchmark.md`.

Counts aggregated over the three seeds at each amplitude:

| Synthetic RMS | Trials | Off correct | Steady policy correct | Off wrong | Steady policy wrong |
|---:|---:|---:|---:|---:|---:|
| 0 px | 1,800 | 1,800 | 1,800 | 0 | 0 |
| 4 px | 1,800 | 1,782 | 1,786 | 0 | 0 |
| 8 px | 1,800 | 1,440 | 1,446 | 0 | 0 |
| 16 px | 1,800 | 481 | 482 | 30 | 30 |

**The important negative result:** nearest, steady, and adaptive modes have identical delivered-policy outcomes on all 7,200 development motions. Conservative correction adds only 11 correct trials over off, with no wrong-target count change. The selector-only experiment improves with smoothing, but this does not establish a delivered-click advantage for the smarter selector. Large press excursions are rejected and native wrong-target clicks are preserved. There is no evidence here to claim a large practical benefit or an advantage over competing extensions.

The motion generator deliberately aims near target centers and waits before pressing, which strongly favors smoothing. The fixed selector's excellent endpoint scores are limited to this model. Adaptive selection produced worse selector-only outcomes at some amplitudes, including errors with zero tremor; it is therefore experimental and not the default. No parameter search on these visible seeds is presented as independent confirmation.

Timing in the replay JSON measures Node selection computation. The browser controller's maximum callback counter sometimes exceeded 1 ms in fixtures, and delivery can include page-handler work. A browser event-latency distribution and dropped-frame study have not been completed; no 1 ms latency guarantee is made.

## Bugs caught during development

- A near-miss drag could activate the original starter's selected target. The new policy tracks maximum excursion and never redirects the reproduced large/returning drag.
- Capture-phase element blur incorrectly canceled a near miss after leaving a focused button. Real Chromium exposed this; the controller now cancels only true window blur.
- Periodic index refresh could temporarily clear an otherwise valid preview and make timing-based browser tests unreliable. Periodic refresh now keeps the previous index available while each chosen target is live-validated; actual DOM/scroll invalidations still abstain until measurement.
- Alt released outside the window could leave bypass stuck; true window blur clears the held-key flag.
- Unrelated storage updates could resume an Escape-paused page. Automatic configuration now preserves page pause; explicit tab enabling resumes it.
- Partial settings updates, options pages in a browser tab, protected-page injection failures, unused permission grants, and multi-tab site forgetting received lifecycle regression coverage.

## Remaining work that code cannot complete

1. Production installation/permission checks on Carol's Mac and advertised platforms; real-site compatibility checks.
2. Feedback from prospective users and an occupational therapist; participant review/permission processes where applicable.
3. New held-out traces/independent dataset conversion, paired sessions, meaningful thresholds chosen before confirmation, and voluntary two-week follow-up.
4. Pinned actual rival-extension comparisons using trusted input.
5. Store account/submission, public privacy URL/support channel, review, and listing.

No participants, approval, clinical outcomes, second dataset, publication, store acceptance, or rival results have been invented. This package completes the implementation and development-evaluation deliverables; the wider project is not empirically finished.
