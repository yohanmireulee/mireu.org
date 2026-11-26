// Disposable by Design. Every page is a short deck of steps: one scroll notch, swipe, key press or
// click on the arrow moves exactly one step, and the step locks in with a single smooth transition.
import { createStage } from './stage.js';
import { startWater } from './water.js';
import { audio } from './audio.js';
import { HERO_DEK, THESIS, ESSAY, INDEX_NOTE, ITEMS, WORKS_CITED } from './content.js';

const $ = (s, el = document) => el.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const pad = (n) => String(n).padStart(2, '0');
const md = (t) => t.replace(/\*(.+?)\*/g, '<em>$1</em>');
const money = (n) => '$' + n.toLocaleString('en-US');
const mobile = () => innerWidth < 820;

startWater($('#water'));
const stage = createStage($('#stage'));
stage.rate = 3.6;                               // about a second for the object to come apart
const view = $('#view');
const veil = $('#veil');

// ------------------------------------------------------------------ sound toggles
function bindToggle(id, get, set) {
  const b = $(id);
  const sync = () => { b.classList.toggle('on', get()); b.setAttribute('aria-pressed', get()); };
  b.addEventListener('click', () => { set(!get()); sync(); audio.play('toggle'); });
  sync();
}
bindToggle('#t-music', () => audio.music, (v) => audio.setMusic(v));
bindToggle('#t-ui', () => audio.ui, (v) => audio.setUi(v));

// ------------------------------------------------------------------ the deck: one input, one step
const deck = { n: 0, i: 0, show: null, lock: 0, acc: 0, last: 0, quiet: false, after: null };
const arrowNext = $('#next'), arrowPrev = $('#prev'), dots = $('#dots');

function setDeck(n, show, { start = 0, after = null } = {}) {
  Object.assign(deck, { n, i: start, show, after, acc: 0 });
  dots.innerHTML = Array.from({ length: n }, (_, k) => `<button type="button" aria-label="Step ${k + 1}"></button>`).join('');
  show(start, 0, true);
  paintNav();
}
function paintNav() {
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === deck.i));
  arrowPrev.classList.toggle('off', deck.i === 0);
  const last = deck.i === deck.n - 1;
  arrowNext.classList.toggle('off', last && !deck.after);
  arrowNext.classList.toggle('wide', last && !!deck.after);
  $('.nx-label', arrowNext).textContent = last && deck.after ? deck.after.label : '';
}
function step(to) {
  if (to < 0 || busy) return;
  if (to >= deck.n) { if (deck.after) deck.after.go(); return; }
  if (to === deck.i) return;
  const dir = Math.sign(to - deck.i);
  deck.i = to;
  audio.play(dir > 0 ? 'step' : 'back');
  deck.show(to, dir, false);
  deck.lock = performance.now() + 900;
  paintNav();
}
dots.addEventListener('click', (e) => { const k = [...dots.children].indexOf(e.target); if (k >= 0) step(k); });
arrowNext.addEventListener('click', () => step(deck.i + 1));
arrowPrev.addEventListener('click', () => step(deck.i - 1));

// a scroll inside a panel that can still scroll belongs to the panel
function scrollsInside(target, dy) {
  const el = target.closest?.('.scroll');
  if (!el) return false;
  return dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
}
addEventListener('wheel', (e) => {
  const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (scrollsInside(e.target, dy)) return;
  e.preventDefault();
  const now = performance.now();
  const gap = now - deck.last;
  deck.last = now;
  if (now < deck.lock) { deck.quiet = true; return; }
  // a trackpad keeps sending momentum after a flick; wait for a pause before the next step
  if (deck.quiet && gap < 180) return;
  deck.quiet = false;
  deck.acc += dy;
  if (Math.abs(deck.acc) > 24) { step(deck.i + Math.sign(deck.acc)); deck.acc = 0; deck.quiet = true; }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); step(deck.i + 1); }
  else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); step(deck.i - 1); }
  else if (e.key === 'Home') step(0);
  else if (e.key === 'End') step(deck.n - 1);
});
let touch = null;
addEventListener('touchstart', (e) => { touch = { y: e.touches[0].clientY, x: e.touches[0].clientX, t: e.target }; }, { passive: true });
addEventListener('touchend', (e) => {
  if (!touch) return;
  const dy = touch.y - e.changedTouches[0].clientY, dx = touch.x - e.changedTouches[0].clientX;
  const t = touch.t; touch = null;
  if (Math.abs(dy) < 45 || Math.abs(dy) < Math.abs(dx)) return;
  if (t.closest?.('#stage')) return;                     // dragging the model
  if (scrollsInside(t, dy)) return;
  step(deck.i + Math.sign(dy));
}, { passive: true });

// show one slide, hide the rest, in the direction of travel
function slides(root) {
  const all = [...root.querySelectorAll('.slide')];
  return (i) => all.forEach((s, k) => {
    s.classList.toggle('on', k === i);
    s.classList.toggle('above', k < i);
    s.classList.toggle('below', k > i);
    if (k === i) s.querySelector('.scroll')?.scrollTo(0, 0);
  });
}

// ------------------------------------------------------------------ the floating selector
function buildDock() {
  const dock = $('#dock');
  dock.innerHTML = `
    <a class="dock-home" href="#/" data-route="/" aria-label="Essay"><span class="dock-ring"></span><span class="dock-tip">The essay</span></a>
    <span class="dock-rule" aria-hidden="true"></span>
    ${ITEMS.map((it, i) => `
      <a class="dock-item" href="#/${it.slug}" data-route="/${it.slug}" aria-label="${it.name}">
        <span class="spr" style="background-image:url(img/turn-${it.slug}.webp);--d:${9 + i * 0.7}s"></span>
        <span class="dock-tip">${pad(i + 1)} · ${it.name}</span>
      </a>`).join('')}`;
  dock.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-route]');
    if (!a) return;
    e.preventDefault();
    if (location.hash === '#' + a.dataset.route) { step(0); return; }
    a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop');
    audio.play('click');
    go(a.dataset.route);
  });
  dock.querySelectorAll('a').forEach((a) => a.addEventListener('pointerenter', () => audio.play('hover')));
}
function markDock(route) {
  document.querySelectorAll('#dock a').forEach((a) => a.classList.toggle('on', a.dataset.route === route));
}

// ------------------------------------------------------------------ routing
let busy = false;
async function go(route) {
  if (busy) return;
  busy = true;
  veil.classList.remove('out'); veil.classList.add('in');
  await new Promise((r) => setTimeout(r, 520));
  location.hash = '#' + route;
  await render(route);
  veil.classList.remove('in'); veil.classList.add('out');
  setTimeout(() => { veil.classList.remove('out'); busy = false; }, 620);
}
const routeOf = () => location.hash.replace(/^#/, '') || '/';
async function render(route) {
  markDock(route);
  const item = ITEMS.find((it) => '/' + it.slug === route);
  document.body.dataset.view = item ? 'item' : 'essay';
  stage.select([]);
  if (item) await itemPage(item); else await essayPage();
  document.title = item ? `${item.name} · Disposable by Design` : 'Disposable by Design';
}
addEventListener('hashchange', () => { if (!busy) render(routeOf()); });
function wireLinks(root) {
  root.querySelectorAll('a[data-route]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); audio.play('click'); go(a.dataset.route); });
    a.addEventListener('pointerenter', () => audio.play('hover'));
  });
}

// ------------------------------------------------------------------ the essay
async function essayPage() {
  const key = (t) => t.replace(/^(<[^>]+>|[“"‘\s])+/, '');
  const cited = WORKS_CITED.slice().sort((a, b) => key(a).localeCompare(key(b)));
  view.innerHTML = `
    <section class="slide hero">
      <div class="panel">
        <p class="eyebrow">A visual essay in five teardowns</p>
        <h1 class="hero-title"><span class="ht-line">Disposable</span><span class="ht-by">by</span><span class="ht-line">Design</span></h1>
        <p class="hero-dek">${HERO_DEK}</p>
        <p class="hero-by">Yohan Mireu Lee</p>
      </div>
    </section>
    <section class="slide thesis"><div class="panel"><p class="thesis-t">${THESIS}</p></div></section>
    ${ESSAY.map((ch, i) => `
      <section class="slide chapter"><div class="panel">
        <p class="ch-label"><span>${NUM[i]}</span><em>${ch.label}</em></p>
        <p class="ch-text">${md(ch.text)}</p>
      </div></section>`).join('')}
    <section class="slide index"><div class="panel">
      <p class="ch-label"><span>${NUM[ESSAY.length]}</span><em>Five objects</em></p>
      <p class="index-note">${INDEX_NOTE}</p>
      <ol class="objects">
        ${ITEMS.map((it, i) => `
          <li><a href="#/${it.slug}" data-route="/${it.slug}">
            <span class="o-num">${pad(i + 1)}</span>
            <span class="o-text"><span class="o-name">${it.name}</span><span class="o-dek">${it.dek}</span></span>
            <span class="spr" style="background-image:url(img/turn-${it.slug}.webp);--d:${12 + i}s"></span>
          </a></li>`).join('')}
      </ol>
    </div></section>
    <section class="slide cited"><div class="panel scroll">
      <p class="ch-label"><span>—</span><em>Works cited</em></p>
      <ol>${cited.map((w) => `<li>${w}</li>`).join('')}</ol>
      <p class="foot"><a href="https://mireu.org/" class="back">← mireu.org</a><span>Disposable by Design · Yohan Mireu Lee · 2026</span></p>
    </div></section>`;
  wireLinks(view);
  stage.visible = 1;
  stage.zoom = 1.6;
  stage.offset = mobile() ? [0, 0.22] : [0.28, 0.03];
  await stage.show('models/iphone.glb', { pitch: 0.55, spin: 0.16, ex: 1.25, yaw: 0.6 });
  stage.explode = 0.9; stage.jump();
  const show = slides(view);
  setDeck(view.querySelectorAll('.slide').length, (i) => {
    show(i);
    stage.visible = i === 0 ? 1 : 0;
  });
}

// ------------------------------------------------------------------ an object
async function itemPage(item) {
  const idx = ITEMS.indexOf(item);
  const next = ITEMS[(idx + 1) % ITEMS.length];
  const n = item.stations.length;
  const max = Math.max(...item.economics.bars.map((b) => b[1]));
  const total = +(item.facts.find((f) => f[0] === 'Parts') || [0, 0])[1];
  view.innerHTML = `
    <section class="slide intro"><div class="panel">
      <p class="eyebrow">Object ${pad(idx + 1)} of ${pad(ITEMS.length)} · ${item.kicker}</p>
      <h1 class="i-title">${item.name}</h1>
      <p class="i-dek">${item.dek}</p>
      <p class="i-lede">${md(item.lede)}</p>
      <dl class="facts">${item.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </div></section>
    <section class="slide apart"><div class="panel">
      <p class="gc-count"><span class="gc-n">0</span><span class="gc-of">parts</span></p>
      <p class="gc-t"><em>Taken apart.</em> Drag to turn it over. The arrow takes you through it one part at a time.</p>
    </div></section>
    ${item.stations.map((s, i) => `
      <section class="slide station"><div class="panel card">
        <p class="c-label"><span>${pad(i + 1)} / ${pad(n)}</span>${s.parts.length > 1 ? s.parts.slice(0, 3).join(', ') + (s.parts.length > 3 ? '…' : '') : s.parts[0]}</p>
        <h2 class="c-title">${md(s.title)}</h2>
        <p class="c-excuse"><span>The excuse</span>${md(s.excuse)}</p>
        <p class="c-body">${md(s.cost)}</p>
      </div></section>`).join('')}
    <section class="slide econ"><div class="panel scroll">
      <p class="eyebrow">Back together · ${item.name}</p>
      <h2 class="e-title">${item.economics.title}</h2>
      <div class="bars">
        ${item.economics.bars.map(([label, v, kind]) => `
          <div class="bar ${kind}">
            <p class="b-label">${label}</p>
            <div class="b-track"><span class="b-fill" style="--w:${(v / max * 100).toFixed(1)}%"></span><span class="b-val">${money(v)}</span></div>
          </div>`).join('')}
      </div>
      <p class="e-body">${md(item.economics.body)}</p>
    </div></section>`;
  wireLinks(view);

  stage.zoom = 1;
  stage.visible = 1;
  stage.explode = 0; stage.jump();
  await stage.show(item.model, item.view);
  const show = slides(view);
  const count = $('.gc-n', view);
  let countRaf = 0;
  const countTo = (target) => {
    cancelAnimationFrame(countRaf);
    const t0 = performance.now();
    const tick = (now) => {
      const k = clamp((now - t0) / 900);
      count.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) countRaf = requestAnimationFrame(tick);
    };
    countRaf = requestAnimationFrame(tick);
  };
  const lastStep = n + 2;
  setDeck(n + 3, (i, dir, first) => {
    show(i);
    const tall = i === 0 || i === lastStep;   // big text panel: lift the object clear of it on phones
    stage.offset = mobile() ? [0, tall ? 0.3 : 0.2] : [0.2, 0];
    stage.zoom = mobile() ? (tall ? 1.4 : 0.92) : 1;
    if (i === 0) { stage.explode = 0; stage.select([]); }
    else if (i === 1) { stage.explode = 1; stage.select([]); countTo(total); if (!first && dir > 0) audio.play('apart'); }
    else if (i < lastStep) { stage.explode = 1; stage.select(item.stations[i - 2].parts); }
    else { stage.explode = 0; stage.select([]); }
    view.querySelector('.econ').classList.toggle('shown', i === lastStep);
  }, { after: { label: `Next: ${next.name}`, go: () => { audio.play('click'); go('/' + next.slug); } } });
}

// ------------------------------------------------------------------ start
buildDock();
render(routeOf()).then(() => document.body.classList.add('ready'));
