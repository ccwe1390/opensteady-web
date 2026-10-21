# Source notice

OpenSteady Web is Carol Chen's project. She owns it and decides what ships. See `LICENSE`.

## Where the code came from

**The starter.** The original OpenSteady Web starter (the project layout, a first target selector, and the seeded generator of scripted hand movements) was written by Claude, an AI assistant made by Anthropic, at Carol's request on 2026-10-02. The generator in `benchmark/robot.js` is retained from that starter. Version 0.1.4 adds an option to it.

**Versions 0.1.0 to 0.1.3.** OpenSteady Web 0.1.0 is a continuation of that starter. The starter's layout and conceptual baseline informed the release. The production controller, gesture policy, selector, settings, lab, and tests were substantially rewritten or added.

**Version 0.1.4.** The changes in 0.1.4 were written by Claude at Carol's request on 2026-10-02 and 2026-10-03, in response to its own review of 0.1.3. Separate Claude instances that had not seen the work then reviewed it in three rounds, one for the code and one for the documents each time, and Claude fixed what they found. The 0.1.4 changes are:

- `extension/core/jitter.js` (new): the shake measurement.
- `extension/core/policy.js` and `extension/core/link-drag.js`: the press rule that scales with measured shake, outline agreement, and the quick drag guard.
- The matching parts of `extension/content.js`, `extension/core/settings.js`, `extension/background.js`, and the popup and settings pages, plus the version numbers in `extension/manifest.json`, `package.json` and `package-lock.json`.
- The new and changed tests in `test/`, and the new `tools/mutation_check.cjs`.
- The changes to `benchmark/replay.js`, `benchmark/run.cjs` and `benchmark/protocol.json`, and the new hover option in `benchmark/robot.js`.
- The wording changes in `lab/index.html` and `lab/lab.js`.
- Everything in `probes/` and `results/` for this version, and the 0.1.4 revisions to the documents.

**Version 0.1.5.** The changes in 0.1.5 were written by Claude in a Claude Code session at Carol's request on 2026-10-21. Carol asked for the project to be brought up to the level of tooling and documentation of an earlier hackathon project, and for it to be published to her GitHub repository. No independent review round was run for 0.1.5. Claude audited its own work (`docs/audits/`) and fixed every finding at Carol's request. The 0.1.5 changes are:

- `extension/ui/i18n.js` and `extension/_locales/en/messages.json` (new), and the rewritten `extension/ui/popup.html`, `popup.js`, `options.html`, `options.js` and `styles.css`.
- The `ACTION` label list in `extension/targets.js`, the two target faults in `tools/mutation_check.cjs`, and the shortcut failure badge.
- The keyboard shortcuts (`commands` in `extension/manifest.json`, and `saveSettings`, `setTab`, `tabIsOn` and `runCommand` in `extension/background.js`), the `outline` setting in `extension/core/settings.js`, and the outline styles in `extension/content.js`.
- `test/i18n.test.cjs` (new), and the new tests in `test/background.test.cjs`, `test/content.test.cjs`, `test/settings.test.cjs` and `test/browser.cjs`. The fix in `test/check.cjs` and the `CHROME_EXECUTABLE` option in `probes/*.cjs`.
- `tools/bump_version.py` and `tools/contrast.py` (new).
- `CLAUDE.md`, everything in `.claude/` and `.github/`, `CONTRIBUTING.md`, `SECURITY.md`, `HANDOFF.md`, `docs/CONTRACTS.md`, `docs/audits/`, the pre-mortem, and the 0.1.5 revisions to the documents.
- Everything in `results/` for this version. The 0.1.4 results were moved unchanged to `results/0.1.4/`.

If a competition, class, or application asks whether AI tools were used, this file is the accurate answer for the starter and for versions 0.1.4 and 0.1.5. It makes no statement about who wrote versions 0.1.0 to 0.1.3 beyond the paragraph above.

## Third parties

No third-party runtime libraries are distributed in the extension. Playwright is an optional development dependency with its own license. It is not bundled in either release ZIP. No competing extension source is incorporated and no competing extension result is claimed.
