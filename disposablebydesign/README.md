# Disposable by Design

A visual essay by Yohan Mireu Lee, served at mireu.org/disposablebydesign.

- `index.html`, `css/dbd.css`: the page
- `src/`: readable source. `content.js` holds every word on the site; `stage.js` is the 3D viewer
  (explode, slow spin, orange outline on the selected part); `main.js` is routing, the essay, the object pages and the floating selector
- `js/dbd.js`: the built bundle (esbuild of `src/main.js` with three.js)
- `models/`: the five objects as compressed .glb files; each part carries its explode direction in its glTF extras
- `tools/`: the Blender (bpy) scripts that build the models from primitives
- `img/turn-*.webp`: 36-frame turntable sprites for the selector icons
