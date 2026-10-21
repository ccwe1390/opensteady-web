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

If a competition, class, or application asks whether AI tools were used, this file is the accurate answer for the starter and for version 0.1.4. It makes no statement about who wrote versions 0.1.0 to 0.1.3 beyond the paragraph above.

## Third parties

No third-party runtime libraries are distributed in the extension. Playwright is an optional development dependency with its own license. It is not bundled in either release ZIP. No competing extension source is incorporated and no competing extension result is claimed.
