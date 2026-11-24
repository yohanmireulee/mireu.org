"""Write src/img-sizes.json: {"slug/01.webp": [width, height], ...} for the project galleries."""
import json, pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
out = {}
for f in sorted((root / "assets/img").glob("*/*.webp")):
    with Image.open(f) as im:
        out[f"{f.parent.name}/{f.name}"] = list(im.size)
(root / "src/img-sizes.json").write_text(json.dumps(out, indent=0))
print(len(out), "images")
