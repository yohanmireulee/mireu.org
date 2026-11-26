import Lenis from 'lenis';
import { createStage } from './stage.js';
import { startWater } from './water.js';
import { ESSAY, THESIS, ITEMS, WORKS_CITED } from './content.js';

const $ = (s, el = document) => el.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const pad = (n) => String(n).padStart(2, '0');
const md = (t) => t.replace(/\*(.+?)\*/g, '<em>$1</em>');
const words = (t) => md(t).split(/(<em>.*?<\/em>)/).map((chunk) => {
  const em = chunk.startsWith('<em>');
  const inner = em ? chunk.slice(4, -5) : chunk;
  const out = inner.split(/(\s+)/).map((w) => (!w || /^\s+$/.test(w) ? w : `<span class="w">${w}</span>`)).join('');
  return em ? `<em>${out}</em>` : out;
}).join('');
const money = (n) => '$' + n.toLocaleString('en-US');

startWater($('#water'));
const stage = createStage($('#stage'));
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
const toTop = () => lenis.scrollTo(0, { immediate: true, force: true });
const view = $('#view');
const veil = $('#veil');
const mobile = () => innerWidth < 820;

// ------------------------------------------------------------------ the floating selector
function buildDock() {
  const dock = $('#dock');
  dock.innerHTML = `
    <a class="dock-home" href="#/" data-route="/" aria-label="Essay"><span class="dock-ring"></span><span class="dock-tip">Essay</span></a>
    <span class="dock-rule" aria-hidden="true"></span>
    ${ITEMS.map((it, i) => `
      <a class="dock-item" href="#/${it.slug}" data-route="/${it.slug}" aria-label="${it.name}">
        <span class="spr" style="background-image:url(img/turn-${it.slug}.webp);--d:${11 + i * 1.3}s"></span>
        <span class="dock-tip">${pad(i + 1)} · ${it.name}</span>
      </a>`).join('')}`;
  dock.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-route]');
    if (!a) return;
    e.preventDefault();
    if (location.hash === '#' + a.dataset.route) { lenis.scrollTo(0, { duration: 1.4 }); return; }
    a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop');
    go(a.dataset.route);
  });
}
function markDock(route) {
  document.querySelectorAll('#dock a').forEach((a) => a.classList.toggle('on', a.dataset.route === route));
}

// ------------------------------------------------------------------ routing + transitions
let current = null, busy = false;
async function go(route) {
  if (busy) return;
  busy = true;
  veil.classList.remove('out'); veil.classList.add('in');
  await new Promise((r) => setTimeout(r, 520));
  location.hash = '#' + route;
  await render(route);
  toTop();
  veil.classList.remove('in'); veil.classList.add('out');
  setTimeout(() => { veil.classList.remove('out'); busy = false; }, 620);
}

function routeOf() { return (location.hash.replace(/^#/, '') || '/'); }

async function render(route) {
  if (current?.dispose) current.dispose();
  markDock(route);
  const item = ITEMS.find((it) => '/' + it.slug === route);
  document.body.dataset.view = item ? 'item' : 'essay';
  current = item ? await itemPage(item) : await essayPage();
  document.title = item ? `${item.name} · Disposable by Design` : 'Disposable by Design';
}

addEventListener('hashchange', () => { if (!busy) render(routeOf()).then(toTop); });

// ------------------------------------------------------------------ scroll plumbing
function onScroll(fn) {
  let raf = 0;
  const h = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(); }); };
  addEventListener('scroll', h, { passive: true });
  addEventListener('resize', h);
  fn();
  return () => { removeEventListener('scroll', h); removeEventListener('resize', h); cancelAnimationFrame(raf); };
}
function brighten(paras) {
  const vh = innerHeight;
  for (const p of paras) {
    const r = p.el.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) continue;
    const f = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.25));
    const n = Math.round(f * p.words.length * 1.08);
    if (n === p.shown) continue;
    p.shown = n;
    p.words.forEach((w, k) => w.classList.toggle('lit', k < n));
  }
}
const collect = (root) => [...root.querySelectorAll('.lightable')].map((el) => ({ el, words: [...el.querySelectorAll('.w')], shown: -1 }));

// ------------------------------------------------------------------ the essay (landing)
async function essayPage() {
  const key = (t) => t.replace(/^(<[^>]+>|[“"‘\s])+/, '');
  const sorted = WORKS_CITED.slice().sort((a, b) => key(a).localeCompare(key(b)));
  view.innerHTML = `
    <article class="essay">
      <header class="hero">
        <p class="eyebrow">A visual essay in five teardowns</p>
        <h1 class="hero-title">
          <span class="ht-line">Disposable</span>
          <span class="ht-by">by</span>
          <span class="ht-line">Design</span>
        </h1>
        <p class="hero-dek">Five things you own, taken apart on purpose: what holds them together, what wears out first, and who decided you shouldn’t be the one to fix it.</p>
        <p class="hero-by">Yohan Mireu Lee</p>
        <p class="scroll-cue" aria-hidden="true"><span></span>Scroll</p>
      </header>

      <section class="thesis"><p class="lightable">${words(THESIS)}</p></section>

      ${ESSAY.map((ch, i) => `
        <section class="chapter">
          <p class="ch-label"><span>${NUM[i]}</span><em>${ch.label}</em></p>
          ${ch.paras.map((p) => `<p class="lightable">${words(p)}</p>`).join('')}
        </section>`).join('')}

      <section class="index" aria-label="The five objects">
        <p class="ch-label"><span>V</span><em>The objects</em></p>
        <ol class="objects">
          ${ITEMS.map((it, i) => `
            <li><a href="#/${it.slug}" data-route="/${it.slug}">
              <span class="o-num">${pad(i + 1)}</span>
              <span class="o-text"><span class="o-kicker">${it.kicker}</span><span class="o-name">${it.name}</span><span class="o-dek">${it.dek}</span></span>
              <span class="spr big" style="background-image:url(img/turn-${it.slug}.webp);--d:${14 + i}s"></span>
            </a></li>`).join('')}
        </ol>
      </section>

      <section class="cited">
        <p class="ch-label"><span>—</span><em>Works cited</em></p>
        <ol>${sorted.map((w) => `<li>${w}</li>`).join('')}</ol>
      </section>

      <footer class="foot">
        <a href="https://mireu.org/" class="back">← mireu.org</a>
        <span>Disposable by Design · Yohan Mireu Lee · 2026</span>
      </footer>
    </article>`;

  view.querySelectorAll('.objects a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.route); }));

  await stage.show('models/iphone.glb', { pitch: 0.55, spin: 0.16, ex: 1.25, yaw: 0.6 });
  stage.explode = 0.9; stage.jump();
  stage.select([]);
  stage.zoom = 1.65;
  const paras = collect(view);
  const stop = onScroll(() => {
    const vh = innerHeight;
    stage.offset = mobile() ? [0, 0.2] : [0.3, 0.03];
    stage.visible = 1 - clamp(scrollY / (vh * 0.9));
    brighten(paras);
  });
  return { dispose: () => { stop(); stage.zoom = 1; } };
}

// ------------------------------------------------------------------ an object
// Everything on this page is scrubbed by scroll: the explode amount, the cards (which fade and drift
// with their own section's progress rather than switching on and off), the part counter and the rail.
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

async function itemPage(item) {
  const idx = ITEMS.indexOf(item);
  const next = ITEMS[(idx + 1) % ITEMS.length];
  const n = item.stations.length;
  const max = Math.max(...item.economics.bars.map((b) => b[1]));
  const total = +(item.facts.find((f) => f[0] === 'Parts') || [0, 0])[1];
  view.innerHTML = `
    <article class="item">
      <section class="i-intro">
        <div class="i-intro-in">
          <p class="eyebrow">Object ${pad(idx + 1)} of ${pad(ITEMS.length)} · ${item.kicker}</p>
          <h1 class="i-title">${item.name}</h1>
          <p class="i-dek">${item.dek}</p>
          <p class="i-lede">${md(item.lede)}</p>
          <dl class="facts">${item.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        </div>
        <p class="scroll-cue" aria-hidden="true"><span></span>Scroll to take it apart</p>
      </section>

      <section class="i-gap" data-k="apart">
        <div class="gap-cap"><p class="gc-count"><span class="gc-n">0</span><span class="gc-of">/ ${total}</span></p><p class="gc-t"><em>parts coming loose</em></p></div>
      </section>

      ${item.stations.map((s, i) => `
        <section class="i-station" data-i="${i}">
          <div class="card">
            <p class="c-label"><span>${pad(i + 1)} / ${pad(n)}</span>${s.parts.length > 1 ? s.parts.slice(0, 3).join(', ') + (s.parts.length > 3 ? '…' : '') : s.parts[0]}</p>
            <h2 class="c-title">${md(s.title)}</h2>
            <p class="c-head">The alibi</p>
            <p class="c-body">${md(s.alibi)}</p>
            <p class="c-head">The bill</p>
            <p class="c-body">${md(s.bill)}</p>
          </div>
        </section>`).join('')}

      <section class="i-gap" data-k="together"><div class="gap-cap"><p class="gc-t"><em>And back together,</em> as if nothing happened.</p></div></section>

      <section class="i-econ">
        <p class="eyebrow">${item.name}</p>
        <h2 class="e-title">${item.economics.title}</h2>
        <div class="bars">
          ${item.economics.bars.map(([label, v, kind]) => `
            <div class="bar ${kind}">
              <p class="b-label">${label}</p>
              <div class="b-track"><span class="b-fill" style="--w:${(v / max * 100).toFixed(1)}%"></span><span class="b-val">${money(v)}</span></div>
            </div>`).join('')}
        </div>
        <p class="e-body">${md(item.economics.body)}</p>
        <a class="next" href="#/${next.slug}" data-route="/${next.slug}">
          <span class="eyebrow">Next object</span>
          <span class="next-name">${next.name}</span>
          <span class="next-dek">${next.dek}</span>
        </a>
      </section>
      <footer class="foot"><a href="#/" data-route="/" class="back">← The essay</a><span>Disposable by Design · Yohan Mireu Lee</span></footer>
    </article>
    <aside class="rail" aria-hidden="true">
      <span class="rail-line"><i></i></span>
      ${item.stations.map((s, i) => `<span class="rail-tick" data-i="${i}">${pad(i + 1)}</span>`).join('')}
    </aside>`;
  view.querySelectorAll('a[data-route]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.route); }));

  stage.explode = 0; stage.jump();
  stage.visible = 1;
  await stage.show(item.model, item.view);
  const intro = $('.i-intro', view), introIn = $('.i-intro-in', view), cue = $('.scroll-cue', view);
  const apart = $('[data-k="apart"]', view), together = $('[data-k="together"]', view);
  const count = $('.gc-n', view), capA = $('[data-k="apart"] .gap-cap', view), capT = $('[data-k="together"] .gap-cap', view);
  const stations = [...view.querySelectorAll('.i-station')];
  const cards = stations.map((s) => $('.card', s));
  const ticks = [...document.querySelectorAll('.rail-tick')];
  const railFill = $('.rail-line i');
  const rail = $('.rail');
  const econ = $('.i-econ', view);
  let active = -2;
  // progress of a section: 0 when its top reaches the bottom of the screen, 1 when its bottom leaves the top
  const span = (el) => { const r = el.getBoundingClientRect(), vh = innerHeight; return { r, p: clamp((vh - r.top) / (r.height + vh)) }; };

  const stop = onScroll(() => {
    const vh = innerHeight, mob = mobile();
    stage.offset = mob ? [0, scrollY < vh * 0.5 ? 0.24 : 0.2] : [0.2, 0];
    stage.zoom = mob ? (scrollY < vh * 0.5 ? 1.15 : 0.9) : 1;

    // the intro drifts up and fades as the object starts to separate, so there is never a dead stretch
    const ir = intro.getBoundingClientRect();
    const ip = clamp(-ir.top / ir.height);
    introIn.style.opacity = (1 - smooth(0.25, 0.85, ip)).toFixed(3);
    introIn.style.transform = `translate3d(0, ${(-ip * 60).toFixed(1)}px, 0)`;
    cue.style.opacity = (1 - smooth(0, 0.15, ip)).toFixed(3);

    // explode: starts while the intro is still leaving and finishes as the first card arrives
    const a = apart.getBoundingClientRect();
    let e = smooth(0, 1, clamp((-(ir.top) - ir.height * 0.35) / ((a.bottom - ir.top) - ir.height * 0.35 - vh * 0.65)));
    const t = together.getBoundingClientRect();
    const tp = clamp((vh * 0.75 - t.top) / (t.height));
    if (tp > 0) e = 1 - smooth(0, 1, tp);
    stage.explode = e;
    count.textContent = Math.round(e * total);
    const ap = clamp((vh - a.top) / (a.height + vh));
    capA.style.opacity = (smooth(0.12, 0.32, ap) * (1 - smooth(0.5, 0.64, ap))).toFixed(3);
    capT.style.opacity = (smooth(0.2, 0.45, tp + 0.2) * (1 - smooth(0.8, 1, tp))).toFixed(3);

    // cards: each one is scrubbed by its own section
    let cur = -1;
    stations.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const p = clamp((vh - r.top) / (r.height + vh));          // 0 → 1 across the section's whole pass
      const vin = smooth(0.24, 0.42, p), vout = 1 - smooth(0.72, 0.88, p);
      const o = vin * vout;
      cards[i].style.opacity = o.toFixed(3);
      cards[i].style.transform = `translate3d(0, ${((1 - vin) * 40 - (1 - vout) * 40).toFixed(1)}px, 0)`;
      if (p > 0.3 && p < 0.8) cur = i;
    });
    if (cur !== active) {
      active = cur;
      stage.select(cur >= 0 ? item.stations[cur].parts : []);
      ticks.forEach((tk, i) => tk.classList.toggle('on', i === cur));
    }
    // the rail fills with overall progress through the stations
    const first = stations[0].getBoundingClientRect(), last = stations[n - 1].getBoundingClientRect();
    const rp = clamp((vh * 0.5 - first.top) / (last.bottom - first.top));
    railFill.style.transform = `scaleY(${rp.toFixed(4)})`;
    rail.style.opacity = (smooth(0, 0.03, rp) * (1 - smooth(0.97, 1, rp))).toFixed(3);

    const er = econ.getBoundingClientRect();
    econ.classList.toggle('shown', er.top < vh * 0.8);
  });
  return { dispose: () => { stop(); stage.select([]); document.querySelector('.rail')?.remove(); } };
}

// ------------------------------------------------------------------ start
buildDock();
render(routeOf()).then(() => document.body.classList.add('ready'));
