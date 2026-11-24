// "Design Philosophy": the Quiet Geometry manifesto, set as a scrolling piece.
// A compass construction draws itself behind the title; then each paragraph gets a line drawing
// on a sticky canvas that builds as you read it, and the words brighten as they pass the reading
// line. The five drawings follow the argument: scattered points settling onto a grid (order from
// raw utility), a symmetrical figure (pattern recognition), a golden-ratio construction
// (grids and ratios), a noisy signal resolving into a clean one (feedback), and everything
// collapsing into a single quiet circle.

const CHAPTERS = [
  {
    label: "Order, intuition, and beauty",
    text: "Design is the deliberate translation of raw utility into the cognitive language of *order, intuition, and beauty.* Across physical objects, digital software, brand systems, and spatial environments, its purpose is empirical: to bridge complex underlying mechanics with human biology, constructing functional systems that accommodate human intent with *minimal friction.*",
  },
  {
    label: "Processing fluency",
    text: "Our brains evolved to conserve metabolic energy through rapid pattern recognition. What we experience as aesthetic beauty is not a decorative preference, but the biological reward for *processing fluency*—the mind effortlessly parsing structural clarity. Because working memory is strictly finite, effective design treats *human attention as a scarce resource.* Symmetry, visual balance, and intuitive affordances eliminate hesitation by speaking directly to human perception, revealing function instantly without requiring conscious trial and error.",
  },
  {
    label: "Ruthless reduction",
    text: "Satisfying this biological demand requires an uncompromising architectural discipline. Visual and physical parameters must emerge directly from material, logical, and structural constraints; aesthetics are simply the organic result of solving a utility problem cleanly. Guided by spatial grids, mathematical ratios, and typographic hierarchies, this discipline demands *ruthless reduction.* Excellence is achieved when every superfluous detail is stripped away, allowing physical materials and digital primitives to present their authentic nature *without deception or ornamentation.*",
  },
  {
    label: "Deterministic feedback",
    text: "As systems scale beyond static objects, design acts as a control layer regulating the exchange of information. Every touchpoint is a communication channel where extraneous detail acts as *signal distortion.* To prevent operational error and cognitive fatigue, interactions require *deterministic feedback*—immediate, unambiguous confirmation of state changes. Design renders cold code, circuitry, and business logic *biologically legible,* molding complex systems around human dimensions so they remain maintainable and coherent over time.",
  },
  {
    label: "Absolute lucidity",
    text: "When utility is organized with structural precision, anchored in cognitive biology, and executed with functional restraint, a system achieves *absolute lucidity.* It presents its purpose with total clarity, performs its duty effortlessly, and recedes into *quiet geometry.*",
  },
];
const NUMERALS = ["I", "II", "III", "IV", "V"];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const span = (p, a, b) => clamp((p - a) / (b - a));

// Words become spans so they can brighten one by one; *...* marks the author's key phrases.
function words(text) {
  let em = false;
  return text.split(/(\*)/).map((part) => {
    if (part === "*") { em = !em; return ""; }
    return part.split(/(\s+)/).map((w) => (/^\s+$/.test(w) || !w ? w
      : `<span class="w${em ? " em" : ""}">${w}</span>`)).join("");
  }).join("");
}

function letters(word, delay) {
  return [...word].map((ch, i) => `<span class="ph-l" style="animation-delay:${(delay + i * 0.06).toFixed(2)}s">${ch}</span>`).join("");
}

// The compass construction behind the title (viewBox 0 0 1000 1000, centred on 500,500).
function construction() {
  const c = 500, R = 420, s = R / Math.SQRT2;
  const tri = [0, 1, 2].map((k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
    return `${(c + R * Math.cos(a)).toFixed(1)},${(c + R * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  const phi = 1.618034;
  const parts = [
    `<circle cx="${c}" cy="${c}" r="${R}"/>`,
    `<rect x="${c - s}" y="${c - s}" width="${2 * s}" height="${2 * s}"/>`,
    `<rect x="${c - s}" y="${c - s}" width="${2 * s}" height="${2 * s}" transform="rotate(45 ${c} ${c})"/>`,
    `<polygon points="${tri}"/>`,
    `<circle cx="${c}" cy="${c}" r="${(R / phi).toFixed(1)}"/>`,
    `<circle cx="${c}" cy="${c}" r="${(R / phi / phi).toFixed(1)}"/>`,
    `<circle cx="${c - R / 2}" cy="${c}" r="${R / 2}"/>`,
    `<circle cx="${c + R / 2}" cy="${c}" r="${R / 2}"/>`,
    `<line x1="${c - R - 60}" y1="${c}" x2="${c + R + 60}" y2="${c}"/>`,
    `<line x1="${c}" y1="${c - R - 60}" x2="${c}" y2="${c + R + 60}"/>`,
  ];
  return parts.map((p, i) => p.replace(/\/>$/, ` pathLength="1" style="animation-delay:${(0.2 + i * 0.22).toFixed(2)}s"/>`)).join("");
}

export function showPhilosophy(page, { onDone } = {}) {
  page.innerHTML = `
    <article class="ph">
      <header class="ph-hero">
        <svg class="ph-construct" viewBox="0 0 1000 1000" aria-hidden="true"><g>${construction()}</g></svg>
        <p class="label ph-kicker">Design Philosophy</p>
        <h1 class="ph-title"><span class="ph-row">${letters("Quiet", 0.35)}</span><span class="ph-row">${letters("Geometry", 0.6)}</span></h1>
        <div class="ph-cue" aria-hidden="true"><span></span></div>
      </header>
      <section class="ph-body">
        <div class="ph-art" aria-hidden="true"><canvas></canvas><p class="ph-art-label"></p></div>
        <div class="ph-chapters">
          ${CHAPTERS.map((c, i) => `
            <section class="ph-ch" data-i="${i}">
              <p class="ph-num"><span>${NUMERALS[i]}</span><em>${c.label}</em></p>
              <p class="ph-text">${words(c.text)}</p>
            </section>`).join("")}
          <footer class="ph-end">
            <span class="ph-end-mark" aria-hidden="true"></span>
            <a class="ph-back" href="#/" data-sfx>Back to work</a>
          </footer>
        </div>
      </section>
    </article>`;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = page.querySelector(".ph-art canvas");
  const artLabel = page.querySelector(".ph-art-label");
  const ctx = canvas.getContext("2d");
  const chapters = [...page.querySelectorAll(".ph-ch")];
  const paras = chapters.map((ch) => ({ el: ch.querySelector(".ph-text"), words: [...ch.querySelectorAll(".w")], shown: -1 }));
  const art = { active: 0, prev: -1, mix: 1, p: [0, 0, 0, 0, 0], target: [0, 0, 0, 0, 0] };
  let raf = 0, alive = true, W = 0, H = 0, dpr = 1;

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  function measure() {
    const vh = innerHeight;
    // which chapter holds the middle of the screen, and how far through it the reader is
    let active = art.active;
    chapters.forEach((ch, i) => {
      const r = ch.getBoundingClientRect();
      art.target[i] = reduce ? 1 : clamp((vh * 0.62 - r.top) / (r.height * 0.85));
      if (r.top < vh * 0.55 && r.bottom > vh * 0.45) active = i;
    });
    if (active !== art.active) {
      art.prev = art.active; art.active = active; art.mix = 0;
      artLabel.textContent = `${NUMERALS[active]} — ${CHAPTERS[active].label}`;
      artLabel.classList.remove("in"); void artLabel.offsetWidth; artLabel.classList.add("in");
    }
    // words brighten as they cross the reading line
    for (const para of paras) {
      const r = para.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const f = reduce ? 1 : clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25));
      const n = Math.round(f * para.words.length * 1.08);
      if (n === para.shown) continue;
      para.shown = n;
      para.words.forEach((w, k) => w.classList.toggle("lit", k < n));
    }
  }

  /* ---------- the five drawings: p = how far through the chapter (0..1), t = seconds ---------- */
  const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const dots = Array.from({ length: 13 * 13 }, () => ({ x: rand() * 2 - 1, y: rand() * 2 - 1, ph: rand() * 6.28, sp: 0.4 + rand() }));
  const ink = (a) => `rgba(232, 240, 247, ${a})`;
  const tint = (a) => `rgba(150, 192, 228, ${a})`;

  function grid(c, S, p, t) {
    const n = 13, g = S * 1.5 / (n - 1);
    const k = ease(span(p, 0.08, 0.75));
    dots.forEach((d, i) => {
      const gx = (i % n) * g - S * 0.75, gy = Math.floor(i / n) * g - S * 0.75;
      const wx = d.x * S * 0.95 + Math.sin(t * d.sp + d.ph) * S * 0.05;
      const wy = d.y * S * 0.95 + Math.cos(t * d.sp * 0.8 + d.ph) * S * 0.05;
      const x = wx + (gx - wx) * k, y = wy + (gy - wy) * k;
      c.fillStyle = ink(0.35 + 0.5 * k);
      c.beginPath(); c.arc(x, y, 1.2 + k * 0.8, 0, 7); c.fill();
    });
    const l = span(p, 0.7, 1);
    if (l > 0) {
      c.strokeStyle = ink(0.16 * l); c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const v = i * g - S * 0.75, e = -S * 0.75 + S * 1.5 * ease(l);
        c.moveTo(-S * 0.75, v); c.lineTo(e, v);
        c.moveTo(v, -S * 0.75); c.lineTo(v, e);
      }
      c.stroke();
    }
  }

  function symmetry(c, S, p, t) {
    const R = S * 0.82;
    c.lineWidth = 1;
    c.strokeStyle = ink(0.1);
    for (let k = 1; k <= 4; k++) { c.beginPath(); c.arc(0, 0, (R * k) / 4, 0, 7); c.stroke(); }
    // a 6-fold rose builds petal by petal, turning very slowly
    const draw = ease(span(p, 0.05, 0.85));
    const total = Math.PI * 2, steps = 720, upto = Math.floor(steps * draw);
    c.save(); c.rotate(t * 0.03);
    c.strokeStyle = ink(0.75); c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 0; i <= upto; i++) {
      const th = (i / steps) * total, r = R * Math.cos(3 * th) * (0.92 + 0.08 * Math.cos(9 * th));
      const x = r * Math.cos(th), y = r * Math.sin(th);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    // its mirror image, offset by half a petal, settles in behind it
    c.strokeStyle = tint(0.45 * span(p, 0.35, 1));
    c.beginPath();
    for (let i = 0; i <= upto; i++) {
      const th = (i / steps) * total + Math.PI / 6, r = R * 0.62 * Math.abs(Math.cos(3 * th));
      const x = r * Math.cos(th), y = r * Math.sin(th);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    c.restore();
    c.fillStyle = ink(0.9); c.beginPath(); c.arc(0, 0, 2.2, 0, 7); c.fill();
  }

  function golden(c, S, p) {
    const phi = 1.618034;
    let w = S * 1.7, h = w / phi, x = -w / 2, y = -h / 2;
    const steps = 9, shown = ease(span(p, 0.03, 0.9)) * steps;
    c.lineWidth = 1;
    c.strokeStyle = ink(0.55);
    c.strokeRect(x, y, w, h);
    // each step cuts the largest square off the rectangle and swings a quarter arc through it
    for (let i = 0; i < steps && i < shown; i++) {
      const f = clamp(shown - i);
      const side = Math.min(w, h), dir = i % 4;
      let sq, cx, cy, a0;
      if (dir === 0) { sq = [x, y, side, side]; cx = x + side; cy = y + side; a0 = Math.PI; x += side; w -= side; }
      else if (dir === 1) { sq = [x, y, side, side]; cx = x; cy = y + side; a0 = -Math.PI / 2; y += side; h -= side; }
      else if (dir === 2) { sq = [x + w - side, y, side, side]; cx = x + w - side; cy = y; a0 = 0; w -= side; }
      else { sq = [x, y + h - side, side, side]; cx = x + side; cy = y + h - side; a0 = Math.PI / 2; h -= side; }
      c.strokeStyle = ink(0.28 * f);
      c.strokeRect(sq[0], sq[1], sq[2], sq[3]);
      c.strokeStyle = tint(0.9 * f); c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, side, a0, a0 + (Math.PI / 2) * f); c.stroke();
      c.lineWidth = 1;
    }
    // the ratio, set small in the corner once the spiral closes
    const lab = span(p, 0.85, 1);
    if (lab > 0) {
      c.fillStyle = ink(0.5 * lab);
      c.font = `italic ${Math.round(S * 0.07)}px "Bodoni Moda", serif`;
      c.fillText("φ = 1.618", -S * 0.85, S * 0.78);
    }
  }

  function signal(c, S, p, t) {
    const noise = 1 - ease(span(p, 0.05, 0.7));
    const square = ease(span(p, 0.6, 0.95));
    const lines = 5, gap = S * 0.34;
    for (let L = 0; L < lines; L++) {
      const oy = (L - (lines - 1) / 2) * gap, main = L === 2;
      c.strokeStyle = main ? ink(0.85) : ink(0.14 + 0.1 * (1 - noise));
      c.lineWidth = main ? 1.4 : 1;
      c.beginPath();
      for (let i = 0; i <= 240; i++) {
        const u = i / 240, x = -S + u * 2 * S;
        const ph = u * Math.PI * 6 - t * 0.9 + L * 0.7;
        const sine = Math.sin(ph), sq = Math.tanh(sine * 8);
        const n = Math.sin(u * 91 + t * 7 + L * 3) * 0.45 + Math.sin(u * 37 - t * 5 + L) * 0.35 + Math.sin(u * 173 + t * 11) * 0.25;
        const y = oy + (gap * 0.28) * ((sine + (sq - sine) * square) + n * noise * 1.4);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    // confirmation marks: once the signal is clean, every change of state gets a dot
    if (square > 0) {
      c.fillStyle = tint(square);
      for (let k = 0; k < 7; k++) {
        const u = ((k + 0.5) / 6 + (t * 0.9) / (Math.PI * 6)) % 1.0, x = -S + u * 2 * S;
        c.beginPath(); c.arc(x, 0, 2.6, 0, 7); c.fill();
      }
    }
  }

  function quiet(c, S, p, t) {
    const R = S * 0.7;
    const k = ease(span(p, 0.1, 0.8));      // polygons round off into circles
    const gather = ease(span(p, 0.3, 0.95)); // and gather onto one radius
    for (let n = 3; n <= 9; n++) {
      const r0 = R * (0.35 + (n - 3) * 0.11), r = r0 + (R - r0) * gather;
      const spin = t * 0.05 * (n % 2 ? 1 : -1) * (1 - gather) + n;
      c.strokeStyle = ink((0.16 + 0.05 * (n - 3)) * (1 - 0.8 * gather) + (n === 9 ? 0.6 * gather : 0));
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i <= 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        // distance to the polygon edge at this angle, blended toward the circle
        const seg = (Math.PI * 2) / n, local = ((a + spin) % seg + seg) % seg - seg / 2;
        const poly = (r * Math.cos(Math.PI / n)) / Math.cos(local);
        const d = poly + (r - poly) * k;
        const x = d * Math.cos(a), y = d * Math.sin(a);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    c.fillStyle = ink(0.3 + 0.6 * gather);
    c.beginPath(); c.arc(0, 0, 1.5 + 1.5 * gather, 0, 7); c.fill();
  }
  const FIGURES = [grid, symmetry, golden, signal, quiet];

  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const t = reduce ? 0 : now / 1000;
    for (let i = 0; i < 5; i++) art.p[i] += (art.target[i] - art.p[i]) * (reduce ? 1 : 0.08);
    art.mix = Math.min(1, art.mix + 0.035);
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const S = Math.min(W, H) * 0.38;
    const draw = (i, alpha) => {
      if (alpha <= 0.01) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(W / 2, H / 2);
      FIGURES[i](ctx, S, art.p[i], t);
      ctx.restore();
    };
    const m = ease(art.mix);
    if (art.prev >= 0 && m < 1) draw(art.prev, 1 - m);
    draw(art.active, m);
  }

  const onScroll = () => measure();
  const onResize = () => { size(); measure(); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  requestAnimationFrame(() => {
    size(); measure();
    artLabel.textContent = `${NUMERALS[0]} — ${CHAPTERS[0].label}`;
    artLabel.classList.add("in");
    raf = requestAnimationFrame(frame);
    onDone?.();
  });

  return function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onResize);
  };
}
