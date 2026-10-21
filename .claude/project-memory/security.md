# security - OpenSteady Web

- background.js rejects messages whose sender.id is not this extension; control messages must come from chrome-extension://<id>/ui/ pages; content scripts may only ask for their own config (top frame only).
- content.js ignores untrusted events and never reads a page flag; pages can only opt out via data-opensteady-no-assist.
- Extension pages CSP: script-src 'self'; object-src 'none'. i18n renders text nodes only (no innerHTML).
- Risk-label exclusion is not a security boundary (docs say so).
- Report vulnerabilities per SECURITY.md.
