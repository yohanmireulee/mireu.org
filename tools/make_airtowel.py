"""Build the Air Towel gallery panels in assets/img/air-towel/ from the transparent renders.
Usage: python3 tools/make_airtowel.py "<path to Portfolio/Air Towel/Renders>"

01: the handheld unit from four sides; 02: the unit, wall dock and charger together;
03: the two cut-away sections laid on their side so the internals read at full width.
"""
import sys
from pathlib import Path
from PIL import Image
from make_tiles import backdrop, place

OUT = Path(__file__).resolve().parent.parent / "assets/img/air-towel"


def main(src):
    r = lambda n: Image.open(f"{src}/{n}.png").convert("RGBA")
    for old in OUT.glob("*.webp"):
        old.unlink()
    a = place(backdrop(2400, 1600), [r(f"Render{i}") for i in (2, 1, 3, 4)], 0.84, 0.07)
    b = place(backdrop(2400, 1600), [r("Render6"), r("Render7"), r("Render5")], 0.84, 0.06)
    # sections: rotate so the nozzle points right, stack the two with room between them
    secs = [r("Internal").rotate(90, expand=True), r("Profile_View").rotate(90, expand=True)]
    c = backdrop(2400, 1000, cy=0.5)
    w = 2200
    secs = [s.resize((w, round(s.height * w / s.width)), Image.LANCZOS) for s in secs]
    gap = 110
    y = (c.height - sum(s.height for s in secs) - gap) // 2
    for s in secs:
        c.paste(s, ((c.width - w) // 2, y), s)
        y += s.height + gap
    for i, im in enumerate((a, b, c), 1):
        im.save(OUT / f"{i:02d}.webp", quality=90, method=6)
        print("wrote", i, im.size)


if __name__ == "__main__":
    main(sys.argv[1])
