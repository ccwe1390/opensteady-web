# OpenSteady Web privacy statement

Version 0.1.4 · October 3, 2026

OpenSteady Web has no account, server, analytics, advertising, remote code, or network requests.

On a page you enable, it processes mouse coordinates and timing, control positions, element state, short control labels, and link addresses. Labels and link addresses help exclude actions such as deletion or payment. It does not read input values or record what you type. Key presses are checked only to pause assistance (Escape), to leave a click to the browser (modifier keys), and to stop the hold to click countdown (any key). Keystrokes are not stored.

To measure how much the pointer is shaking, the extension holds the last fraction of a second of pointer positions in memory (at most 0.6 seconds). Older positions are discarded as new ones arrive, and the whole buffer is emptied when you scroll, switch away, or pause. Nothing is gathered while assistance is paused or switched off. These positions are never written to storage and never leave the page.

It stores global settings and the scheme and hostname of sites you explicitly remember using `chrome.storage.local`. Temporary tab enablement uses `chrome.storage.session`, which holds the scheme and hostname of each tab you enabled until the browser closes. It does not retain webpage contents, URLs visited, pointer traces, or clicking history. Diagnostic counts, and a short description of the most recent press (measured shake, allowed distance, and what was decided), remain in the content script's memory until the page reloads. The description of the last press is also cleared whenever settings change. Normal browser synchronization is not used.

Website access starts off. Enable one current tab, or explicitly grant access to a remembered site. Remembered scopes include every port on the same scheme and hostname because Chrome host match patterns do not separate ports. Forgetting a site revokes its remembered grant. The browser may still provide a temporary activeTab grant during the current interaction. Assistance is switched off for that tab either way.

The separate local lab records only after **Start 22-trial recording**. It collects lab pointer coordinates and times, target geometry and intended IDs, observed activations, the browser's user agent (which names the browser and operating system), viewport dimensions, the operator's condition label, and the date and time the recording started. Completed records stay in memory until exported or discarded. The lab does not upload them. Only the person using the lab chooses whether to save or share an export. A downloaded export becomes a normal local file. Deleting it is a separate action.

Use **Clear settings and revoke remembered site access** to erase settings and stored site grants. Reload the page to clear diagnostic counters and lab recordings. Remove the extension to uninstall. This is an experimental accessibility tool and has not established benefit for people with tremor.
