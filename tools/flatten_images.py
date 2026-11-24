"""Give gallery images that have transparent backgrounds a solid backdrop, so they read
properly on the page (a black logo on a transparent background vanishes on the dark site)."""
from pathlib import Path
from PIL import Image
from make_tiles import backdrop

IMG = Path(__file__).resolve().parent.parent / "assets/img"


def flat(name, bg, pad=0.0):
    f = IMG / name
    im = Image.open(f).convert("RGBA")
    if im.getextrema()[3][0] >= 250:
        return
    if pad:
        p = round(min(im.size) * pad)
        big = Image.new("RGBA", (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0))
        big.paste(im, (p, p))
        im = big
    base = bg(im.size).convert("RGBA")
    base.alpha_composite(im)
    base.convert("RGB").save(f, quality=90, method=6)
    print("flattened", name, base.size)


paper = lambda s: Image.new("RGB", s, (239, 233, 221))
navy = lambda s: Image.new("RGB", s, (14, 24, 38))
studio = lambda s: backdrop(*s, lo=(40, 44, 50), hi=(120, 126, 134), cy=0.45)

flat("billiards-rebrand/06.webp", paper, pad=0.08)
flat("constellation-shelter/11.webp", navy, pad=0.06)
flat("schrodingers-american/02.webp", studio)
flat("schrodingers-american/04.webp", studio)
