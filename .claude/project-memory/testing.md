# testing - OpenSteady Web

- `npm test`: node:test over test/*.test.cjs (unit + mocked worker/content + i18n catalog). 0.1.5: 119 tests.
- `npm run check`: syntax of every JS file, manifest permissions, no network/eval, HTML references.
- `node tools/mutation_check.cjs`: 61 faults + 1 control; unit tests must catch all 61.
- `npm run test:browser`: installed extension with a localhost-only test manifest copy; trusted Playwright input. 0.1.5: 44 checks (41 from 0.1.4 + shortcuts, settings page, popup).
- Controller only: BROWSER_CONTROLLER_ONLY=1 with the headless shell.
- Probes: probes/README.md. Real time; counts vary by 1-2.
- Frozen rule: never weaken an assertion to make a change pass; add a test that shows the new behavior instead.
