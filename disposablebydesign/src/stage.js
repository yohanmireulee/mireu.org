// One WebGL canvas for the whole site. It holds one object at a time, explodes it by an amount the
// page sets from scroll, spins it slowly on its own clock, and outlines whichever parts are selected.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const ORANGE = new THREE.Color('#D2451E');
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export function createStage(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.0;
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0xd9d6cf, 0.5);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
  const pivot = new THREE.Group();          // spins
  scene.add(pivot);

  const outlineMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: ORANGE }, px: { value: 2.6 }, res: { value: new THREE.Vector2(1, 1) }, alpha: { value: 0 } },
    vertexShader: `
      uniform float px; uniform vec2 res;
      attribute vec3 smoothN;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * smoothN);
        vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
        float l = length(d);
        if (l > 1e-5) clip.xy += d / l * px * 2.0 / res * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: `uniform vec3 color; uniform float alpha; void main(){ gl_FragColor = vec4(color, alpha);
      #include <colorspace_fragment>
    }`,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  const state = {
    obj: null, parts: [], byName: new Map(), explode: 0, explodeTarget: 0,
    view: { pitch: 0.4, spin: 0.12, ex: 1, yaw: 0 }, yaw: 0, dragYaw: 0, dragPitch: 0,
    selected: new Set(), sel: 0, offsetX: 0, offsetY: 0, visible: 1, visibleTarget: 1,
    fit: { c0: new THREE.Vector3(), r0: 1, c1: new THREE.Vector3(), r1: 1 }, focus: new THREE.Vector3(), focusW: 0,
    reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    outlineMat.uniforms.res.value.set(w, h);
    applyOffset();
  }
  function applyOffset() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.setViewOffset(w, h, -state.offsetX * w, state.offsetY * h, w, h);
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- loading
  async function load(url) {
    if (!cache.has(url)) cache.set(url, loader.loadAsync(url).then((g) => prepare(g.scene)));
    return cache.get(url);
  }

  function prepare(root) {
    const parts = [];
    root.children.slice().forEach((node) => {
      const e = node.userData.explode || [0, 0, 0];
      const meshes = [];
      node.traverse((m) => {
        if (!m.isMesh) return;
        m.material = m.material.clone();
        const mt = m.material;
        mt.side = THREE.DoubleSide;
        mt.userData.baseOpacity = mt.opacity;
        mt.userData.baseTransparent = mt.transparent;
        if (mt.name && /glass|clear plastic|light lens/i.test(mt.name)) { mt.envMapIntensity = 0.75; mt.roughness = Math.min(mt.roughness, 0.08); }
        meshes.push(m);
      });
      parts.push({
        name: node.name, node, meshes, home: node.position.clone(),
        dir: new THREE.Vector3(e[0], e[2], -e[1]), ghost: 1, outline: null,
      });
    });
    // centre the assembled object on the origin, resting on y = 0
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    return { root, parts };
  }

  function measure(ex) {
    const b = new THREE.Box3();
    state.parts.forEach((p) => {
      p.node.position.copy(p.home).addScaledVector(p.dir, ex);
      p.node.updateMatrixWorld(true);
    });
    state.obj.updateMatrixWorld(true);
    // measure in the object's own frame (ignoring spin)
    const saved = pivot.rotation.y; pivot.rotation.y = 0; pivot.updateMatrixWorld(true);
    b.setFromObject(state.obj);
    pivot.rotation.y = saved; pivot.updateMatrixWorld(true);
    const s = b.getBoundingSphere(new THREE.Sphere());
    return { c: s.center, r: s.radius };
  }

  async function show(url, view) {
    const { root, parts } = await load(url);
    if (state.obj) pivot.remove(state.obj);
    state.obj = root;
    state.parts = parts;
    state.byName = new Map(parts.map((p) => [p.name, p]));
    pivot.add(root);
    state.view = { pitch: 0.4, spin: 0.12, ex: 1, yaw: 0, ...view };
    state.yaw = state.view.yaw; state.dragYaw = 0; state.dragPitch = 0;
    const a = measure(0), b = measure(state.view.ex);
    state.fit = { c0: a.c, r0: a.r, c1: b.c, r1: b.r };
    state.explode = state.explodeTarget;
    select([]);
    parts.forEach((p) => { p.ghost = 1; setGhost(p, 1); });
    return root;
  }

  // ---------------------------------------------------------------- selection
  function outlineFor(p) {
    if (p.outline) return p.outline;
    p.outline = p.meshes.map((m) => {
      const pos = m.geometry.attributes.position, idx = m.geometry.index;
      // smooth normals welded across hard edges, so the hull doesn't crack open at corners
      const keyOf = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
      const keys = new Array(pos.count), acc = new Map();
      for (let i = 0; i < pos.count; i++) { keys[i] = keyOf(i); if (!acc.has(keys[i])) acc.set(keys[i], new THREE.Vector3()); }
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const tri = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < tri; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
        const n = b.sub(a).cross(c.sub(a));
        acc.get(keys[i0]).add(n); acc.get(keys[i1]).add(n); acc.get(keys[i2]).add(n);
      }
      const sn = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { const n = acc.get(keys[i]).clone().normalize(); sn[i * 3] = n.x; sn[i * 3 + 1] = n.y; sn[i * 3 + 2] = n.z; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', pos);
      geo.setAttribute('smoothN', new THREE.BufferAttribute(sn, 3));
      if (idx) geo.setIndex(idx);
      const o = new THREE.Mesh(geo, outlineMat);
      o.renderOrder = 10;
      o.visible = false;
      o.frustumCulled = false;
      m.add(o);
      return o;
    });
    return p.outline;
  }

  function select(names) {
    state.parts.forEach((p) => { if (p.outline) p.outline.forEach((o) => (o.visible = false)); });
    state.selected = new Set(names.map((n) => THREE.PropertyBinding.sanitizeNodeName(n)).filter((n) => state.byName.has(n)));
    state.selected.forEach((n) => outlineFor(state.byName.get(n)).forEach((o) => (o.visible = true)));
    // where to lean the camera
    if (state.selected.size) {
      const b = new THREE.Box3();
      state.selected.forEach((n) => {
        const p = state.byName.get(n);
        p.node.position.copy(p.home).addScaledVector(p.dir, state.view.ex);
        b.expandByObject(p.node);
      });
      state.parts.forEach((p) => p.node.position.copy(p.home).addScaledVector(p.dir, state.explode * state.view.ex));
      state.focus.copy(b.getCenter(new THREE.Vector3())).applyAxisAngle(new THREE.Vector3(0, 1, 0), -pivot.rotation.y);
      state.focusR = b.getBoundingSphere(new THREE.Sphere()).radius / Math.max(1e-6, state.fit.r1);
    }
  }

  function setGhost(p, v) {
    p.meshes.forEach((m) => {
      const mt = m.material;
      const base = mt.userData.baseOpacity;
      mt.opacity = base * v;
      const t = mt.userData.baseTransparent || v < 0.999;
      if (mt.transparent !== t) { mt.transparent = t; mt.needsUpdate = true; }
      mt.depthWrite = v > 0.6;
    });
  }

  // ---------------------------------------------------------------- input
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: state.dragYaw, pitch: state.dragPitch };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    state.dragYaw = drag.yaw + (e.clientX - drag.x) * 0.008;
    state.dragPitch = Math.max(-0.5, Math.min(0.6, drag.pitch + (e.clientY - drag.y) * 0.005));
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // ---------------------------------------------------------------- loop
  let last = performance.now(), focusMix = 0, lastOp = '';
  const tmpC = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.obj) {
      state.explode = damp(state.explode, state.explodeTarget, 10, dt);
      const ex = state.explode * state.view.ex;
      state.parts.forEach((p) => p.node.position.copy(p.home).addScaledVector(p.dir, ex));

      if (!state.reduce && !drag) state.yaw += dt * state.view.spin;
      pivot.rotation.y = state.yaw + state.dragYaw;

      const any = state.selected.size > 0;
      state.sel = damp(state.sel, any ? 1 : 0, 7, dt);
      state.parts.forEach((p) => {
        const target = !any || state.selected.has(p.name) ? 1 : 0.06;
        const g = damp(p.ghost, target, 8, dt);
        if (Math.abs(g - p.ghost) > 1e-4 || (g !== 1 && p.ghost === 1)) { p.ghost = g; setGhost(p, g); }
      });
      outlineMat.uniforms.alpha.value = state.sel;

      // camera: fit the sphere for the current explode amount, lean toward the selection
      const k = Math.min(1, state.explode);
      tmpC.lerpVectors(state.fit.c0, state.fit.c1, k);
      const r = THREE.MathUtils.lerp(state.fit.r0 * 1.12, state.fit.r1, k);
      const small = 1 - Math.min(1, (state.focusR || 1) * 2.2);       // 1 for tiny parts, 0 for big ones
      focusMix = damp(focusMix, any ? 0.22 + 0.5 * small : 0, 3, dt);
      const fx = state.focus.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), pivot.rotation.y);
      const cx = tmpC.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), pivot.rotation.y);
      const target = cx.lerp(fx, focusMix);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitV = r / Math.sin(fov / 2);
      const fitH = r / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect * (1 - Math.abs(state.offsetX) * 1.4)));
      const dist = Math.max(fitV, fitH) * (1 - focusMix * 0.55) * (state.zoom || 1);
      const pitch = state.view.pitch + state.dragPitch;
      camera.position.set(target.x, target.y + Math.sin(pitch) * dist, target.z + Math.cos(pitch) * dist);
      camera.lookAt(target);
      camera.near = dist / 50; camera.far = dist * 6;
      camera.updateProjectionMatrix();
      key.position.copy(camera.position).add(new THREE.Vector3(dist * 0.6, dist, 0));
    }
    state.visible = damp(state.visible, state.visibleTarget, 5, dt);
    const op = state.visible.toFixed(2);
    if (op !== lastOp) { canvas.style.opacity = op; lastOp = op; }
    if (state.visible > 0.01) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('resize', size);
  size();

  return {
    show,
    select,
    set explode(v) { state.explodeTarget = v; },
    get explode() { return state.explodeTarget; },
    set offset([x, y]) { state.offsetX = x; state.offsetY = y; applyOffset(); },
    set visible(v) { state.visibleTarget = v; },
    set zoom(v) { state.zoom = v; },
    jump() { state.explode = state.explodeTarget; },
    preload: (url) => load(url),
    state,
  };
}
