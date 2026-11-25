// Sound: interface sounds synthesised for this site (tools/make_sounds.py: soft water drops and
// washes) and an ambient music bed ("Ambient Cinematic" by Leberch, Pixabay licence).
// UI sound and music both default ON; a visitor who switches either off is remembered.
// Browsers only allow sound after the first click, tap or key press, so the music starts
// then (or straight away, where the browser already allows this site to play sound).
//
// Browsers keep audio locked until the visitor clicks, taps or presses a key, and Safari is the
// strictest: it only counts some events (click, mouseup, touchend, keydown) and, on iPhone, keeps
// Web Audio quiet in silent mode unless the page has also played an ordinary <audio> element.
// So on the first such gesture the page creates its audio context, resumes it, and plays a few
// milliseconds of silence through an <audio> element, which is exactly what switching the music
// on used to do by accident.

const SFX = {
  hover: ["ui_hover", 0.16],
  slide: ["ui_slide", 0.3],
  click: ["ui_click", 0.55],
  back: ["ui_back", 0.5],
  menuOpen: ["ui_menu_open", 0.5],
  menuClose: ["ui_menu_close", 0.42],
  toggle: ["ui_toggle", 0.45],
  tick: ["ui_tick", 0.16],
  zoom: ["ui_zoom", 0.5],
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
// Download and decode the sounds straight away. Decoding uses an offline context, which needs no
// gesture; the decoded buffers then play through the live context once a gesture creates it.
const buffers = {};
const decoded = {};
const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
const decoder = OAC ? new OAC(1, 1, 22050) : null;
for (const [name, [file]] of Object.entries(SFX)) {
  decoded[name] = fetch(`assets/audio/${file}.wav`)
    .then((r) => r.arrayBuffer())
    .then((data) => new Promise((ok, fail) => decoder.decodeAudioData(data, ok, fail)))
    .then((buf) => (buffers[name] = buf))
    .catch((e) => console.warn("sound", file, e));
}
let ctx = null, sfxBus = null;

// A 0.05 s silent WAV, played once through an <audio> element to unlock Safari's audio.
const SILENCE = "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

function createContext() {
  if (ctx || !AC) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
  ctx = new AC();
  sfxBus = ctx.createGain();
  sfxBus.connect(ctx.destination);
}

let uiOn = store.get("mireu-ui", true);
let musicOn = store.get("mireu-music", true);
let primed = false;

function wake() {
  if (!AC) return;
  createContext();
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  if (!primed) {
    primed = true;
    if (musicOn) startMusic();
    // iOS also wants one buffer started inside a gesture before it lets sound through
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination);
    s.start(0);
    const el = new Audio(SILENCE);
    el.play().catch(() => {});
  }
}
// only events Safari treats as a real gesture can unlock audio
for (const ev of ["click", "mouseup", "pointerup", "touchend", "keydown"]) {
  addEventListener(ev, wake, { capture: true, passive: true });
}

export function play(name) {
  if (!uiOn || !ctx || !primed) return;
  const buf = buffers[name];
  // On the very first gesture the sounds are still decoding and the context is still starting;
  // play as soon as both are ready, unless that takes long enough to feel disconnected.
  if (!buf || ctx.state !== "running") {
    const asked = performance.now();
    Promise.all([decoded[name], ctx.resume()]).then(() => {
      if (buffers[name] && ctx.state === "running" && performance.now() - asked < 600) start(name, buffers[name]);
    }).catch(() => {});
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

function startMusic() {
  if (!current) current = players[0];
  if (current.paused) startPlayer(current);
  else fade(current, MUSIC_LEVEL, 1.5);
}

export function setMusic(on) {
  musicOn = on;
  store.set("mireu-music", on);
  if (on) {
    wake();
    startMusic();
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

// Try to start the music on arrival; browsers that need a click first refuse quietly, and the
// first click then starts it (see wake).
if (musicOn) {
  const p = players[0];
  p.preload = "auto";
  try { p.currentTime = MUSIC_START; } catch {}
  p.volume = 0;
  p.play().then(() => { if (!musicOn) { p.pause(); return; } current = p; fade(p, MUSIC_LEVEL, CROSSFADE); }).catch(() => {});
}

export const audio = {
  play, setMusic, setUi,
  get music() { return musicOn; },
  get ui() { return uiOn; },
};
// Handy for checking from the browser console: mireuAudio.state
window.mireuAudio = { get state() { return { context: ctx?.state ?? "not created", loaded: Object.keys(buffers).length, music: musicOn, ui: uiOn, playing: current && !current.paused, volume: current?.volume }; } };
