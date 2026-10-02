#!/usr/bin/env python3
"""Create source and store ZIPs with sorted entries and source checksums."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
dist.mkdir(exist_ok=True)
skip = {"node_modules", ".git", "dist", "traces", "__pycache__", "playwright-report", "test-results"}
paths = sorted(p for p in root.rglob("*") if p.is_file() and not any(part in skip for part in p.relative_to(root).parts)
               and p.name not in {".DS_Store"} and not p.name.endswith(".pyc"))
version = json.loads((root / "extension/manifest.json").read_text())["version"]
for scope, name in (([p for p in paths if p.is_relative_to(root / "extension")], f"opensteady-web-extension-{version}.zip"),
                    (paths, f"opensteady-web-{version}.zip")):
    destination = dist / name
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for p in scope:
            relative = p.relative_to(root) if name == f"opensteady-web-{version}.zip" else p.relative_to(root / "extension")
            arcname = "opensteady-web/" + str(relative) if name == f"opensteady-web-{version}.zip" else str(relative)
            info = zipfile.ZipInfo(arcname, date_time=(2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, p.read_bytes())
        if name == f"opensteady-web-{version}.zip":
            store = dist / f"opensteady-web-extension-{version}.zip"
            info = zipfile.ZipInfo("opensteady-web/release/" + store.name, date_time=(2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, store.read_bytes())
    print(destination, destination.stat().st_size, "bytes")
checksums = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dist.glob("*.zip"))}
(dist / "SHA256SUMS.txt").write_text("".join(f"{value}  {name}\n" for name, value in checksums.items()))
