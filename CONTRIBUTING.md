# Contributing

OpenSteady Web is Carol Chen's project. Issues and pull requests are welcome. Carol decides what ships.

## Before you start

- Read `README.md` "Scope and limits" and `docs/ARCHITECTURE.md`. The project is deliberately conservative: a click that already reaches the right control is never replaced, and forms, risky actions and editing are left alone.
- This is an experimental accessibility tool. Benefit for people with tremor has not been established. Please don't add text that suggests otherwise.

## Setup

```sh
npm ci
npx playwright install chromium   # local machines only
npm test && npm run check
```

## Rules for changes

1. No network requests, remote code, analytics or new permissions in `extension/`. `npm run check` enforces the first part. New permissions need an issue first.
2. A change that could alter which control receives a click needs a unit test, a browser test in `test/browser.cjs`, and a fault in `tools/mutation_check.cjs` that the unit tests catch.
3. User-visible text goes in `extension/_locales/en/messages.json`. Use `data-i18n` in HTML and `t(key, subs, fallback)` in scripts. `npm test` checks that they match.
4. Numbers in documents must come from `results/` for the same version. If your change affects behavior, regenerate them (see `results/README.md`).
5. Say what you did not test.

## Using Claude Code

This repository is set up for Claude Code. `CLAUDE.md` holds the rules. `.claude/commands/` holds slash commands such as `/verify`, `/review`, `/audit` and `/release`. `.claude/project-memory/` is the project's working memory. If an AI assistant writes part of your change, say so in `NOTICE.md`.
