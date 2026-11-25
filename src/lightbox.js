// Full-screen image viewer: click anywhere or press Escape to close.
import { audio } from "./audio.js";

export function lightbox(src, alt = "") {
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `<img src="${src}" alt="${alt}"><button aria-label="Close">×</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  const close = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); removeEventListener("keydown", key); };
  const key = (e) => { if (e.key === "Escape") close(); };
  el.addEventListener("click", close);
  addEventListener("keydown", key);
  audio.play("zoom");
}
