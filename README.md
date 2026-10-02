# OpenSteady Web

An experimental, local-only browser extension for near-miss clicks, small slips during a press, and repeated mouse clicks. Includes a pure target selector, conservative gesture policy, local pointing lab, reproducible replay benchmark, and evaluation materials.

Version **0.1.0**. Chrome and Edge desktop, Manifest V3, Chrome 120+ APIs. No build step or runtime dependencies. This is a browser prototype, not a system-wide cursor filter or a medical treatment. Real-world benefit has not been established.

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

**Recovery:** hold Alt to bypass assistance; press Escape to pause this page; resume from the toolbar. Choose **Turn off on this tab**, **Turn off & forget this site**, or **Pause everywhere** as needed. Remove the extension normally to uninstall.

## Behavior

- Pointer path smoothing, probabilistic rectangle scoring, dwell, hysteresis, and abstention. Default fixed spread; an adaptive residual-spread variant is experimental and appears only in the benchmark.
- A quiet outline of the proposed target; freeze the proposal at a mouse press.
- Handle correction at the final click. Do not cancel pointerdown or pointerup, manufacture those events, or alter the OS cursor.
- Preserve a click that physically lands on the same control at press/release. Never reassign a native click on another control based on an inferred intention.
- Reject a correction if any point during the press moves more than 12 px from its start, the hold exceeds 1.2 s, the target moves/disappears/becomes covered, modifiers are held, text is selected, pointer capture begins, or focus is lost.
- Suppress a second nearby safe mouse activation on the same target within 300 ms. The setting is optional; Alt bypasses it. Keyboard activation remains unchanged.
- Conservative exclusions for forms, file pickers, text editing, risky labels, unlabeled controls, and unsupported interaction types. Risk matching is imperfect and is not a security boundary.

Maximum radius is 24 px, but probability/confidence gates usually allow a smaller effective distance. This maximum is not a promise that every miss within 24 px will be corrected.

## Scope and limits

Top-level http/https webpages only. Iframes (including same-origin), shadow-root internals, browser chrome, PDF viewers, desktop apps, touch, pen, and drag assistance are outside this release. Form controls are left native. This intentionally narrows the original plan's frame scope for a more reviewable first implementation.

Redirected `HTMLElement.click()` events are untrusted. Some sites ignore them or respond to pointerdown before a click; this extension cannot universally reproduce native input. A native click on a neighboring target is deliberately preserved, so a better selector does not automatically fix every wrong-target click. Heavily animated pages may temporarily lose their outline. Pages with more than 6,000 discovered controls get no target assistance.

## Verify

Node 20+ is needed only for development:

```sh
npm test
npm run check
npm run benchmark
python3 benchmark/analyze.py results/benchmark.json
```

For real Chromium fixture tests:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

Use `HEADED=1 npm run test:browser` for a visible test browser. A missing browser fails the test command, rather than recording a pass. The suite uses the actual extension code in an isolated world and trusted Playwright mouse events. Its temporary test manifest grants only localhost access; the shipped manifest is unchanged. Permission/lifecycle flows also have mocked service-worker tests and a manual checklist.

See [VALIDATION.md](docs/VALIDATION.md) for this build's actual results and remaining checks. A unit pass is not a claim of browser or user effectiveness.

## Compare and record

The lab's **Run seeded simulation** evaluates four rules against identical generated paths: off, nearest, fixed steady selection, and experimental adaptive steady selection. It reports **selector-only** and **geometry/gesture-policy** results separately. It does not dispatch fake events to the installed extension or bypass its trusted-input gate.

The CLI uses a fixed geometry and three development seeds; the lab uses the displayed DOM geometry. Their numbers need not match. `benchmark/protocol.json` describes all parameters. Synthetic data is a software development aid, not an estimate of tremor prevalence, severity, or human benefit.

Real recording requires **Start recording** on the lab page. It collects only that lab's pointer movements, target rectangles, relative times, and observed target activations. Completed trials remain in memory, and export is explicit. Condition labels are entered by the operator and **not verified automatically**. A reload discards unexported records. The extension never records pointer traces on other sites.

Replay an export:

```sh
node benchmark/run.cjs --trace /path/to/opensteady-lab-trace.json --out results/trace-replay.json
python3 benchmark/analyze.py /path/to/opensteady-lab-trace.json
```

Trace replay evaluates counterfactual algorithms on recorded motions; it does not recreate how a person would adapt their behavior with different assistance. Observed task outcomes and modeled outcomes must be reported separately.

## Project map

| Path | Purpose |
|---|---|
| `extension/core/selector.js` | Geometry, Gaussian scoring, temporal selection, spatial grid |
| `extension/core/policy.js` | Pure press/release/click state machine |
| `extension/targets.js` | DOM eligibility, risk exclusions, index, live revalidation |
| `extension/content.js` | Trusted input, outline, policy application, recovery |
| `extension/background.js` | Opt-in injection, settings, site permissions |
| `extension/ui/` | Toolbar popup, settings, privacy |
| `lab/` | Local simulation, explicit recordings, compatibility fixtures |
| `benchmark/` | Seeded generator, JSON replay, analysis, protocol |
| `test/` | Core, mocked integration, worker, package, real browser tests |
| `docs/` | Architecture, privacy, pilot protocol, compatibility/release checklist |
| `results/` | Actual development measurements and validation status |

## Release

`python3 tools/package.py` creates a full source ZIP and a store-upload ZIP of the extension only. The full download also includes that extension-only ZIP under `release/`. Store submission, external-site compatibility, independent traces, participant recruitment, and follow-up are separate milestones; none is claimed by the source package. Start with the local lab, then opt in on a low-consequence webpage you control.

MIT license. Copyright (c) 2026 Carol Chen. See `LICENSE` and `NOTICE.md`.
