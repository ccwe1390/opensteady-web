#!/usr/bin/env python3
"""WCAG 2.2 contrast of the extension's UI color pairs, light and dark, and of the on-page outline styles.

Text pairs need 4.5:1 (1.4.3). Borders, focus rings and the outline need 3:1 against what they sit on (1.4.11).
Pairs are listed here by hand from extension/ui/styles.css and extension/content.js; keep them in sync.
Exit status 1 if any pair fails.
"""
import sys


def lum(hex_color):
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    def chan(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (chan(h[i:i + 2]) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


TEXT, UI = 4.5, 3.0
PAIRS = [
    # theme, what, foreground, background, minimum
    ("light", "body text", "#172d36", "#f4f7f5", TEXT),
    ("light", "muted / small text on page", "#53656c", "#f4f7f5", TEXT),
    ("light", "muted text on card", "#53656c", "#ffffff", TEXT),
    ("light", "button text", "#193832", "#ffffff", TEXT),
    ("light", "primary button text", "#ffffff", "#087b63", TEXT),
    ("light", "status text", "#172d36", "#e3efe9", TEXT),
    ("light", "error text", "#a0282b", "#f4f7f5", TEXT),
    ("light", "link", "#076b56", "#f4f7f5", TEXT),
    ("light", "help summary on card", "#076b56", "#ffffff", TEXT),
    ("light", "focus ring vs page", "#1463ac", "#f4f7f5", UI),
    ("light", "checkbox accent vs card", "#087b63", "#ffffff", UI),
    ("dark", "body text", "#e4eeea", "#101a1e", TEXT),
    ("dark", "muted / small text on page", "#a9bcb5", "#101a1e", TEXT),
    ("dark", "muted text on card", "#a9bcb5", "#16242a", TEXT),
    ("dark", "button text", "#e4eeea", "#1b292e", TEXT),
    ("dark", "primary button text", "#ffffff", "#087b63", TEXT),
    ("dark", "status text", "#e4eeea", "#183129", TEXT),
    ("dark", "error text", "#ff9d97", "#101a1e", TEXT),
    ("dark", "link", "#6fd6b8", "#101a1e", TEXT),
    ("dark", "help summary on card", "#6fd6b8", "#16242a", TEXT),
    ("dark", "focus ring vs page", "#7fb8ff", "#101a1e", UI),
    ("dark", "checkbox accent vs card", "#3ccaa3", "#16242a", UI),
    ("outline", "standard/bold green on white page", "#078265", "#ffffff", UI),
    ("outline", "standard/bold green on black page", "#078265", "#000000", UI),
    ("outline", "contrast black on white page", "#000000", "#ffffff", UI),
    ("outline", "contrast yellow halo on black page", "#ffd400", "#000000", UI),
]


def main():
    failed = 0
    print(f"{'theme':8} {'pair':40} {'ratio':>6}  need  result")
    for theme, what, fg, bg, need in PAIRS:
        r = ratio(fg, bg)
        ok = r >= need
        failed += not ok
        print(f"{theme:8} {what:40} {r:6.2f}  {need:>4}  {'ok' if ok else 'FAIL'}")
    print(f"\n{len(PAIRS) - failed} of {len(PAIRS)} pairs meet their minimum.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
