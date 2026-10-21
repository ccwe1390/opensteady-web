# tooling - OpenSteady Web

- npm scripts: test, check, benchmark, test:browser, test:review-links, pack.
- tools/: package.py (deterministic ZIPs + SHA256SUMS), icons.py, mutation_check.cjs, bump_version.py, contrast.py.
- .claude/commands: verify, regen-results, probe, release, audit, a11y-audit, review, claims-check, add-setting, site-compat, handoff, remember, premortem.
- .claude/agents: code-reviewer, docs-reviewer, a11y-reviewer.
- .claude/hooks: session-start.sh (npm ci if needed, export CHROME_EXECUTABLE), guard-extension.sh (package check after any edit in extension/).
- CI: .github/workflows/checks.yml, release.yml.
