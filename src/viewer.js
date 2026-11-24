// Project-page 3D viewer: orbit, zoom, pan, turntable, explode slider and the museum cutaway.
// Ported unchanged in behaviour from the first version of the site.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const DEG = Math.PI / 180;

export class Viewer {
  constructor(host, options) {
    this.host = host;
    this.opt = Object.assign({ yaw: 30, pitch: 14, zoom: 0.9, exposure: 1, env: 1, ground: true, autoRotate: true }, options);

    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = this.opt.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    this.scene.environmentIntensity = this.opt.env;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.7, zoomSpeed: 0.9, panSpeed: 0.8, screenSpacePanning: true });
    this.controls.autoRotate = this.opt.autoRotate;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.addEventListener("start", () => {
      this.interacted = true;
      this.controls.autoRotate = false;
      this.onInteract?.();
    });

    this.key = new THREE.DirectionalLight(0xfff5e8, 1.6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -4e-4;
    this.key.shadow.radius = 6;
    this.key.shadow.blurSamples = 16;
    this.scene.add(this.key, this.key.target);
    this.fill = new THREE.DirectionalLight(0xdfe9ff, 0.35);
    this.scene.add(this.fill);

    this._resize = () => this.resize();
    addEventListener("resize", this._resize);
    this.ro = new ResizeObserver(this._resize);
    this.ro.observe(host);
    this.visible = true;
    this.io = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting), { threshold: 0.01 });
    this.io.observe(host);
    this.resize();
  }

  load(url, onProgress) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => { this.setup(gltf.scene); resolve(); },
        (e) => { if (e.total) onProgress?.(e.loaded / e.total); }, reject);
    });
  }

  setup(model) {
    this.model = model;
    this.scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this.box = box; this.size = size; this.center = center; this.radius = sphere.radius;
    this.meshes = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      if (m) {
        if (m.transmission > 0) { m.thickness = 2e-3 * this.radius; o.castShadow = false; }
        if (m.map) m.map.anisotropy = 8;
        if (m.alphaTest > 0) { m.alphaTest = 0.3; m.alphaToCoverage = true; o.castShadow = true; }
      }
      this.meshes.push(o);
    });

    const r = this.radius;
    this.key.position.copy(center).add(new THREE.Vector3(r * 1.2, r * 2.2, r * 1.6));
    this.key.target.position.copy(center);
    const sc = this.key.shadow.camera;
    sc.left = sc.bottom = -r * 1.3; sc.right = sc.top = r * 1.3;
    sc.near = r * 0.2; sc.far = r * 6; sc.updateProjectionMatrix();
    this.key.shadow.normalBias = r * 4e-3;
    this.fill.position.copy(center).add(new THREE.Vector3(-r * 2, r * 0.6, -r * 1.2));

    if (this.opt.ground) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(r * 12, r * 12), new THREE.ShadowMaterial({ opacity: 0.32 }));
      g.rotation.x = -Math.PI / 2;
      g.position.set(center.x, box.min.y - r * 2e-3, center.z);
      g.receiveShadow = true;
      this.scene.add(g);
      this.ground = g;
    }
    this.parts = this.meshes.map((m) => {
      const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
      return { m, base: m.position.clone(), d: c.sub(center) };
    });
    if (this.opt.cutaway) this.setupCutaway();
    this.resetView(true);
  }

  setExplode(t) {
    this.explode = t;
    const k = this.opt.explodeScale ?? 1.1;
    for (const p of this.parts) {
      const off = p.d.clone().multiplyScalar(t * k);
      if (p.d.length() < this.radius * 0.05) off.y += t * this.radius * 0.25;
      const local = off.clone();
      if (p.m.parent && p.m.parent !== this.model) {
        const inv = new THREE.Matrix4().copy(p.m.parent.matrixWorld).invert().setPosition(0, 0, 0);
        local.applyMatrix4(inv);
      }
      p.m.position.copy(p.base).add(local);
    }
    if (this.ground) this.ground.visible = t < 0.05;
  }

  resetView(instant) {
    const o = this.opt, r = this.radius, target = this.center.clone();
    if (o.target) target.add(new THREE.Vector3(o.target[0] * this.size.x, o.target[1] * this.size.y, o.target[2] * this.size.z));
    const dist = (r / Math.sin((this.camera.fov * DEG) / 2)) * o.zoom;
    const yaw = o.yaw * DEG, pitch = o.pitch * DEG;
    const pos = new THREE.Vector3(
      target.x + dist * Math.sin(yaw) * Math.cos(pitch),
      target.y + dist * Math.sin(pitch),
      target.z + dist * Math.cos(yaw) * Math.cos(pitch));
    this.controls.minDistance = r * (o.minZoom ?? 0.12);
    this.controls.maxDistance = r * 5;
    this.camera.near = r * 5e-3;
    this.camera.far = r * 40;
    this.camera.updateProjectionMatrix();
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.fly = { from: this.camera.position.clone(), to: pos, tf: this.controls.target.clone(), tt: target, t0: performance.now() };
  }

  setAutoRotate(on) { this.controls.autoRotate = on; }

  // Museum: walls between the camera and the room hide as you orbit, so you can see inside.
  setupCutaway() {
    const box = this.box, c = this.center, walls = [];
    for (const m of this.meshes) {
      if (!/^wall/i.test(m.name)) continue;
      const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), mc = b.getCenter(new THREE.Vector3());
      const axis = s.x < s.z ? "x" : "z";
      const half = (box.max[axis] - box.min[axis]) / 2;
      if (Math.abs(mc[axis] - c[axis]) < half * 0.55) continue;
      walls.push({ m, axis, side: Math.sign(mc[axis] - c[axis]), pos: mc[axis], box: b, attached: [] });
    }
    for (const m of this.meshes) {
      if (walls.some((w) => w.m === m)) continue;
      const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), mc = b.getCenter(new THREE.Vector3());
      for (const w of walls) {
        const other = w.axis === "x" ? "z" : "x";
        if (!(s[w.axis] > 0.6) && Math.abs(mc[w.axis] - w.pos) < 0.45 && mc[other] > w.box.min[other] - 0.1 && mc[other] < w.box.max[other] + 0.1) {
          w.attached.push(m);
          break;
        }
      }
    }
    this.walls = walls;
  }

  updateCutaway() {
    if (!this.walls) return;
    const cam = this.camera.position, c = this.center;
    for (const w of this.walls) {
      const hide = (cam[w.axis] - c[w.axis]) * w.side > (this.box.max[w.axis] - this.box.min[w.axis]) * 0.2;
      w.m.visible = !hide;
      for (const a of w.attached) a.visible = !hide;
    }
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (!this.visible || document.hidden) return;
      if (this.fly) {
        const t = Math.min(1, (performance.now() - this.fly.t0) / 800), e = 1 - Math.pow(1 - t, 3);
        this.camera.position.lerpVectors(this.fly.from, this.fly.to, e);
        this.controls.target.lerpVectors(this.fly.tf, this.fly.tt, e);
        if (t >= 1) this.fly = null;
      }
      this.controls.update();
      this.updateCutaway();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    removeEventListener("resize", this._resize);
    this.ro.disconnect();
    this.io.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) {
        for (const k in o.material) if (o.material[k]?.isTexture) o.material[k].dispose();
        o.material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
