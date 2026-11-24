"""Tone the service portrait (PV2) for the About page.

Crops to the photo, softens the scan grain, opens up the levels, and maps the result onto the
site's cool silver-blue duotone (deep blue-black shadows, pale slate highlights) with a soft
fade at the edges so the print settles into the dark page.
Usage: python3 tools/make_portrait.py <ServicePortrait_PV2.png>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets/img/about/portrait-pv2.webp"
card = Image.open(sys.argv[1]).convert("RGB").crop((150, 196, 1925, 2600))

L = np.asarray(card.convert("L")).astype(np.float32) / 255
Lb = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
L = 0.55 * L + 0.45 * Lb
lo, hi = np.percentile(L, 1.0), np.percentile(L, 99.7)
L = np.clip((L - lo) / (hi - lo), 0, 1)
L = L ** 0.82
L = L * L * (3 - 2 * L) * 0.35 + L * 0.65  # slight S-curve

sh = np.array([7, 13, 21], np.float32)
mid = np.array([92, 112, 128], np.float32)
hl = np.array([214, 226, 234], np.float32)
t = L[..., None]
rgb = np.where(t < 0.5, sh + (mid - sh) * (t / 0.5), mid + (hl - mid) * ((t - 0.5) / 0.5))

h, w = L.shape
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
d = np.sqrt(((xx - w * 0.5) / (w * 0.62)) ** 2 + ((yy - h * 0.42) / (h * 0.66)) ** 2)
v = np.clip(1.15 - d, 0, 1) ** 0.9
rgb = sh + (rgb - sh) * v[..., None]
rng = np.random.default_rng(5)
rgb += rng.normal(0, 2.2, rgb.shape[:2])[..., None]

out = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
out = out.resize((1100, round(1100 * h / w)), Image.LANCZOS)
out.save(OUT, quality=88, method=6)
print(OUT, out.size)
