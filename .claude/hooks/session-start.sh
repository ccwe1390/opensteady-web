#!/bin/bash
# Prepares a session: installs the pinned dev dependency (Playwright) when missing,
# and tells Claude which Chromium to use. Never downloads browsers.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
if [ ! -d node_modules/playwright ] && command -v npm >/dev/null; then
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund >/dev/null 2>&1 || echo "npm ci failed; browser suites will not run until it succeeds."
fi
chrome=""
for candidate in "${CHROME_EXECUTABLE:-}" /opt/pw-browsers/chromium; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then chrome="$candidate"; break; fi
done
version=$(node -p "require('./extension/manifest.json').version" 2>/dev/null || echo unknown)
echo "OpenSteady Web $version. Read CLAUDE.md and .claude/project-memory/important.md before changing behavior."
if [ -n "$chrome" ]; then
  echo "Chromium for browser suites and probes: CHROME_EXECUTABLE=$chrome"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then echo "export CHROME_EXECUTABLE=$chrome" >> "$CLAUDE_ENV_FILE"; fi
else
  echo "No preinstalled Chromium found. Browser suites need 'npx playwright install chromium' on a local machine."
fi
