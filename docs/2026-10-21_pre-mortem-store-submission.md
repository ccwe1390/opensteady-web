# Pre-mortem: Chrome Web Store submission

Date: 2026-10-21. Version at writing: 0.1.5. Written by Claude at Carol Chen's request, as part of bringing the project's tooling up to the level of her hackathon project.

Imagine it is April 2027. OpenSteady Web went into the Chrome Web Store and it went badly. Below is how that could happen, grounded in this repository, with the warning sign and the cheapest mitigation for each.

| # | How it failed | Likelihood | Impact | Early warning | Mitigation | Owner | Done when |
|---|---|---|---|---|---|---|---|
| 1 | Rejected for "misleading functionality" because the listing implied help for tremor | Med | High | Draft listing uses "helps", "for tremor" or "accuracy" | Use the `docs/RELEASE.md` description as written. It says benefit is not established. Run `/claims-check` on the listing text. | Carol | Listing passes `/claims-check` |
| 2 | Rejected for permissions: `scripting` + optional `<all_urls>`-like hosts looked broad | Med | Med | Reviewer asks for justification | Paste the permission table from `docs/RELEASE.md`, including that shortcuts need no permission | Carol | Justification fields filled from the table |
| 3 | A wrong click on something that mattered (account closure, publish, block) | Low-Med | High | First bug report of type "A different control was clicked" | Fix audit finding A1-1 (risky label gaps) before submission. Regenerate the evidence. | Claude session | **Done 2026-10-21**: A1-1 fixed, two faults added to `tools/mutation_check.cjs`. Keep extending the list as reports arrive. |
| 4 | Works in tests, fails on the Mac Carol actually uses | Med | High | Nothing in `results/` from macOS | Run `npm test`, `npm run test:browser` and `probes/real_input.cjs` on the Mac (`docs/RELEASE.md` step 1). Save to `results/mac/`. | Carol | `results/mac/` exists |
| 5 | Shortcut Alt+Shift+S conflicts with another extension or a site, so users think it is broken | Med | Low | Popup says "No keyboard shortcut is set" | The popup already shows the bound key or how to set one. Mention `chrome://extensions/shortcuts` in the listing. | Carol | Listing mentions it |
| 6 | Sites reject synthetic `HTMLElement.click()`, so corrections do nothing on popular sites | High | Med | Compatibility rows with "fail" in `docs/COMPATIBILITY.md` | Run `/site-compat` on 10 harmless public sites before submission. State the limit in the listing (already in the docs). | Carol | 10 dated rows |
| 7 | Users get stuck: assistance on, page misbehaves, no idea how to stop | Low | High | Support requests about turning it off | Escape, popup and shortcut all exist. Have an unfamiliar person install, pause and uninstall without coaching (`docs/RELEASE.md` step 4). | Carol | One unassisted session noted in `docs/PILOT.md` style |
| 8 | No support channel, so the store listing points nowhere and issues pile up | High | Med | Listing form requires a support URL | Use GitHub Issues (templates exist in `.github/ISSUE_TEMPLATE`). Host `docs/PRIVACY.md` at a public URL (GitHub Pages or the repo file URL). | Carol | Both URLs live |
| 9 | Evidence goes stale: a later change ships with 0.1.5 numbers | Med | Med | `results/README.md` version differs from the manifest | `/release` runs `/regen-results` and `/claims-check`. CI runs the browser suite on every push. | Claude session | The release commit includes regenerated `results/` |
| 10 | Overfitting: the press rule was tuned on the same scripted paths it is measured on | High | Med | Any number quoted without "scripted hand" | Keep the caveat everywhere (`probes/README.md` "Reading the numbers"). Collect independent traces through the lab before claiming anything new. | Carol | Pilot traces exist (`docs/PILOT.md`) |
| 11 | A Chrome update changes drag or selection behavior and the quick drag guard stops working silently | Med | Med | CI browser job starts failing on a new Chromium | CI runs the installed-extension suite with the current Playwright Chromium on every push. Pin a scheduled weekly run if the repo goes quiet. | Claude session | Weekly schedule added to `checks.yml` |
| 12 | Privacy questionnaire answered wrongly ("collects website content") | Low | High | Uncertainty filling the form | `disclosure.md` and `docs/PRIVACY.md` state exactly what is processed and stored. Answer "no data collected". Hostnames stay local. | Carol | Form answers copied from PRIVACY.md |
| 13 | AI-use question on a store, competition or class form answered inaccurately | Low | Med | Being asked "was AI used?" | `NOTICE.md` is the accurate answer for the starter, 0.1.4 and 0.1.5 | Carol | Answer quotes NOTICE.md |

## Do these three first

1. **Keep the excluded-action list growing (#3).** A1-1 is fixed in 0.1.5, but any missed consequential label is still the main way the extension itself could cause harm. Add every reported label, with a test.
2. **A Mac run (#4).** Every number today is from Linux. Carol's own machine is the first real platform.
3. **A support URL and a hosted privacy statement (#8).** The store form cannot be completed without them, and both are nearly free with GitHub.
