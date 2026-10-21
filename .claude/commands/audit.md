---
description: Full code + documentation audit; writes docs/audits/<date>_audit-<n>.md with findings ranked by severity
argument-hint: "[area: code|docs|privacy|permissions|all]"
---
Audit OpenSteady Web (default scope: all) and write `docs/audits/YYYY-MM-DD_audit-N.md`. N is one more than the highest number already there.

Method: read the code. Don't rely on the docs, and don't trust earlier audits. For every finding give:
`ID | severity (critical/high/medium/low/note) | file:line | what happens | concrete failing scenario | suggested fix | status (open/fixed in <commit>)`.

Check at least:
- **Click safety.** Can any path redirect a click to a control the user did not aim at, replace a trusted click, or act on a form, a risky label, editing, or a no-assist region? Trace `content.js`'s click listener through `core/policy.js`.
- **Trust boundary.** Can a page enable assistance, forge config, or trigger a synthetic delivery? Check `background.js` sender checks, the message types in `docs/CONTRACTS.md`, and isolated-world assumptions.
- **Permissions and privacy.** Does the manifest match `docs/RELEASE.md` and `docs/PRIVACY.md`? Is anything written to storage beyond settings and site keys? No network surface.
- **Lifecycle.** Revoked permissions, worker restarts, global pause, Escape, the error pause after 3 errors, and the keyboard shortcuts.
- **Docs vs code.** Every number and rule in README.md, ARCHITECTURE.md, options page text and messages.json against the code constants (12 / 48 px, 0.6 / 1.2 s, 0.5 s drag window, 300 ms repeat, 24 px radius, 6,000 cap, 32 px / 250 ms rearm).
- **Tests.** Is every rule in policy/link-drag/jitter covered by a fault in `tools/mutation_check.cjs`?

Use the `code-reviewer` and `docs-reviewer` agents in parallel for an independent pass, then verify each of their findings yourself before including it. Mark unverified ones "plausible". End with a short "what was not checked" section.
