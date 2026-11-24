"""Tint the black-and-white service portrait (PV2) for the About page.

The scan is a warm, grainy black-and-white print. This lifts it to a clean, natural photo:
grain softened, levels opened up, then each area is hand-tinted from its own brightness the
way old photographs were coloured by hand (skin, Army camouflage, the flag's stripes and
stars, a dark backdrop). The masks below were placed by eye on the cropped photo.
Usage: python3 tools/make_portrait.py <ServicePortrait_PV2.png>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets/img/about/portrait.webp"
src = Image.open(sys.argv[1]).convert("RGB").crop((150, 196, 1925, 2600))
W, H = src.size

# soften the scan grain, keep edges
g = src.convert("L")
soft = g.filter(ImageFilter.GaussianBlur(2.2))
med = g.filter(ImageFilter.MedianFilter(5))
L = (np.asarray(med, np.float32) * 0.55 + np.asarray(soft, np.float32) * 0.45) / 255
lo, hi = np.percentile(L, 0.8), np.percentile(L, 99.8)
L = np.clip((L - lo) / (hi - lo), 0, 1) ** 0.72   # open up the shadows


def mask(poly, blur=26):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([(x * 3, y * 3) for x, y in poly], fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(blur)), np.float32)[..., None] / 255


def ramp(t, stops):
    """Map brightness t (0..1) through colour stops [(pos, (r,g,b)), ...]."""
    t = t[..., None]
    out = np.zeros(t.shape[:2] + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        c0, c1 = np.array(c0, np.float32), np.array(c1, np.float32)
        k = np.clip((t - p0) / (p1 - p0), 0, 1)
        inside = (t >= p0) & (t <= p1)
        out = np.where(inside, c0 + (c1 - c0) * k, out)
    return out / 255


# areas, in thirds-scale coordinates of the cropped photo (591 x 801 preview)
flag = mask([(0, 0), (300, 0), (215, 110), (205, 205), (215, 330), (120, 430), (0, 560)])
canton = mask([(40, 0), (300, 0), (215, 110), (205, 205), (170, 250), (60, 250), (40, 120)], 18)
skin = mask([(212, 190), (380, 190), (382, 250), (365, 300), (352, 335), (348, 372), (300, 390), (252, 372), (245, 330), (228, 295), (214, 250)], 14)
shirt = mask([(255, 360), (345, 360), (300, 465)], 12)
cap = mask([(205, 100), (388, 100), (392, 205), (205, 205)], 10)
body = mask([(100, 405), (170, 372), (250, 350), (300, 470), (350, 350), (430, 372), (500, 400), (512, 801), (88, 801)], 16)
ocp = np.clip(cap + body - shirt, 0, 1)

neutral = ramp(L, [(0, (10, 14, 19)), (0.5, (104, 110, 118)), (1, (226, 230, 233))])
skin_c = ramp(L * 0.92, [(0, (48, 28, 20)), (0.45, (160, 106, 76)), (0.75, (212, 156, 120)), (0.92, (232, 186, 152))])
ocp_c = ramp(L, [(0, (24, 22, 17)), (0.3, (76, 70, 52)), (0.55, (122, 118, 92)), (0.8, (176, 164, 128)), (1, (214, 204, 172))])
shirt_c = ramp(L, [(0, (30, 24, 18)), (0.5, (120, 100, 76)), (1, (200, 178, 148))])
# stripes: dark bands red, light bands white; canton: navy with white stars
t = np.clip((L - 0.2) / 0.45, 0, 1)
stripes = ramp(t, [(0, (70, 18, 24)), (0.45, (150, 40, 46)), (0.75, (196, 188, 182)), (1, (232, 228, 222))]) * (0.55 + 0.6 * L[..., None])
stars = ramp(np.clip((L - 0.25) / 0.5, 0, 1), [(0, (16, 24, 52)), (0.5, (36, 50, 92)), (1, (232, 232, 236))])

c = neutral
c = c * (1 - flag) + stripes * flag
c = c * (1 - canton) + stars * canton
c = c * (1 - ocp) + ocp_c * ocp
c = c * (1 - shirt) + shirt_c * shirt
c = c * (1 - skin) + skin_c * skin
# keep the tint gentle, like a hand-coloured print: blend a little of the neutral back in
c = c * 0.88 + neutral * 0.12

img = Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8))
img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=2))
img = img.resize((1100, round(1100 * H / W)), Image.LANCZOS)
img.save(OUT, quality=88, method=6)
print(OUT, img.size)
