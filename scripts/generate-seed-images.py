#!/usr/bin/env python3
"""
Generate clearly-labelled illustrative sample photographs for the development
seed. These are NOT real bus photographs; they exist so that a fresh demo
account has something in the photo archive.

Usage:
    python scripts/generate-seed-images.py [output_dir]

Then:
    SEED_PHOTOS_DIR=seed-photos pnpm seed
"""
from __future__ import annotations

import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT = 1400, 933

PALETTES = [
    ((14, 25, 43), (26, 54, 88), (33, 96, 186), (240, 244, 250), "1204", "25"),
    ((34, 29, 24), (71, 53, 38), (196, 138, 56), (250, 246, 238), "8102", "R4"),
    ((21, 32, 33), (43, 64, 63), (32, 128, 120), (238, 245, 243), "2501", "49"),
    ((31, 24, 38), (57, 40, 66), (150, 78, 130), (247, 240, 246), "2519", "100"),
    ((20, 26, 36), (38, 48, 62), (204, 76, 62), (248, 241, 238), "3401", "N19"),
    ((23, 28, 25), (40, 52, 45), (120, 152, 90), (242, 246, 236), "2140", "14"),
    ((19, 33, 44), (30, 57, 72), (70, 150, 190), (240, 248, 250), "601", "250"),
    ((32, 27, 20), (55, 45, 33), (212, 160, 68), (252, 247, 238), "1601", "N19"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), top)
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        ratio = y / max(1, HEIGHT - 1)
        colour = tuple(int(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3))
        draw.line([(0, y), (WIDTH, y)], fill=colour)
    return image


def add_map_lines(image: Image.Image, accent: tuple[int, int, int], seed: int) -> None:
    rng = random.Random(seed)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for _ in range(9):
        start_x = rng.randint(-200, WIDTH)
        start_y = rng.randint(0, HEIGHT)
        points = [(start_x, start_y)]
        x, y = start_x, start_y
        for _ in range(4):
            x += rng.choice([-1, 1]) * rng.randint(120, 280)
            y += rng.choice([-1, 1]) * rng.randint(40, 160)
            points.append((x, y))
        draw.line(points, fill=(*accent, 26), width=rng.choice([2, 3, 5]))
    layer = layer.filter(ImageFilter.GaussianBlur(1.2))
    image.paste(layer, (0, 0), layer)


def rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_bus(
    image: Image.Image,
    body: tuple[int, int, int],
    light: tuple[int, int, int],
    fleet: str,
    route: str,
    seed: int,
    variant: int,
) -> None:
    rng = random.Random(seed)
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    # Ground shadow
    draw.ellipse((150, 790, 1250, 850), fill=(0, 0, 0, 90))

    x0 = 130 + (variant % 3) * 40
    y0 = 330
    x1 = 1270 - (variant % 2) * 60
    y1 = 745
    radius = 42 if variant % 2 == 0 else 26

    rounded_rect(draw, (x0, y0, x1, y1), radius, fill=(*body, 255))

    # Lower skirt and livery stripe
    draw.rectangle((x0 + 6, y1 - 74, x1 - 6, y1 - 8), fill=(0, 0, 0, 46))
    stripe_y = y0 + 196
    draw.rectangle((x0 + 10, stripe_y, x1 - 10, stripe_y + 22), fill=(*light, 235))

    # Windows
    window_top = y0 + 58
    window_bottom = y0 + 170
    window_width = 96
    gap = 26
    start = x0 + 96
    count = 7 if variant % 2 == 0 else 6
    for index in range(count):
        left = start + index * (window_width + gap)
        if left + window_width > x1 - 80:
            break
        rounded_rect(
            draw,
            (left, window_top, left + window_width, window_bottom),
            10,
            fill=(12, 24, 38, 235),
            outline=(*light, 70),
            width=2,
        )
        draw.line(
            [(left + 12, window_top + 16), (left + window_width - 18, window_top + 8)],
            fill=(255, 255, 255, 28),
            width=3,
        )

    # Windscreen at the front
    rounded_rect(
        draw,
        (x1 - 96, window_top - 6, x1 - 26, window_bottom + 14),
        12,
        fill=(8, 18, 30, 240),
        outline=(*light, 80),
        width=2,
    )

    # Destination / route board
    rounded_rect(draw, (x0 + 26, y0 - 34, x0 + 250, y0 + 30), 8, fill=(10, 14, 20, 235))
    draw.text((x0 + 42, y0 - 28), route, font=font(40, True), fill=(*light, 245))
    draw.text((x0 + 130, y0 - 22), "SAMPLE", font=font(22, True), fill=(255, 255, 255, 120))

    # Headlight and tail light
    draw.ellipse((x1 - 86, y1 - 132, x1 - 50, y1 - 96), fill=(255, 214, 140, 235))
    draw.ellipse((x0 + 22, y1 - 132, x0 + 50, y1 - 104), fill=(210, 70, 60, 220))

    # Wheels
    wheel_centres = [x0 + 210, x1 - 240]
    if variant % 2 == 0:
        wheel_centres.insert(1, (x0 + x1) // 2 - 20)
    for centre in wheel_centres:
        draw.ellipse((centre - 74, 690, centre + 74, 838), fill=(12, 14, 18, 255))
        draw.ellipse((centre - 42, 722, centre + 42, 806), fill=(90, 96, 104, 255))
        draw.ellipse((centre - 16, 748, centre + 16, 780), fill=(28, 30, 36, 255))

    # Windows reflection smear
    reflection = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    reflection_draw = ImageDraw.Draw(reflection)
    reflection_draw.polygon(
        [
            (x0 + 120, window_top),
            (x0 + 300, window_top),
            (x0 + 140, window_bottom),
            (x0 + 40, window_bottom),
        ],
        fill=(255, 255, 255, 26),
    )
    layer = Image.alpha_composite(layer, reflection)
    draw = ImageDraw.Draw(layer)

    # Fleet number plate
    plate_width = 210
    rounded_rect(
        draw,
        (WIDTH - plate_width - 52, 60, WIDTH - 52, 156),
        10,
        fill=(8, 12, 18, 205),
    )
    draw.text(
        (WIDTH - plate_width - 30, 74),
        fleet,
        font=font(54, True),
        fill=(*light, 245),
    )

    image.paste(layer, (0, 0), layer)


def add_texture(image: Image.Image, seed: int) -> None:
    rng = random.Random(seed)
    noise = Image.new("L", (WIDTH, HEIGHT))
    pixels = noise.load()
    for y in range(0, HEIGHT, 2):
        for x in range(0, WIDTH, 2):
            value = rng.randint(0, 255)
            pixels[x, y] = value
            if x + 1 < WIDTH:
                pixels[x + 1, y] = value
            if y + 1 < HEIGHT:
                pixels[x, y + 1] = value
                if x + 1 < WIDTH:
                    pixels[x + 1, y + 1] = value
    noise = noise.filter(ImageFilter.GaussianBlur(0.6))
    image.paste(Image.new("RGB", (WIDTH, HEIGHT), (255, 255, 255)), (0, 0), noise.point(lambda p: int(p * 0.035)))


def main() -> None:
    output = sys.argv[1] if len(sys.argv) > 1 else os.path.join("seed-photos")
    os.makedirs(output, exist_ok=True)

    for index, (top, bottom, accent, light, fleet, route) in enumerate(PALETTES):
        image = gradient(top, bottom)
        add_map_lines(image, accent, index)
        draw_bus(image, accent, light, fleet, route, index, index)
        add_texture(image, index)

        draw = ImageDraw.Draw(image)
        draw.text((56, HEIGHT - 96), "ILLUSTRATIVE SAMPLE", font=font(26, True), fill=(*light, 120))
        draw.text(
            (56, HEIGHT - 62),
            "Generated for the TransitSpotter development seed - not a real photograph.",
            font=font(20),
            fill=(*light, 90),
        )

        path = os.path.join(output, f"sample-{index + 1:02d}-{fleet}.jpg")
        image.save(path, "JPEG", quality=88, optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
