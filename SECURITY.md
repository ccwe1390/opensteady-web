# Security policy

## Supported versions

Only the latest version in this repository receives fixes. The extension is not yet published in any store.

## What counts as a security issue

- A webpage that can switch assistance on, change settings, or make the extension deliver a click.
- A way for page script or another extension to send control messages to the service worker.
- Any network request, remote code path, or data written outside `chrome.storage` by the extension.
- A redirect onto a form control, a payment or delete control, an editing field, or a `data-opensteady-no-assist` region.

The risk-label exclusion ("delete", "pay" and similar) is a conservative heuristic, not a security boundary. Missing a label is a bug, not a vulnerability. Report it as an ordinary issue.

## Reporting

Use GitHub's private vulnerability reporting: **Security → Report a vulnerability** on this repository. Include the Chrome version, the extension version, and a minimal local page that reproduces the problem. Don't include personal data.

You should get a reply within 14 days. This is a one-person project, so fixes may take longer.
