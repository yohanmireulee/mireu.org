// Home page carousel: flat tiles bent onto a ring around the viewer in the vertex shader, with
// edge bokeh blur, chromatic aberration, a faint heat-haze shimmer and film grain toward the sides.
// Geometry, physics and effect values match zenobasi.com/work (measured Nov 2026); the cursor
// "fluid" distortion is intentionally left out.
import * as THREE from "three";

const CONFIG = {
  breakpoints: { mobile: 600, tablet: 1000 },
  fov: 45,
  distance: 5,
  maxPixelRatio: 2,
  textureSize: 1600,
  // Zen's ring circumference equals his 7 tiles laid end to end. Locking the ring to 7 tiles
  // keeps the exact same curve even though this site has more projects.
  ringSlides: 7,
  slide: { aspect: { mobile: 2 / 3, desktop: 1.5 }, cornerRadius: 0.015, height: { mobile: 0.55, tablet: 0.5, desktop: 0.65 }, maxWidth: 0.75, gap: 0.05, span: 1.6, segments: [48, 1] },
  scroll: { spring: 8, dragSpring: 45, friction: 2, coast: 1, snapDuration: 0.8, glideDuration: 2.4, minDuration: 0.2, wheel: 1.8, wheelMax: 160, drag: 1.3, snapThreshold: 0.05, snapDelay: 150, keySpring: 6.5, keyQueue: 4, keyKick: 0.7, tapDistance: 6, tapSpeed: 0.5 },
  motion: { velocityMax: 10, velocityEase: 5, zoomOut: 0.5 },
  panorama: { radius: 1, side: -1, scale: 1, speedRadius: 0.5 },
  scene: { streak: 0.025, rgbShift: 0.025, parallax: 0.025, shading: 0.25, backside: 0.4, fogDepth: 8, fogStrength: 0.85, nearFade: 1.5 },
  edges: { blur: { tablet: 0.02, desktop: 0.035 }, aberration: { tablet: 0.01, desktop: 0.035 }, zone: 0.35, shimmer: 0.0075, shimmerScale: 10, shimmerSpeed: 5, shimmerZone: 0.25 },
  grain: 0.135,
  pointer: { parallax: 0.5, vertical: 0.6, image: 0.008, ease: 3 },
  expand: { duration: 1.2, zoom: 1.4 },
  intro: { delay: 0.25, duration: 1.6 },
};

const VERT = /* glsl */ `
#define TAU 6.28318530718
#define NORMAL_STEP 0.01
#define LIGHT_DIRECTION vec3(-0.35, 0.45, 1.0)
uniform float uLoop; uniform float uSpan; uniform float uVelocity; uniform float uExpand;
uniform float uRadius; uniform float uSide; uniform float uScale; uniform float uSpeedRadius;
uniform float uShading; uniform float uFogDepth; uniform float uNearFade;
varying vec2 vUv; varying float vShade; varying float vFog; varying float vParallax; varying float vFacing;
float ringRadius() { return max(uRadius * uLoop / TAU * (1.0 + uSpeedRadius * abs(uVelocity)), 0.1); }
vec3 panorama(vec3 p) {
  float radius = ringRadius();
  float theta = p.x / radius;
  return vec3(radius * sin(theta), p.y, uSide * radius * (cos(theta) - 1.0) + p.z) * uScale;
}
vec3 bend(vec3 p) { return mix(panorama(p), p, uExpand); }
void main() {
  vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 p = bend(world);
  vec3 normal = normalize(cross(bend(world + vec3(NORMAL_STEP, 0.0, 0.0)) - p, bend(world + vec3(0.0, NORMAL_STEP, 0.0)) - p));
  vec3 light = normalize(LIGHT_DIRECTION);
  vUv = uv;
  vShade = mix(1.0, abs(dot(normal, light)) / light.z, uShading);
  vFog = max(smoothstep(0.0, uFogDepth, -p.z), smoothstep(uNearFade, uNearFade + 2.0, p.z));
  vParallax = clamp(modelMatrix[3].x / uSpan, -1.0, 1.0);
  vFacing = mix(cos(world.x / ringRadius()), 1.0, uExpand);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
#define BLUR_SAMPLES 24
#define STREAK_SAMPLES 8
#define GOLDEN_ANGLE 2.39996323
uniform sampler2D uMap; uniform vec2 uCover; uniform vec2 uTextureSize; uniform vec2 uSlide; uniform float uPad;
uniform vec2 uResolution; uniform float uVelocity; uniform float uExpand; uniform vec2 uPointer;
uniform float uStreak; uniform float uRgbShift; uniform float uParallax; uniform float uPointerShift; uniform float uFocus;
uniform float uCornerRadius; uniform float uBlur; uniform float uBlurZone; uniform float uAberration; uniform float uGrain;
uniform float uTime; uniform float uShimmer; uniform float uShimmerScale; uniform float uShimmerSpeed; uniform float uShimmerZone;
uniform float uBackside; uniform float uFogStrength; uniform vec3 uBackground; uniform float uIntro;
varying vec2 vUv; varying float vShade; varying float vFog; varying float vParallax; varying float vFacing;
vec2 imageScale; vec2 imageOffset;
vec2 coverUv(vec2 uv) { return (clamp(uv, 0.0, 1.0) - 0.5) * imageScale + 0.5 - imageOffset; }
vec3 splitColor(vec2 uv, vec2 shift, float lod) {
  return vec3(textureLod(uMap, coverUv(uv + shift), lod).r, textureLod(uMap, coverUv(uv), lod).g, textureLod(uMap, coverUv(uv - shift), lod).b);
}
vec3 gather(vec2 uv, vec2 shift, float radius, float streak, float pixelLod, int count) {
  vec2 texels = uTextureSize * imageScale;
  vec2 texelsPerWorld = texels / uSlide;
  float discSpacing = radius / sqrt(float(count)) * 2.0 * max(texelsPerWorld.x, texelsPerWorld.y);
  float streakSpacing = abs(streak) / float(count) * texels.x;
  float lod = max(pixelLod, log2(max(max(discSpacing, streakSpacing), 1.0)));
  float falloff = radius > 0.0 ? 2.0 : 0.0;
  vec3 color = vec3(0.0); float total = 0.0;
  for (int i = 0; i < BLUR_SAMPLES; i++) {
    if (i >= count) break;
    float progress = (float(i) + 0.5) / float(count);
    float angle = float(i) * GOLDEN_ANGLE;
    vec2 disc = vec2(cos(angle), sin(angle)) * sqrt(progress) * radius / uSlide;
    float along = fract(float(i) * 0.618034 + 0.31) - 0.5;
    float weight = exp(-falloff * progress);
    color += splitColor(uv + disc + vec2(along * streak, 0.0), shift, lod) * weight;
    total += weight;
  }
  return color / total;
}
float hash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float valueNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(vec3(i, 0.0)), hash(vec3(i + vec2(1.0, 0.0), 0.0)), f.x), mix(hash(vec3(i + vec2(0.0, 1.0), 0.0)), hash(vec3(i + 1.0, 0.0)), f.x), f.y);
}
vec2 heatHaze(vec2 screen) {
  vec2 q = vec2(screen.x * uResolution.x / uResolution.y, screen.y);
  float t = uTime * uShimmerSpeed;
  float bendN = valueNoise(q * 3.0 - vec2(0.0, t * 0.04));
  float patches = valueNoise(q * 2.0 + vec2(5.3, -t * 0.06));
  float phase = q.y * uShimmerScale - t + bendN * 6.0;
  vec2 ripple = vec2(0.6 * sin(phase) + 0.4 * sin(phase * 1.7 + 1.3 - t * 0.6), 0.35 * sin(phase * 1.3 + 2.1));
  return ripple * mix(0.3, 1.0, patches);
}
vec3 overlayGrain(vec3 c, float n, float amount) {
  vec3 o = mix(2.0 * c * n, 1.0 - 2.0 * (1.0 - c) * (1.0 - n), step(0.5, c));
  return mix(c, o, amount);
}
float edgeMask(vec2 p, float softness) {
  vec2 halfSize = 0.5 * uSlide;
  float corner = min(uCornerRadius * (1.0 - uFocus), min(halfSize.x, halfSize.y));
  vec2 q = abs(p - halfSize) - (halfSize - corner);
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  return smoothstep(softness, -softness, outside);
}
void main() {
  vec2 p = (vUv - 0.5) * (uSlide + 2.0 * uPad) + 0.5 * uSlide;
  if (!gl_FrontFacing) p.x = uSlide.x - p.x;
  vec2 pPerPixelX = dFdx(p); vec2 pPerPixelY = dFdy(p);
  float worldPerPixel = max(length(pPerPixelX), length(pPerPixelY));
  vec2 screen = gl_FragCoord.xy / uResolution;
  float side = min(screen.x, 1.0 - screen.x);
  float edge = 1.0 - smoothstep(0.0, uBlurZone, side);
  edge *= edge * (1.0 - uExpand);
  float haze = (1.0 - smoothstep(0.0, uShimmerZone, side)) * (1.0 - uExpand);
  if (haze > 0.0) p += heatHaze(screen) * uShimmer * haze * worldPerPixel;
  float radius = uBlur * edge * worldPerPixel;
  vec2 aberration = normalize(screen - 0.5 + 1e-4) * uAberration * edge * worldPerPixel;
  vec2 shift = aberration / uSlide + vec2(uRgbShift * uVelocity, 0.0);
  float streak = uStreak * uVelocity;
  float drift = 1.0 - uFocus;
  imageScale = uCover * (1.0 - 2.0 * (uParallax + uPointerShift) * drift);
  imageOffset = (vec2(vParallax * uParallax, 0.0) + uPointer * uPointerShift) * drift;
  vec2 uv = p / uSlide;
  vec2 base = coverUv(uv);
  vec2 gradX = dFdx(base); vec2 gradY = dFdy(base);
  float alpha = edgeMask(p, max(radius * 0.6, worldPerPixel * 0.75));
  if (alpha < 0.002 || vFacing < 0.0) discard;
  vec3 color = vec3(textureGrad(uMap, coverUv(uv + shift), gradX, gradY).r, textureGrad(uMap, base, gradX, gradY).g, textureGrad(uMap, coverUv(uv - shift), gradX, gradY).b);
  float radiusPixels = uBlur * edge;
  float streakPixels = abs(streak) * uSlide.x / worldPerPixel;
  float blurPixels = max(radiusPixels, streakPixels);
  if (blurPixels > 0.5) {
    float texelsPerPixel = max(length(gradX * uTextureSize), length(gradY * uTextureSize));
    float pixelLod = log2(max(texelsPerPixel, 1.0));
    int count = radiusPixels < 0.5 ? STREAK_SAMPLES : BLUR_SAMPLES;
    vec3 blurred = gather(uv, shift, radius, streak, pixelLod, count);
    color = mix(color, blurred, smoothstep(0.5, 2.0, blurPixels));
  }
  color *= vShade;
  if (!gl_FrontFacing) color *= uBackside;
  color = mix(color, uBackground, vFog * uFogStrength);
  gl_FragColor = vec4(color, alpha * uIntro);
  #include <colorspace_fragment>
  float n = hash(vec3(gl_FragCoord.xy, floor(uTime * 24.0)));
  gl_FragColor.rgb = overlayGrain(gl_FragColor.rgb, n, uGrain);
}`;

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const easeInOut4 = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2); // GSAP power4.inOut
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);

async function loadTexture(url, anisotropy, maxSize) {
  const blob = await fetch(url).then((r) => r.blob());
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export class Carousel {
  constructor(host, slides, { onChange, onOpen, onPlay, startIndex = 0, startExpanded = false } = {}) {
    this.host = host;
    this.slides = slides;
    this.onChange = onChange;
    this.onOpen = onOpen;
    this.sfx = onPlay || (() => {});
    const C = CONFIG;
    const T = (this.T = slides.length);

    const renderer = (this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, C.maxPixelRatio));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const shared = (this.uniforms = {
      uLoop: { value: 1 }, uSpan: { value: 1 }, uPad: { value: 0 }, uCornerRadius: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }, uVelocity: { value: 0 }, uExpand: { value: 0 },
      uPointer: { value: new THREE.Vector2() }, uPointerShift: { value: 0 }, uBlur: { value: 0 }, uBlurZone: { value: 0 },
      uAberration: { value: 0 }, uGrain: { value: C.grain }, uTime: { value: 0 }, uShimmer: { value: 0 },
      uShimmerScale: { value: 1 }, uShimmerSpeed: { value: 0 }, uShimmerZone: { value: 1 },
      uBackground: { value: new THREE.Color("#0d1822") }, uIntro: { value: startExpanded ? 1 : 0 },
    });
    for (const k of Object.keys({ ...C.panorama, ...C.scene })) shared["u" + k[0].toUpperCase() + k.slice(1)] = { value: 0 };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(C.fov, 1, 0.1, 100);
    this.camera.position.z = C.distance;
    this.geometry = new THREE.PlaneGeometry(1, 1, ...C.slide.segments);
    const aniso = renderer.capabilities.getMaxAnisotropy();
    this.meshes = slides.map((s, i) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: true, depthWrite: false,
        uniforms: { ...shared, uMap: { value: null }, uCover: { value: new THREE.Vector2(1, 1) }, uSlide: { value: new THREE.Vector2(1, 1) }, uFocus: { value: 0 }, uTextureSize: { value: new THREE.Vector2(1, 1) } },
      });
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.scene.add(mesh);
      loadTexture(s.tile, aniso, C.textureSize).then((tex) => {
        if (this.disposed) return tex.dispose();
        mat.uniforms.uMap.value = tex;
        mat.uniforms.uTextureSize.value.set(tex.image.width, tex.image.height);
        mat.userData.imageAspect = tex.image.width / tex.image.height;
        this.cover(mat);
        mesh.visible = true;
        if (s.tileVideo) this.attachVideo(s.tileVideo, mat, tex);
      }).catch((e) => console.warn("Couldn't load", s.tile, e));
      return mesh;
    });

    this.view = { pixelWidth: 1, pixelHeight: 1, width: 1, height: 1, worldPerPixel: 1 };
    this.layout = { slideWidth: 1, slideHeight: 1, step: 1, pad: 0 };
    this.expand = { value: startExpanded ? 1 : 0, index: startExpanded ? mod(startIndex, T) : -1, anim: null };
    this.track = { position: startIndex, target: startIndex, speed: 0, frequency: C.scroll.spring, glide: null, velocity: 0, active: -1 };
    this.pointer = { target: new THREE.Vector2(), current: shared.uPointer.value, client: null, clickable: false };
    this.drag = null;
    this.wheelSession = null;
    this.ac = new AbortController();
    const sig = { signal: this.ac.signal };

    this.measure();
    // Re-measure whenever the container changes size. This, plus the per-frame size check in
    // tick(), fixes the old bug where a page restored in a background tab rendered squashed.
    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(host);
    addEventListener("resize", () => this.measure(), sig);
    addEventListener("pageshow", () => this.measure(), sig);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.measure(); }, sig);

    this.bindInput(sig);
    this.active = true;
    this.startTime = performance.now();
    if (startExpanded) this.close();
    else this.introStart = performance.now() + C.intro.delay * 1000;
    renderer.setAnimationLoop((t) => this.tick(t));
  }

  pick(v) {
    if (typeof v !== "object") return v;
    const { mobile, tablet } = CONFIG.breakpoints, w = this.view.pixelWidth;
    return w <= mobile ? v.mobile ?? v.tablet ?? v.desktop : w <= tablet ? v.tablet ?? v.desktop : v.desktop;
  }

  measure() {
    const C = CONFIG, host = this.host;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return false;
    this.rect = host.getBoundingClientRect();
    const v = this.view;
    v.pixelWidth = w; v.pixelHeight = h;
    v.height = 2 * Math.tan(THREE.MathUtils.degToRad(C.fov / 2)) * C.distance;
    v.width = v.height * (w / h);
    v.worldPerPixel = v.height / h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, C.maxPixelRatio));
    this.renderer.setSize(w, h);
    const U = this.uniforms;
    this.renderer.getDrawingBufferSize(U.uResolution.value);
    const { slide, edges } = C;
    const aspect = this.pick(slide.aspect), blur = this.pick(edges.blur), ab = this.pick(edges.aberration);
    const L = this.layout;
    L.slideWidth = Math.min(v.height * this.pick(slide.height) * aspect, v.width * slide.maxWidth);
    L.step = L.slideWidth * (1 + slide.gap);
    L.slideHeight = L.slideWidth / aspect;
    L.pad = v.height * (blur + ab + edges.shimmer);
    for (const [k, val] of Object.entries({ ...C.panorama, ...C.scene })) U["u" + k[0].toUpperCase() + k.slice(1)].value = val;
    U.uPad.value = L.pad;
    U.uCornerRadius.value = L.slideWidth * slide.cornerRadius;
    U.uLoop.value = L.step * C.ringSlides;
    U.uSpan.value = Math.max(v.width / 2, L.step * slide.span);
    const resY = U.uResolution.value.y;
    U.uBlur.value = resY * blur;
    U.uAberration.value = resY * ab;
    U.uBlurZone.value = edges.zone;
    U.uShimmer.value = resY * edges.shimmer;
    U.uShimmerScale.value = edges.shimmerScale;
    U.uShimmerSpeed.value = edges.shimmerSpeed;
    U.uShimmerZone.value = edges.shimmerZone;
    U.uPointerShift.value = C.pointer.image;
    this.sized = { w, h };
    return true;
  }

  cover(mat) {
    const a = mat.userData.imageAspect;
    if (!a) return;
    const { uSlide, uFocus, uCover } = mat.uniforms;
    const zoom = lerp(1, CONFIG.expand.zoom, uFocus.value);
    const n = uSlide.value.x / (uSlide.value.y * zoom);
    uCover.value.set(Math.min(n / a, 1), Math.min(a / n, 1) / zoom);
  }

  pxToSteps(px) { return (px * this.view.worldPerPixel) / this.layout.step; }

  settledIndex() {
    if (this.drag || this.wheelSession || !Number.isInteger(this.track.target)) return null;
    const i = Math.round(this.track.position);
    return i === this.track.target ? i : null;
  }

  // Is screen point (x, y) inside the bent outline of a tile?
  hit(mesh, x, y) {
    if (!mesh.visible) return false;
    const r = this.rect;
    const nx = ((x - r.left) / r.width) * 2 - 1, ny = 1 - ((y - r.top) / r.height) * 2;
    const U = this.uniforms;
    const radius = Math.max((U.uRadius.value * U.uLoop.value) / (2 * Math.PI) * (1 + U.uSpeedRadius.value * Math.abs(U.uVelocity.value)), 0.1);
    const { x: sw, y: sh } = mesh.material.uniforms.uSlide.value;
    const pts = [];
    for (let t = 0; t < 16; t++) {
      const th = (mesh.position.x + (t / 15 - 0.5) * sw) / radius;
      const px = radius * Math.sin(th) * U.uScale.value;
      const pz = U.uSide.value * radius * (Math.cos(th) - 1) * U.uScale.value;
      for (const sy of [1, -1]) {
        const v = new THREE.Vector3(px, (sy * sh) / 2 * U.uScale.value, pz).applyMatrix4(this.camera.matrixWorldInverse);
        if (v.z > -this.camera.near) return false;
        v.applyMatrix4(this.camera.projectionMatrix);
        pts.push({ v, sy, t });
      }
    }
    const top = pts.filter((p) => p.sy === 1).map((p) => p.v);
    const bottom = pts.filter((p) => p.sy === -1).map((p) => p.v).reverse();
    const poly = top.concat(bottom);
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if (a.y > ny !== b.y > ny && nx < ((b.x - a.x) * (ny - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  stopGlide() { clearTimeout(this.snapTimer); this.wheelSession = null; this.track.glide = null; }

  glideTo(target) {
    this.stopGlide();
    const S = CONFIG.scroll, tr = this.track;
    const dist = target - tr.position;
    const s = Math.min(Math.abs(tr.speed) / S.coast, 1);
    const dur = lerp(S.snapDuration, S.glideDuration, s);
    tr.target = target;
    if (dist || tr.speed) {
      tr.glide = { from: tr.position, distance: dist, speed: tr.speed, duration: Math.max(Math.min(tr.speed * dist > 0 ? (4 * dist) / tr.speed : Infinity, dur), S.minDuration), elapsed: 0 };
    }
  }

  settleWheel() {
    const tr = this.track, d = tr.target - this.wheelSession.start;
    if (Math.abs(d) < CONFIG.scroll.snapThreshold) this.glideTo(this.wheelSession.start);
    else if (Math.abs(d) < 1) this.glideTo(this.wheelSession.start + Math.sign(d));
    else this.glideTo(Math.round(tr.target));
  }

  animateExpand(to, done) {
    this.expand.anim = { from: this.expand.value, to, t0: performance.now(), done };
  }

  open(i) {
    this.expand.index = mod(i, this.T);
    this.host.classList.add("is-expanded");
    this.animateExpand(1, () => this.onOpen?.(this.expand.index));
  }

  close() {
    this.animateExpand(0, () => { this.expand.index = -1; this.host.classList.remove("is-expanded"); });
  }

  bindInput(sig) {
    const S = CONFIG.scroll, host = this.host, tr = this.track;
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || !this.active) return;
      e.preventDefault();
      if (this.drag || this.expand.index !== -1) return;
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const d = clamp(e.deltaMode === 1 ? raw * 16 : e.deltaMode === 2 ? raw * host.clientHeight : raw, -S.wheelMax, S.wheelMax);
      if (!d) return;
      this.wheelSession ??= { start: Math.round(tr.target) };
      tr.glide = null;
      tr.target += this.pxToSteps(d) * S.wheel;
      tr.frequency = S.spring;
      clearTimeout(this.snapTimer);
      this.snapTimer = setTimeout(() => this.settleWheel(), S.snapDelay);
    }, { passive: false, ...sig });

    host.addEventListener("pointerdown", (e) => {
      if (this.drag || !e.isPrimary || e.button !== 0) return;
      host.setPointerCapture(e.pointerId);
      const base = { id: e.pointerId, startX: e.clientX, startY: e.clientY };
      if (this.expand.index !== -1) { this.drag = { ...base, moved: 0, locked: true }; return; }
      const settled = this.settledIndex();
      const onTile = settled !== null && this.hit(this.meshes[mod(settled, this.T)], e.clientX, e.clientY);
      this.stopGlide();
      host.classList.add("is-dragging");
      const caught = !onTile && Math.abs(tr.speed) > S.tapSpeed;
      tr.frequency = S.dragSpring;
      tr.target = tr.position + tr.speed / S.dragSpring;
      this.drag = { ...base, startTarget: tr.target, moved: 0, caught, committed: onTile ? settled : null };
    }, sig);

    host.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.startX;
      d.moved = Math.max(d.moved, Math.hypot(dx, e.clientY - d.startY));
      if (!d.locked) tr.target = d.startTarget - this.pxToSteps(dx) * S.drag;
    }, sig);

    const end = (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const tap = e.type === "pointerup" && !d.caught && d.moved < S.tapDistance;
      this.drag = null;
      if (d.locked) { if (tap) { this.sfx("click"); this.close(); } return; }
      host.classList.remove("is-dragging");
      if (tap && d.committed !== null) { this.glideTo(d.committed); this.sfx("click"); this.open(d.committed); return; }
      this.glideTo(Math.round(tr.position + tr.speed / S.friction));
    };
    host.addEventListener("pointerup", end, sig);
    host.addEventListener("pointercancel", end, sig);
    host.addEventListener("lostpointercapture", end, sig);

    host.addEventListener("keydown", (e) => {
      if ((e.key !== "Enter" && e.key !== " ") || e.repeat || this.drag || this.expand.index !== -1) return;
      e.preventDefault();
      const i = this.settledIndex() ?? Math.round(tr.target);
      this.glideTo(i); this.sfx("click"); this.open(i);
    }, sig);

    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    addEventListener("keydown", (e) => {
      if (!this.active) return;
      const dir = keys[e.key];
      if (!dir || e.metaKey || e.ctrlKey || e.altKey || this.drag || this.expand.index !== -1 || e.target.matches?.("input, select, textarea")) return;
      e.preventDefault();
      const cur = Math.round(tr.position);
      const next = clamp(Math.round(tr.target) + dir, cur - S.keyQueue, cur + S.keyQueue);
      if (next === tr.target) return;
      this.stopGlide();
      tr.target = next;
      tr.frequency = S.keySpring;
      if (e.repeat) return;
      const kick = S.keyKick * S.keySpring * (next - tr.position);
      if (Math.abs(kick) > tr.speed * Math.sign(kick)) tr.speed = kick;
    }, sig);

    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      this.pointer.client = { x: e.clientX, y: e.clientY };
      this.pointer.target.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
    }, sig);
    const reset = () => { this.pointer.target.set(0, 0); this.pointer.client = null; };
    document.documentElement.addEventListener("pointerleave", reset, sig);
    addEventListener("blur", reset, sig);
  }

  tick(now) {
    const C = CONFIG, tr = this.track, U = this.uniforms;
    // Safety net for the old first-load bug: if the canvas and its box ever disagree, re-measure.
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (w && h && (!this.sized || w !== this.sized.w || h !== this.sized.h)) this.measure();
    if (!this.sized) return;

    const dt = Math.min(((now - (this.lastNow ?? now)) || 0) / 1000, 0.1);
    this.lastNow = now;
    if (dt <= 0 && this.framesDrawn) return;

    if (tr.glide) {
      const g = tr.glide;
      g.elapsed = Math.min(g.elapsed + dt, g.duration);
      const n = 1 - g.elapsed / g.duration, a = g.speed * g.duration - 4 * g.distance, b = 3 * g.distance - g.speed * g.duration;
      tr.position = g.from + g.distance + n ** 3 * (a + b * n);
      tr.speed = -(3 * a * n ** 2 + 4 * b * n ** 3) / g.duration;
      if (n === 0) tr.glide = null;
    } else {
      const f = tr.frequency, x = tr.position - tr.target, e = Math.exp(-f * dt), v = tr.speed + f * x;
      tr.position = tr.target + (x + v * dt) * e;
      tr.speed = (tr.speed - f * v * dt) * e;
      if (Math.abs(tr.position - tr.target) < 1e-6 && Math.abs(tr.speed) < 1e-6) { tr.position = tr.target; tr.speed = 0; }
    }
    U.uTime.value = ((now - this.startTime) / 1000) % 1000;
    tr.velocity = damp(tr.velocity, clamp(tr.speed / C.motion.velocityMax, -1, 1), C.motion.velocityEase, dt);
    U.uVelocity.value = tr.velocity;

    // expand / collapse animation
    const ex = this.expand;
    if (ex.anim) {
      const t = Math.min(1, (performance.now() - ex.anim.t0) / (C.expand.duration * 1000));
      ex.value = lerp(ex.anim.from, ex.anim.to, easeInOut4(t));
      if (t >= 1) { const done = ex.anim.done; ex.anim = null; done?.(); }
    }
    if (this.introStart !== undefined) {
      const t = clamp((performance.now() - this.introStart) / (C.intro.duration * 1000), 0, 1);
      U.uIntro.value = easeOut3(t);
      if (t >= 1) this.introStart = undefined;
    }

    this.pointer.current.lerp(this.pointer.target, 1 - Math.exp(-C.pointer.ease * dt));
    const par = C.pointer.parallax * (1 - ex.value);
    this.camera.position.set(this.pointer.current.x * par, this.pointer.current.y * par * C.pointer.vertical, C.distance + Math.abs(tr.velocity) * C.motion.zoomOut);
    this.camera.lookAt(0, 0, 0);
    U.uExpand.value = ex.value;

    const { slideWidth: sw, slideHeight: sh, step, pad } = this.layout, v = this.view;
    const ew = lerp(sw, v.width, ex.value), eh = lerp(sh, v.height, ex.value), grow = (ew - sw) / 2;
    this.meshes.forEach((m, i) => {
      const s = mod(i - tr.position + this.T / 2, this.T) - this.T / 2;
      const focused = i === ex.index;
      const fw = focused ? ew : sw, fh = focused ? eh : sh;
      m.position.set(s * step + clamp(s, -1, 1) * grow, 0, 0);
      m.scale.set(fw + 2 * pad, fh + 2 * pad, 1);
      m.material.uniforms.uSlide.value.set(fw, fh);
      m.material.uniforms.uFocus.value = focused ? ex.value : 0;
      this.cover(m.material);
    });

    const settled = this.pointer.client && ex.index === -1 ? this.settledIndex() : null;
    const clickable = settled !== null && this.hit(this.meshes[mod(settled, this.T)], this.pointer.client.x, this.pointer.client.y);
    if (clickable !== this.pointer.clickable) { this.pointer.clickable = clickable; this.host.classList.toggle("is-clickable", clickable); }

    const active = mod(Math.round(tr.position), this.T);
    if (active !== tr.active) {
      if (tr.active !== -1) this.sfx("slide");
      tr.active = active;
      this.onChange?.(active);
    }
    this.renderer.render(this.scene, this.camera);
    this.framesDrawn = (this.framesDrawn || 0) + 1;
  }

  get index() { return mod(Math.round(this.track.position), this.T); }

  // Stop rendering while another page is showing; pick up again on return.
  // An animated tile: the still image shows first, then the looping video takes over once it plays.
  attachVideo(url, mat, still) {
    const v = document.createElement("video");
    Object.assign(v, { src: url, muted: true, loop: true, playsInline: true, preload: "auto" });
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    (this.videos ||= []).push(v);
    v.addEventListener("playing", () => {
      if (this.disposed || mat.uniforms.uMap.value?.isVideoTexture) return;
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      mat.uniforms.uMap.value = tex;
      mat.uniforms.uTextureSize.value.set(v.videoWidth, v.videoHeight);
      still.dispose();
    }, { once: true });
    v.play().catch(() => {}); // autoplay can be refused (e.g. low-power mode); the still stays
  }

  pause() {
    this.videos?.forEach((v) => v.pause());
    this.active = false;
    this.drag = null;
    this.host.classList.remove("is-dragging", "is-clickable");
    this.renderer.setAnimationLoop(null);
  }

  // Come back from a project page: start fully expanded on that tile, then shrink back into the ring.
  resume(fromIndex = null) {
    this.videos?.forEach((v) => v.play().catch(() => {}));
    this.active = true;
    this.lastNow = undefined;
    this.sized = null;
    this.measure();
    if (fromIndex !== null) {
      const tr = this.track, i = mod(fromIndex, this.T);
      const near = Math.round(tr.position) + (mod(i - Math.round(tr.position) + this.T / 2, this.T) - this.T / 2);
      this.stopGlide();
      tr.position = tr.target = near; tr.speed = 0; tr.velocity = 0;
      this.expand.index = i; this.expand.value = 1; this.expand.anim = null;
      this.host.classList.add("is-expanded");
      this.close();
    } else if (this.expand.index !== -1) {
      this.expand.index = -1; this.expand.value = 0; this.host.classList.remove("is-expanded");
    }
    this.uniforms.uIntro.value = 1;
    this.renderer.setAnimationLoop((t) => this.tick(t));
  }

  dispose() {
    this.disposed = true;
    this.videos?.forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
    this.ac.abort();
    this.ro.disconnect();
    clearTimeout(this.snapTimer);
    this.renderer.setAnimationLoop(null);
    for (const m of this.meshes) { m.material.uniforms.uMap.value?.dispose(); m.material.dispose(); }
    this.geometry.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer.domElement.remove();
  }
}
