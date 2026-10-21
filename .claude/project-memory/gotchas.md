# gotchas - OpenSteady Web

## Playwright pin vs preinstalled Chromium (2026-10-21)
package.json pins playwright 1.62.1, which looks for chromium-1234. Cloud containers ship /opt/pw-browsers/chromium (build 1194). Without CHROME_EXECUTABLE the browser suite fails with "Executable doesn't exist". Fix: CHROME_EXECUTABLE=/opt/pw-browsers/chromium. Never `npx playwright install` in the cloud. The session-start hook exports it.

## Probes ignored CHROME_EXECUTABLE before 0.1.5 (2026-10-21)
Only test/*.cjs honored it. Fixed in all probes/*.cjs that launch a browser.

## test/check.cjs scanned node_modules HTML (2026-10-21)
After `npm ci`, the HTML reference check walked playwright-core's dashboard and failed on an absolute /playwright-logo.svg. It passed in 0.1.4 only because node_modules was absent. Fixed by filtering node_modules.

## Node 24 test runner output (2026-10-03)
Node 24 changed the default reporter; the first mutation_check could not parse it and called every fault caught. It now forces TAP, refuses unreadable results, and includes a control fault that must survive.

## Alt+click downloads links in Chrome (2026-10-03)
Do not tell users to hold Alt/Option to bypass. Any modifier leaves the click to the browser.

## Shake meter blind spots (2026-10-03)
Needs ~0.15-0.2 s hover; 3 Hz tremor reads "unknown"; 4 Hz reads ~3/4 size; a deliberate wiggle reads as shake. results/meter-check.txt.

## results/ gets overwritten by test runs (2026-10-21)
`npm run test:browser` writes results/browser.json and results/lab.png, and `npm run benchmark` writes results/benchmark.*. Running them for a quick check changes the evidence files. Use git checkout on results/ afterwards, or run /regen-results deliberately.

## chrome.i18n.getMessage substitutions must be strings (2026-10-21)
Pass String(n). ui/i18n.js converts automatically.
