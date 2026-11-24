"""Build the 3:2 carousel tiles in assets/tiles/ from existing gallery images and renders.
Usage: python3 tools/make_tiles.py "<path to Portfolio/Air Towel/Renders>"

crop: centre-crop a landscape image to 3:2 (fx, fy shift the crop window, 0..1).
pad:  fit the whole image to the tile height on a blurred, darkened fill of itself.
lineup: transparent product cutouts side by side on a studio backdrop.
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw

W, H = 1800, 1200
ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
OUT = ROOT / "assets" / "tiles"


def crop(src, fx=0.5, fy=0.5):
    im = Image.open(src).convert("RGB")
    r = W / H
    if im.width / im.height > r:
        cw, ch = round(im.height * r), im.height
    else:
        cw, ch = im.width, round(im.width / r)
    x = round((im.width - cw) * fx)
    y = round((im.height - ch) * fy)
    return im.crop((x, y, x + cw, y + ch)).resize((W, H), Image.LANCZOS)


def pad(src, scale=1.0, dim=0.55):
    im = Image.open(src).convert("RGB")
    bg = crop(src).filter(ImageFilter.GaussianBlur(60))
    bg = ImageEnhance.Brightness(bg).enhance(dim)
    h = round(H * scale)
    w = round(im.width * h / im.height)
    fg = im.resize((w, h), Image.LANCZOS)
    # feather the left/right edges so the join into the blurred fill is invisible
    mask = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(mask)
    feather = max(8, w // 14)
    for i in range(feather):
        a = round(255 * i / feather)
        d.line([(i, 0), (i, h)], fill=a)
        d.line([(w - 1 - i, 0), (w - 1 - i, h)], fill=a)
    bg.paste(fg, ((W - w) // 2, (H - h) // 2), mask)
    return bg


def lineup(paths, height=0.84, gap=0.07):
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    for y in range(H):
        for x in range(0, W, 1):
            dx, dy = (x - W * 0.5) / W, (y - H * 0.42) / H
            v = max(0.0, 1 - (dx * dx * 1.6 + dy * dy * 2.2) ** 0.5 * 1.25)
            c = round(14 + 30 * v)
            px[x, y] = (c, c + 1, c + 3)
    ims = [Image.open(p).convert("RGBA") for p in paths]
    h = round(H * height)
    ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
    total = sum(im.width for im in ims) + gap * W * (len(ims) - 1)
    x = (W - total) / 2
    top = round((H - h) * 0.42)
    for im in ims:
        # soft floor shadow
        sh = Image.new("L", (im.width * 3, 60), 0)
        ImageDraw.Draw(sh).ellipse((im.width * 0.6, 10, im.width * 2.4, 50), fill=120)
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        bg.paste((4, 4, 6), (round(x - im.width), top + h - 30), sh)
        bg.paste(im, (round(x), top), im)
        x += im.width + gap * W
    return bg


def main(at_renders):
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        "air-towel": lambda: lineup([f"{at_renders}/Render{i}.png" for i in (2, 1, 3, 4)]),
        "animal-crossing": lambda: crop(IMG / "animal-crossing/01.webp", 0.5, 0.6),
        "atoms-for-air": lambda: crop(IMG / "atoms-for-air/01.webp", 0.5, 0.5),
        "constellation-shelter": lambda: crop(IMG / "constellation-shelter/01.webp", 0.5, 0.55),
        "dog-scene": lambda: pad(IMG / "dog-scene/01.webp", dim=1.0),
        "kitchen-scene": lambda: crop(IMG / "kitchen-scene/01.webp", 0.5, 0.5),
        "museum-exhibition": lambda: crop(IMG / "museum-exhibition/03.webp", 0.5, 0.5),
        "probable-cause": lambda: pad(ROOT / "tools/sources/probable-cause-cover.webp"),
        "restaurant-rebrand": lambda: pad(IMG / "restaurant-rebrand/04.webp"),
        "schrodingers-american": lambda: crop(IMG / "schrodingers-american/02.webp", 0.5, 0.5),
    }
    for slug, fn in jobs.items():
        fn().save(OUT / f"{slug}.webp", quality=84, method=6)
        print("wrote", slug)


if __name__ == "__main__":
    main(sys.argv[1])
