# OpenSteady Web privacy statement

Version 0.1.0 · October 2, 2026

OpenSteady Web has no account, server, analytics, advertising, remote code, or network requests.

On a page you enable, it processes mouse coordinates and timing, control positions, element state, and short control labels. Labels help exclude actions such as deletion or payment. It does not read input values or record what you type. Recovery keys are checked only to bypass or pause assistance; keystrokes are not stored.

It stores global settings and the scheme/hostname of sites you explicitly remember using `chrome.storage.local`. Temporary tab enablement uses `chrome.storage.session`. It does not retain webpage contents, URLs visited, pointer traces, or clicking history. Diagnostic counts remain in the content script's memory until the page reloads. Normal browser synchronization is not used.

Website access starts off. Enable one current tab, or explicitly grant access to a remembered site. Remembered scopes include every port on the same scheme and hostname because Chrome host match patterns do not separate ports. Forgetting a site revokes its remembered grant; the browser may still provide a temporary activeTab grant during the current interaction. Assistance is switched off for that tab either way.

The separate local lab records only after **Start recording**. It collects lab pointer coordinates/times, target geometry and intended IDs, observed activations, browser identifier, viewport dimensions, and the operator's condition label. Completed records stay in memory until exported or discarded. The lab does not upload them. Only the person using the lab chooses whether to save or share an export. A downloaded export becomes a normal local file; deleting it is a separate action.

Use **Clear settings and revoke remembered site access** to erase settings and stored site grants. Reload the page to clear diagnostic counters and lab recordings. Remove the extension to uninstall. This is an experimental accessibility tool and has not established benefit for people with tremor.
