---
description: Archive the current results/ under results/<old version>/ and regenerate the full evidence set for this version
argument-hint: "[--skip-probes]"
---
Regenerate the evidence in `results/` for the version in `extension/manifest.json`.

1. Read the version in `results/README.md` (first heading). If it differs from the manifest version, move every top-level file in `results/` (not the existing `results/0.x.y/` folders) into `results/<that old version>/` with `git mv`. Check that `git diff -M --stat` shows only renames.
2. Use `CHROME_EXECUTABLE=/opt/pw-browsers/chromium` when that file exists.
3. Produce each file listed in the table in `results/README.md`, with the command in its "Produced by" column. Use `node --test --test-reporter=tap test/*.test.cjs > results/unit.tap` for the unit file. The controller only suite needs `BROWSER_CONTROLLER_ONLY=1` and the headless shell under `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`.
4. The probes run in real time (`real_input.cjs 66 8,16` takes about 20 minutes). Run them in the background unless `$ARGUMENTS` has `--skip-probes`. If they are skipped, say so in `results/README.md` and list the files that were not regenerated.
5. Rewrite `results/README.md` for the new version: date (US Central), OS, Node, Playwright, Chromium version (read from `results/browser.json`), and the same file table.
6. Compare every headline number with the previous version's files. Report each difference. Real-input counts may move by one or two between runs. Anything larger needs an explanation before the docs change.
7. Do not edit README.md or docs/VALIDATION.md numbers here. Run `/claims-check` next.
