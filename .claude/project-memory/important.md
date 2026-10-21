# important - OpenSteady Web

> Critical facts: getting one wrong is irreversible or expensive, invalidates
> results, or breaks a store or permission constraint. Numbered, dated, newest
> last. CLAUDE.md wins on conflict. Never remove an entry without telling Carol.
> Keep entries short; detail lives in the topic bin. ASCII only.

## 1. Not a medical device; no benefit established (2026-10-21)
**What:** No person with tremor has used any build. All evidence is a scripted hand on Linux in Chromium.
**Constrains:** No text, store listing or UI may say it helps, works for, or improves accuracy for people. Say "scripted hand" next to every measured number.
**Why:** A false benefit claim misleads vulnerable users and can fail store review.
**Source:** README.md, docs/VALIDATION.md, extension/ui/options.html ("Benefit for people with tremor has not been established").

## 2. No network, remote code or telemetry, ever (2026-10-21)
**What:** The extension makes no network requests and runs no remote code.
**Constrains:** `npm run check` fails on fetch/XHR/WebSocket/sendBeacon/eval in extension/. Privacy statement and store answers depend on this.
**Why:** It is the whole privacy promise (docs/PRIVACY.md). Breaking it silently makes published statements false.
**Source:** test/check.cjs, docs/PRIVACY.md.

## 3. Permissions are fixed: activeTab, scripting, storage + optional hosts (2026-10-21)
**What:** No mandatory host permission. A site grant is requested only by "Always enable on this site".
**Constrains:** Adding any permission needs Carol's OK and a store justification. test/check.cjs asserts the exact list.
**Why:** A new permission triggers re-review and a scarier install prompt; existing users get the extension disabled until they accept.
**Source:** extension/manifest.json, docs/RELEASE.md "Permission explanations".

## 4. A working click is never replaced; pointerdown/up never touched (2026-10-21)
**What:** If the browser's own click reaches the chosen control, it passes through. Correction happens only at the final click.
**Constrains:** Any change to content.js click handling needs unit, browser and mutation coverage.
**Why:** Synthetic clicks are untrusted and some sites reject them; replacing a trusted click can break a page that worked.
**Source:** docs/ARCHITECTURE.md "Gesture policy".

## 5. Numbers in docs must come from results/ of the same version (2026-10-21)
**What:** results/ holds the evidence for the current version; results/<old>/ holds history.
**Constrains:** Behavior change -> /regen-results -> /claims-check before editing numbers. Never present an archived number as current.
**Why:** The project's credibility rests on every number being reproducible.
**Source:** results/README.md; this session archived 0.1.4 evidence to results/0.1.4/.

## 6. Settings keys are a stored contract (2026-10-21)
**What:** Stored settings pass through normalizeSettings. `dragGuard` replaced `linkDragGuard` in 0.1.4 (old key ignored). `outline` added in 0.1.5.
**Constrains:** Renaming a key silently resets users to the default. Add, don't rename; document any migration.
**Source:** extension/core/settings.js, CHANGELOG.md.

## 7. AI credit must stay accurate (2026-10-21)
**What:** NOTICE.md and extension/NOTICE.md state which parts Claude wrote.
**Constrains:** Update both in the same commit as any Claude-written change.
**Why:** Carol uses it to answer competition/class/application questions about AI use.
**Source:** NOTICE.md.

## 8. Keyboard shortcut default: Alt+Shift+S (MacCtrl+Shift+S on Mac) (2026-10-21)
**What:** 0.1.5 adds `toggle-tab` (with that default) and `pause-everywhere` (no default) commands.
**Constrains:** Changing a suggested_key does not affect existing installs; users rebind at chrome://extensions/shortcuts. Option+Shift+S on Mac would have eaten a typed character, hence MacCtrl.
**Source:** extension/manifest.json, extension/background.js runCommand.
