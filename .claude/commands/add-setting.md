---
description: Add a new user setting end to end (normalize, worker allowlist, UI, catalog, tests, docs)
argument-hint: "<camelCaseName> <type and default, e.g. boolean false>"
---
Add the setting `$ARGUMENTS`. Every step below is required. The tests fail if one is missed.

1. `extension/core/settings.js`: add it to `DEFAULTS` and to `normalizeSettings` with bounds or an allowlist. Unknown or hostile values fall back to the default.
2. `test/settings.test.cjs`: add the key to the deepEqual expectation and add a test for bounds and junk values.
3. `extension/background.js`: add the key to the `saveSettings` allowlist. Add a mocked test in `test/background.test.cjs` showing it saves and that the global pause shortcut keeps it.
4. `extension/ui/options.html` and `options.js`: add a labelled control (load and save). Put its label and help text in `extension/_locales/en/messages.json` and reference them with `data-i18n`. `test/i18n.test.cjs` checks that the fallback text matches.
5. If the controller uses it (`content.js` reads `config.<name>`), add a content test. If it can change which control receives a click, also add a browser test and a fault to `tools/mutation_check.cjs`.
6. Docs: README "Behavior", docs/ARCHITECTURE.md, docs/PRIVACY.md (if it stores anything new), CHANGELOG.
7. Run `/verify quick`.
