# Release kit

## Current status

0.1.5 is a source release and locally installable prototype. This document prepares store submission. It does not claim submission, store approval, publication, testing by real users, or coverage of outside websites.

## Store description draft

**Short description:** Optional help with near misses, slips, quick drags and repeated clicks, plus hold to click without pressing, inside webpages. (This is the `description` in `extension/manifest.json`. Keep the two the same.)

**Detailed description:** OpenSteady Web gives some mouse clicks a little extra room. On pages you choose, a quiet outline shows a proposed nearby target. A conservative correction can rescue a near miss or a slip during a press. When the pointer was shaking just before the press, the press is allowed to wander further before it stops counting as a click. A quick drag on a link or button is kept as a click, and a guard (on by default) blocks rapid repeat activations. An optional hold to click mode activates an outlined target without pressing the mouse. Ordinary clicks and keyboard input retain their normal behavior.

Access is opt-in. Enable the current tab, or explicitly grant a site permission. Press Escape to pause a page, and use the toolbar to turn it off. A click made with Shift, Control, Command or Option held is left to the browser. To drag a link on purpose, press, wait half a second, then move. There are no accounts, network requests, analytics, advertising, or remote code. Settings are kept locally. A separate local lab can record and export practice traces only after you explicitly start it.

Experimental release: benefit for people with tremor has not been established. Works only in top-level http/https webpages, not the desktop, browser toolbar, PDFs, iframes, or touch interactions. Forms, file pickers, risky actions, and unsupported controls remain native. Redirected clicks are synthetic, and some sites may reject them. Switch off assistance on any page where it behaves poorly.

## Permission explanations

| Permission | Purpose |
|---|---|
| activeTab | Temporary access when the user opens the extension and enables this tab |
| scripting | Inject the bundled local controller into explicitly enabled pages |
| storage | Save preferences and chosen hosts. Tab choices that last only for the browser session |
| (no permission) keyboard shortcuts | `commands` in the manifest. Pressing a shortcut grants activeTab for the current tab, like opening the popup |
| Optional http and https hosts | Request one host only when the user chooses "Always enable on this site" |

No mandatory host permissions, permission to read browsing history, downloads permission, remote code, or data transmission. Chosen hostnames are stored locally and should be described accurately in any store questionnaire about data use. The page DOM and pointer inputs are processed transiently on enabled pages.

## Acceptance before submission

1. Rerun `npm test`, `npm run check`, `npm run test:browser` and `npm run test:review-links` on the release sources, on the Mac. Keep failures and browser version in the validation report.
2. Complete the production permission and manual checklist on your Mac and a Windows Chrome/Edge machine if those platforms are advertised.
3. Try a representative set of real, non-sensitive pages and document failures. Avoid store claims of universal site compatibility.
4. Have a person unfamiliar with the project install, activate, pause, and uninstall without coaching. Fix installation and recovery confusion.
5. Add a real support channel you will maintain, and host the privacy statement at a public URL. No fabricated support address is included.
6. Capture screenshots of the actual popup, settings, and local lab. Do not label mockups as product screenshots or synthetic performance as participant results.
7. Create the extension-only ZIP with `python3 tools/package.py` and inspect its manifest and file list. Keep participant traces and development tools out of the upload.
8. Submit through your own developer account, initially unlisted if appropriate. Store fees, review timing, permissions review, and platform eligibility must be checked at submission time.

## Rival comparisons

The built-in nearest rule is a baseline, not a claim to reproduce MagPoint, Fitts Lens, or SteadySync. No rival extension was tested here. To compare one: install a pinned actual release in an isolated browser profile, disable other helpers, use the same lab layout and trial order, drive **trusted** input (or collect paired real sessions), and record actual activations. Include version and source hash, configuration, permissions, browser, misses, wrong activations, duplicates, and delays. Do not inject fake events from the page and assume the rival accepts them.

Some rivals need different browsers or permissions. State those differences. One harness does not make them equivalent. The existing geometric replay can compare pure selectors. It cannot stand in for a comparison of shipped extensions.

`probes/real_input.cjs` is the starting point for such a comparison: it drives an installed extension with trusted mouse input in real time and counts actual activations.

## Maintenance

Investigate wrong activations and stuck recovery controls promptly. Repeat fixtures after browser updates. Keep bug reports free of passwords, private URLs, medical details, and pointer recordings unless the reporter separately elects to share an anonymized lab export. Maintain numbered releases, release notes, and a reproducible benchmark. Add Firefox, frames, or adaptive calibration only after evidence and new compatibility checks.
