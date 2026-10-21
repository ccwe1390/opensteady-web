# Accessibility audit - OpenSteady Web 0.1.5

Date: 2026-10-21. Auditor: Claude (Claude Code session), at Carol Chen's request. Scope: the toolbar popup, the settings page, and the on-page outline. The people this extension is for have tremor, so motor access is checked first.

This is a record of what was measured, not a claim of WCAG conformance. No person using assistive technology took part.

## Method

- **Installed extension:** Chromium 141.0.7390.37 headless on Linux, the extension loaded unpacked. Each page opened at `chrome-extension://<id>/ui/...` (popup at 360 x 640, settings at 900 x 900).
- **Target sizes:** `getBoundingClientRect()` of every button, link, select, checkbox, checkbox label and summary.
- **Keyboard:** Tab pressed until focus cycled. Each focused element's computed outline recorded.
- **Labels and structure:** inputs with no `<label>` or `aria-label`, heading order, live regions, `lang`.
- **Themes:** screenshots with `prefers-color-scheme: dark` and `forced-colors: active` emulated.
- **Contrast:** `python3 tools/contrast.py`, 26 color pairs across light, dark and the three outline styles.

## Results after fixes

| Check | Popup | Settings page |
|---|---|---|
| Smallest pointer target | 44 px tall (buttons 316 x 44, link 44 tall) | 44 px tall (buttons, selects, summaries). Checkbox rows 45 tall, and the whole row is the label, so the whole row toggles. |
| Keyboard order | Every enabled control, in visual order | enabled, repeat guard, drag guard, help, hold to click, time, help, mode, help, outline, save, clear |
| Focus ring | 3 px solid on every focused element | same |
| Unlabeled inputs | none | none |
| Headings | h1 | h1, then h2 x 5, in order |
| Live regions | `#status` role=status, `#error` role=alert | same |
| `lang` | `en`, from the catalog | same |
| Contrast | 26 of 26 pairs meet their minimum (4.5:1 text, 3:1 non-text) | same |
| Dark mode, forced colors | Readable. Borders and focus kept. Screenshots reviewed. | same |

## Findings

| ID | Severity | Location | Finding | Fix | Status |
|---|---|---|---|---|---|
| AX-1 | Medium | `ui/popup.html` footer link | "Settings & privacy" was 119 x 17 px. It met WCAG 2.5.8 (24 px) only through the spacing exception. For a hand with tremor it was the smallest target in the popup. | `.footer a` is now an inline-flex box at least 44 px tall. | Fixed |
| AX-2 | Low | `ui/options.html` selects | 39 px tall. | `min-height: 44px` | Fixed |
| AX-3 | Low | `ui/options.html` checkbox rows | Label rows were 25 px tall, with a 20 x 20 px box. | `label.check` is at least 44 px tall with padding. The full row toggles. | Fixed |
| AX-4 | Low | `ui/options.html` | Three help paragraphs of up to 181 words sat between controls, so **Save** was a long scroll away (audit A1-7). | Long help folds behind "How this works" (`<details>`, 44 px summary). **Save** is sticky at the bottom of the viewport while the card scrolls. | Fixed |
| AX-5 | Low | `ui/styles.css` dark mode | Primary button text was 4.30:1 in the first dark draft (audit A1-4). | Same green as the light theme, 5.22:1. | Fixed |
| AX-6 | Low | `ui/popup.js` counters | "1 corrections" (audit A1-6). | Reworded as labels: "Corrections: 1". | Fixed |
| AX-7 | Note | Outline on pages | The standard 2 px green outline is 4.78:1 against white and 4.39:1 against black. It passes 3:1, but it is thin. | The new **Outline style** setting offers bold (4 px) and high contrast (black on a yellow halo, 21:1 and 14.7:1). | Addressed in 0.1.5 |
| AX-8 | Note | Keyboard shortcuts | Alt+Shift+S is not a Chrome default. On a Mac, Option+Shift+S types a character, so the Mac default is Control+Shift+S. A conflicting extension can leave it unassigned. | The popup shows the bound key or how to set one. A shortcut that cannot act puts a red `!` on the icon (audit A1-5). | Addressed in 0.1.5 |
| AX-9 | Open | Whole UI | Not tried with a screen reader (VoiceOver, NVDA), with browser zoom at 200%, or by a person with tremor. | Do these during the pilot (`docs/PILOT.md`). | Open |

## Motor load

| Task | Presses |
|---|---|
| Turn on for this tab | 1 shortcut, or 2 clicks (toolbar icon, **Enable on this tab**) |
| Pause this page | 1 key (Escape) |
| Resume | 1 shortcut, or 2 clicks |
| Pause everywhere | 2 clicks, or 1 shortcut once assigned |

No control needs a drag, a double click, a held press, or a target under 44 px.

## Not checked

Screen readers, zoom and reflow at 320 CSS px wide, high contrast themes on real Windows, macOS Increase Contrast, the lab page (a development tool), and every real person.
