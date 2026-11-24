# mireu.org

Portfolio site for Yohan Mireu Lee, served by GitHub Pages from the `main` branch.

## What's where

- `index.html`: the page shell (header, menu, home footer)
- `css/site.css`: styles. The type scale, page edges and menu geometry follow zenobasi.com
- `src/`: the readable source
  - `main.js`: routing (`#/`, `#/about`, `#/contact`, `#/<project>`), header, menu, project pages
  - `carousel.js`: the home carousel (ring bend, edge bokeh, chromatic aberration, grain, physics)
  - `water.js`: the animated dark-water background
  - `viewer.js`: the 3D model viewer on project pages
  - `audio.js`: UI sounds and music (UI sound on and music off by default)
  - `projects.js`: project write-ups, gallery layout and viewer settings, in carousel order
- `js/app.js`: the built bundle the page loads (made from `src/` plus three.js; don't edit by hand)
- `assets/tiles/`: 3:2 carousel tiles (`tools/make_tiles.py` rebuilds them)
- `assets/models/`: one compressed 3D model per project (.glb)
- `assets/img/<project>/`: gallery images, numbered in page order
- `assets/audio/`: Kenney Interface Sounds (CC0) and the music track

## Changing the code

```
npm install
npm run build    # rebuilds js/app.js from src/
```

Commit `js/app.js` along with the source. GitHub Pages serves the files as they are, with no build step on its side.
