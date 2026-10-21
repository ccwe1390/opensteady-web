# compliance - OpenSteady Web

- Chrome Web Store: not submitted. Acceptance list in docs/RELEASE.md (Mac run, manual permission checklist, unfamiliar-user install test, real support channel, hosted privacy statement, real screenshots).
- Store short description = manifest description (__MSG_extDescription__), max 132 chars; test/i18n.test.cjs enforces.
- Single purpose: click assistance on chosen pages. Keyboard shortcuts and outline style serve that purpose.
- Data use answers: no data collected or transmitted; hostnames of remembered sites stored locally.
- Claims: see important.md #1 and writing.md.
- License MIT; no third-party runtime code; Playwright dev-only (Apache-2.0), not bundled.
