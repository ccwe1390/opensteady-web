# Release kit

## Current status

0.1.0 is a source release and locally installable prototype. This document prepares store submission; it does not claim submission, store approval, publication, real-user validation, or external-site coverage.

## Store description draft

**Short description:** Optional assistance for near misses, small click slips, and repeated mouse clicks inside webpages.

**Detailed description:** OpenSteady Web gives some mouse clicks a little extra room. On pages you choose, a quiet outline shows a proposed nearby target. A conservative correction can rescue a small near miss or slip during a press, and an optional guard can block rapid repeat activations. Ordinary clicks and keyboard input retain their normal behavior.

Access is opt-in. Enable the current tab, or explicitly grant a site permission. Hold Alt to bypass assistance, press Escape to pause a page, and use the toolbar to turn it off. There are no accounts, network requests, analytics, advertising, or remote code. Settings are kept locally. A separate local lab can record/export practice traces only after you explicitly start it.

Experimental release: benefit for people with tremor has not been established. Works only in top-level http/https webpages, not the desktop, browser toolbar, PDFs, iframes, or touch/drag interactions. Forms, file pickers, risky actions, and unsupported controls remain native. Redirected clicks are synthetic; some sites may reject them. Switch off assistance on any page where it behaves poorly.

## Permission explanations

| Permission | Purpose |
|---|---|
| activeTab | Temporary access when the user opens the extension and enables this tab |
| scripting | Inject the bundled local controller into explicitly enabled pages |
| storage | Save preferences/chosen hosts; session-only tab choices |
| Optional http/https hosts | Request one host only when the user chooses “Always enable on this site” |

No mandatory host permissions, browsing-history permission, downloads permission, remote-code surface, or data transmission. Chosen hostnames are stored locally and should be described accurately in any store data-use questionnaire. The page DOM and pointer inputs are processed transiently on enabled pages.

## Acceptance before submission

1. Rerun `npm test`, `npm run check`, and `npm run test:browser` on the release sources. Keep failures and browser version in the validation report.
2. Complete the production permission/manual checklist on your Mac and a Windows Chrome/Edge machine if those platforms are advertised.
3. Try a representative set of real, non-sensitive pages; document failures. Avoid store claims of universal site compatibility.
4. Have a person unfamiliar with the project install, activate, bypass, pause, and uninstall without coaching. Fix installation/recovery confusion.
5. Add a real support channel you will maintain, and host the privacy statement at a public URL. No fabricated support address is included.
6. Capture screenshots of the actual popup, settings, and local lab. Do not label mockups as product screenshots or synthetic performance as participant results.
7. Create the extension-only ZIP with `python3 tools/package.py`; inspect its manifest and file list. Keep participant traces and development tools out of the upload.
8. Submit through your own developer account, initially unlisted if appropriate. Store fees, review timing, permissions review, and platform eligibility must be checked at submission time.

## Rival comparisons

The built-in nearest rule is a baseline, not a claim to reproduce MagPoint, Fitts Lens, or SteadySync. No rival extension was tested here. To compare one: install a pinned actual release in an isolated browser profile, disable other helpers, use the same lab layout and trial order, drive **trusted** input (or collect paired real sessions), and record actual activations. Include version/source hash, configuration, permissions, browser, misses, wrong activations, duplicates, and delays. Do not inject page-generated fake events and assume the rival accepts them.

Some rivals need different browsers or permissions. State those differences rather than pretending one harness makes them equivalent. The existing geometric replay can compare pure selectors; it cannot stand in for a shipped-extension comparison.

## Maintenance

Investigate wrong activations and stuck recovery controls promptly. Repeat fixtures after browser updates. Keep bug reports free of passwords, private URLs, medical details, and pointer recordings unless the reporter separately elects to share an anonymized lab export. Maintain numbered releases, release notes, and a reproducible benchmark. Add Firefox, frames, or adaptive calibration only after evidence and new compatibility checks.
