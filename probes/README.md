# Probes for OpenSteady Web

Written by Claude (AI assistant) on 2026-10-02. These are measurement scripts. None of them is part of the extension, and none is included in the store ZIP.

The unit tests and the replay benchmark cannot see what a real browser does with a moving press: it starts a drag, or selects text. Most of these probes drive a real Chromium with trusted mouse events, in real time, and count what was actually clicked. They are how the problems in 0.1.3 were found.

"Trusted" here means the events are sent through the browser's automation interface, so the page and the extension treat them exactly like a real mouse. They do not come from a physical mouse or from the operating system.

Setup, from the `opensteady-web` folder:

```sh
npm install
npx playwright install chromium
```

Results below are for 0.1.4 (Chromium 141 on Linux). On 0.1.5 every probe gave the same result apart from small timing differences. See `docs/VALIDATION.md`. Set `CHROME_EXECUTABLE=/path/to/chrome` to use a browser other than Playwright's own.

| Command | What it measures | Result on 0.1.4, Chromium 141 on Linux |
|---|---|---|
| `node probes/real_input.cjs 66 8,16` | The installed extension on shaky paths: off, defaults, and quick drag guard switched off. 66 trials each at 8 px and 16 px of shake. About 20 minutes. | 8 px: 38, 63 and 41 correct of 66. 16 px: 13, 48 and 28. No wrong clicks. |
| `node probes/per_trial.cjs 66 16` | The same trials one by one: which ones the extension changed, why the rest were missed, and whether text was selected at the press. About 5 minutes. | See `results/per-trial-16px.txt`. The largest cause of the remaining misses is a press that lands on a neighboring control. |
| `node probes/intentional_drag.cjs` | A deliberate 370 px drag of a link with the guard off, on, and on after a 0.7 s pause. | Off: drags. On, at once: cancelled, nothing clicked. On, after the pause: drags. |
| `node probes/hold_to_click.cjs 4 100` | Time until hold to click fires while the pointer jitters 4 px at 100 moves a second. | Six of six tries fired between 1.05 and 1.10 s after aiming. |
| `node probes/link_drag.cjs` | Whether the browser turns a shaky press on a link into a drag. No extension. | Links: 28 of 28 became drags, no clicks. |
| `node probes/alt_click.cjs` | What Chrome does with Alt and click on a link. No extension. | It starts a download. |
| `node probes/policy_variants.cjs` | The synthetic benchmark with the press limit fixed at 12 px and with the shipped rule, for both selectors. No browser. | See `results/policy-variants.txt`. |
| `node probes/press_delay.cjs` | The synthetic benchmark with the scripted hand pressing sooner after it arrives. No browser. | With no hover the wider limit gives almost nothing. About 0.15 s of hover gives most of the benefit. |
| `node probes/meter_check.cjs` | How the shake meter reads a hovering pointer that shakes at 3 to 12 cycles a second. No browser. | 3 Hz: almost never measured. 4 Hz: reads about three quarters. 5 to 12 Hz: within about ten percent. |

Saved outputs of these runs are in `results/`. See `results/README.md`. `docs/VALIDATION.md` has the full tables.

## Reading the numbers

- All input is a scripted hand: a smooth reach, a hover, and a sine wave. It compares rules on identical input. It is not evidence about people.
- The press rule's settings were chosen while looking at these same paths. Treat the results as development evidence.
- Counts can move by one or two between runs, because the probes run in real time and the browser's own timing varies.
- `real_input.cjs` prints the planned and actual press duration and how far behind schedule it ran. If the lag is large (tens of milliseconds), the machine was busy and the run should be repeated.

## How they work

The probes that load the extension copy it to a temporary folder and add a localhost permission to that copy, the same way `test/browser.cjs` does. Your `extension` folder is not changed. They read the list of files to inject from `extension/background.js`, so they keep working if that list changes.

`page.html` is the trial page: six 28 px buttons, six 20 px buttons, eight links in a dense list, and two large buttons. The paths come from `benchmark/robot.js` with a fixed seed, so every run and every build sees the same motion.
