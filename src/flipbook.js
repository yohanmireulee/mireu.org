// Page-turning booklet viewer. Pages are images (assets/book/<slug>/01.webp, 02.webp, ...).
// The book opens on its cover; each "leaf" is one sheet with a page on the front and the next
// page on the back, hinged at the spine. Click or tap the right page to go forward, the left page
// to go back, swipe, or use the arrow keys while the book is on screen.
const pad2 = (n) => String(n).padStart(2, "0");

export function mountBook(host, { dir, pages, size: [w, h], label }, onTurn) {
  const leaves = Math.ceil(pages / 2);
  let at = 0; // number of leaves turned to the left

  const page = (n) => (n <= pages
    ? `<img src="${dir}${pad2(n)}.webp" alt="${label}, page ${n}" decoding="async" draggable="false">`
    : "");
  host.innerHTML = `
    <div class="book" style="aspect-ratio: ${2 * w} / ${h}; width: min(100%, calc(78svh * ${(2 * w / h).toFixed(4)}))" tabindex="0" role="group" aria-roledescription="booklet" aria-label="${label}">
      <div class="book-spread">
        ${Array.from({ length: leaves }, (_, i) => `
          <div class="leaf">
            <div class="face front">${page(i * 2 + 1)}</div>
            <div class="face back">${page(i * 2 + 2)}</div>
          </div>`).join("")}
      </div>
    </div>
    <div class="book-ui">
      <button class="v-btn" data-dir="-1" aria-label="Previous page" data-sfx>←</button>
      <span class="book-count" aria-live="polite"></span>
      <button class="v-btn" data-dir="1" aria-label="Next page" data-sfx>→</button>
    </div>`;

  const book = host.querySelector(".book");
  const spread = host.querySelector(".book-spread");
  const leafEls = [...host.querySelectorAll(".leaf")];
  const count = host.querySelector(".book-count");
  const btns = host.querySelectorAll(".book-ui button");

  function render(moving = -1) {
    leafEls.forEach((el, i) => {
      const turned = i < at;
      el.classList.toggle("turned", turned);
      el.style.zIndex = i === moving ? leaves + 2 : turned ? i + 1 : leaves - i;
    });
    // closed on the cover or the back: centre the single visible page
    spread.style.transform = at === 0 ? "translateX(-25%)" : at === leaves && pages % 2 === 0 ? "translateX(25%)" : "none";
    const left = at * 2, right = at * 2 + 1;
    count.textContent = at === 0 ? `Cover · ${pages} pages`
      : right > pages ? `Page ${left} of ${pages}` : `Pages ${left}–${right} of ${pages}`;
    btns[0].disabled = at === 0;
    btns[1].disabled = at === leaves;
  }

  let busy = 0;
  function turn(d) {
    const next = at + d;
    if (next < 0 || next > leaves) return;
    const moving = d > 0 ? at : at - 1;
    at = next;
    render(moving);
    onTurn?.();
    clearTimeout(busy);
    busy = setTimeout(() => render(), 900); // settle stacking once the leaf has landed
  }

  btns.forEach((b) => b.addEventListener("click", () => turn(+b.dataset.dir)));
  // click / tap: right half forward, left half back; horizontal swipe turns too
  let x0 = null;
  book.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  book.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) return turn(dx < 0 ? 1 : -1);
    const r = book.getBoundingClientRect();
    turn(e.clientX > r.left + r.width / 2 ? 1 : -1);
  });
  book.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); turn(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); }
  });
  render();
}
