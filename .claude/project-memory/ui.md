# ui - OpenSteady Web

- Popup: status, enable tab, remember site, hold to click toggle, pause everywhere, Escape help, shortcut hint, counters.
- Options: assistance toggles, hold-to-click time, selection mode, outline style, keyboard shortcuts, sites, privacy, limits, clear.
- All text from _locales/en/messages.json; HTML keeps English fallback (checked by test/i18n.test.cjs).
- Dark mode (prefers-color-scheme), forced-colors borders and focus, reduced motion. Contrast pairs in tools/contrast.py.
- Outline styles: standard (2 px green), bold (4 px green), contrast (4 px black, yellow halo). Appearance only.
- Every pointer target >= 44 px tall (measured 2026-10-21); checkbox rows are 45 px labels; focus ring 3 px; long help in <details>; Save is sticky.
