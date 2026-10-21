# Validation

## 0.1.5 (results/)

Date: October 21, 2026 (US Central time). Timestamps inside result files are UTC.

Where it was run: a Claude Code cloud container, Linux x86_64, Node 22.22.0, Python 3.13.16, Playwright 1.62.1 driving Chromium 141.0.7390.37 (the container's preinstalled build, through `CHROME_EXECUTABLE`). That is the same Chromium version as for 0.1.4, on a different machine. The controller only suite used the headless shell of the same build.

Where it was not run: a Mac, Windows, Edge, or Node 24 (the GitHub Actions workflow runs the unit tests and fault check on Node 20, 22 and 24). Nothing here was tried by a person with tremor. "Trusted input" means the same as in the 0.1.4 section below: events from Chromium's automation interface, not a physical mouse.

### What passed

| Check | Result | Record | Compared with 0.1.4 |
|---|---|---|---|
| Unit, mocked and catalog tests | 121 of 121 | `results/unit.tap` | 108 before. New: shortcuts (5), outline (2), catalog (5), action labels (1). |
| Installed extension suite | 44 of 44, no page errors | `results/browser.json`, `results/browser-console.txt` | The same 41, plus shortcuts registered, settings page, popup outside a webpage |
| Controller only suite | 41 of 41, no page errors | `results/browser-controller.json` | Same 41. The three new checks need the installed extension. |
| Package check | Passed, 42 JavaScript files | `results/package-check.txt` | 40 before (new `ui/i18n.js`, `test/i18n.test.cjs`). Also fixed: it no longer fails after `npm install`. |
| Fault injection | 63 of 63 caught, control survived | `results/mutation-check.txt` | 61 before. The 2 new faults remove the action label exclusion and match action words in link addresses. |
| Replay benchmark | Every accuracy figure identical | `results/benchmark.md` | Only the per-decision computation time column differs |
| `policy_variants`, `press_delay`, `meter_check` | Byte for byte identical | `results/policy-variants.txt`, `results/press-delay.txt`, `results/meter-check.txt` | Same |
| Contrast | 26 of 26 pairs | `python3 tools/contrast.py` | New |

### The installed extension under trusted mouse input

`probes/real_input.cjs 66 8,16`, the same paths as 0.1.4:

| Shake (RMS) | Condition | Correct | Links | Buttons | Wrong target | 0.1.4 |
|---:|---|---:|---:|---:|---:|---:|
| 8 px | Extension off | 38 of 66 | 0 of 24 | 38 of 42 | 0 | 38 |
| 8 px | 0.1.5 defaults | 63 of 66 | 22 of 24 | 41 of 42 | 0 | 63 |
| 8 px | Quick drag guard switched off | 41 of 66 | 0 of 24 | 41 of 42 | 0 | 41 |
| 16 px | Extension off | 13 of 66 | 0 of 24 | 13 of 42 | 0 | 13 |
| 16 px | 0.1.5 defaults | 48 of 66 | 12 of 24 | 36 of 42 | 0 | 48 |
| 16 px | Quick drag guard switched off | 28 of 66 | 1 of 24 | 27 of 42 | 0 | 28 |

Planned press 121 ms, actual 120 ms, schedule lag at release 9 ms. A second complete run (`results/real-input-repeat.txt`, actual press 119 ms, lag 8 ms) gave the same counts in every row.

The per-trial probes gave the same summary as 0.1.4 at both amplitudes (`results/per-trial-16px.txt`, `results/per-trial-8px.txt`): at 16 px, 13 correct off and 48 on, and at 8 px, 38 and 63, with no wrong clicks. The largest cause of misses at 16 px is still a press that lands on a neighboring control (9 of 18).

The new action label exclusion did not change any of these numbers, because no target on the probe page is labelled with one of those actions. The exclusion is tested by `test/targets.test.cjs` and the two new faults, not by these probes.

### Other probes

| Probe | 0.1.5 | 0.1.4 |
|---|---|---|
| `link_drag` (no extension) | Links: 28 of 28 presses that stayed on the link became drags, no clicks | Same |
| `alt_click` (no extension) | Alt and click downloads the link | Same |
| `intentional_drag` | Guard off drags. Guard on, at once: cancelled, nothing clicked. Guard on, after 0.7 s: drags. | Same |
| `hold_to_click 4 100` | Six of six fired, 1.05 to 1.13 s after aiming | Six of six, 1.05 to 1.10 s |
| `review-links` | Guard on: 30 of 32 correct, 0 wrong. Guard off: 1 of 32. | Guard on: 30. Guard off: 0. |

The two differences (hold to click timing, and one link press with the guard off) are real-time timing variation. Nothing in those code paths changed.

### What 0.1.5 adds that these runs do not measure

The keyboard shortcuts are checked by mocked tests and by the browser check that Chromium registered them with the right key and descriptions. No test presses the key in a real browser, because automation cannot send browser-level shortcuts. The outline styles are checked by unit tests and by saving the setting in the installed extension. Their look on real pages was checked only in screenshots of the settings page (`docs/audits/2026-10-21_accessibility-audit.md`).

## 0.1.4 (results/0.1.4/)

Everything in this section describes 0.1.4 and its files in `results/0.1.4/`. It is kept as it was written on 2026-10-03, with file paths updated.


Date: October 3, 2026 (US Central time). Timestamps inside result files are UTC.

Where it was run: Linux x86_64, Node 22.22.0, Python 3.13.15, Playwright 1.56.0, Chromium 141.0.7390.37. The installed extension tests used the full Chromium build. The controller only tests used the headless shell of the same version. The Node and Chromium versions are recorded inside the result files. The others are from the machine the tests ran on.

The unit tests, the fault check, the package check, the benchmark, the installed extension suite and the link replay were also run under Node 24.21.0, with the same results. The Node 24 fault check and browser suite output are kept as `results/0.1.4/mutation-check-node24.txt` and `results/0.1.4/browser-console-node24.txt`.

Where it was not run: a Mac, Windows, Edge, or the Playwright version pinned in `package.json` (1.62.1, which brings a newer Chromium). Nothing here was tried by a person with tremor.

**What "trusted input" means in this document.** The browser tests and probes send mouse events through Chromium's automation interface, in a browser with no visible window. The page and the extension see them as trusted, exactly as they see a real mouse. But they do not come from a physical mouse or from the operating system, and they follow scripted paths. Drag handling on a Mac may differ in details.

### What passed

| Check | Result | Record |
|---|---|---|
| Unit and mocked tests (`npm test`) | 108 of 108 | `results/0.1.4/unit.tap` |
| Installed extension suite (`npm run test:browser`) | 41 of 41, no page errors | `results/0.1.4/browser.json`, `results/0.1.4/browser-console.txt` |
| Controller only suite | 41 of 41, no page errors | `results/0.1.4/browser-controller.json`, `results/0.1.4/browser-controller-console.txt` |
| Package check (`npm run check`) | Passed, 40 JavaScript files | `results/0.1.4/package-check.txt` |
| Paired link replay (`npm run test:review-links`) | Ran, no errors | `results/0.1.4/review-links.json` |
| Replay benchmark (`npm run benchmark`) | Ran | `results/0.1.4/benchmark.json`, `results/0.1.4/benchmark.md` |
| Fault injection (`node tools/mutation_check.cjs`) | 61 of 61 deliberate faults caught by the unit tests | `results/0.1.4/mutation-check.txt` |
| Probes | Ran | `results/0.1.4/real-input.txt` and the files listed in `results/0.1.4/README.md` |

The installed extension suite loads the real extension into Chromium and drives it with trusted mouse and keyboard input. Its temporary manifest grants localhost access so the test does not have to click through a permission prompt. The shipped manifest is unchanged. The suite covers native event preservation, near miss delivery, drag rejection, synthetic input rejection, modifier keys, risky and covered targets, moving, removed and unlabeled targets, slips, the repeat guard, native text selection, keyboard editing, Escape, a handler that accepts only trusted clicks, checkbox, nested label and iframe input, hold to click, the quick drag guard, selected text, wide slips after measured shake, pages that cancel drags themselves, draggable handles, nested controls, a 5,000-link stress page, the 6,000-control cap, the lab simulation, and a recording export.

The controller only suite runs the same checks with the controller injected into an isolated world, without installing the extension. It is a narrower check. To reproduce it:

```sh
BROWSER_CONTROLLER_ONLY=1 CHROME_EXECUTABLE=/absolute/path/to/headless_shell npm run test:browser
```

Neither suite tests the real permission prompts, the popup talking to the worker, or behavior across a browser restart. Those have mocked tests and a manual checklist in `docs/COMPATIBILITY.md`.

**How strong the tests are.** `tools/mutation_check.cjs` breaks one rule of the extension at a time, 61 rules in all (for example "drag guard: outline agreement is dropped" or "click: a stray click on a containing control is let through"), and runs the unit tests against each broken copy. The unit tests caught all 61. The output is `results/0.1.4/mutation-check.txt`.

The first version of this script had a bug, found by an outside check after release. From Node 24 the test runner prints its summary in a different format, the script could not read it, and it counted every fault as caught, even one that changes nothing. It now asks for the TAP format explicitly, refuses to give a verdict when it cannot read the results, first confirms that the unchanged code passes, and includes a control fault that changes only a comment and must be reported as surviving. On Node 22 and Node 24 it now gives the same verdict and the same number of failing tests for every fault.

The browser checks added after the reviews were also run, each one alone, against two of the earlier drafts of 0.1.4: the draft before any review, and the draft after the first review. `results/0.1.4/checks-on-earlier-drafts.txt` records which ones fail on which draft. Of the 8 checks listed there, 6 fail on the draft before any review, 3 fail on the draft after the first review, and all pass on this build. Those drafts are not part of this package.

### The installed extension under trusted mouse input

`probes/real_input.cjs` moves the pointer along scripted shaky paths in real time and counts which control actually received a click. Each condition has 66 trials: 24 aimed at links and 42 at buttons. The three conditions use identical paths.

| Shake (RMS) | Condition | Correct | Links | Buttons | Wrong target |
|---:|---|---:|---:|---:|---:|
| 8 px | Extension off | 38 of 66 | 0 of 24 | 38 of 42 | 0 |
| 8 px | 0.1.4 defaults | 63 of 66 | 22 of 24 | 41 of 42 | 0 |
| 8 px | 0.1.4, quick drag guard switched off | 41 of 66 | 0 of 24 | 41 of 42 | 0 |
| 16 px | Extension off | 13 of 66 | 0 of 24 | 13 of 42 | 0 |
| 16 px | 0.1.4 defaults | 48 of 66 | 12 of 24 | 36 of 42 | 0 |
| 16 px | 0.1.4, quick drag guard switched off | 28 of 66 | 1 of 24 | 27 of 42 | 0 |

For comparison, the earlier review measured 0.1.3 on the same paths at 36 of 66 at 8 px and 13 of 66 at 16 px with its defaults, which is no better than having the extension off. With its optional link setting switched on it scored 49 and 13. Those 0.1.3 runs are not in this package.

The mean press lasted 119 ms against a planned 121 ms, and the script ran a mean of 8 ms behind schedule at release, so the timing is close to what was planned. A second complete run, kept as `results/0.1.4/real-input-repeat.txt`, gave the same counts in every row. A repeat on an earlier draft differed by one in one row (not kept), so treat a difference of one or two as noise.

What the remaining misses are, from `probes/per_trial.cjs` at 16 px (18 misses with the extension on):

| Cause | Count |
|---|---:|
| The press landed on a neighboring control. The extension never reassigns that. | 9 |
| The press wandered past the allowed distance. | 6 |
| A near miss was released on a different control. | 2 |
| The press landed beside the target while the outline was on a neighbor. | 1 |

At 8 px there are 3 misses: 2 that pressed on a neighboring control, 1 that wandered past the allowed distance.

Other probes on this build:

- **Deliberate drag.** With the guard on, press, wait 0.7 seconds, then drag a link 370 px: the browser drags as usual. Drag at once: the drag is cancelled and nothing is clicked. With the guard off: the browser drags as usual.
- **Hold to click.** With 4 px jitter at a requested 100 moves a second, six of six tries fired between 1.05 and 1.10 seconds after aiming (the countdown is 0.9 seconds).
- **Native link drag, no extension.** 28 of 28 shaky presses that began and ended on a link became drags, with no click. This is why the guard exists.
- **Alt and click, no extension.** Chrome started a download and did not navigate. This is why Alt is no longer advertised as the bypass key.

### Paired link replay

`npm run test:review-links` replays 32 scripted link presses (seed 77, 8 px shake) twice, with trusted input against the installed extension.

| Quick drag guard | Correct | Wrong | Miss | Correct among the 28 presses that began and ended on the link |
|---|---:|---:|---:|---:|
| Off | 0 | 0 | 32 | 0 |
| On | 30 | 0 | 2 | 28 |

This replay paces its input with ordinary timers, less precisely than the probes, and its counts moved by one between runs during development (those runs are not kept).

### Synthetic replay benchmark

Three fixed development seeds, 600 trials each, at four amplitudes: 7,200 motions, replayed under four modes. Settings, per-trial outcomes and source hashes are in `results/0.1.4/benchmark.json`. The target geometry is defined in `benchmark/replay.js` and the scripted hand in `benchmark/robot.js`. Both are identified in the JSON by hash. All rows are in `results/0.1.4/benchmark.md`.

Counts over the three seeds at each amplitude, default (steady) selector:

| Synthetic RMS | Trials | Off correct | 0.1.4 correct | Off wrong | 0.1.4 wrong |
|---:|---:|---:|---:|---:|---:|
| 0 px | 1,800 | 1,800 | 1,800 | 0 | 0 |
| 4 px | 1,800 | 1,782 | 1,798 | 0 | 0 |
| 8 px | 1,800 | 1,440 | 1,757 | 0 | 0 |
| 16 px | 1,800 | 481 | 1,339 | 30 | 30 |

The validation document for 0.1.3 reported 1,786, 1,446 and 482 correct at 4, 8 and 16 px for that build: almost no gain over off. That document is not in this package. `results/0.1.3/review-policy-variants.txt` gives the same figures as percentages.

The 30 wrong clicks at 16 px are presses that began and ended on a neighboring control. They happen with the extension off as well, and the extension leaves them alone.

The selector now matters. With the nearest selector in place of the steady one, the same press rule gives 1,729 correct and 8 wrong at 8 px, and 1,121 correct and 174 wrong at 16 px. `probes/policy_variants.cjs` prints this comparison, and `results/0.1.4/policy-variants.txt` holds its output.

The replay is a geometry model. It cannot show a browser turning a moving press on a link into a drag, or accidental text selection. Both mattered more than the press rule under trusted input, which is why the table in the previous section is the better guide.

### The benchmark flatters the shake measurement

The scripted hand always hovers for 0.3 to 0.6 seconds before pressing, and its shake is a clean 4 to 7 Hz sine wave. Both are the best case for the meter. Two probes show what happens otherwise.

`probes/press_delay.cjs` replays the same hand pressing sooner after it arrives (1,800 trials per row, steady selector):

| Hover before the press | 8 px: limit widened | 8 px: correct, off then on | 16 px: limit widened | 16 px: correct, off then on |
|---|---:|---|---:|---|
| 0.00 s | 1.0% | 81.2% then 81.9% | 8.9% | 26.7% then 30.1% |
| 0.05 s | 8.6% | 80.7% then 83.1% | 30.4% | 28.0% then 40.4% |
| 0.10 s | 43.3% | 81.6% then 88.5% | 70.4% | 25.2% then 59.2% |
| 0.15 s | 91.4% | 79.6% then 96.8% | 98.4% | 27.3% then 73.4% |
| 0.20 s | 98.6% | 80.7% then 97.3% | 100.0% | 25.1% then 73.1% |
| 0.30 s | 98.6% | 80.1% then 97.1% | 100.0% | 25.6% then 75.1% |
| 0.45 s | 98.6% | 80.8% then 97.7% | 100.0% | 27.7% then 75.7% |
| 0.60 s | 98.7% | 79.6% then 97.2% | 100.0% | 27.0% then 75.1% |

A hand that presses the instant it arrives gets almost nothing from the wider limit. About 0.15 seconds of hovering is enough for most of the benefit.

`probes/meter_check.cjs` feeds the meter a hovering pointer that shakes at a known size and speed. At 3 cycles a second it declines to answer almost every time. At 4 it reads about three quarters of the true size. From 5 to 12 it reads within about ten percent. A person whose tremor is about 3 cycles a second would usually get the 12 px limit, and would count as steady for the rules about selected text.

### How much weight these numbers can carry

- **The settings were chosen on these same paths.** The shake multiplier (3) and the 48 px ceiling were picked while looking at these seeds, and the 2 px line for a steady hand while looking at a reviewer's browser experiments. The results show the rule works on the paths it was tuned for. They are not an independent confirmation. A fresh set of seeds, and then recordings from people, are needed for that.
- **The measurements on shaky paths never exercise the time limits.** Every scripted shaky press lasts 0.08 to 0.16 seconds. The 0.6 second cutoff, the 1.2 second maximum and the 0.5 second drag window are checked by logic tests and by a few fixed browser checks. Whether they suit real hands is unknown.
- **A scripted hand is not a person.** The paths are a smooth reach, a hover, and a sine wave. Real tremor is less regular, real hands do not always hover, and people change how they move once a tool helps them.
- **Zero wrong clicks in 264 probe trials with the extension on is not a safety proof.** It means none were seen on this page layout.
- **The cost to deliberate drags has not been measured with people.** The guard asks people to pause half a second before dragging a link. Whether that is acceptable is a question for users.
- **Timing.** The replay's timing column measures selector computation in Node. A distribution of browser event latency has not been collected, and no latency guarantee is made.

### Hold to click

Unchanged since 0.1.3 apart from the rule for selected text. The suite activates a 20 by 20 px target once with 4 px circular jitter, checks that a stationary pointer cannot activate it repeatedly, and checks cancellation, exclusions and rearming. The press and release benchmark does not evaluate hold to click.

### Problems found and fixed while building 0.1.4

Found during the build, before the independent review. These are observations from development runs that are not all kept as result files.

- A 13 px wobble on a link after a cancelled drag was rejected by the 12 px limit, so the link was not clicked. A press released on the control it started on is now recognized up to 48 px.
- At 16 px, one probe trial clicked a neighboring link: the drag guard had turned a press and release on that neighbor into a click. The guard now requires the outline to agree with the pressed target.
- A shaky near miss on selected text was dragged by the browser as a text drag, and nothing was clicked. For a hand that is not steady the guard now cancels that drag too.
- The controller only test mode created a second isolated world on Chromium 141 and failed on both 0.1.3 and 0.1.4. The harness now keeps one world per document.

Found by the first independent review of the finished work. Each was reproduced in Chromium by the reviewer and each now has a test of its logic. `docs/REVIEW-RESPONSE.md` has the detail.

- On a page that cancels link drags itself, the guard stopped clicks that the page would otherwise have received.
- A steady hand selecting a few letters beside an outlined control had the control clicked and the selection removed.
- With a button nested inside a clickable card, a working trusted click was replaced by a synthetic one.
- The check for selected text slowed down on a very large selected block of text. (The speed itself is not tested.)
- After a cancelled drag, a scroll event or a modifier key during the press cost the click.
- A handle marked draggable inside a link had its drag cancelled.

Found by the second independent review, of the fixes above, and by the final check:

- The fix for the steady hand selecting text used a 5 px line for "steady". A mild tremor measuring 3 to 5 px therefore lost most near misses on text (the reviewer's runs, not kept as files; `results/0.1.4/checks-on-earlier-drafts.txt` shows the new check failing on that draft). The text rules now use a separate 2 px line, and the press limit no longer jumps at 5 px.
- A page that cancels drags in a window listener added after the extension still lost its click. And whether a page's own cancellation kept the press depended on when the page's listener ran. Now any drag the page cancels keeps the press, and any drag that really starts ends it.
- After a cancelled drag, a clickable container (a card around a link) could receive a click the browser would never have sent. The final check found that the first fix covered only containers marked as controls. It now covers any element.

Bugs caught in earlier versions are listed in `CHANGELOG.md`.

### Remaining work that code cannot complete

1. Run the automated checks and the manual checklist on Carol's Mac, and on any other platform that will be advertised. Try real websites where a wrong click does no harm.
2. Feedback from prospective users and an occupational therapist, with the review and permission process that applies.
3. New held-out traces or an independent dataset, paired sessions, thresholds chosen before confirmation, and a voluntary follow-up after two weeks.
4. A comparison with pinned releases of rival extensions using trusted input.
5. Store account and submission, a public privacy URL and support channel, review, and listing.

No participants, approvals, clinical outcomes, second dataset, publication, store acceptance, or rival results have been invented. This package completes the implementation and its development evaluation. The wider project is not empirically finished.
