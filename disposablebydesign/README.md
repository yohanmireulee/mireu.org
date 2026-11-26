# Disposable by Design

A visual essay by Yohan Mireu Lee, served at mireu.org/disposablebydesign.

- `index.html`, `css/dbd.css`: the page
- `src/`: readable source. `content.js` holds every word on the site; `stage.js` is the 3D viewer
  (explode, slow spin, orange outline on the selected part); `main.js` is routing, the essay, the object pages, smooth scrolling (Lenis) and the floating selector; `water.js` is the ocean background shared with the portfolio
- `js/dbd.js`: the built bundle (esbuild of `src/main.js` with three.js)
- `models/`: the five objects as compressed .glb files; each part carries its explode direction in its glTF extras
- `tools/`: the Blender (bpy) scripts that build the models. `iphone2.py`, `macbook2.py` and `model_y2.py` start
  from the supplied shells (Onshape exports in millimetres, rotated to Z up and scaled to metres on export; the
  Model Y source is welded, decimated and sorted panel by panel) and add the modeled internals; `washer.py` and
  `fridge.py` are built entirely from primitives in `lib.py`. The source shells themselves aren't in the repo.
- `img/turn-*.webp`: 36-frame turntable sprites for the selector icons
