# Changelog

## 0.1.5 (2026-10-21)

One change to which controls can be corrected: more consequential actions are now left alone (below). Selection, the press limit, the quick drag guard, the repeat guard and hold to click work exactly as in 0.1.4. The rest of this version is about how you control the extension and how it looks, plus the project's tooling. Measurements are in `results/` and `docs/VALIDATION.md`. They use a scripted hand on Linux in Chromium, not people and not a Mac.

- **More actions are left native.** Buttons and links whose visible label names a consequential action are no longer corrected or activated by hold to click: delete or remove (any form, such as "Deleting"), deactivate, terminate, close account, unfollow, unfriend, block, leave, report, trash, publish, post, repost, book, reserve, bid, subscribe, and add to cart, bag or basket. These words are checked against the label text only, not the link address, so a link to `/post/123` is still eligible. The existing list (delete, pay, submit and others, also checked against addresses) is unchanged. Found in the 0.1.5 audit (`docs/audits/2026-10-21_audit-1.md`, A1-1). Risk matching is still imperfect and is not a security boundary.
- **Keyboard shortcuts.** Alt+Shift+S (Control+Shift+S on a Mac) turns assistance on or off on the current tab, like the popup's enable button. It also resumes a page paused with Escape. A second shortcut, **Pause or resume assistance everywhere**, has no key until you set one at `chrome://extensions/shortcuts`. Pressing a shortcut grants the same temporary access as opening the popup. No permission was added.
- **Outline style.** A new setting under **Settings & privacy**: standard (thin green, as before), bold (thick green), or high contrast (black on a yellow halo, visible on light and dark pages). It changes only how the outline looks.
- **Dark mode and high contrast.** The popup and settings page follow the system's dark mode, keep borders and focus rings in Windows High Contrast (forced colors), and respect reduced motion. Every text and control color pair meets WCAG contrast minimums (`python3 tools/contrast.py`).
- **All text in one catalog.** Every string in the popup, the settings page, the manifest and user-facing errors is in `extension/_locales/en/messages.json`. The settings page reads its version from the manifest. The text is unchanged apart from the new controls. No other language is included.
- **Popup** shows the tab shortcut, or how to set one. A shortcut that cannot act (a browser page, a page Chrome protects, or paused everywhere) puts a red `!` on that tab's icon instead of doing nothing silently. The counters read "Corrections: 1" instead of "1 corrections".
- **Settings page.** Long help folds behind "How this works", **Save** stays on screen while you scroll, and every control is at least 44 px tall (`docs/audits/2026-10-21_accessibility-audit.md`).
- **Fixes in development tools.** `npm run check` no longer fails after `npm install`: it had been checking HTML files inside `node_modules`. The probes now honor `CHROME_EXECUTABLE`, as the browser tests already did.
- **Tests.** 121 unit tests (13 new: shortcuts, outline setting, message catalog, action labels) and 44 installed extension checks (3 new: shortcuts registered, settings page, popup outside a webpage). `tools/mutation_check.cjs` now breaks 63 rules (2 new, for the action labels). The unit tests catch all 63.
- **Measurements.** The trusted-input probe gave exactly the 0.1.4 counts on the same paths (63 of 66 at 8 px, 48 of 66 at 16 px, no wrong clicks), as did the per-trial probes, the benchmark and the deterministic probes. See `docs/VALIDATION.md`.
- **Evidence.** 0.1.4's results moved to `results/0.1.4/`. `results/` was regenerated for this build.
- **Project tooling.** `CLAUDE.md`, `.claude/` (slash commands, review agents, hooks, project memory), GitHub Actions for checks and releases, issue and pull request templates, `CONTRIBUTING.md`, `SECURITY.md`, `HANDOFF.md`, `docs/CONTRACTS.md`, audits in `docs/audits/`, `tools/bump_version.py` and `tools/contrast.py`.

What a steady hand will notice, compared with 0.1.4: near misses and slips on controls labelled with the actions above are no longer corrected. The settings page has two new sections, and the popup has one new line.

## 0.1.4 (2026-10-03)

Fixes for the four behavior problems found by driving 0.1.3 with trusted mouse input, then fixes for what three rounds of independent review of that work found. Measurements are in `docs/REVIEW-RESPONSE.md` and `docs/VALIDATION.md`. All of them use a scripted hand on Linux (in Chromium for the browser runs), not people and not a Mac.

- **Press limit scales with measured shake.** New `core/jitter.js` measures how much the pointer shook in the 0.3 seconds before a press. A press of 0.6 seconds or less may wander three times that, never less than 12 px and never more than 48 px. The limit starts to grow at 4 px of shake.
- **Outline agreement.** A slip that goes further than 12 px, or ends on another control, is corrected only if the outline was on the pressed target when the press landed. A near miss released on the outlined target itself now counts.
- **Quick drag guard, on by default.** Replaces the 0.1.3 setting "Prevent link dragging while clicking (experimental)", which was off by default and blocked every link drag. A drag that begins within 0.5 seconds of a press on an eligible link or button is cancelled so the click can happen. Press, wait half a second, then move still drags. For a hand that is not steady, a quick drag of selected text or an image beside the outlined target is cancelled too. The guard does nothing when the page cancels the drag itself (the press then carries on), and never touches anything a page marks as draggable. After a cancelled drag, a press that went more than 48 px or lasted longer than 1.2 seconds clicks nothing, and a click that lands anywhere other than the pressed control is stopped. The stored setting is now `dragGuard`. The old `linkDragGuard` value is ignored.
- **Selected text no longer switches assistance off.** A steady press (measured shake under 2 px, or not measured) is left alone only when it lands on selected plain text or selects visible text itself. For other hands, selected text is not a reason to stand down. Text selected by a corrected press is removed before the click is delivered. The check for a press that lands on selected text looks only at the character under the pointer, so its cost does not grow with the size of the selection.
- **A working click is never replaced.** When the browser's own click already reaches the chosen control, it is passed through as it is.
- **Alt is no longer advertised as a bypass.** Chrome downloads a link on Alt and click. Escape pauses the page. A click with Shift, Control, Command or Option held is left to the browser.
- **Status report.** The controller's status now includes the measured shake, the allowed distance, whether the hand counted as steady, and the decision for the most recent press, in memory only.
- **Benchmark.** The replay uses the same shake measurement and press rule as the controller (protocol version 2). A test ties the protocol file to the code defaults. The scripted hand accepts a fixed hover time.
- **Probes.** New `probes/` folder: measurements of the installed extension under trusted input, and two checks of the shake meter's limits.
- **Tests.** 108 unit tests and 41 installed extension checks pass on Linux with Chromium 141. The controller only test mode now works on that Chromium as well. New `tools/mutation_check.cjs` breaks 61 rules one at a time and confirms the unit tests notice each one. Not yet run on a Mac.
- **Wording.** "Hold-to-click" is now "hold to click" in the popup, settings and lab.
- **Fault check fix (after release, same day).** On Node 24 the first version of `tools/mutation_check.cjs` could not read the test output and reported every fault as caught. It now forces TAP output, refuses unreadable results, checks the unchanged code first, and includes a control fault that must survive. The extension itself did not change.
- **Credit.** `NOTICE.md`, and its copy in the `extension` folder, state which parts were written with an AI assistant. The credit line in `benchmark/robot.js` is restored.

What a steady hand will notice, compared with 0.1.3: the quick drag guard; selected text no longer switches assistance off for the whole page; a near miss released on the outlined target now counts; a slip of 12 px or less that ends on a neighboring control now goes to the pressed control when the outline agreed; a press that wandered up to 48 px and came back to its control now counts for the repeat guard. See `docs/ARCHITECTURE.md`.

Known limits of the new measurement: it needs the pointer to hover for about a fifth of a second before the press, it reads shake at about 4 cycles a second or slower as smaller than it is, and a deliberate wiggle or a quick correction before a press can measure as shake.

## 0.1.3 (2026-10-02)

- Use one monotonic delivery-time clock for event and timer updates; add a delayed-timestamp regression and six high-rate dwell attempts.
- Add initially-off link drag prevention with explicit Alt/Option bypass, original-link release validation, and rejection of large returning drags after intervention. It does not classify intention.
- Add supplied-review geometry replay, native-link/press-limit evidence, and an explicit account of unresolved press-policy effectiveness. Keep the conservative 12 px redirect limit and optional dwell off initially.

## 0.1.2 (2026-10-02)

- Add optional hold-to-click so an outlined safe target can activate without a physical mouse press. Default countdown is 900 ms, adjustable from 500 to 2,000 ms.
- Show countdown progress in the outline. Require moving 32 px away for 250 ms before allowing another automatic activation; timer stalls cannot finish an old countdown.
- Cancel on manual presses, keyboard input, scrolling, pointer exit, selected text, Alt bypass, or losing focus. Keep form/risk/no-assist/custom-element exclusions and live geometry checks.
- Add a popup toggle, settings controls, in-memory activation count, pure-policy regression checks, and real-controller small-target/jitter, repeat prevention, rearming, and exclusion checks.
- Keep press/release recordings separate from automatic activation. Stop a recording on activation without a physical press. Synthetic press/release results do not measure hold-to-click or human benefit.

## 0.1.1 (2026-10-02)

- Keep clicks in form gaps native; never redirect them to a neighboring target outside the form.
- Exclude custom-element subtrees, exposed shadow hosts, and explicitly marked no-assist targets. This deliberately reduces assistance on component-heavy pages.
- Recheck multi-rectangle layout before delivering a correction.
- When a remembered site's host permission is revoked through browser controls, disable its existing tab sessions and forget that site.
- Global pause sends only the setting it changes, preserving newer selection/repeat settings from another control window.
- Add form/custom-element/no-assist browser checks and permission-revocation regression tests. 40 automated tests and 19 controller checks pass; installed extension integration remains blocked here.

## 0.1.0 (2026-10-02)

- Replace nearest-only stub with temporal smoothing, Gaussian target evidence, hysteresis, acquisition/switch delays, and abstention.
- Add bounded spatial indexing, DOM invalidation, stable IDs, risk exclusions, and live geometry/exposure validation.
- Replace unconditional release takeover with a pure conservative gesture policy applied at click. Track the maximum press excursion to reject drags that return to the start.
- Preserve modifiers, editing, keyboard clicks, native neighboring targets, and unsupported controls. Add optional repeat guard, Alt bypass, Escape pause, global/tab/site controls, and error pause.
- Add opt-in Manifest V3 site access and isolated-world injection; no page-controlled lab trust bypass.
- Add local simulation and explicit trace recording, JSON validation/replay, analysis, source hashes, protocols, browser fixtures, and evaluation/release materials.
- Restrict initial support to top-level documents. Human effectiveness, independent datasets, rival comparisons, external-site compatibility, and store publication remain unestablished.
