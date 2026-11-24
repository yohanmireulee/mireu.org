// Subtle animated background: dark water seen from above. A full-screen WebGL pass drawn at reduced
// resolution behind everything, capped at 30 fps and paused when the tab is hidden.
const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uDrift;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++){ s += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; } return s; }
// height of the water surface: slow swell plus small wind ripples, domain-warped so it never repeats
float height(vec2 p, float t){
  vec2 w = vec2(fbm(p * 0.6 + vec2(t * 0.05, -t * 0.03)), fbm(p * 0.6 + vec2(-t * 0.04, t * 0.06) + 5.2));
  vec2 q = p + (w - 0.5) * 1.6;
  float swell = sin(q.x * 1.3 + t * 0.35) * 0.5 + sin(q.y * 1.7 - t * 0.28 + q.x * 0.4) * 0.35;
  float ripple = fbm(q * 2.4 + vec2(t * 0.16, t * 0.12));
  return swell * 0.5 + ripple * 0.6;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 1.35 + uDrift;
  float t = uTime;
  float e = 0.02;
  float h = height(p, t);
  vec3 n = normalize(vec3(height(p - vec2(e, 0), t) - height(p + vec2(e, 0), t), height(p - vec2(0, e), t) - height(p + vec2(0, e), t), e * 5.0));
  // soft overhead light, slightly off to the upper left, and a cool sky tint in the reflections
  vec3 L = normalize(vec3(-0.35, 0.45, 1.0));
  float spec = pow(max(dot(reflect(-L, n), vec3(0, 0, 1)), 0.0), 60.0);
  float sheen = pow(1.0 - n.z, 2.0);
  // calm deep blue water: lighter in the middle of the screen, sky-blue sheen on the ripples
  vec3 deep = vec3(0.095, 0.175, 0.245);
  vec3 col = deep + vec3(0.07, 0.13, 0.17) * sheen * 1.5 + vec3(0.7, 0.85, 0.95) * spec * 0.06;
  // soft light where the surface crests
  col += vec3(0.016, 0.03, 0.04) * smoothstep(0.55, 0.95, h);
  // vignette keeps the edges darkest, like the reference sites
  float v = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
  col *= mix(0.72, 1.0, v);
  o = vec4(col, 1.0);
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
    gl.uniform2f(uDrift, t * 0.012, t * 0.006);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(frame);
  return { stop() { cancelAnimationFrame(raf); } };
}
