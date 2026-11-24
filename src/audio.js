// Sound: Kenney UI sounds (CC0) and an ambient music bed (Pixabay licence, "Ambient Cinematic" by Leberch).
// UI sound defaults ON, music defaults OFF. Browsers only allow audio after the visitor's first
// click or key press, so nothing plays before then.

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
const MUSIC_START = 0.43;     // leading silence in the track
const MUSIC_END = 166.6;      // trailing silence starts at ~166.8 s
const CROSSFADE = 4;
const MUSIC_LEVEL = 0.42;

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v === "1"; } catch { return fallback; }
  },
  set(key, on) { try { localStorage.setItem(key, on ? "1" : "0"); } catch {} },
};

let ctx = null, master = null, sfxBus = null, musicBus = null;
const buffers = {};
let unlocked = false;
let uiOn = store.get("mireu-ui", true);
let musicOn = false; // music always starts off; the switch is the visitor's choice each visit
let deck = null; // { a, b, current, timer }

function ensureContext() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  for (const [name, [file]] of Object.entries(SFX)) {
    fetch(`assets/audio/${file}.wav`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))
      .then((buf) => (buffers[name] = buf)).catch(() => {});
  }
  return ctx;
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  ensureContext();
  if (ctx.state === "suspended") ctx.resume();
}
for (const ev of ["pointerdown", "keydown", "touchend"]) addEventListener(ev, unlock, { capture: true, passive: true });

export function play(name) {
  if (!uiOn || !unlocked || !ctx) return;
  const buf = buffers[name];
  if (!buf) return;
  if (ctx.state === "suspended") ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = SFX[name][1];
  src.connect(g); g.connect(sfxBus);
  src.start();
}

// Two <audio> elements cross-fade into each other so the loop has no gap.
function makeDeck() {
  const make = () => {
    const el = new Audio(MUSIC_URL);
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    const src = ctx.createMediaElementSource(el);
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(g); g.connect(musicBus);
    return { el, g };
  };
  return { a: make(), b: make(), current: null, timer: null };
}

function startVoice(v) {
  const t = ctx.currentTime;
  v.el.currentTime = MUSIC_START;
  v.el.play().catch(() => {});
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(0, t);
  v.g.gain.linearRampToValueAtTime(1, t + CROSSFADE);
}

function stopVoice(v, fade = CROSSFADE) {
  const t = ctx.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(v.g.gain.value, t);
  v.g.gain.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => { if (v.g.gain.value < 0.01) v.el.pause(); }, fade * 1000 + 200);
}

function watchLoop() {
  clearInterval(deck.timer);
  deck.timer = setInterval(() => {
    const cur = deck.current;
    if (!cur || cur.el.paused) return;
    if (cur.el.currentTime >= MUSIC_END - CROSSFADE) {
      const next = cur === deck.a ? deck.b : deck.a;
      stopVoice(cur);
      startVoice(next);
      deck.current = next;
    }
  }, 250);
}

export function setMusic(on) {
  musicOn = on;
  if (on) {
    unlock();
    ensureContext();
    if (!deck) deck = makeDeck();
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL, t + 2);
    if (!deck.current || deck.current.el.paused) { deck.current = deck.a; startVoice(deck.a); }
    watchLoop();
  } else if (ctx && deck) {
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0, t + 1.2);
    clearInterval(deck.timer);
    setTimeout(() => { if (!musicOn) { deck.a.el.pause(); deck.b.el.pause(); deck.current = null; } }, 1400);
  }
}

export function setUi(on) {
  uiOn = on;
  store.set("mireu-ui", on);
}

export const audio = {
  play, setMusic, setUi,
  get music() { return musicOn; },
  get ui() { return uiOn; },
};
