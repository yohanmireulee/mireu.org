// mireu.org: page shell, routing, header and menu, home carousel, project pages.
import { projects } from "./projects.js";
import { Carousel } from "./carousel.js";
import { Viewer } from "./viewer.js";
import { startWater } from "./water.js";
import { audio } from "./audio.js";
import sizes from "./img-sizes.json";
import { mountBook } from "./flipbook.js";
import { showPhilosophy } from "./philosophy.js";

const $ = (s, el = document) => el.querySelector(s);
const pad2 = (n) => String(n).padStart(2, "0");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const home = $("#home");
const page = $("#page");
const veil = $("#veil");
const slider = $("#slider");
const titleEl = $("#slide-title");
const countEl = $("#slide-count");
const blurbEl = $("#slide-blurb");

startWater($("#water"));
addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 40), { passive: true });

/* ---------- audio switches (UI sound on, music off by default) ---------- */
function syncToggles() {
  for (const [id, on] of [["#t-music", audio.music], ["#t-ui", audio.ui]]) {
    const b = $(id);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  }
}
$("#t-music").addEventListener("click", () => { audio.setMusic(!audio.music); audio.play("toggle"); syncToggles(); });
$("#t-ui").addEventListener("click", () => { audio.setUi(!audio.ui); audio.play("toggle"); syncToggles(); });
syncToggles();

document.addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse") return;
  const el = e.target.closest("[data-sfx]");
  if (el && !el.contains(e.relatedTarget)) audio.play("hover");
});

/* ---------- menu ---------- */
const nav = $("nav");
const menuBtn = $(".menu-toggle");
const panel = $(".menu-panel");
function setMenu(open) {
  if (open === nav.classList.contains("is-menu-open")) return;
  nav.classList.toggle("is-menu-open", open);
  panel.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  panel.setAttribute("aria-hidden", String(!open));
  panel.inert = !open;
  audio.play(open ? "menuOpen" : "menuClose");
}
panel.inert = true;
menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-menu-open")));
addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
addEventListener("pointerdown", (e) => {
  if (nav.classList.contains("is-menu-open") && !panel.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
});
panel.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

function markCurrent(route) {
  for (const a of panel.querySelectorAll("a")) {
    const r = a.getAttribute("href").replace("#/", "") || "work";
    a.classList.toggle("current", r === route);
  }
}

/* ---------- home ---------- */
let carousel = null;
let lastProject = null;

function setSlideInfo(i) {
  const p = projects[i];
  titleEl.textContent = p.title;
  blurbEl.textContent = p.blurb;
  countEl.textContent = `${pad2(i + 1)} / ${pad2(projects.length)}`;
}

function showHome(fromSlug) {
  document.title = "Yohan Mireu Lee";
  document.body.dataset.view = "home";
  home.hidden = false;
  const from = fromSlug ? projects.findIndex((p) => p.slug === fromSlug) : -1;
  if (!carousel) {
    try {
      carousel = new Carousel(slider, projects, {
        startIndex: Math.max(from, 0),
        startExpanded: from >= 0,
        onChange: setSlideInfo,
        onPlay: audio.play,
        onOpen: (i) => { location.hash = "#/" + projects[i].slug; },
      });
    } catch (err) {
      console.error(err);
      slider.innerHTML = `<ul class="slider-fallback">${projects.map((p) => `<li><a href="#/${p.slug}" data-sfx>${p.title}</a></li>`).join("")}</ul>`;
    }
  } else {
    carousel.resume(from >= 0 ? from : null);
  }
  setSlideInfo(carousel?.index ?? Math.max(from, 0));
  requestAnimationFrame(() => home.classList.add("show"));
}

function hideHome() {
  home.classList.remove("show");
  home.hidden = true;
  carousel?.pause();
}

/* ---------- project pages ---------- */
let viewer = null;

function showProject(slug) {
  const i = projects.findIndex((p) => p.slug === slug);
  if (i < 0) { location.hash = "#/"; return; }
  const p = projects[i], next = projects[(i + 1) % projects.length], v = p.view;
  document.title = `${p.title} · Yohan Mireu Lee`;
  document.body.dataset.view = "project";
  lastProject = slug;
  const dir = `assets/img/${slug}/`;
  // Justified rows: every image in a row shares one height, so widths follow each image's
  // proportions. A row is never taller than ~84% of the screen or its images' own pixel height.
  const gallery = p.rows.map((row) => {
    const dims = row.map((n) => sizes[`${slug}/${pad2(n)}.webp`] || [1600, 1200]);
    const sum = dims.reduce((t, [w, h]) => t + w / h, 0);
    const cap = Math.min(...dims.map(([, h]) => h));
    return `<div class="g-row" style="max-width: calc(min(84svh, ${cap}px) * ${sum.toFixed(4)} + ${row.length - 1}rem)">` +
      row.map((n, k) => {
        const [w, h] = dims[k];
        return `<figure style="flex: ${(w / h).toFixed(4)} 1 0; aspect-ratio: ${w} / ${h}"><img loading="lazy" decoding="async" src="${dir}${pad2(n)}.webp" width="${w}" height="${h}" alt="${p.title}, image ${n}"></figure>`;
      }).join("") + "</div>";
  }).join("");
  const tools = v.model ? `
      <div class="v-tools">
        <button class="v-btn" data-act="reset" data-sfx>Reset view</button>
        <button class="v-btn on" data-act="spin" data-sfx>Turntable</button>
        ${v.explode ? '<label class="v-explode" data-sfx><span>Explode</span><input type="range" min="0" max="1" step="0.001" value="0" aria-label="Explode the assembly"></label>' : ""}
        <button class="v-btn icon" data-act="full" data-sfx aria-label="Full screen">⤢</button>
      </div>
      <p class="v-hint">Drag to rotate · Scroll to zoom · Right-drag to pan${v.cutaway ? " · Walls hide as you look in" : ""}</p>
      <div class="v-load"><div class="v-bar"><i></i></div><span>Loading model</span></div>` : "";
  page.innerHTML = `
    <article class="proj">
      <div class="proj-top">
        <div class="stage ${v.model ? "has-model" : "has-video"}" id="stage">${v.video ? `<video src="${dir}${v.video}" poster="${dir}${v.poster}" autoplay muted loop playsinline></video>` : ""}${tools}</div>
        <aside class="proj-info">
          <p class="label">${pad2(i + 1)} — ${p.course}</p>
          <h1>${p.title}</h1>
          ${p.paras.map((t) => `<p>${t}</p>`).join("")}
          <div class="soft"><p class="label">Software</p><ul>${p.software.map((s) => `<li>${s}</li>`).join("")}</ul></div>
        </aside>
      </div>
      ${p.book ? `<section class="book-sec"><p class="label">${p.book.label}</p><div class="book-host"></div><p class="book-hint">Click a page or use the arrow keys to turn it</p></section>` : ""}
      <section class="gallery">${gallery}</section>
      <a class="next" href="#/${next.slug}" data-sfx>
        <span class="label">Next project</span>
        <span class="next-title">${next.title}</span>
        <img src="${next.tile}" alt="">
      </a>
    </article>`;
  page.hidden = false;
  scrollTo(0, 0);
  requestAnimationFrame(() => page.classList.add("show"));
  page.querySelectorAll(".gallery img").forEach((img) => img.addEventListener("click", () => lightbox(img.src)));
  if (p.book) mountBook($(".book-host", page), { ...p.book, dir: `assets/book/${slug}/` }, () => audio.play("slide"));

  if (!v.model) return;
  const stage = $("#stage");
  viewer = new Viewer(stage, v);
  viewer.onInteract = () => { stage.classList.add("touched"); $('[data-act="spin"]', stage)?.classList.remove("on"); };
  const bar = $(".v-bar i", stage);
  viewer.load(`assets/models/${v.model}`, (f) => (bar.style.width = (f * 100).toFixed(1) + "%"))
    .then(() => { stage.classList.add("ready"); viewer.start(); })
    .catch((e) => { console.error(e); $(".v-load span", stage).textContent = "This model could not load."; });
  stage.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    audio.play("click");
    if (b.dataset.act === "reset") viewer.resetView();
    if (b.dataset.act === "spin") { const on = !b.classList.contains("on"); b.classList.toggle("on", on); viewer.setAutoRotate(on); }
    if (b.dataset.act === "full") document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen?.();
  });
  const range = $(".v-explode input", stage);
  if (range) {
    let step = 0;
    range.addEventListener("input", () => {
      viewer.setExplode(+range.value);
      const s = Math.round(+range.value * 10);
      if (s !== step) { step = s; audio.play("tick"); }
    });
  }
}

function lightbox(src) {
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `<img src="${src}" alt=""><button aria-label="Close">×</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  const close = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); removeEventListener("keydown", key); };
  const key = (e) => { if (e.key === "Escape") close(); };
  el.addEventListener("click", close);
  addEventListener("keydown", key);
  audio.play("zoom");
}

/* ---------- About / Contact (blank for now) ---------- */
function showBlank(name) {
  lastProject = null;
  document.title = `${name} · Yohan Mireu Lee`;
  document.body.dataset.view = "blank";
  page.innerHTML = `<section class="blank"><h1 class="sr-only">${name}</h1></section>`;
  page.hidden = false;
  scrollTo(0, 0);
  requestAnimationFrame(() => page.classList.add("show"));
}

let disposePage = null;

function showPhilosophyPage() {
  lastProject = null;
  document.title = "Design Philosophy · Yohan Mireu Lee";
  document.body.dataset.view = "philosophy";
  page.hidden = false;
  scrollTo(0, 0);
  disposePage = showPhilosophy(page, { onDone: () => page.classList.add("show") });
}

function clearPage() {
  viewer?.dispose();
  viewer = null;
  disposePage?.();
  disposePage = null;
  page.classList.remove("show");
  page.hidden = true;
  page.innerHTML = "";
}

/* ---------- router ---------- */
let first = true;
let busy = Promise.resolve();
function route() {
  busy = busy.then(async () => {
    const m = location.hash.match(/^#\/([\w-]+)/);
    const key = m ? m[1] : "";
    const wasHome = document.body.dataset.view === "home";
    const comingFrom = lastProject;
    // Opening a tile already expands it to fill the screen, so skip the fade in that case.
    const fromExpand = wasHome && carousel?.expand.index !== -1 && projects.some((p) => p.slug === key);
    if (!first && !fromExpand) { veil.classList.add("on"); await wait(320); }
    if (key === "philosophy") {
      hideHome(); clearPage(); showPhilosophyPage(); markCurrent(key);
    } else if (key === "about" || key === "contact") {
      hideHome(); clearPage(); showBlank(key === "about" ? "About" : "Contact"); markCurrent(key);
    } else if (key) {
      hideHome(); clearPage(); showProject(key); markCurrent("");
    } else {
      clearPage();
      showHome(first ? null : comingFrom);
      lastProject = null;
      markCurrent("work");
      if (!first && comingFrom) audio.play("back");
    }
    first = false;
    veil.classList.remove("on");
  });
}
addEventListener("hashchange", route);
route();
