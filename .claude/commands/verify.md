---
description: Run every automated gate (unit, package, fault check, benchmark, browser suites) and report exact counts
argument-hint: "[quick]  (quick = skip browser suites and fault check)"
---
Run the full verification gate for OpenSteady Web and report results exactly.

1. Read the version from `extension/manifest.json`.
2. Run, in order, stopping only to report (never to "fix and retry" silently):
   - `npm test` (record tests / pass / fail)
   - `npm run check`
   - unless `$ARGUMENTS` contains `quick`:
     - `node tools/mutation_check.cjs` (record caught / total, and confirm the control fault survived)
     - `npm run benchmark` (compare headline rows with `results/benchmark.md`; differences mean the replay changed)
     - the installed extension suite: `npm run test:browser`. Set `CHROME_EXECUTABLE` to `/opt/pw-browsers/chromium` if that file exists. Record PASS count and any page errors.
     - `npm run test:review-links`
3. Do not write into `results/` here. That is `/regen-results`.
4. Report a table: check | command | result | matches `results/`? Name the browser version printed in `results/browser.json` vs this run.
5. If anything failed, show the first failing assertion verbatim and the file:line, and stop. Do not mark the work done.
