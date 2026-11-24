// Sound: Kenney UI sounds (CC0) and an ambient music bed ("Ambient Cinematic" by Leberch, Pixabay licence).
// UI sound defaults ON, music defaults OFF.
//
// Browsers keep audio locked until the visitor clicks, taps or presses a key. Safari in particular
// only unlocks inside the gesture itself, so every gesture re-checks and resumes the audio context,
// and the music is started directly from the switch's click.

const SFX = {
  hover: ["click_002", 0.22],
  slide: ["tick_004", 0.32],
  click: ["select_002", 0.55],
  back: ["back_002", 0.5],
  menuOpen: ["toggle_001", 0.4],
  menuClose: ["toggle_004", 0.4],
  toggle: ["click_005", 0.55],
  tick: ["click_003", 0.3],
  zoom: ["glass_005", 0.35],
};
const MUSIC_URL = "assets/audio/music.mp3";
const MUSIC_START = 0.43;   // leading silence in the track
const MUSIC_END = 166.6;    // trailing silence starts at ~166.8 s
const CROSSFADE = 4;        // seconds
const MUSIC_LEVEL = 0.45;

const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : v === "1"; } catch { return fallback; } },
  set(key, on) { try { localStorage.setItem(key, on ? "1" : "0"); } catch {} },
};

const AC = window.AudioContext || window.webkitAudioContext;
// Creating the context before any gesture is allowed; it just starts out suspended. Doing it now
// lets the UI sounds download and decode immediately, so the very first click already has sound.
const ctx = AC ? new AC() : null;
const sfxBus = ctx ? ctx.createGain() : null;
if (ctx) sfxBus.connect(ctx.destination);
const buffers = {};
if (ctx) {
  for (const [name, [file]] of Object.entries(SFX)) {
    fetch(`assets/audio/${file}.wav`)
      .then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, fail) => ctx.decodeAudioData(b, ok, fail)))
      .then((buf) => (buffers[name] = buf))
      .catch((e) => console.warn("sound", file, e));
  }
}

let uiOn = store.get("mireu-ui", true);
let musicOn = false;
let primed = false;

function wake() {
  if (!ctx) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  if (!primed) {
    // iOS needs one buffer started inside a gesture before it lets any sound through.
    primed = true;
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination);
    s.start(0);
  }
}
for (const ev of ["pointerdown", "pointerup", "click", "touchend", "keydown"]) {
  addEventListener(ev, wake, { capture: true, passive: true });
}

export function play(name) {
  if (!uiOn || !ctx) return;
  const buf = buffers[name];
  if (!buf) return;
  // The very first gesture resumes the context asynchronously; play as soon as it is running.
  if (ctx.state !== "running") {
    if (!primed) return; // no click or key press yet: the browser would hold these back
    ctx.resume().then(() => ctx.state === "running" && start(name, buf)).catch(() => {});
    return;
  }
  start(name, buf);
}

function start(name, buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = SFX[name][1];
  src.connect(g);
  g.connect(sfxBus);
  src.start();
}

/* ---------- music: two plain <audio> players that cross-fade at the loop point ---------- */
const players = [new Audio(), new Audio()];
for (const p of players) { p.preload = "none"; p.src = MUSIC_URL; p.volume = 0; }
let current = null;
let fadeRaf = 0;
const fades = new Map();

function fade(el, to, seconds, then) {
  fades.set(el, { from: el.volume, to, t0: performance.now(), dur: seconds * 1000, then });
  if (!fadeRaf) fadeRaf = requestAnimationFrame(stepFades);
}
function stepFades(now) {
  for (const [el, f] of fades) {
    const t = Math.min(1, (now - f.t0) / f.dur);
    el.volume = Math.max(0, Math.min(1, f.from + (f.to - f.from) * t));
    if (t >= 1) { fades.delete(el); f.then?.(); }
  }
  fadeRaf = fades.size ? requestAnimationFrame(stepFades) : 0;
}

function startPlayer(p) {
  p.preload = "auto";
  try { p.currentTime = MUSIC_START; } catch {}
  p.volume = 0;
  const go = p.play();
  if (go && go.catch) go.catch((e) => console.warn("music", e));
  fade(p, MUSIC_LEVEL, CROSSFADE);
}

function onTime(e) {
  const p = e.target;
  if (!musicOn || p !== current) return;
  if (p.currentTime >= MUSIC_END - CROSSFADE) {
    const next = players[0] === p ? players[1] : players[0];
    fade(p, 0, CROSSFADE, () => p.pause());
    current = next;
    startPlayer(next);
  }
}
for (const p of players) p.addEventListener("timeupdate", onTime);

export function setMusic(on) {
  musicOn = on;
  if (on) {
    wake();
    if (!current) current = players[0];
    if (current.paused) startPlayer(current);
    else fade(current, MUSIC_LEVEL, 1.5);
  } else {
    for (const p of players) fade(p, 0, 1.2, () => p.pause());
  }
}

export function setUi(on) {
  uiOn = on;
  store.set("mireu-ui", on);
  if (on) wake();
}

// Pause the music while the tab is in the background, resume when it comes back.
document.addEventListener("visibilitychange", () => {
  if (!musicOn || !current) return;
  if (document.hidden) current.pause();
  else current.play().catch(() => {});
});

export const audio = {
  play, setMusic, setUi,
  get music() { return musicOn; },
  get ui() { return uiOn; },
};
// Handy for checking from the browser console: mireuAudio.state
window.mireuAudio = { get state() { return { context: ctx?.state, loaded: Object.keys(buffers).length, music: musicOn, ui: uiOn, playing: current && !current.paused, volume: current?.volume }; } };
