import { createStage } from './stage.js';
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

const stage = createStage($('#stage'));
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
    if (location.hash === '#' + a.dataset.route) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
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
  scrollTo(0, 0);
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

addEventListener('hashchange', () => { if (!busy) render(routeOf()).then(() => scrollTo(0, 0)); });

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
  stage.zoom = 1.45;
  const paras = collect(view);
  const stop = onScroll(() => {
    const vh = innerHeight;
    stage.offset = mobile() ? [0, 0.2] : [0.26, 0.03];
    stage.visible = 1 - clamp(scrollY / (vh * 0.9));
    brighten(paras);
  });
  return { dispose: () => { stop(); stage.zoom = 1; } };
}

// ------------------------------------------------------------------ an object
async function itemPage(item) {
  const idx = ITEMS.indexOf(item);
  const next = ITEMS[(idx + 1) % ITEMS.length];
  const n = item.stations.length;
  const max = Math.max(...item.economics.bars.map((b) => b[1]));
  view.innerHTML = `
    <article class="item">
      <section class="i-intro">
        <p class="eyebrow">Object ${pad(idx + 1)} of ${pad(ITEMS.length)} · ${item.kicker}</p>
        <h1 class="i-title">${item.name}</h1>
        <p class="i-dek">${item.dek}</p>
        <p class="i-lede">${md(item.lede)}</p>
        <dl class="facts">${item.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <p class="scroll-cue" aria-hidden="true"><span></span>Scroll to take it apart</p>
      </section>

      <section class="i-gap" data-k="apart"><p class="gap-cap"><em>Coming apart.</em></p></section>

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

      <section class="i-gap" data-k="together"><p class="gap-cap"><em>And back together,</em> as if nothing happened.</p></section>

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
    </article>`;
  view.querySelectorAll('a[data-route]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.route); }));

  stage.explode = 0; stage.jump();
  stage.visible = 1;
  await stage.show(item.model, item.view);
  const apart = $('[data-k="apart"]', view), together = $('[data-k="together"]', view);
  const stations = [...view.querySelectorAll('.i-station')];
  const econ = $('.i-econ', view);
  let active = -2;
  const prog = (el) => { const r = el.getBoundingClientRect(); return clamp((innerHeight * 0.55 - r.top) / r.height); };

  const stop = onScroll(() => {
    const vh = innerHeight, mid = vh * 0.5;
    stage.offset = mobile() ? [0, scrollY < vh * 0.6 ? 0.24 : 0.2] : [0.2, 0];
    stage.zoom = mobile() ? (scrollY < vh * 0.6 ? 1.15 : 0.9) : 1;
    const pa = prog(apart), pt = prog(together);
    let e = ease(pa);
    if (pt > 0) e = 1 - ease(pt);
    stage.explode = e;
    let a = -1;
    const line = mobile() ? vh * 0.85 : mid;
    stations.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top < line && r.bottom > line) a = i; });
    if (a !== active) {
      active = a;
      stage.select(a >= 0 ? item.stations[a].parts : []);
      stations.forEach((s, i) => s.classList.toggle('on', i === a));
    }
    const er = econ.getBoundingClientRect();
    econ.classList.toggle('shown', er.top < vh * 0.75);
    stage.visible = 1;
  });
  return { dispose: () => { stop(); stage.select([]); } };
}

// ------------------------------------------------------------------ start
buildDock();
render(routeOf()).then(() => document.body.classList.add('ready'));
