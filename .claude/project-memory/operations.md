# operations - OpenSteady Web

- No servers, no backend, no accounts. Nothing to deploy except release ZIPs.
- GitHub: ccwe1390/opensteady-web. Default branch main.
- CI: .github/workflows/checks.yml on push and PR - unit, package check, benchmark, fault check, installed-extension browser suite (Playwright Chromium).
- Releases: push tag vX.Y.Z -> .github/workflows/release.yml builds dist/ ZIPs with tools/package.py and attaches them plus SHA256SUMS.txt to a GitHub Release. Store upload is manual (Carol's developer account).
- Local lab: python3 -m http.server 8000 --bind 127.0.0.1, then http://127.0.0.1:8000/lab/index.html (.claude/launch.json "opensteady-lab").
