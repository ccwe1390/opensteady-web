# OpenSteady Web

An experimental browser extension that runs entirely on your own computer and makes no network requests. It is meant to help with near misses, slips during a press, quick accidental drags, repeated mouse clicks, and optional hold to click without a button press. It includes a pure target selector, a conservative gesture policy, a local pointing lab, a reproducible replay benchmark, measurement probes that drive the installed extension, and evaluation materials.

Version **0.1.5**. Desktop Chrome, Manifest V3, Chrome 120 or newer. Edge uses the same extension system but has not been tested. No build step or runtime dependencies. This is a browser prototype, not a system-wide cursor filter or a medical treatment. Real-world benefit has not been established. Every measurement of this build comes from a scripted hand with synthetic tremor, on Linux, not from people.

## Start on your Mac

1. Unzip this download. Keep the whole `opensteady-web` folder.
2. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the `extension` subfolder. In Edge use `edge://extensions`.
3. Open Terminal, type `cd ` (with a space), drag the outer `opensteady-web` folder into Terminal, and press Enter.
4. Run:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

5. Open <http://127.0.0.1:8000/lab/index.html>. Pin OpenSteady in the browser toolbar, open its popup, and choose **Enable on this tab**.
6. Move slowly beside a button until a green outline appears, then click. A near miss needs that outline to be visible for at least 60 ms first. Clear native clicks work normally. Some gaps deliberately receive no assistance.

Keep Terminal open while using the lab. Press Control+C to stop the local server. The extension itself needs no server to assist other webpages. Enable each tab manually or explicitly grant **Always enable on this site**. It starts with no website access.

**Recovery:** press Escape to pause this page, and resume from the toolbar or with **Alt+Shift+S** (Control+Shift+S on a Mac). Choose **Turn off on this tab**, **Turn off & forget this site**, or **Pause everywhere** as needed. A click made with Shift, Control, Command or Option held is left to the browser. Remove the extension normally to uninstall.

## What changed in 0.1.5

Clicking is unchanged from 0.1.4. This version adds controls and appearance options, and the project tooling to keep developing it. See [CHANGELOG.md](CHANGELOG.md).

- **Keyboard shortcuts.** **Alt+Shift+S** (Control+Shift+S on a Mac) turns assistance on or off on the current tab and resumes a page paused with Escape. **Pause or resume assistance everywhere** has no default key. Set or change both at `chrome://extensions/shortcuts`. No new permission.
- **Outline style.** Standard, bold, or high contrast (black on a yellow halo), under **Settings & privacy**. Appearance only.
- **Dark mode, forced colors, reduced motion** in the popup and settings page.
- **One message catalog** (`extension/_locales/en/messages.json`) for every user-visible string. English only.
- **Development.** Fixed `npm run check` failing after `npm install`, and made the probes honor `CHROME_EXECUTABLE`. Added CI, release automation, audits, and Claude Code project tooling (see below).

## What changed in 0.1.4

Version 0.1.3 passed its tests but, when the installed extension was driven with trusted mouse input, its default settings did nothing for a shaking hand. Four causes were found and fixed. The work was then checked in three rounds by independent AI reviewers that had not seen it being written, one for the code and one for the documents each time, and what they found was fixed as well. Details and measurements are in [docs/REVIEW-RESPONSE.md](docs/REVIEW-RESPONSE.md).

1. **The press limit now scales with measured shake.** A press could wander only 12 px before it stopped counting as a click, and a shaking hand almost always exceeds that. The extension now measures how much the pointer shook in the 0.3 seconds before the press. A press of 0.6 seconds or less may wander three times that, never less than 12 px and never more than 48 px, so the limit starts to grow at 4 px of shake. A steady hand still gets exactly 12 px.
2. **Selected text no longer switches assistance off.** A shaky press often selects text by accident, and any selection anywhere used to disable all help. Now a steady press is left alone only when it lands on selected plain text or selects text itself. Here a hand counts as steady when its measured shake is under 2 px, or when the shake could not be measured.
3. **A quick drag is kept as a click, by default.** A browser turns a moving press on a link into a drag, and then nothing is clicked. A drag that begins within half a second of the press is now cancelled so the click can happen. To drag on purpose: press, wait half a second, then move.
4. **Alt is no longer advertised as the bypass key.** Chrome downloads a link on Alt (Option) and click. Escape pauses the page. Any click with a modifier key held is left entirely to the browser.

## Behavior

- **Outline.** A quiet green outline shows the proposed target. The proposal is frozen at a mouse press. Selection uses pointer path smoothing, probabilistic rectangle scoring, a short acquisition delay, memory, and abstention when the evidence is unclear.
- **Native clicks first.** A press and release on the same control is that control's click. A native click on another control is never reassigned to an inferred target. The one exception follows a drag the guard cancelled: the browser then sends its click to whatever contains both the press and the release, and that click is not treated as a click on that container.
- **Near miss.** A press on empty space beside the outlined target, released on empty space or on that target, is delivered to the target.
- **Slip.** A press on a target that slides off before release is delivered to the pressed target. If the press wandered more than 12 px, or the release landed on another control, the outline must also have been on the pressed target.
- **Trusted clicks are kept.** When the browser's own click already reaches the right control, the extension passes it through. It never replaces a working click with a synthetic one.
- **How far a press may wander.** 12 px always. For presses of 0.6 seconds or less, three times the shake measured just before the press, up to 48 px, which is more than 12 px once shake exceeds 4 px. A press longer than 1.2 seconds is never corrected. Measuring shake needs the pointer to hover near the target for about a fifth of a second before the press.
- **Quick drag guard** (on by default, under **Settings & privacy**). A drag that begins within 0.5 seconds of a press on an eligible link or button is cancelled so the press can finish as a click. A drag that begins at once is cancelled however far it goes. If that press then travels more than 48 px or lasts longer than 1.2 seconds, nothing is clicked. A click that lands anywhere other than the pressed control (a card holding the link, say) is stopped. Apart from drags beside the target, which also need measured shake of 2 px or more, the only test is timing. It does not identify tremor. Anything a page marks as draggable is left alone, and so is a drag the page cancels itself.
- **Repeat guard.** A second nearby mouse activation of the same target within 300 ms is suppressed. It is on by default and can be switched off. Keyboard activation is unchanged.
- **Optional hold to click.** Choose **Turn on hold to click** in the toolbar. Keep aiming at a safe outlined target until its progress bar fills (0.9 seconds by default, adjustable from 0.5 to 2 seconds). It activates once without pressing the mouse. Move 32 pixels away for a quarter second before another activation. This is off initially because hovering will activate eligible controls when it is on. Manual presses, typing, scrolling, the pointer leaving the page, holding Option, and losing focus cancel the countdown. An automatic click is untrusted and may be rejected by a site.
- **What cancels a correction.** A modifier key, a press longer than 1.2 seconds, wandering past the allowed distance, a target that moves, disappears or becomes covered, pointer capture, scrolling, a drag that really starts (one that neither the guard nor the page cancelled), and losing focus. For a steady hand (measured shake under 2 px, or not measured), a press that lands on selected plain text or that selects text on its way.
- **Exclusions.** Forms, file pickers, text editing, risky labels such as delete or pay, unlabeled controls, custom elements, and unsupported interaction types are left alone. Risk matching is imperfect and is not a security boundary.
- **Events.** Correction happens at the final click. The extension does not cancel pointerdown or pointerup, manufacture those events, or move the operating system cursor.

The default radius is 24 px (internally bounded to 8 to 32 px), but the probability and confidence gates usually allow a smaller effective distance. This maximum is not a promise that every miss within 24 px will be corrected.

## Scope and limits

Top-level http and https webpages only. Iframes (including same-origin), shadow-root internals, browser chrome, PDF viewers, desktop apps, touch, and pen are outside this release. Form controls are left native.

Redirected `HTMLElement.click()` events are untrusted. Some sites ignore them or respond to pointerdown before a click, and this extension cannot universally reproduce native input. A press that lands on a neighboring control is that control's click. The extension does not correct it. In the probe measurements this is the largest remaining cause of misses at high shake. Heavily animated pages may temporarily lose their outline. Pages with more than 6,000 discovered controls get no target assistance.

The quick drag guard changes one ordinary habit: dragging a link the instant you press it no longer works while the guard is on. Press, wait half a second, then drag, or switch the guard off. On a page with its own drag code on ordinary links, the page may be left looking as if a drag were in progress after the guard cancels one. A page that stops the drag event from traveling on, without cancelling it, switches the guard off for that drag.

The rules for a hand that is not steady have a cost as well. When shake of 2 px or more was measured just before a press, a short, quick drag that starts beside an outlined target (for example, the start of a text selection) is taken for a near miss and clicked, and the text it selected is deselected. A quick corrective movement just before the press can measure that high even for a steady person. A hand that measures under 2 px keeps its selection and nothing is clicked.

The shake measurement has limits of its own. It needs the pointer to hover near the target for about a fifth of a second, so a hand that presses the instant it arrives usually gets only the 12 px limit, and is treated as steady by the rules about selected text. Shake at about 3 cycles a second usually cannot be measured at all and is treated the same way. Shake at about 4 cycles a second reads as smaller than it is. A deliberate wiggle before a press measures as shake. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

A steady hand keeps the 12 px limit, but 0.1.4 is not identical to 0.1.3 for a steady hand. The differences are listed under "What a steady hand will notice" in the architecture document.

## Verify

Node 20 or newer is needed only for development:

```sh
npm test
npm run check
npm run benchmark
python3 benchmark/analyze.py results/benchmark.json
node tools/mutation_check.cjs
```

The last command checks the tests themselves: it breaks one rule of the extension at a time and confirms that the unit tests notice.

Two more tools: `python3 tools/contrast.py` checks the WCAG contrast of every UI color pair, and `python3 tools/bump_version.py X.Y.Z` writes a new version everywhere it appears. GitHub Actions (`.github/workflows/checks.yml`) runs the unit tests on Node 20, 22 and 24, plus the package check, benchmark, fault check, contrast check, a reproducible-package check, and the installed extension suite, on every push and pull request. Pushing a tag `vX.Y.Z` publishes a GitHub Release with the ZIPs (`release.yml`). That is not a store submission.

For tests that load the real extension into Chromium:

```sh
npm install
npx playwright install chromium
npm run test:browser
npm run test:review-links
```

Use `HEADED=1 npm run test:browser` for a visible test browser. If Playwright's own Chromium is not installed (for example in a cloud container with a preinstalled browser), point the suites and probes at another build with `CHROME_EXECUTABLE=/path/to/chrome`. A missing browser fails the test command instead of recording a pass. The suite loads the actual extension and uses trusted Playwright mouse events. Its temporary test manifest grants only localhost access. The shipped manifest is unchanged. Permission and lifecycle flows also have mocked service-worker tests and a manual checklist.

See [docs/VALIDATION.md](docs/VALIDATION.md) for this build's actual results and remaining checks. A unit pass is not a claim of browser or user effectiveness.

## Measure the installed extension

The `probes` folder drives the installed extension with trusted mouse events along scripted shaky paths, in real time. The events are injected through the browser's automation interface. They are trusted by the page, but they do not come from a physical mouse or from the operating system. This is how the 0.1.3 problems were found, because the replay benchmark cannot see native dragging or text selection.

```sh
node probes/real_input.cjs 66 8,16
node probes/per_trial.cjs 66 16
node probes/press_delay.cjs
node probes/meter_check.cjs
```

See [probes/README.md](probes/README.md) for every probe and what it showed on this build.

## Compare and record

The lab's **Run seeded simulation** evaluates four rules against identical generated paths: off, nearest, fixed steady selection, and experimental adaptive steady selection. It reports **selector** and **policy** results separately. It does not dispatch fake events to the installed extension or bypass its trusted-input gate.

Hold to click has its own policy tests and installed extension checks. The press and release benchmark and recorder **do not evaluate hold to click**. Turn it off for those recordings. An activation without a physical press stops the recorder instead of silently producing an invalid trial.

The command-line benchmark uses a fixed geometry and three development seeds. The lab uses the displayed page geometry. Their numbers need not match. `benchmark/protocol.json` lists the selector, press and shake settings. The target geometry is in `benchmark/replay.js` and the scripted hand is in `benchmark/robot.js`. Synthetic data is a software development aid, not an estimate of tremor prevalence, severity, or human benefit. The replay models the press rule but not the browser's native dragging or text selection, so the probes are the better guide to what the installed extension does.

Real recording requires **Start 22-trial recording** on the lab page. It collects that lab's pointer movements, target rectangles, relative times, and observed target activations, plus the browser's user agent (which names the browser and operating system), window size, the condition label you choose, and the time the recording started. Completed trials remain in memory, and export is explicit. Condition labels are entered by the operator and **not verified automatically**. A reload discards unexported records. The extension never records pointer traces on other sites.

Replay an export:

```sh
node benchmark/run.cjs --trace /path/to/opensteady-lab-trace.json --out results/trace-replay.json
python3 benchmark/analyze.py /path/to/opensteady-lab-trace.json
```

Trace replay evaluates counterfactual algorithms on recorded motions. It does not recreate how a person would adapt their behavior with different assistance. Observed task outcomes and modeled outcomes must be reported separately.

The paired link replay can be reproduced with `npm run test:review-links`. It uses a fixed geometry and scripted input in a localhost fixture, not participant data.

## Project map

| Path | Purpose |
|---|---|
| `extension/core/selector.js` | Geometry, Gaussian scoring, temporal selection, spatial grid |
| `extension/core/jitter.js` | Shake measurement before a press, and the distance a press may wander |
| `extension/core/policy.js` | Pure press, release and click state machine |
| `extension/core/link-drag.js` | Quick drag guard: which drags may be cancelled, and when |
| `extension/core/dwell.js` | Optional hold to click countdown, cancellation, and rearm state machine |
| `extension/core/settings.js` | Defaults and validation of stored settings |
| `extension/targets.js` | DOM eligibility, risk exclusions, index, live revalidation |
| `extension/content.js` | Trusted input, outline, policy application, recovery |
| `extension/background.js` | Opt-in injection, settings, site permissions |
| `extension/ui/` | Toolbar popup, settings, privacy; `i18n.js` fills text from the catalog |
| `extension/_locales/en/messages.json` | Every user-visible string, and the manifest name and description |
| `extension/manifest.json`, `extension/icons/`, `extension/LICENSE`, `extension/NOTICE.md` | Extension manifest, icons, license and notice |
| `lab/` | Local simulation, explicit recordings, compatibility fixtures |
| `benchmark/` | Seeded generator, JSON replay, analysis, protocol |
| `probes/` | Measurements of the installed extension under trusted input, and checks of the shake meter |
| `test/` | Core, mocked integration, worker, package, and installed extension tests |
| `docs/` | Architecture, privacy, validation, review response, pilot protocol, research notes, compatibility and release checklists |
| `results/` | Actual development measurements for this build. Earlier builds are in `results/0.1.3/` and `results/0.1.4/` |
| `tools/` | Packaging script, icon generator, the check that the tests notice broken rules, version bump, contrast check |
| `docs/CONTRACTS.md`, `docs/audits/` | Messages, storage and settings between the parts; dated audits |
| `HANDOFF.md` | Where the work stands and what to do next |
| `CLAUDE.md`, `.claude/` | Rules, slash commands, review agents, hooks and project memory for Claude Code |
| `.github/` | CI and release workflows, issue and pull request templates |
| `release/` | The extension alone, zipped, as it would be uploaded to a store |

## Working on it with Claude Code

The repository is set up for [Claude Code](https://code.claude.com). `CLAUDE.md` holds the project's hard rules (no network, claims follow evidence, native input first). A session start hook installs the development dependency and finds a Chromium. After any edit inside `extension/`, a hook reruns the package check. Project slash commands:

| Command | What it does |
|---|---|
| `/verify [quick]` | Every automated gate, with exact counts |
| `/regen-results` | Archive `results/` under the old version and regenerate all evidence |
| `/probe <name>` | Run one probe and compare it with the saved result |
| `/claims-check` | Trace every number in the docs to `results/` or a code constant |
| `/review` | Independent code and documents review by fresh agents, then verify and respond |
| `/audit`, `/a11y-audit` | Write a dated audit to `docs/audits/` |
| `/add-setting <name>` | Add a setting end to end, with tests |
| `/release <version>` | Bump, changelog, evidence, packages, checks |
| `/site-compat <site>` | Record a manual compatibility check |
| `/handoff`, `/remember`, `/premortem` | Keep `HANDOFF.md`, project memory and risk notes current |

## Release

`python3 tools/package.py` creates a full source ZIP and a ZIP of the extension alone for uploading to a store, in a `dist` folder. The full download also includes the extension ZIP under `release/`. Store submission, compatibility with outside websites, independent traces, participant recruitment, and follow-up are separate milestones. None is claimed by the source package. Start with the local lab, then opt in on a webpage you control where a wrong click does no harm.

MIT license. Copyright (c) 2026 Carol Chen. See `LICENSE` and `NOTICE.md`. `NOTICE.md` states which parts were written with an AI assistant.
