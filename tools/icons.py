#!/usr/bin/env python3
"""Generate the project's geometric icon; Pillow is a development tool only."""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parents[1] / "extension" / "icons"
out.mkdir(parents=True, exist_ok=True)
size = 512
image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=110, fill="#087b63")
draw.rounded_rectangle((108, 96, 404, 416), radius=72, outline="#b9dcc9", width=18)
draw.polygon([(191, 157), (191, 347), (232, 310), (271, 374), (306, 353), (269, 290), (325, 282)], fill="#ffffff")
for resolution in (16, 48, 128):
    image.resize((resolution, resolution), Image.Resampling.LANCZOS).save(out / f"icon{resolution}.png")
