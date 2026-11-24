"""Render the PDF booklets into single-page images for the page-turning viewer.
Usage: python3 tools/make_books.py <rulebook.pdf> <schrodinger-booklet.pdf>
Spreads (pages twice as wide as tall) are split into their left and right pages."""
import subprocess, sys, tempfile, shutil
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets/book"


def build(pdf, slug, dpi, height):
    out = OUT / slug
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", str(dpi), "-png", pdf, f"{tmp}/p"], check=True)
        pages = []
        for f in sorted(Path(tmp).glob("p-*.png"), key=lambda p: int(p.stem.split("-")[1])):
            im = Image.open(f).convert("RGB")
            if im.width > im.height * 1.2:  # a two-page spread
                half = im.width // 2
                pages += [im.crop((0, 0, half, im.height)), im.crop((half, 0, im.width, im.height))]
            else:
                pages.append(im)
        for i, im in enumerate(pages, 1):
            im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
            im.save(out / f"{i:02d}.webp", quality=86, method=6)
        print(slug, len(pages), "pages", pages[0].size)


build(sys.argv[1], "probable-cause", 160, 1300)
build(sys.argv[2], "schrodingers-american", 150, 1300)
