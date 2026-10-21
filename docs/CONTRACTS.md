# Contracts

This describes version 0.1.5. It lists every message, stored key and setting that the parts of the extension exchange. If you change one, change this file, `extension/background.js`, and the tests named here together.

## Who may send what

| Sender | Recognized by | May send |
|---|---|---|
| Extension pages (popup, settings) | `sender.id` is this extension and `sender.url` starts with `chrome-extension://<id>/ui/` | `get-settings`, `save-settings`, `clear-settings`, `tab-status`, `set-tab`, `remember-site` |
| Content script, top frame | `sender.id` is this extension, `sender.tab` set, `sender.frameId === 0` | `content-config` only |
| Content script, any other frame | as above with `frameId !== 0` | nothing (`Top-level pages only.`) |
| Anything else | `sender.id` differs | nothing (`Unsupported sender.`) |
| Keyboard shortcut | `chrome.commands.onCommand` | `toggle-tab`, `pause-everywhere` (not a message, see below) |

A webpage cannot reach the service worker. The manifest declares no `externally_connectable`. Page script runs in the main world, and the content script runs in the isolated world. Tests: `test/background.test.cjs` "content scripts can obtain their own config but cannot mutate controls".

## Messages to the service worker

Every reply is either the result below or `{ error: string }`. User-facing errors come from `_locales/en/messages.json` when the browser provides `chrome.i18n`.

| `type` | Request fields | Reply | Effect |
|---|---|---|---|
| `get-settings` | none | `{ settings }` | none |
| `save-settings` | `settings`: any subset of `enabled`, `mode`, `doubleGuard`, `radius`, `dwellEnabled`, `dwellMs`, `dragGuard`, `outline` | `{ settings }` (normalized) | Merges the allowed keys over the stored settings, normalizes, saves, resynchronizes registered scripts and every tab's config. Other keys are dropped. |
| `clear-settings` | none | `{ ok: true }` | Clears local and session storage, removes every granted http/https origin, resynchronizes. |
| `tab-status` | `tabId` | `{ site, remembered, config, status }` | `status` is the content script's status report, or `null` if no script answers. |
| `set-tab` | `tabId`, `enabled` | `{ ok: true }` | When `enabled` is true, injects first (fails on protected pages), then stores `tab:<id>` in session storage and sends `configure` with `resume: true`. |
| `remember-site` | `tabId`, `enabled` | `{ ok: true }` | Enabling needs the origin already granted (the popup asks with `chrome.permissions.request`). Disabling also switches off every tab on that site and removes the grant. |
| `content-config` | none (content script) | `{ config }` | The effective config for the sender's tab. |

`config` is the normalized settings without `sites`, with `enabled` true only when the global switch is on and this tab or remembered site is on.

## Messages to the content script

Sent with `{ frameId: 0 }`. The content script ignores messages from other extensions.

| `type` | Fields | Reply |
|---|---|---|
| `configure` | `config`, `resume` | `{ ok: true }`. `resume: true` clears an Escape pause. |
| `status` | none | The status report: `enabled`, `paused`, `config`, `counters`, `index`, `dwell`, `outlineReady`, `outlineAgeMs`, `selectionReason`, `lastPress`, `lastDecision`. |

The content script also listens to `chrome.storage.onChanged` and asks for `content-config` again, so a script already injected picks up changes made in another window.

## Keyboard shortcuts (new in 0.1.5)

| Command | Default | Behavior |
|---|---|---|
| `toggle-tab` | Alt+Shift+S (Control+Shift+S on a Mac) | Same as the popup's enable / turn off button for the active tab. Pressing it grants `activeTab`. Does nothing on non-http(s) pages or while paused everywhere. A page paused with Escape is resumed. |
| `pause-everywhere` | none | Flips the global `enabled` setting. Every other setting is kept. |

Failures (for example a page Chrome does not allow scripts on) are swallowed. The badge does not change. Tests: `test/background.test.cjs` "toggle-tab shortcut ...", "pause-everywhere shortcut ...". The browser check "keyboard shortcuts are registered ..." confirms the descriptions and default key in Chromium.

## Storage

| Area | Key | Value |
|---|---|---|
| `chrome.storage.local` | `settings` | Normalized settings (below), including `sites`: sorted, deduplicated `scheme://hostname` strings, at most 200 |
| `chrome.storage.session` | `tab:<tabId>` | `{ site, enabled }`. Removed when the tab closes. |

Nothing else is stored. `chrome.storage.sync` is not used.

## Settings

Source of truth: `extension/core/settings.js` `normalizeSettings`. Junk values fall back to the default.

| Key | Type | Default | Bounds |
|---|---|---|---|
| `enabled` | boolean | true | anything but `false` is true |
| `sites` | string[] | [] | http/https only, ports dropped, at most 200 |
| `mode` | `'stable'` or `'nearest'` | `'stable'` | other values become `'stable'` |
| `doubleGuard` | boolean | true | anything but `false` is true |
| `radius` | number (px) | 24 | 8 to 32 |
| `dwellEnabled` | boolean | false | only `true` is true |
| `dwellMs` | number (ms) | 900 | 500 to 2000 |
| `dragGuard` | boolean | true | anything but `false` is true. The 0.1.3 key `linkDragGuard` is ignored. |
| `outline` | `'standard'`, `'bold'` or `'contrast'` | `'standard'` | other values become `'standard'`. Appearance only (0.1.5). |

## Page opt-out

A page may mark any container with `data-opensteady-no-assist`. Nothing inside it is outlined, corrected, or activated by hold to click. Pages cannot opt in or change settings.

## Message catalog

Every user-visible string in `extension/ui/*` and the manifest is a key in `extension/_locales/en/messages.json`. HTML elements carry `data-i18n="key"` and keep the English text as a fallback. `[[Key]]` in a message is rendered as `<kbd>Key</kbd>` without parsing HTML. `test/i18n.test.cjs` checks that keys exist, placeholders match, the fallback text equals the catalog, the store description is 132 characters or fewer, and no message is unused.
