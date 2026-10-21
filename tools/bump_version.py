#!/usr/bin/env python3
"""Set the release version everywhere it is written. Usage: python3 tools/bump_version.py 0.1.6

Updates extension/manifest.json, package.json, package-lock.json, and the "Version x.y.z"
or "OpenSteady Web x.y.z" lines in START-HERE.md, docs/PRIVACY.md, docs/RELEASE.md
and the fallback version text in extension/ui/options.html.
Historical text (CHANGELOG entries, results/<version>/, REVIEW-RESPONSE) is never touched.
"""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]


def parse(v):
    if not re.fullmatch(r"\d+\.\d+\.\d+", v):
        sys.exit(f"Version must look like 1.2.3, got {v!r}")
    return tuple(int(x) for x in v.split("."))


new = sys.argv[1] if len(sys.argv) == 2 else sys.exit(__doc__)
manifest_path = root / "extension/manifest.json"
manifest = json.loads(manifest_path.read_text())
old = manifest["version"]
if parse(new) <= parse(old):
    sys.exit(f"{new} is not newer than {old}")
changed = []


def write_json(path, update):
    data = json.loads(path.read_text())
    update(data)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    changed.append(path.relative_to(root))


write_json(manifest_path, lambda d: d.__setitem__("version", new))
write_json(root / "package.json", lambda d: d.__setitem__("version", new))
write_json(root / "package-lock.json", lambda d: (d.__setitem__("version", new), d["packages"][""].__setitem__("version", new)))

patterns = [r"(OpenSteady Web )" + re.escape(old) + r"\b", r"(Version )" + re.escape(old) + r"\b", r"(^)" + re.escape(old) + r"( is a source release)"]
for rel in ["START-HERE.md", "docs/PRIVACY.md", "docs/RELEASE.md", "extension/ui/options.html"]:
    path = root / rel
    if not path.exists():
        continue
    text = path.read_text()
    updated = text
    for pattern in patterns:
        updated = re.sub(pattern, lambda m: m.group(1) + new + (m.group(2) if m.lastindex and m.lastindex > 1 else ""), updated, flags=re.M)
    if updated != text:
        path.write_text(updated)
        changed.append(Path(rel))

print(f"{old} -> {new}")
for path in changed:
    print("  updated", path)
print("Next: CHANGELOG section, /regen-results, /claims-check, python3 tools/package.py")
