// Contact page: a message form (delivered by Web3Forms, so no address appears on the page) and a
// button that reveals the email address only when someone clicks it.
//
// Keeping the address away from scrapers: it never appears as text in the HTML or the JavaScript.
// It is stored below as scrambled character codes and only put together in the browser after a
// click, which bulk scrapers reading page source never do.
import { audio } from "./audio.js";

// Web3Forms access key: create one at web3forms.com with the address that should receive the
// messages, then paste it here. Web3Forms keys are designed to sit in public page code; the key
// only lets people send to that inbox and never reveals the address.
const FORM_KEY = "";

const CODE = [35, 124, 6, 72, 52, 83, 3, 64, 40, 118, 27, 69, 63, 118, 64, 74, 53, 126];
const MIX = [0x5a, 0x13, 0x6e, 0x29];
const address = () => String.fromCharCode(...CODE.map((c, i) => c ^ MIX[i % MIX.length]));

const letters = (word, delay) => [...word].map((ch, i) =>
  `<span class="ph-l" style="animation-delay:${(delay + i * 0.06).toFixed(2)}s">${ch === " " ? "&nbsp;" : ch}</span>`).join("");

export function showContact(page, { onDone } = {}) {
  page.innerHTML = `
    <article class="ct">
      <svg class="ct-orbit" viewBox="0 0 1000 1000" aria-hidden="true">
        <circle cx="500" cy="500" r="430" pathLength="1"/>
        <circle cx="500" cy="500" r="266" pathLength="1"/>
        <g class="ct-moon"><circle cx="500" cy="70" r="5"/></g>
      </svg>
      <div class="ct-grid">
        <section class="ct-intro">
          <p class="label ct-kicker">Contact</p>
          <h1 class="ct-title"><span class="ph-row">${letters("Say hello.", 0.3)}</span></h1>
          <p class="ct-lede">Send a note with the form, or reveal my email address to write from your own mail app.</p>
          <div class="ct-reveal">
            <button class="ct-show" type="button" data-sfx>
              <span class="ct-show-ring" aria-hidden="true"></span>
              <span>Show email address</span>
            </button>
            <div class="ct-addr" hidden>
              <a class="ct-mail" href="#"></a>
              <div class="ct-addr-actions">
                <button class="v-btn ct-copy" type="button" data-sfx>Copy</button>
                <a class="v-btn ct-write" href="#" data-sfx>Open mail app</a>
                <span class="ct-copied" aria-live="polite"></span>
              </div>
            </div>
          </div>
        </section>

        <form class="ct-form" novalidate>
          <input type="hidden" name="subject" value="New message from mireu.org">
          <input type="hidden" name="from_name" value="mireu.org contact form">
          <!-- spam trap: hidden from people, bots tick it and get rejected -->
          <input type="checkbox" name="botcheck" class="ct-trap" tabindex="-1" autocomplete="off" aria-hidden="true">
          <label class="ct-field">
            <input name="name" type="text" autocomplete="name" required placeholder=" ">
            <span>Name</span>
          </label>
          <label class="ct-field">
            <input name="email" type="email" autocomplete="email" required placeholder=" ">
            <span>Email</span>
          </label>
          <label class="ct-field">
            <textarea name="message" rows="5" required placeholder=" "></textarea>
            <span>Message</span>
          </label>
          <div class="ct-send-row">
            <button class="ct-send" type="submit" data-sfx>
              <span class="roll"><span class="roll-line">Send message</span><span class="roll-line" aria-hidden="true">Send message</span></span>
            </button>
            <p class="ct-status" role="status" aria-live="polite"></p>
          </div>
          <div class="ct-done" hidden>
            <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" pathLength="1"/><path d="M15 27 l7 7 l15 -16" pathLength="1"/></svg>
            <p>Thank you. Your message is on its way.</p>
            <button class="ct-again" type="button" data-sfx>Write another</button>
          </div>
        </form>
      </div>
    </article>`;

  /* ---------- reveal ---------- */
  const show = page.querySelector(".ct-show");
  const box = page.querySelector(".ct-addr");
  const mail = page.querySelector(".ct-mail");
  const write = page.querySelector(".ct-write");
  const copied = page.querySelector(".ct-copied");
  show.addEventListener("click", () => {
    const a = address();
    mail.textContent = a;
    mail.href = write.href = `mailto:${a}`;
    show.classList.add("gone");
    setTimeout(() => { show.hidden = true; box.hidden = false; requestAnimationFrame(() => box.classList.add("in")); }, 350);
    audio.play("toggle");
  });
  page.querySelector(".ct-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(address());
      copied.textContent = "Copied";
    } catch {
      // clipboard blocked: select the address so it can be copied by hand
      getSelection().selectAllChildren(mail);
      copied.textContent = "Press ⌘C to copy";
    }
    audio.play("tick");
    clearTimeout(copied.t);
    copied.t = setTimeout(() => { copied.textContent = ""; }, 2400);
  });

  /* ---------- form ---------- */
  const form = page.querySelector(".ct-form");
  const status = page.querySelector(".ct-status");
  const send = page.querySelector(".ct-send");
  const done = page.querySelector(".ct-done");
  const fields = [...form.querySelectorAll(".ct-field input, .ct-field textarea")];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "ct-status";
    const bad = fields.find((f) => !f.checkValidity() || !f.value.trim());
    fields.forEach((f) => f.closest(".ct-field").classList.toggle("bad", !f.checkValidity() || !f.value.trim()));
    if (bad) {
      status.textContent = bad.name === "email" && bad.value ? "That email address doesn't look right." : "Please fill in every field.";
      status.classList.add("err");
      bad.focus();
      return;
    }
    if (!FORM_KEY) {
      status.textContent = "The form isn't connected yet. Please use the email address instead.";
      status.classList.add("err");
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.access_key = FORM_KEY;
    if (data.botcheck) return; // a bot ticked the trap: quietly do nothing
    delete data.botcheck;
    send.disabled = true;
    form.classList.add("sending");
    status.textContent = "Sending…";
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.status);
      form.classList.add("sent");
      done.hidden = false;
      requestAnimationFrame(() => done.classList.add("in"));
      status.textContent = "";
      audio.play("click");
    } catch (err) {
      console.warn("contact form", err);
      status.textContent = "Something went wrong sending that. Please try again, or use the email address.";
      status.classList.add("err");
    } finally {
      send.disabled = false;
      form.classList.remove("sending");
    }
  });
  fields.forEach((f) => f.addEventListener("input", () => f.closest(".ct-field").classList.remove("bad")));
  page.querySelector(".ct-again").addEventListener("click", () => {
    form.reset();
    done.classList.remove("in");
    done.hidden = true;
    form.classList.remove("sent");
    fields[0].focus();
  });

  requestAnimationFrame(() => onDone?.());
  return () => {};
}
