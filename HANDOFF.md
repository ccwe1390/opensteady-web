# Handoff - OpenSteady Web

Updated 2026-10-21 by Claude (Claude Code session) for Carol Chen.

## 1. Where things stand

- **Version 0.1.5** on branch `update-0.1.4-and-tooling` of `ccwe1390/opensteady-web`. `main` still holds the original 0.1.0 commit until this branch is merged.
- **Verified 2026-10-21** on Linux in Chromium 141.0.7390.37 (`results/README.md`):
  - 121 of 121 unit tests (`results/unit.tap`)
  - 44 of 44 installed extension checks, and 41 of 41 controller only checks, no page errors
  - 63 of 63 faults caught, control fault survived (`results/mutation-check.txt`)
  - benchmark, per-trial probes, and the short probes identical to 0.1.4 apart from timing
  - real input probe identical to 0.1.4 in every row, twice: 63 of 66 at 8 px and 48 of 66 at 16 px with defaults, no wrong clicks
  - contrast: 26 of 26 color pairs (`python3 tools/contrast.py`)
- **Never tested:** a Mac, Windows, Edge, real websites, screen readers, any person.

## 2. What changed since the 0.1.0 repository

1. Brought up to 0.1.4 from Carol's ZIP: shake-scaled press limit, quick drag guard, hold to click, probes, review response.
2. 0.1.5 features: keyboard shortcuts, outline style, dark mode and forced colors, one message catalog, more excluded action labels, a `!` badge when a shortcut cannot act, 44 px targets, folded help, sticky Save.
3. Fixes: `npm run check` no longer reads `node_modules`. Probes honor `CHROME_EXECUTABLE`.
4. Tooling: `CLAUDE.md`, `.claude/` (13 commands, 3 agents, 2 hooks, project memory), GitHub Actions (checks, release), issue and PR templates, `CONTRIBUTING.md`, `SECURITY.md`, `docs/CONTRACTS.md`, two audits, a pre-mortem, `tools/bump_version.py`, `tools/contrast.py`.
5. Evidence: 0.1.4 results moved unchanged to `results/0.1.4/`. `results/` regenerated for 0.1.5.

## 3. Open problems

- Audit AX-9: no screen reader, 200% zoom or human check of the UI.
- Pre-mortem items 4 to 13 (`docs/2026-10-21_pre-mortem-store-submission.md`): Mac run, support URL, hosted privacy statement, real-site compatibility rows, unassisted install test.
- The `ACTION` and `RISK` label lists will never be complete. Add every label reported as wrongly corrected, with a test.
- `docs/COMPATIBILITY.md` still has no real-site rows.

## 4. Next steps, in order

1. **Merge** the branch on GitHub (compare `update-0.1.4-and-tooling` into `main`). Watch the `checks` workflow go green.
2. **Mac run:** `npm ci && npx playwright install chromium && npm test && npm run test:browser`, then `node probes/real_input.cjs 66 8,16`. Save the output under `results/mac/` and add a row to `docs/VALIDATION.md`.
3. **Try it yourself** on the lab page and a harmless public site. Record what happens with `/site-compat <site>`.
4. **Store prep:** follow `docs/RELEASE.md` "Acceptance before submission". Use GitHub Issues as the support URL.
5. **Release:** `/release 0.1.6` (or tag `v0.1.5` to publish this build as a GitHub prerelease).

## 5. Decisions that must not be reversed without Carol

From `.claude/project-memory/important.md`: no network or telemetry; permissions fixed at activeTab, scripting and storage plus optional hosts; a working click is never replaced; numbers come from `results/` of the same version; settings keys are added, never renamed; `NOTICE.md` stays accurate; no claim of benefit for people with tremor.

## 6. How to run everything

```sh
npm ci
npm test
npm run check
node tools/mutation_check.cjs
npm run benchmark
npm run test:browser            # add CHROME_EXECUTABLE=/path/to/chrome if needed
npm run test:review-links
python3 tools/contrast.py
python3 tools/package.py        # dist/ ZIPs and SHA256SUMS
python3 -m http.server 8000 --bind 127.0.0.1   # lab at http://127.0.0.1:8000/lab/index.html
```

In Claude Code, `/verify` runs the automated gates and `/handoff` rewrites this file.
