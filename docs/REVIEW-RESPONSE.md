# Review response for 0.1.4

The review of 0.1.3 drove the installed extension with trusted mouse input and found that its default settings did nothing for a shaking hand, even though every test passed. It listed four problems with behavior and one about credit. This document says what was done about each one and what the measurements show now. It then describes three rounds of independent review of the 0.1.4 work itself and what they changed.

Every measurement of this build below uses a scripted hand with synthetic tremor, on Linux, with the browser runs in Chromium 141. The mouse events are sent through the browser's automation interface, not by a physical mouse. Figures for 0.1.3 come from earlier runs and are marked as such. The comparisons use identical input for both builds. It is not evidence about people.

## Summary

| # | Finding in 0.1.3 | What 0.1.4 does | Evidence |
|---|---|---|---|
| 1 | The defaults did nothing under tremor. A press could wander only 12 px. | Measures shake before the press and lets the press wander three times that, up to 48 px. | Probe at 8 px: 36 of 66 correct before (0.1.3 run, not in this package), 63 of 66 now. At 16 px: 13 before, 48 now. No wrong clicks. |
| 2 | Any selected text switched all assistance off. Shaky presses select text by accident. | A steady press is left alone only when it lands on selected plain text or selects text itself. Other hands are not stopped by selected text. | Browser checks for each case. |
| 3 | The link setting was off by default, blocked every link drag when on, and its description was wrong. | Replaced by a quick drag guard that is on by default and uses timing: a drag within 0.5 s of the press is cancelled. Press, wait, then drag still drags. | Links at 8 px: 0 of 24 with the guard off, 22 of 24 with it on. A probe of deliberate drags. |
| 4 | Alt was the bypass key, but Chrome downloads a link on Alt and click. | Alt is no longer advertised. Escape pauses. Clicks with a modifier key are left to the browser. | `probes/alt_click.cjs`. |
| 5 | Credit: `NOTICE.md` named no AI assistance, and the credit line was removed from `benchmark/robot.js`. | `NOTICE.md` states which parts an AI assistant wrote. The line in `robot.js` is restored. | The files themselves. |

## 1. The press limit

**Cause.** The policy refused to correct any press that moved more than 12 px between press and release. In the 0.1.3 benchmark at 8 px of shake, 349 of the 360 presses that needed help exceeded that (`results/0.1.3/review-press-limit.json`). So the rule that was meant to reject drags rejected nearly every shaky click.

**Why not just raise the limit.** A larger fixed limit helps a shaking hand and harms a steady one, whose 30 px movement during a press is a drag, not a slip. Removing the limit in the 0.1.3 benchmark also raised wrong clicks at 16 px from 1.7% to about 5% (`results/0.1.3/review-policy-variants.txt`).

**Fix.** The extension now measures the hand before the press (`extension/core/jitter.js`). It takes the last 0.3 seconds of pointer positions, removes the smooth part of the motion, and measures what is left. A press of 0.6 seconds or less may then wander three times that shake, never less than 12 px and never more than 48 px. So a hand that measures under 4 px keeps the old 12 px limit. A long press also keeps the 12 px limit, because a long press that travels looks like a drag however shaky the hand.

Two safeguards came with the wider limit:

- **Outline agreement.** A slip that goes further than 12 px, or ends on another control, is corrected only if the green outline was on the pressed target when the press landed. Without this, a press that began on the wrong neighbor would be credited to that neighbor.
- **Another control still wins.** If the browser's own click reaches a different control, nothing is redirected. The one exception follows a drag the guard cancelled (section 3). With the default selector, the benchmark's count of wrong clicks with the extension on equals the count with it off at every amplitude.

**Result in the replay benchmark** (1,800 trials per amplitude, steady selector). The 0.1.3 column is from that build's own validation document, which is not in this package. `results/0.1.3/review-policy-variants.txt` gives the same figures as percentages.

| Shake (RMS) | Off | 0.1.3 | 0.1.4 | Wrong clicks, off and 0.1.4 |
|---:|---:|---:|---:|---:|
| 4 px | 1,782 | 1,786 | 1,798 | 0 and 0 |
| 8 px | 1,440 | 1,446 | 1,757 | 0 and 0 |
| 16 px | 481 | 482 | 1,339 | 30 and 30 |

The benchmark is the best case for the measurement, because its scripted hand always hovers before pressing. See "The benchmark flatters the shake measurement" in `docs/VALIDATION.md`.

## 2. Selected text

**Cause.** A shaky press on a page often drags across a few letters and selects them. The controller treated any selection anywhere on the page as a sign that the person was working with text, and stood down. In the earlier review's run of 0.1.3 at 16 px, text was selected at 42 of 44 presses, so the extension was off for nearly all of them. (That run is not in this package.)

**Fix.** A hand counts as steady for these rules when its measured shake is under 2 px, or could not be measured.

- Selected text somewhere else on the page is ignored.
- A steady press that lands on selected plain text is left to the browser, as before.
- A steady press beside a target that selects visible text on its way is someone selecting text. Nothing is clicked.
- A press on a link or button is a press on that control, whatever text is selected.
- For a hand that is not steady, selected text is not a reason to stand down.
- Whenever a press is corrected, text that the press itself selected is removed just before the click is delivered. A selection that was already there is left alone.

With the extension on at 16 px, text is selected at 21 of 66 presses. With it off, the figure is 64 of 66. One reason is that a corrected press removes the text it selected, so the next press starts clean.

## 3. The link setting

**Cause.** A browser turns a moving press on a link into a drag, and then no click happens. With no extension, 28 of 28 shaky presses that began and ended on a link became drags. The 0.1.3 setting that addressed this was off by default, cancelled every link drag when on (including deliberate ones), and described itself inaccurately.

**Fix.** The quick drag guard is on by default and uses one test: time. A drag that begins within half a second of the press is cancelled, so the press can finish as a click. A drag that begins later is left alone. It also covers buttons, and, for a hand that is not steady, a drag of selected text or an image beside the outlined target. It is left alone if the outline was on a different target. After a cancelled drag, a press that went more than 48 px or lasted longer than 1.2 seconds clicks nothing, and a click that lands anywhere other than the pressed control (a card around the link, say) is stopped.

**What a deliberate drag looks like now** (`probes/intentional_drag.cjs`):

| Action | Result |
|---|---|
| Guard on. Press a link, wait 0.7 s, drag 370 px. | The browser drags the link as usual. No click. |
| Guard on. Press a link and drag 370 px at once. | The drag is cancelled. No click. |
| Guard off. Press a link and drag 370 px at once. | The browser drags the link as usual. No click. |

This is a real cost: dragging a link the instant you press it no longer works while the guard is on. The setting can be switched off.

## 4. The bypass key

Chrome treats Alt (Option on a Mac) with a click on a link as "download this link". `probes/alt_click.cjs` confirms it: one download started and the page did not navigate. Telling people to hold Alt to bypass assistance was therefore telling them to download things. The advice is removed from the popup, the settings page and the documents. Any click made with Shift, Control, Command or Option held is left entirely to the browser, which then does what that key normally does. Escape pauses the page.

## 5. Credit

`NOTICE.md` now says plainly which parts were written by an AI assistant: the original starter, and the 0.1.4 changes. The copy inside the `extension` folder says the same. The credit line in `benchmark/robot.js` is back.

## Results under trusted mouse input

The installed extension, driven in real time. 66 trials per condition: 24 at links, 42 at buttons. The same paths in every condition and in both builds. The 0.1.3 column is from the earlier review's run, which is not in this package.

| Shake (RMS) | Condition | 0.1.3 correct | 0.1.4 correct | 0.1.4 links | 0.1.4 buttons | 0.1.4 wrong |
|---:|---|---:|---:|---:|---:|---:|
| 8 px | Extension off | 38 | 38 | 0 of 24 | 38 of 42 | 0 |
| 8 px | Defaults | 36 | 63 | 22 of 24 | 41 of 42 | 0 |
| 8 px | Drag setting the other way (0.1.3: on, 0.1.4: off) | 49 | 41 | 0 of 24 | 41 of 42 | 0 |
| 16 px | Extension off | 13 | 13 | 0 of 24 | 13 of 42 | 0 |
| 16 px | Defaults | 13 | 48 | 12 of 24 | 36 of 42 | 0 |
| 16 px | Drag setting the other way | 13 | 28 | 1 of 24 | 27 of 42 | 0 |

The "other way" rows are not the same condition in the two builds. In 0.1.3 the link setting was off by default, so the row shows it switched on. In 0.1.4 the guard is on by default, so the row shows it switched off. The 0.1.4 row shows how much of the gain comes from the press rule alone.

## What is still missed

At 16 px with the extension on, 18 of 66 trials still fail:

- 9 pressed on a neighboring control.
- 6 wandered past the allowed distance.
- 2 near misses released on a different control.
- 1 landed beside the target while the outline was on a neighbor.

A press that lands on a neighboring control is never reassigned. Doing so safely would need evidence about intention that a single press does not give.

## Independent reviews of 0.1.4

After the fixes above were built and measured, separate AI reviewers that had not seen the work were asked to find what was wrong with it. This happened in three rounds, the last a final check of the last changes. In each round one reviewer checked the code and reproduced its findings in Chromium with the installed extension, and another checked every statement in the documents against the result files and the code. Everything they found was either fixed or is listed below as not fixed. All measurements in this document were made after the last fix.

### First round: the code

| Found | What happened | What was done |
|---|---|---|
| A page that cancels link drags itself lost clicks. | On such a page a press that moved 80 px inside one link is a click. The guard cancelled the drag as well, judged the press too far, and stopped the click. | The guard now acts after the page's own handlers and does nothing when the page has already cancelled the drag. |
| A steady hand selecting text beside an outlined control clicked the control. | A 10 px drag over a few letters counted as a near miss, and the selection was removed. | A steady press that selects text is treated as a selection. (The first version of this fix drew the line for "steady" too high. See the second round.) |
| A working trusted click was replaced by a synthetic one. | With a button nested in a clickable card, the browser's click already reached the card, but the policy redirected anyway. | When the browser's own click reaches the chosen control, it is passed through. |
| The check for selected text slowed down on huge selections. | It measured every line of the selected text under the pointer. The reviewer timed one press on a selected block of 300,000 lines at 177 ms. | It now asks the browser for the character under the pointer and measures only that. A rerun of the reviewer's test gave about 20 ms, and the frame rate on that page was the same with the extension on and off. These timings are not kept as result files. |
| A scroll or a modifier key after a cancelled drag cost the click. | Anything that reset the gesture policy during the press made the later click look like a press that went too far. | The drag record keeps its own account of distance and time. Modifier and keyboard clicks are never stopped. |
| A handle marked draggable inside a link had its drag cancelled. | The settings text said such things were excluded. | They are now. |
| A steady hand could measure as shaking. | In the reviewer's simulation (not kept as a file), a quick corrective move before a press could measure up to 8 px. | A 5 px margin was added. The second round showed that margin did harm, and it was replaced. |
| The meter misses slow tremor and needs a hover. | 3 Hz shake is almost never measured. A press made the instant the hand arrives is usually not measured. | Not fixed. Documented, with two probes that show it: `probes/meter_check.cjs` and `probes/press_delay.cjs`. |
| Several tests could not fail. | Of 33 deliberate faults the reviewer put into the code, 8 went unnoticed by the unit tests (the reviewer's run, not kept as a file). | Tests were added, and the fault check now ships as `tools/mutation_check.cjs`. |

### Second round: the code

| Found | What happened | What was done |
|---|---|---|
| A mild tremor lost help on text. | With the 5 px margin, a hand measuring 3 to 5 px counted as steady. A press that selected a letter beside a target was taken for deliberate selection. In the reviewer's run (not kept as a file), 12 attempts in a row at a button beside some words gave 2 clicks instead of 12. | The two questions are now separate. The press limit is three times the shake from 12 px up, with no margin and no jump. The text rules count a hand as steady only below 2 px. A browser check makes 12 such attempts and needs at least 10 clicks. It fails on the previous draft. |
| A page's window listener could still be missed. | A page that cancels drags in a window listener added after the extension started lost its click. | The guard's acting listener is added to the window again each time it decides, so it runs after every window listener the page has added by then. |
| A container could get a click it should not. | After a cancelled drag the browser sends its click to the element containing both press and release. A clickable card around a link received it. Without the guard there would have been a drag and no click. | That click is now stopped. A press that went too far or lasted too long clicks nothing anywhere. The final check found that this first covered only cards marked as controls, not cards that only have a script listening for clicks. It now covers any element, and the browser check tests both kinds. |
| A page can switch the guard off. | A page that stops the drag event from traveling further, without cancelling it, prevents the guard's listener from running. | Not fixed. The browser then drags as usual, which is the behavior without the extension. Documented. |
| Selected text at some boundaries is not seen. | At boundaries between left to right and right to left text, at the edges of inline blocks, and on selected images, the check misses. | Not fixed. The consequence is that a steady press there is treated as not on selected text. Documented. |
| More test gaps. | The reviewer's own fault run (not kept as a file) found 8 of 40 faults unnoticed, and one browser check that also passed on the build before the review. | Tests were added. `results/mutation-check.txt` shows all 61 faults caught now. `results/checks-on-earlier-drafts.txt` shows which browser checks fail on which earlier draft. |
| Small wording problems. | The status said "target gone" when there had never been one. The popup's counts after a cancelled drag did not add up. The settings text overstated one rule. | Corrected. |

### Final check: the code

| Found | What happened | What was done |
|---|---|---|
| The container fix was incomplete. | A card that only has a script listening for clicks (no role or link markup) still received the browser's click after a cancelled drag. | Fixed as described in the row above. |
| A page's own cancellation was handled two ways. | Whether a drag the page cancelled kept the press depended on when the page's listener ran, so the same slip was corrected on one page and not on another. | Now any drag the page cancels keeps the press, and any drag that really starts ends it. A test covers both, with the guard on and off. |
| A hand that cannot be measured counts as steady. | A press made the instant the hand arrives, and slow tremor, usually read as unknown, and unknown counts as steady for the rules about selected text. | Kept as the cautious choice, and now stated in the README, the settings page and the architecture notes. |
| Checking a selection for visible text could be slow. | It turned the whole selection into text, and in odd layouts a short press can select a lot. | It now runs only for a press beside an outlined target that moved no more than 48 px, and checks a selection within one text node directly. A selection across several nodes is still turned into text. |

### The documents

In all three rounds, no number in the documents disagreed with a result file. What the document reviews found instead was:

- Steps in the Mac update guide that could not be followed as written. In the first round, a Shift click check that the lab page cannot show. In the second round, a step that asked for **Enable on this tab** on a page where the popup offers only **Turn off on this tab**.
- A stale notice inside the `extension` folder.
- Statements that claimed more than the files showed, such as "a steady hand is unchanged", "repeated three times", and "real mouse input" for an automated browser.
- Figures with no file behind them. Those are now either kept as files or labeled as not kept.
- In the final round: sentences that described slow shake too broadly, a reference to the wrong rows of the compatibility checklist, and wording that claimed more than the code did about when the selection check runs.

These are corrected.

## After release: an outside check

An outside check of the finished package confirmed the unit tests, the package check and all 48 benchmark rows, and could not run the browser tests in its environment. It found one bug: on Node 24, `tools/mutation_check.cjs` misread the test output and counted every fault as caught, including a change to a comment only. That is fixed, as described in `docs/VALIDATION.md`. The rest of the check repeated limits already stated here: quick deliberate drags are blocked, measured shake can turn a deliberate text selection into a click, immediate presses and slow tremor are poorly measured, and the settings were tuned on the paths they are scored on. Its advice, to test normal clicks, deliberate drags and text selection on the Mac and then ask prospective users, is the same as the next step listed here.

## What this does not show

- The thresholds were chosen while looking at these same seeded paths and at a reviewer's browser experiments. This is development evidence. It is not an independent test.
- A scripted hand is a smooth reach, a hover, and a sine wave. Real tremor is less regular, real hands do not always hover, and people adapt to tools.
- Nothing was run on a Mac, in Edge, or on real websites.
- The cost of the half second rule to people who drag links has not been measured.
- No one with tremor has used this build.

## Reproduce

```sh
npm install
npx playwright install chromium
npm test
node tools/mutation_check.cjs
npm run test:browser
npm run test:review-links
node probes/real_input.cjs 66 8,16
node probes/per_trial.cjs 66 16
node probes/intentional_drag.cjs
node probes/alt_click.cjs
node probes/link_drag.cjs
node probes/policy_variants.cjs
node probes/press_delay.cjs
node probes/meter_check.cjs
```

The first probe takes about 20 minutes because it runs in real time.

## Carried over from 0.1.3

The single clock for event handling introduced in 0.1.3 is unchanged, and its regression test still passes. Hold to click still fires in about 1.1 seconds under jitter. The 0.1.3 result files that were not regenerated for this build are kept in `results/0.1.3/` and are labeled as such.
