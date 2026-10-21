---
description: Check every number and claim in README, VALIDATION, CHANGELOG, RELEASE, PRIVACY, START-HERE and the UI text against results/ and the code
---
Make sure the documents say only what the evidence shows.

1. Extract every number with a unit or a count (for example `63 of 66`, `48 px`, `0.5 seconds`, `108 unit tests`) from README.md, START-HERE.md, CHANGELOG.md (current version section only), docs/VALIDATION.md, docs/RELEASE.md, docs/PRIVACY.md, probes/README.md, results/README.md and `extension/_locales/en/messages.json`.
2. Trace each one to its source: a file in `results/` for measured numbers, or a constant in `extension/` for rules. Give file and line.
3. Flag:
   - numbers with no source, or a source from another version's folder;
   - test counts that differ from `results/unit.tap` and `results/browser.json`;
   - version strings that differ from the manifest;
   - forbidden claims: "works for people with tremor", "clinically", "proven", "improves accuracy" without "scripted", "safe", "guarantee", "tested on Mac" (unless a Mac run exists in results/);
   - limits from ARCHITECTURE.md that are missing from README.md.
4. Output a table: claim | location | source | status (ok / mismatch / unsourced / forbidden). Fix mismatches only when the source is clear. Otherwise ask.
