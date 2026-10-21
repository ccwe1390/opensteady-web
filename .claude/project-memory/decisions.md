# decisions - OpenSteady Web

Format: date - decision - why - source.

- 2026-10-02 - Desktop Chrome MV3 only, top-level http/https pages, no iframes/shadow internals/touch/pen - smallest surface that can be tested honestly - README "Scope and limits".
- 2026-10-02 - Correct at the final click, never at pointerdown/up - keeps page event semantics intact - ARCHITECTURE "Gesture policy".
- 2026-10-02 - Opt-in per tab (activeTab) or per remembered site (optional host grant) - no install-time access to every page - ARCHITECTURE "Boundaries".
- 2026-10-02 - Default radius 24 px (bounded 8-32), 60 ms acquisition, 6 px Gaussian spread - engineering defaults, not calibrated - ARCHITECTURE "Selector".
- 2026-10-02 - Hold to click off by default, 900 ms (500-2000), 32 px / 250 ms rearm - hovering would otherwise activate controls - CHANGELOG 0.1.2.
- 2026-10-03 - Press limit = 3 x measured shake, min 12 px, max 48 px, presses <= 0.6 s; never correct > 1.2 s - steady hands keep exactly 12 px - CHANGELOG 0.1.4.
- 2026-10-03 - "Steady" threshold 2 px (separate from the 4 px where the limit grows) - one 5 px line lost near misses on text for mild tremor - ARCHITECTURE "Shake measurement".
- 2026-10-03 - Quick drag guard on by default, 0.5 s window - links were 0 of 24 at 8 px with it off - docs/VALIDATION.md.
- 2026-10-03 - Alt no longer advertised as bypass; any modifier leaves the click to the browser - Chrome downloads on Alt+click - probes/alt_click.cjs.
- 2026-10-21 - 0.1.5: keyboard shortcuts, outline style setting (appearance only), dark/forced-colors CSS, all UI strings in _locales/en - accessibility and maintainability without touching click rules - CHANGELOG 0.1.5.
- 2026-10-21 - ACTION label list (visible label only) added to targets.js; fixes audit A1-1 - Carol: "make sure you fix all the changes" - docs/audits/2026-10-21_audit-1.md.
- 2026-10-21 - Shortcut that cannot act sets a red ! badge on the tab - audit A1-5.
- 2026-10-21 - Translations other than English not shipped - Carol: "u dont need to do the languages"; catalog stays English-only but ready - this session.
- 2026-10-21 - Repository target is ccwe1390/opensteady-web; ccwe1390/opensteady (Python/C filter) is a separate project and untouched - this session.
