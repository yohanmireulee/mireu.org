"""Build the 3:2 carousel tiles in assets/tiles/ from existing gallery images and renders.
Usage: python3 tools/make_tiles.py "<path to Portfolio/Air Towel/Renders>"

crop: centre-crop a landscape image to 3:2 (fx, fy shift the crop window, 0..1).
pad:  fit the whole image to the tile height on a blurred, darkened fill of itself.
lineup: transparent product cutouts side by side on a studio backdrop.
"""
import sys
from pathlib import Path
import numpy as np
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


def backdrop(w, h, lo=(22, 25, 30), hi=(66, 72, 80), cy=0.42):
    """Soft studio backdrop: a radial glow computed in floating point, with fine grain added
    before rounding to 8 bits so the gradient has no visible steps (banding)."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = (x - w * 0.5) / w, (y - h * cy) / h
    v = np.clip(1 - np.sqrt(dx * dx * 1.6 + dy * dy * 2.2) * 1.25, 0, 1) ** 1.4
    lo, hi = np.array(lo, np.float32), np.array(hi, np.float32)
    img = lo + (hi - lo) * v[..., None]
    rng = np.random.default_rng(7)
    img += rng.normal(0, 1.6, (h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(np.round(img), 0, 255).astype(np.uint8))


def place(bg, ims, height, gap, top_frac=0.42, shadow=True):
    """Scale cutouts to a common height and set them side by side, centred, with floor shadows."""
    w, h = bg.size
    hh = round(h * height)
    ims = [im.resize((round(im.width * hh / im.height), hh), Image.LANCZOS) for im in ims]
    total = sum(im.width for im in ims) + gap * w * (len(ims) - 1)
    x = (w - total) / 2
    top = round((h - hh) * top_frac)
    for im in ims:
        if shadow:
            sh = Image.new("L", (im.width * 3, 80), 0)
            ImageDraw.Draw(sh).ellipse((im.width * 0.55, 14, im.width * 2.45, 66), fill=110)
            sh = sh.filter(ImageFilter.GaussianBlur(18))
            bg.paste((8, 9, 12), (round(x - im.width), top + hh - 40), sh)
        bg.paste(im, (round(x), top), im)
        x += im.width + gap * w
    return bg


def lineup(paths, height=0.84, gap=0.07):
    return place(backdrop(W, H), [Image.open(p).convert("RGBA") for p in paths], height, gap)


def main(at_renders):
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = {
        "air-towel": lambda: lineup([f"{at_renders}/Render{i}.png" for i in (2, 1, 3, 4)]),
        "animal-crossing": lambda: crop(IMG / "animal-crossing/01.webp", 0.5, 0.6),
        "atoms-for-air": lambda: crop(IMG / "atoms-for-air/01.webp", 0.5, 0.5),
        "constellation-shelter": lambda: crop(IMG / "constellation-shelter/01.webp", 0.5, 0.55),
        # dog-scene: rendered at 3:2 from Dog Scene/3D Files/dog6.blend (EEVEE, lens 75 mm)
        "kitchen-scene": lambda: crop(IMG / "kitchen-scene/01.webp", 0.5, 0.5),
        "museum-exhibition": lambda: crop(IMG / "museum-exhibition/03.webp", 0.5, 0.5),
        "probable-cause": lambda: crop(IMG / "probable-cause/01.webp", 0.5, 0.5),
        "billiards-rebrand": lambda: crop(IMG / "billiards-rebrand/04.webp", 0.5, 0.5),
        "schrodingers-american": lambda: crop(ROOT / "tools/sources/schrodingers-cover.webp", 0.5, 0.5),
    }
    only = sys.argv[2:]
    for slug, fn in jobs.items():
        if only and slug not in only:
            continue
        fn().save(OUT / f"{slug}.webp", quality=90, method=6)
        print("wrote", slug)


if __name__ == "__main__":
    main(sys.argv[1])
