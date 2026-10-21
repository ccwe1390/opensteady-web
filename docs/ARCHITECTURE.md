# Architecture and design decisions

This describes version 0.1.4.

## Boundaries

The production extension runs in Chrome's isolated world, in a top-level document, after explicit tab activation or an optional permission for a remembered host. A page cannot switch assistance on or widen it, and cannot trigger it with synthetic events. A page can only opt parts of itself out, by marking a container with `data-opensteady-no-assist`. There is no network, remote code, account, or telemetry. Chrome storage contains only settings and the sites the user chose. Tab enablement is session storage. Per-page counters are in memory.

The local lab uses the same pure selection and policy modules but is not the production controller. This keeps simulation from weakening the trusted-input gate. It can record real input on its own page after a user explicitly starts a recording.

## Target index

Stable element IDs live in a WeakMap. Rectangles and a 64 px spatial grid are rebuilt after DOM changes, scroll, resize, and periodic layout checks while the pointer is active. A pointer move queries the grid. It never rescans the full DOM. Bounding-box gaps of wrapped controls are excluded. Giant rectangles are stored separately to bound cell replication. Above 6,000 discovered controls the index abstains entirely.

Candidates are screened locally for semantic eligibility and short risk labels. Live geometry, exposure through `elementFromPoint`, connectedness, enabled state, opacity, and ancestor opacity are checked before outlining and immediately before delivery. This reduces errors from stale or covered targets. It does not make a hostile page safe. Geometry reading and outline updates can still force layout on some pages, which browser stress tests must measure.

## Selector

The default uses a 75 ms low-pass trend with a cutoff that increases for large slow-trend deviations. It scores each rectangle with the product of normal-CDF differences for x and y, using a fixed 6 px spread. It acquires a target after 60 ms of clear evidence and switches after 80 ms when the challenger is at least 1.6 times as strong. Low scores and ambiguous candidates abstain. An existing target has a smaller exit threshold. A 600 ms sample gap resets history.

These are engineering defaults, not calibrated physiological parameters or validated clinical settings. Adaptive mode derives a bounded 4 to 12 px spread from an exponentially weighted residual. Deliberate motion also affects this estimate, so it is experimental and appears only in the benchmark and the lab simulation.

Raw and smoothed points must both be within the radius cap. Risky controls within 12 px of the pointer create an additional exclusion zone. The outline has to be visible and fresh at the press. It is not conjured at the click.

## Shake measurement (new in 0.1.4)

`core/jitter.js` answers one question: how much was the pointer shaking just before this press? It holds up to 0.6 seconds of pointer positions from movement with no button held, and measures the most recent 0.3 seconds. For each axis it fits a smooth curve (a quadratic) through those positions and measures what is left over. The result is the root mean square of the leftover motion in pixels, both axes combined. A steady hand gives a value near zero. A shaking hand gives roughly the size of the shake.

The meter answers "unknown" (zero) in three cases: fewer than 8 samples, samples covering less than 0.12 seconds, or a pointer that is still traveling. Traveling means the average position of the last third of the window is further from the first third than 6 px plus 1.5 times the measured value. Without that check, a steady hand slowing down at the end of a reach can look like shake.

The measurement answers two separate questions.

- **How far may this press wander?** `limitFor` gives three times the shake, never less than 12 px and never more than 48 px. So the limit starts to grow at 4 px of shake, without a jump.
- **Is the hand steady, for the rules about selected text?** `isSteady` says yes below 2 px, and also when the shake could not be measured. A hand that hovers still reads well under 1 px. A mild tremor of 3 or 4 px is not steady, even though its press limit is still 12 px. In this document "steady hand" means this test.

The two lines are different on purpose. An earlier draft of 0.1.4 used one line at 5 px for both. A reviewer measured what that did in Chromium (the reviewer's runs are not kept as files): a mild tremor reading 3 to 5 px was treated as steady, so a press that selected a few letters beside a target was taken for deliberate text selection, and most such near misses on text were lost. The browser check "a mild tremor that leaves the press limit at 12 px" now guards against this, and `results/checks-on-earlier-drafts.txt` shows it failing on that draft.

Positions are gathered only while assistance is on for the page. The meter uses each event's own timestamp, and only compares those timestamps with each other. Everything else in the controller uses the delivery-time clock described below.

Known limits of the measurement:

- **It needs a hover.** The pointer has to stay near the target for roughly 0.15 to 0.2 seconds before the press. A hand that presses the instant it arrives is usually "unknown", so it gets the 12 px limit and counts as steady for the rules about selected text. `probes/press_delay.cjs` shows how much of the benefit that removes.
- **Slow shake reads too low.** With a 0.3 second window, shake at about 4 cycles a second or slower partly looks like travel. In `probes/meter_check.cjs`, 3 Hz shake is reported as "unknown" almost every time, 4 Hz reads at about three quarters of its true size, and 5 to 12 Hz reads within about ten percent. A person whose tremor is about 3 cycles a second is usually not measured, so gets the 12 px limit and counts as steady for the rules about selected text, and a near miss that selects a letter is not corrected.
- **A deliberate wiggle before a press measures as shake.** The meter cannot tell why the pointer moved. A quick corrective movement just before the press can read as 2 px or more as well, so a steady person who corrects their aim and then selects text right beside an outlined target may have that selection treated as a slip.

## Gesture policy

The pure policy in `core/policy.js` receives physical control IDs and records a candidate on a trusted primary mouse press. A native target at the press takes precedence over the selector. The candidate is frozen while the button is held. The policy tracks the maximum distance from the press, not only the final displacement, so a drag that returns to its origin cannot activate a target.

How far a press may wander:

| Press | Allowed distance |
|---|---|
| Any press up to 1.2 s | 12 px |
| A press of 0.6 s or less, when shake was measured just before it | 3 times the shake, up to 48 px (more than 12 px once shake exceeds 4 px) |
| A press longer than 1.2 s | Never corrected |

At the click the policy returns one of three answers: pass (leave the browser's own click as it is, which may mean nothing is clicked), redirect (click the frozen target instead), or suppress (the repeat guard stops a second click). It passes in these cases and redirects in the near miss and slip cases:

- **Native click.** Press and release on the same control. The browser's click passes through untouched. A press that wandered past its allowed distance, but no further than 48 px, and came back to the control it started on is still recognized as that control's click, so the repeat guard and the quick drag guard can account for it. Nothing is ever redirected for such a press.
- **Near miss.** The press landed on empty, safe space beside a target that had been outlined for at least 60 ms. The release landed on empty space or on that target.
- **Slip.** The press landed on the target and the release came off it. If the release is on empty space and the press stayed within 12 px, that is enough. If the press went further than 12 px, or the release landed on another control, the outline must also have been on the pressed target at the moment of the press. This is called outline agreement. It stops a press that began on the wrong neighbor from being credited to that neighbor.
- **Another control wins.** If the browser's own click reaches a different control, nothing is redirected. The one exception follows a drag the guard cancelled, described below.
- **A trusted click is never replaced.** If the browser's own click already reaches the chosen control (for example, the release landed on a button nested inside a clickable card), that click is passed through. The extension does not swap it for a synthetic one.

The controller adds geometry checks before any redirect. The press must be within the radius (24 px by default) of the target. So must the release, with one allowance: when shake widened the press limit, the release may be further away by the same extra distance.

The repeat guard affects only a matching, nearby, safe mouse gesture. Keyboard and synthetic clicks pass.

DOM delivery happens synchronously in the trusted click listener. Pointerdown, mousedown, pointerup, and mouseup keep normal propagation. The controller calls focus, validates again, calls `HTMLElement.click()`, guards its own synchronous delivery, and cancels the original click only after a delivery attempt. Exceptions reset the current gesture. Three internal errors pause assistance. It cannot undo page handlers that already ran, nor guarantee recovery from arbitrary page actions.

## Quick drag guard (changed in 0.1.4)

A browser turns a press on a link into a drag as soon as the pointer moves a few pixels, and then no click happens. The same is true of a press on selected text and, less often, of a press on a button. For a hand that shakes, this defeats most presses on links.

`core/link-drag.js` remembers one press. The controller decides whether to cancel the browser's `dragstart` before the page sees the event, and acts after the page's own handlers have run. It cancels the drag when all of these hold:

1. The setting is on (it is on by default) and no modifier key is held.
2. The drag begins within 0.5 seconds of the press.
3. The press was on an eligible link or button. Or the press was beside the outlined target and the hand was not steady (a near miss, where the browser would otherwise drag selected text or an image).
4. The drag begins where the press did: on the pressed control, or, for a near miss, on something that is not a control. Anything a page marks as draggable, and anything editable or otherwise sensitive, is left to the browser.
5. The outline was not on a different target. It may be absent or on the pressed target. If the outline was on a different target when the press landed, the drag is left to the browser.
6. The target is still present and in the same place.
7. The page has not cancelled the drag itself. If it has, the browser was never going to drag, the page expects its click, and the guard does nothing at all. The press then carries on as an ordinary press, whether or not the guard would have acted. The guard checks this after the page's own handlers: its acting listener is added to the window again each time a drag starts, which puts it after every window listener the page has added by then. A drag that neither the guard nor the page cancels ends the press, and nothing is corrected.

Cancelling the drag lets the browser deliver its click. Without the guard there would have been a drag and no click at all, so the guard is careful about which click it lets through:

- The drag record keeps its own account of how far the press went and when it ended. If the press went more than 48 px or lasted longer than 1.2 seconds, the plain mouse click that follows is stopped, wherever it lands.
- The browser sends that click to the innermost element containing both the press and the release. If that is anything other than the pressed control (a clickable card that contains the link, say, whether the card is marked as a control or only has a script listening for clicks), the click is not a click on that element. It is stopped. The policy then judges the press as if the click had reached no control, so a slip that ends on the card can still go to the pressed link when the outline agreed.
- Otherwise the browser's own click on the pressed control stands, even if a scroll or a lost focus reset the gesture policy during the press.
- A click with a modifier key held, and a keyboard click, are never stopped.

Apart from drags beside the target, which also need a hand that is not steady, the only test is timing. The guard does not try to tell tremor from intention. To drag a link on purpose: press, wait half a second, then move. A drag that begins at once is cancelled however far it goes, so a deliberate quick drag does not happen. A short one becomes a click, and a long one ends with nothing clicked.

One consequence for pages with their own drag code on ordinary links: the page's `dragstart` handler runs before the guard cancels the drag, and no `dragend` follows. A page that changes its appearance in `dragstart` may be left looking as if a drag were in progress. Elements marked `draggable="true"` are never touched, which covers most drag-and-drop interfaces. A page that stops the `dragstart` event from traveling further (`stopPropagation`) without cancelling it switches the guard off for that drag, because the guard's acting listener never runs. The browser then drags as usual.

## Selected text (changed in 0.1.4)

A shaky press often selects text by accident. In 0.1.3 any selected text anywhere on the page switched assistance off, so the first slip disabled help for every click after it.

Now:

- Selected text somewhere else on the page is ignored.
- A steady press that lands on selected plain text is left to the browser.
- A steady press beside a target that selects some visible text on its way is treated as someone selecting text. Nothing is clicked and the selection is kept.
- A press on a link or button is a press on that control, whatever text is selected in it or gets selected on the way.
- For a hand that is not steady, selected text is not a reason to stand down.
- Whenever a press is corrected (a near miss by a hand that is not steady, or a slip off a control by any hand), text that the press itself selected is removed just before the click is delivered. A selection that existed before the press is left alone.

To decide whether a point is on selected text, the controller asks the browser which character is nearest the point and measures only that character and its neighbor. The cost does not grow with the size of the selection. Inside a single text node of more than a million characters it skips the measurement and assumes the text is in the way. The check can miss at a boundary between left to right and right to left text, at the edge of an inline block, and on a selected image. There a steady press is treated as not on selected text.

## Recovery and lifecycle

A click made with Shift, Control, Command or Option held is left to the browser. Earlier versions told people to hold Alt (Option) to bypass assistance. That advice is gone, because Chrome downloads a link on Alt and click. Pointer capture, a drag that really starts (one that neither the guard nor the page cancelled), blur, scroll, resize, and pointercancel all cancel a pending correction. Escape pauses the page. An explicit toolbar enable resumes it. Site settings survive worker suspension. Registered content scripts are synchronized after optional permission removal, install or startup, and settings changes. Global off stops the target observer. Scripts already injected receive updated configuration, since unregistering scripts alone does not remove them.

## What a steady hand will notice

The 12 px press limit is unchanged for a steady hand. Five other things differ from 0.1.3:

1. The quick drag guard is on. Dragging a link the instant it is pressed no longer works. Press, wait half a second, then drag.
2. Selected text no longer switches assistance off for the whole page. Only a press that lands on selected plain text, or selects text on its way, is left alone.
3. A near miss released on the outlined target itself is now delivered. In 0.1.3 the release had to land on empty space.
4. A slip of 12 px or less that ends on a neighboring control is now delivered to the pressed control, if the outline was on the pressed control. In 0.1.3 nothing was clicked.
5. A press that wandered up to 48 px and came back to the control it started on now counts for the repeat guard.

## Optional hold to click

`core/dwell.js` implements a separate pure countdown and rearm state machine. For hold to click the controller uses only the latest position from trusted mouse movement, and reevaluates selection every 40 ms while enabled and focused. Timer updates do not manufacture pointer events. A stable target that passes the live checks can receive one synthetic click after the configured delay. Presses and keyboard input stop the countdown. The pointer must move 32 px away for 250 ms after an activation before rearming. Long timer gaps reset acquisition instead of completing stale countdowns. Forms, sensitive controls, no-assist regions, and neighboring native controls remain excluded. Selected text under the pointer stops the countdown unless it is the text of an eligible link or button. No user activation or trusted event is guaranteed for clicks delivered by the timer. The press and release benchmark does not evaluate this mode.

## One clock

The controller uses `performance.now()/1000` for selection, gesture handling, the drag record, and hold to click. Historical `Event.timeStamp` values never move selection backward in time after a timer tick. The shake meter is the one exception, as described above, and it never mixes the two clocks.

## Primary documentation

- [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [HTMLElement.click](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click)
- [Event.isTrusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted)

Known omissions: frames, filtering the cursor itself, pointerdown behavior specific to particular sites, correcting a press that lands on the wrong neighboring control, clinically calibrated models, and evaluation against rival extensions. Those need separate evidence before this release is extended.
