# glossary - OpenSteady Web

- **Outline** - green box showing the proposed target. Must be visible >= 60 ms before a near miss counts.
- **Near miss** - press on empty safe space beside the outlined target; delivered to that target.
- **Slip** - press on a target that slides off before release; delivered to the pressed target.
- **Outline agreement** - for slips > 12 px or ending on another control, the outline must have been on the pressed target at the press.
- **Press limit** - how far a press may wander and still count: 12 px, or 3 x shake up to 48 px for presses <= 0.6 s.
- **Steady** - measured shake < 2 px, or unmeasured. Governs selected-text rules only.
- **Quick drag guard** - cancels a drag beginning within 0.5 s of a press on an eligible link/button.
- **Repeat guard** - suppresses a second nearby activation of the same target within 300 ms.
- **Hold to click / dwell** - optional; activates an outlined target after 0.9 s without a press.
- **Trusted input** - events with isTrusted true. In probes they come from Chromium's automation interface, not a physical mouse.
- **Controller only mode** - browser suite with content scripts injected into an isolated world, extension not installed.
