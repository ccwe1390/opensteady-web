---
description: Prepare a numbered release (version bump, changelog, evidence, packages, checksums) on a branch
argument-hint: "<new version, e.g. 0.1.6>"
---
Prepare release `$ARGUMENTS`. Do not push or tag without asking.

1. Refuse if the working tree is dirty or `$ARGUMENTS` is not greater than the manifest version.
2. `python3 tools/bump_version.py $ARGUMENTS`. It updates the manifest, package.json, package-lock.json and the version lines in docs. Show its list of changed files.
3. Add a `## $ARGUMENTS (date)` section at the top of `CHANGELOG.md`, built from `git log` since the last version. Write it in the existing voice: what changed, what a steady hand will notice, what was not tested.
4. Run `/regen-results`, then `/claims-check`. Fix every mismatch before going on.
5. Update `NOTICE.md` and `extension/NOTICE.md` if Claude wrote code in this release.
6. `python3 tools/package.py`. Then replace the ZIP in `release/` with `dist/opensteady-web-extension-$ARGUMENTS.zip` and delete the old one. List the files in the extension ZIP and confirm that it holds no tests, probes, results or traces.
7. Run `/verify`.
8. Commit as "Release $ARGUMENTS". Tell the user that pushing a tag `v$ARGUMENTS` makes `.github/workflows/release.yml` publish a GitHub Release with the ZIPs and SHA256SUMS. Ask before tagging.
9. Store submission is a manual step for Carol. Point to the acceptance list in `docs/RELEASE.md`. Never claim the build was submitted or approved.
