# CLAUDE.md - OpenSteady Web

Instructions for Claude Code sessions in this repository. Read this first, then
`.claude/project-memory/INDEX.md` and `.claude/project-memory/important.md`.

## What this is

OpenSteady Web is an experimental Manifest V3 Chrome extension that gives some
mouse clicks a little extra room on webpages the user explicitly enables: near
misses, slips during a press, quick accidental drags, repeated clicks, and an
optional hold to click. Owner and decider: **Carol Chen**. MIT license.

It is **not** a medical device and has **not** shown benefit for people with
tremor. Every measurement comes from a scripted hand on Linux, never from
people and never from a Mac. Any text you write must keep that true.

## Hard rules

1. **No network, no remote code, no telemetry.** Nothing in `extension/` may call
   `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or `eval`. `npm run check`
   enforces this. No new permission without Carol's explicit OK. The
   permissions are exactly `activeTab`, `scripting`, `storage`, plus optional
   http/https hosts.
2. **Claims follow evidence.** Every number in `README.md`, `docs/VALIDATION.md`,
   `CHANGELOG.md` or `docs/RELEASE.md` must come from a file in `results/` for
   the current version. If you change behavior, rerun the evidence (`/regen-results`)
   before you update a number. Never round a miss away, and never write "works",
   "helps", "improves accuracy for people", or "clinically".
3. **Native input first.** A click that already reaches the right control is never
   replaced. Pointerdown/up are never cancelled or manufactured. Forms, risky
   labels, editing, custom elements and `data-opensteady-no-assist` regions stay
   native. If a change could redirect a click somewhere new, it needs a unit test,
   a browser test, and a fault in `tools/mutation_check.cjs`.
4. **Trusted input only in production.** The lab and probes may simulate. The
   extension must never accept page-supplied synthetic events or a page flag.
5. **One clock.** Controller logic uses `performance.now()/1000`. Only the shake
   meter (`core/jitter.js`) uses `Event.timeStamp`, and never mixes the two.
6. **Keep the AI-credit notice accurate.** When Claude writes or changes code,
   update `NOTICE.md` and `extension/NOTICE.md` in the same commit.
7. **Plain, exact prose.** Short sentences. Name units (px, seconds). Say what was
   not tested. Match the existing document voice.

## Layout

| Path | Purpose |
|---|---|
| `extension/core/*.js` | Pure, testable logic: selector, policy, jitter, link-drag, dwell, settings |
| `extension/content.js`, `targets.js` | Controller in the page's isolated world; DOM eligibility and index |
| `extension/background.js` | Service worker: opt-in injection, settings, site permissions, keyboard shortcuts |
| `extension/ui/` | Popup and settings pages; `i18n.js` fills `data-i18n` text from `_locales` |
| `extension/_locales/en/messages.json` | Every user-visible string in the UI and manifest |
| `lab/` | Local pointing lab (served at http://127.0.0.1:8000/lab/index.html) |
| `benchmark/`, `probes/` | Seeded replay benchmark; trusted-input probes of the installed extension |
| `test/` | Unit + mocked tests (`*.test.cjs`), browser suites, package check |
| `results/` | Evidence for the current version; `results/<old version>/` for history |
| `docs/` | Architecture, validation, privacy, release, contracts, audits |
| `.claude/` | Commands, agents, hooks, and project memory for Claude Code |

## Commands

```sh
npm test                      # unit + mocked tests (node:test)
npm run check                 # syntax, manifest, no-network, file references
npm run benchmark             # seeded replay -> results/benchmark.json
node tools/mutation_check.cjs # break rules one at a time; tests must notice
npm run test:browser          # installed extension in Chromium (needs playwright)
npm run test:review-links     # paired link replay
python3 tools/package.py      # dist/ ZIPs + SHA256SUMS
python3 tools/bump_version.py 0.1.6   # version strings everywhere
python3 tools/contrast.py     # WCAG contrast of UI color pairs
```

In a cloud session Chromium is preinstalled. Point the browser suites at it with
`CHROME_EXECUTABLE=/opt/pw-browsers/chromium`. Never run `npx playwright install`
there. The controller only suite needs the headless shell:
`BROWSER_CONTROLLER_ONLY=1 CHROME_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`.

## Slash commands in this repo

`/verify`, `/regen-results`, `/probe`, `/release`, `/audit`, `/a11y-audit`,
`/review`, `/claims-check`, `/add-setting`, `/site-compat`, `/handoff`,
`/remember`, `/premortem`. Each lives in `.claude/commands/` and says exactly
what it does and what it writes.

## Conventions

- Code style is dense, single-quoted, `'use strict'`, and UMD-style for core modules
  (`module.exports` in Node, a global like `OpenSteadyPolicy` in the browser). Match it.
- New user-visible text goes in `extension/_locales/en/messages.json` and is
  referenced with `data-i18n="key"` in HTML or `t('key', subs, fallback)` in JS.
  The HTML keeps the English text as a fallback, and `test/i18n.test.cjs`
  checks that it matches the catalog.
- New settings go through `normalizeSettings` (bounded, defaulted), the
  `save-settings` allowlist in `background.js`, and `test/settings.test.cjs`.
  Use `/add-setting`.
- Commit messages: imperative subject, a body that says what changed and what
  evidence was rerun.
- Before telling the user something is done, run `/verify` and quote the counts.
