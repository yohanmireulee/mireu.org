// Animated background: open water at dusk seen from above. A full-screen WebGL pass drawn at reduced
// resolution behind everything, capped at 30 fps and paused when the tab is hidden.
const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uDrift;
out vec4 o;

// Open water seen from above, after the wave model in Alexander Alekseev's "Seascape": each wave
// octave is a sharpened sine lattice, warped by noise and rotated, so crests come out pointed
// and troughs broad like real wind waves. The surface is shaded with a Fresnel blend of the
// dusk sky it reflects and the deep water below, plus a soft glint from a low sun.
const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return -1.0 + 2.0 * mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float octave(vec2 uv, float choppy) {
  uv += noise(uv);
  vec2 wv = 1.0 - abs(sin(uv)), swv = abs(cos(uv));
  wv = mix(wv, swv, wv);
  return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
}
float sea(vec2 p, float t, int n) {
  float freq = 0.16, amp = 0.6, choppy = 4.0, h = 0.0;
  vec2 uv = p; uv.x *= 0.75;
  for (int i = 0; i < 5; i++) {
    if (i >= n) break;
    float d = octave((uv + t) * freq, choppy) + octave((uv - t) * freq, choppy);
    h += d * amp;
    uv *= OCT; freq *= 1.9; amp *= 0.22; choppy = mix(choppy, 1.0, 0.2);
  }
  return h;
}

const vec3 SUN = normalize(vec3(-0.30, 0.45, -0.84));   // low light far up the frame
const vec3 DEEP = vec3(0.050, 0.098, 0.142);              // water seen straight down
const vec3 BODY = vec3(0.30, 0.48, 0.58);                 // light scattered back from inside the water

vec3 sky(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 c = mix(vec3(0.30, 0.42, 0.52), vec3(0.12, 0.21, 0.30), pow(y, 0.5)); // brighter at the horizon
  c += vec3(0.55, 0.50, 0.42) * pow(max(dot(d, SUN), 0.0), 24.0) * 0.6;       // glow around the sun
  // soft cloud cover, so every tilted facet reflects a slightly different patch of sky
  vec2 cp = d.xz / max(d.y, 0.15) * 1.6 + uTime * 0.005;
  float cl = 0.5 * noise(cp) + 0.25 * noise(cp * 2.1 + 3.7) + 0.125 * noise(cp * 4.3 - 1.3);
  c *= 0.82 + 0.45 * clamp(cl + 0.35, 0.0, 1.0);
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 q = (frag - 0.5 * uRes) / uRes.y;
  float t = 1.0 + uTime * 0.11;                         // half the portfolio's pace

  // camera high above the water, looking almost straight down with a slight forward tilt
  vec3 ro = vec3(uDrift.x * 40.0, 10.0, uDrift.y * 40.0);
  float pitch = -1.22;
  vec3 fw = normalize(vec3(0.0, sin(pitch), -cos(pitch)));
  vec3 rt = normalize(cross(fw, vec3(0, 1, 0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw * 1.55 + rt * q.x + up * q.y);

  // where the view ray meets the (mean) water plane
  float dist = ro.y / -rd.y;
  vec3 p = ro + rd * dist;

  // surface normal from the height field; the finite-difference step grows with distance,
  // which also filters out ripples too small to resolve on screen
  float e = 0.012 * dist / 10.0;
  float h = sea(p.xz, t, 5);
  vec3 n = normalize(vec3(h - sea(p.xz + vec2(e, 0.0), t, 5), e, h - sea(p.xz + vec2(0.0, e), t, 5)));

  vec3 v = -rd;
  float fres = 0.04 + 0.96 * pow(clamp(1.0 - dot(n, v), 0.0, 1.0), 2.2);
  vec3 refl = sky(reflect(rd, n));
  float diff = pow(dot(n, SUN) * 0.4 + 0.6, 24.0);
  vec3 refr = DEEP + diff * BODY * 0.10;
  vec3 col = mix(refr, refl, fres);
  col += BODY * (h - 0.6) * 0.06;                       // crests catch a little more light
  float nrm = (60.0 + 8.0) / (3.14159 * 8.0);
  col += vec3(0.80, 0.86, 0.90) * pow(max(dot(reflect(-SUN, n), v), 0.0), 60.0) * nrm * 0.10;

  // soft vignette keeps the edges darker, as on the reference sites
  vec2 uv = frag / uRes;
  float vig = smoothstep(1.3, 0.25, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
  col *= mix(0.62, 1.0, vig);
  // a touch of noise breaks up 8-bit banding in the dark gradients
  col += (hash(frag + fract(uTime) * 61.0) - 0.5) / 255.0;
  o = vec4(max(col, 0.0), 1.0);
}`;

export function startWater(canvas) {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "uRes"), uTime = gl.getUniformLocation(prog, "uTime"), uDrift = gl.getUniformLocation(prog, "uDrift");

  const scale = 0.5; // render at half resolution; the water is soft so it upsamples cleanly
  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * Math.min(devicePixelRatio, 2) * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * Math.min(devicePixelRatio, 2) * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h);
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  let last = 0, raf = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / 30) return;
    last = now;
    resize();
    const t = reduced ? 20 : (now - t0) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uDrift, t * 0.006, t * 0.003);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);
  return { stop() { cancelAnimationFrame(raf); } };
}
