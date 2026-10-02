# Architecture and design decisions

## Boundaries

The production extension runs in Chrome's isolated world, in a top-level document after explicit tab activation or an optional remembered-host permission. The page cannot configure it using HTML attributes and cannot trigger assistance with synthetic events. There is no network, remote code, account, or telemetry. Chrome storage contains only settings and user-chosen site scopes; tab enablement is session storage; per-page counters are in memory.

The local lab uses the same pure selection and policy modules but is not the production controller. This keeps simulation from weakening the trusted-input gate. It can record real input on its own page after a user explicitly starts a recording.

## Target index

Stable element IDs live in a WeakMap. Rectangles and a 64 px spatial grid are rebuilt after DOM changes, scroll, resize, and periodic layout checks while the pointer is active. A pointer move queries the grid; it never rescans the full DOM. Bounding-box gaps of wrapped controls are excluded. Giant rectangles are stored separately to bound cell replication. At 6,000 discovered controls the index abstains entirely.

Candidates are screened locally for semantic eligibility and short risk labels. Live geometry, exposure through `elementFromPoint`, connectedness, enabled state, opacity, and ancestor opacity are checked before outlining and immediately before delivery. This reduces stale/covered-target errors; it does not make a hostile page safe. Geometry reading and outline updates can still force layout on some pages, which browser stress tests must measure.

## Selector

The default uses a 75 ms low-pass trend with a cutoff that increases for large slow-trend deviations. It scores each rectangle with the product of normal-CDF differences for x/y, using a fixed 6 px spread. It acquires a target after 60 ms of clear evidence and switches after 80 ms when the challenger is at least 1.6 times as strong. Low scores and ambiguous candidates abstain; an existing target has a smaller exit threshold. A 600 ms sample gap resets history.

These are engineering defaults, not calibrated physiological parameters or validated clinical settings. Adaptive mode derives a bounded 4–12 px spread from an exponentially weighted residual; deliberate motion also affects this estimate, so it is experimental and not shipped as the default.

Raw and smoothed points must both be within the radius cap. Risky controls within 12 px of the pointer create an additional exclusion zone. The outline has to be visible and fresh at the press; it is not conjured at the click.

## Gesture policy

The pure policy receives physical control IDs and records a candidate on a trusted primary mouse press. A native target at press takes precedence over the selector. The candidate is frozen while held. It tracks the maximum distance from press, rather than only the final displacement, so a drag returning to its origin cannot activate a target.

Release readies a gesture only within 12 px and 1.2 s. At click: pass a native same-target click, redirect a qualified near miss or slip into empty space, or abstain. A different physical target wins. The repeat guard affects only a matching, nearby safe mouse gesture; keyboard/synthetic clicks pass.

DOM delivery happens synchronously in the trusted click listener. Pointerdown, mousedown, pointerup, and mouseup retain normal propagation. The controller calls focus then validates again and calls `HTMLElement.click()`, guards its own synchronous delivery, and cancels the original click only after a delivery attempt. Exceptions reset the current gesture; three internal errors pause assistance. It cannot undo page handlers that already ran, nor guarantee recovery from arbitrary page actions.

## Recovery and lifecycle

Alt, any other click modifier, text selection, pointer capture, dragstart, blur, scroll, resize, and pointercancel cancel a pending correction. Escape pauses the page; an explicit toolbar enable resumes it. Site settings survive worker suspension. Registered content scripts are synchronized after optional permission removal, install/startup, and settings changes. Global off stops the target observer. Scripts already injected receive updated configuration, since unregistering scripts alone does not remove them.

## Primary documentation

- [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [HTMLElement.click](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click)
- [Event.isTrusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted)

Known omissions: frames, pointer-side cursor filtering, arbitrary site-specific pointerdown behavior, direct wrong-target correction, clinically calibrated models, and rival-extension evaluation. Those need separate evidence, rather than automatic expansion of this release.
