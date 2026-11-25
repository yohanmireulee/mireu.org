// About page. Where the Design Philosophy page is driven by scroll position, this one is driven
// by touch and arrival: the service portrait develops like a print in a darkroom and tilts under
// the pointer like a photograph held to the light; each section assembles once as it enters the
// screen (degree letters ink in and the GPAs count up), the software circles on a slow orbit,
// and the skills rise line by line.

const EDUCATION = [
  { abbr: "BFA", school: "Queens College, CUNY", field: "Bachelor of Fine Arts, Design", gpa: "4.0", honor: "summa cum laude" },
  { abbr: "AS", school: "LaGuardia Community College, CUNY", field: "Associate in Science, Liberal Arts: Math & Science", gpa: "4.0", honor: "High Honors" },
];
const SOFTWARE = ["PTC Onshape", "Autodesk Fusion", "Blender", "Figma", "Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign"];
const SKILLS = [
  "Web design", "UI/UX design", "3D product design", "FDM 3D printing", "Consumer electronics R&D",
  "Laboratory equipment engineering", "Microbiology laboratory experience",
];

const pad2 = (n) => String(n).padStart(2, "0");
const rise = (text, delay, cls = "") =>
  `<span class="ab-mask ${cls}"><span class="ab-rise" style="--d:${delay}s">${text}</span></span>`;

export function showAbout(page, { onDone } = {}) {
  page.innerHTML = `
    <article class="ab">
      <header class="ab-hero">
        <div class="ab-intro">
          <p class="label ab-kicker">About</p>
          <h1 class="ab-name">
            ${rise("Yohan", 0.25)}
            ${rise("Mireu", 0.38, "ab-mid")}
            ${rise("Lee", 0.51)}
          </h1>
          <ul class="ab-facts">
            <li style="--d:1.2s"><span class="ab-star" aria-hidden="true"></span>U.S. Army Veteran</li>
            <li style="--d:1.35s">BFA, Design · Queens College, CUNY</li>
            <li style="--d:1.5s">AS, Math &amp; Science · LaGuardia Community College, CUNY</li>
          </ul>
        </div>
        <figure class="ab-photo">
          <div class="ab-print">
            <img src="assets/img/about/portrait-pv2.webp" width="1100" height="1490" alt="Service portrait of Yohan Mireu Lee in U.S. Army uniform in front of an American flag">
            <span class="ab-sheen" aria-hidden="true"></span>
            <span class="ab-scan" aria-hidden="true"></span>
          </div>
        </figure>
      </header>

      <section class="ab-sec ab-edu" data-reveal>
        <p class="label ab-sec-label">Education</p>
        ${EDUCATION.map((e, i) => `
          <div class="ab-degree" style="--i:${i}">
            <span class="ab-abbr" aria-hidden="true">${e.abbr}</span>
            <div class="ab-degree-body">
              <h2>${e.school}</h2>
              <p class="ab-field">${e.field}</p>
              <p class="ab-gpa"><span class="ab-count" data-to="${e.gpa}">0.0</span> GPA <em>${e.honor}</em></p>
            </div>
          </div>`).join("")}
      </section>

      <section class="ab-sec ab-tools" data-reveal>
        <p class="label ab-sec-label">Software</p>
        <div class="ab-orbit" style="--n:${SOFTWARE.length}">
          <svg class="ab-orbit-lines" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="49.5" pathLength="1"/><circle cx="50" cy="50" r="31" pathLength="1"/>
          </svg>
          <p class="ab-orbit-core">Tools</p>
          <ul class="ab-ring">
            ${SOFTWARE.map((s, i) => `<li style="--k:${i}"><span>${s}</span></li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="ab-sec ab-skills" data-reveal>
        <p class="label ab-sec-label">Skills</p>
        <ol class="ab-skill-list">
          ${SKILLS.map((s, i) => `<li style="--i:${i}"><span class="ab-mask"><span class="ab-skill"><i>${pad2(i + 1)}</i>${s}</span></span></li>`).join("")}
        </ol>
      </section>

      <footer class="ab-sec ab-end" data-reveal>
        <a class="ab-next" href="#/contact" data-sfx><span>Get in touch</span><i aria-hidden="true">→</i></a>
        <a class="ab-next" href="#/philosophy" data-sfx><span>Read the design philosophy</span><i aria-hidden="true">→</i></a>
      </footer>
    </article>`;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups = [];

  /* ---------- the portrait tilts and catches the light under the pointer ---------- */
  const print = page.querySelector(".ab-print");
  if (!reduce && matchMedia("(hover: hover)").matches) {
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const loop = () => {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      print.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
      print.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
      print.style.setProperty("--lx", `${(50 + x * 60).toFixed(1)}%`);
      print.style.setProperty("--ly", `${(40 + y * 60).toFixed(1)}%`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e) => {
      const r = print.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.9)));
      ty = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height * 0.9)));
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const leave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); };
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    cleanups.push(() => { removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); });
  }

  /* ---------- sections assemble once as they arrive ---------- */
  const countUp = (el) => {
    const to = parseFloat(el.dataset.to), t0 = performance.now(), dur = reduce ? 0 : 1400;
    const step = (now) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("in");
      en.target.querySelectorAll(".ab-count").forEach((c, i) => setTimeout(() => countUp(c), 500 + i * 250));
      io.unobserve(en.target);
    }
  }, { threshold: 0.2 });
  page.querySelectorAll("[data-reveal]").forEach((s) => io.observe(s));
  cleanups.push(() => io.disconnect());

  const img = page.querySelector(".ab-print img");
  const develop = () => requestAnimationFrame(() => print.classList.add("developed"));
  img.complete ? develop() : img.addEventListener("load", develop, { once: true });

  requestAnimationFrame(() => onDone?.());
  return () => cleanups.forEach((f) => f());
}
