---
description: Accessibility audit of the popup, settings page and on-page outline; writes docs/audits/<date>_accessibility-audit.md
---
Audit the accessibility of the extension's own UI and outline. The users are people with tremor, so motor access comes first.

1. **Contrast.** `python3 tools/contrast.py`. It checks every text and control color pair in `extension/ui/styles.css` (light and dark) and the outline styles in `content.js` against WCAG 2.2 (4.5:1 text, 3:1 non-text). Quote failures.
2. **Pointer targets.** Load `ui/popup.html` and `ui/options.html` in the installed extension through Playwright (see `test/browser.cjs` for how to get the extension ID). Measure each button, checkbox, select and link: at least 24x24 CSS px (WCAG 2.5.8), and report anything under 44x44.
3. **Keyboard.** Tab through both pages. Every control is reachable in a sensible order, the focus ring is visible (3 px outline), nothing traps focus, and Escape on a page pauses assistance. List the keyboard shortcuts and whether they conflict with Chrome defaults.
4. **Screen readers.** Every input has a label. Status and error regions use `role=status` / `role=alert`. Headings are in order. `lang` is set. Check the accessibility tree with `page.accessibility.snapshot()`.
5. **Preferences.** `prefers-color-scheme: dark`, `forced-colors: active` and `prefers-reduced-motion`. Emulate each one and screenshot it to the scratchpad.
6. **Motor load.** Count the presses needed to enable a tab, pause and resume. Hold to click works without any press. Check that no control needs a drag, a double click or a precise small target.

Write findings in the table format used by `/audit`, plus a short list of fixes made in this session. Do not claim WCAG conformance. Report what was checked.
