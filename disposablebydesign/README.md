# Disposable by Design

A visual essay by Yohan Mireu Lee, served at mireu.org/disposablebydesign.

- `index.html`, `css/dbd.css`: the page
- `src/`: readable source. `content.js` holds every word on the site; `stage.js` is the 3D viewer
  (explode, slow spin, orange outline on the selected part); `main.js` is routing, the essay, the object pages, step navigation (one scroll, swipe, key or arrow click per step) and the floating selector; `water.js` is the portfolio's ocean background at half speed; `audio.js` plays the portfolio's music plus this site's own UI sounds, each with its own toggle
- `js/dbd.js`: the built bundle (esbuild of `src/main.js` with three.js)
- `models/`: the five objects as compressed .glb files; each part carries its explode direction in its glTF extras
- `tools/`: the Blender (bpy) scripts that build the models. `iphone3.py`, `macbook2.py` and `model_y2.py` start
  from the supplied shells (Onshape exports in millimetres, rotated to Z up and scaled to metres on export; the
  Model Y source is welded, decimated and sorted panel by panel) and add the modeled internals; `washer.py` and
  `fridge.py` are built entirely from primitives in `lib.py`. `pcbkit.py` builds the populated circuit boards. The source shells themselves aren't in the repo.
- `img/turn-*.webp`: 36-frame turntable sprites for the selector icons
- `audio/dbd_*.wav`: UI sounds, synthesized by `tools/make_sounds.py`
