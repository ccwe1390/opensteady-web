# disclosure - OpenSteady Web

What exists and where it may go:
- Settings and remembered hostnames: chrome.storage.local on the user's machine. Never synced (storage.sync unused).
- Tab enablement: chrome.storage.session until browser closes.
- Pointer positions: up to 0.6 s in content-script memory, discarded continuously.
- Counters and last-press description: content-script memory until reload.
- Lab recordings: in page memory until the user exports a JSON file. The lab never uploads.
- Bug reports: must not contain passwords, private URLs, medical details or traces unless the reporter opts in (docs/RELEASE.md "Maintenance"; .github issue templates repeat this).
- Repo: public-facing content only. Never commit participant traces (traces/ is gitignored).
