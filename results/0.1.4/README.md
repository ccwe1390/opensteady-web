# Results for 0.1.4

Every file here, apart from the `0.1.3` folder, was produced by running this build on October 3, 2026 (US Central time), on Linux x86_64 with Node 22.22.0, Playwright 1.56.0 and Chromium 141.0.7390.37. Timestamps inside the files are UTC. None of it was run on a Mac. All input is a scripted hand, not people. Mouse events were sent through the browser's automation interface, not by a physical mouse.

| File | Produced by | What it is |
|---|---|---|
| `unit.tap` | `npm test` | Unit and mocked tests |
| `mutation-check.txt` | `node tools/mutation_check.cjs` | Rules broken one at a time, and whether the unit tests noticed each one |
| `mutation-check-node24.txt`, `browser-console-node24.txt` | The same fault check and `npm run test:browser`, run with Node 24.21.0 | Confirms the same results on Node 24 |
| `checks-on-earlier-drafts.txt` | Each browser check added after the reviews, run alone | Which of those checks fail on two earlier drafts of 0.1.4, which are not in this package |
| `package-check.txt` | `npm run check` | Syntax, manifest and file reference checks |
| `benchmark.json`, `benchmark.md`, `benchmark-console.txt` | `npm run benchmark` | Synthetic replay, 7,200 motions under four modes |
| `policy-variants.txt` | `node probes/policy_variants.cjs` | The replay with the press limit fixed at 12 px and with the shipped rule |
| `press-delay.txt` | `node probes/press_delay.cjs` | The replay with the scripted hand pressing sooner after it arrives |
| `meter-check.txt` | `node probes/meter_check.cjs` | How the shake meter reads shake of different speeds |
| `browser.json`, `browser-console.txt`, `lab.png` | `npm run test:browser` | Checks against the installed extension, and a screenshot of the lab |
| `browser-controller.json`, `browser-controller-console.txt` | The same suite in controller only mode | The same checks with the controller in an isolated world, extension not installed |
| `review-links.json`, `review-links-console.txt` | `npm run test:review-links` | 32 link presses with the quick drag guard off and on |
| `real-input.txt` | `node probes/real_input.cjs 66 8,16` | Installed extension, trusted mouse input, three conditions at two amplitudes |
| `real-input-repeat.txt` | The same command, run a second time | A repeat of the run above |
| `per-trial-16px.txt`, `per-trial-8px.txt` | `node probes/per_trial.cjs 66 16` and `66 8` | Trial by trial detail and the cause of each miss |
| `intentional-drag.txt` | `node probes/intentional_drag.cjs` | Deliberate link drags with the guard off and on |
| `hold-to-click.txt` | `node probes/hold_to_click.cjs 4 100` | Time to fire under jitter |
| `native-link-drag.txt` | `node probes/link_drag.cjs` | What the browser does with a shaky press on a link, no extension |
| `alt-click.txt` | `node probes/alt_click.cjs` | What Chrome does with Alt and click, no extension |

`docs/VALIDATION.md` explains what these do and do not show.

The folder `0.1.3` holds result files from the previous build that were not regenerated. They are kept for the record and describe 0.1.3, not this build.
