#!/usr/bin/env python3
"""Rasterize BrokerBoost mark (same geometry/colors as brokerboost-mark.svg) to PNG sizes for social profiles."""
from __future__ import annotations

import os
import struct
from pathlib import Path

from PIL import Image, ImageDraw


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.removeprefix("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(
    c1: tuple[int, int, int], c2: tuple[int, int, int], t: float
) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def gradient_rgb(t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    a, b, c = hex_rgb("#1B4332"), hex_rgb("#2D6A4F"), hex_rgb("#40916C")
    if t <= 0.55:
        return lerp_rgb(a, b, t / 0.55)
    return lerp_rgb(b, c, (t - 0.55) / 0.45)


def svg_t(sx: float, sy: float) -> float:
    """Gradient parameter matching SVG linearGradient BL (0,32) -> TR (32,0)."""
    return (sx - sy + 32.0) / 64.0


def build_mark(size: int) -> Image.Image:
    s = float(size)
    scale = s / 32.0
    r_card = max(1, int(round(8 * scale)))

    grad = Image.new("RGB", (size, size))
    px = grad.load()
    for y in range(size):
        sy = (y + 0.5) * 32.0 / s
        for x in range(size):
            sx = (x + 0.5) * 32.0 / s
            px[x, y] = gradient_rgb(svg_t(sx, sy))

    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, size - 1, size - 1), radius=r_card, fill=255)

    r, g, b = grad.split()
    out = Image.merge("RGBA", (r, g, b, mask))

    dr = ImageDraw.Draw(out)

    def rr(
        x: float,
        y: float,
        w: float,
        h: float,
        rx: float,
        fill: tuple[int, int, int, int],
    ) -> None:
        x0, y0 = int(round(x * scale)), int(round(y * scale))
        x1 = int(round((x + w) * scale)) - 1
        y1 = int(round((y + h) * scale)) - 1
        rad = max(1, int(round(rx * scale)))
        dr.rounded_rectangle((x0, y0, x1, y1), radius=rad, fill=fill)

    rr(6, 19, 5, 7, 1.25, (203, 232, 216, int(round(255 * 0.92))))
    rr(13.5, 14, 5, 12, 1.25, (250, 247, 242, int(round(255 * 0.98))))
    rr(21, 8, 5, 18, 1.25, (196, 149, 106, 255))

    cx, cy = 23.5 * scale, 6.5 * scale
    rad = 1.75 * scale
    dr.ellipse(
        (
            int(round(cx - rad)),
            int(round(cy - rad)),
            int(round(cx + rad)),
            int(round(cy + rad)),
        ),
        fill=(232, 212, 188, 255),
    )

    return out


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    sizes = {
        "brokerboost-social-profile-1080.png": 1080,  # Instagram / general HQ
        "brokerboost-social-profile-512.png": 512,  # Pinterest / X sharp
        "brokerboost-social-profile-400.png": 400,  # X recommended
        "brokerboost-social-profile-180.png": 180,  # Facebook minimum
    }
    for name, dim in sizes.items():
        path = root / name
        img = build_mark(dim)
        img.save(path, "PNG", optimize=True)
        print(path, img.size)


if __name__ == "__main__":
    main()
