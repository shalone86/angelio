// The hub page: a tile per live app, in a section per subject (the menu links to #math, #language,
// #faith). Live apps open at angelio.org/<path>/; the rest are one "coming soon" row.

import { SUBJECTS, APP_LIST } from "./apps.js";
import { jingleOnce } from "./jingle.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Each live game is a big icon tile (tap: play); 🔊 reads its name and what it is. Coming-soon games
// are one small row at the bottom, so the page stays short.
const tile = (a) => `
  <div class="tile">
    <a class="tile-go" href="/${a.path}/" aria-label="${esc(a.name)}: ${esc(a.blurb)}">
      <img src="/${a.path}/icon.svg" alt="" width="88" height="88" loading="lazy">
      <b>${esc(a.name)}</b><small>${esc(a.grades)}</small><p>${esc(a.blurb)}</p>
    </a>
    <button type="button" class="tile-say" data-say="${esc(`${a.name}. ${a.blurb}`)}" aria-label="Hear about ${esc(a.name)}">🔊</button>
  </div>`;

document.getElementById("apps").innerHTML = SUBJECTS.map((s) => {
  const live = APP_LIST.filter((a) => a.subject === s.id && a.path);
  return live.length ? `<section class="subject" id="${s.id}" style="--c:${s.color}"><h2><span aria-hidden="true">${s.emoji}</span> ${esc(s.title)}</h2><div class="tiles">${live.map(tile).join("")}</div></section>` : "";
}).join("");

const soon = APP_LIST.filter((a) => !a.path);
document.getElementById("soon").innerHTML = soon.length ? `<section class="soon-row" aria-label="Coming soon"><h3>Coming soon</h3>
  <div>${soon.map((a) => `<span class="chip" title="${esc(a.blurb)}"><span aria-hidden="true">${a.emoji}</span> ${esc(a.name)}</span>`).join("")}</div></section>` : "";

// 🔊 on a tile: the games' own voice (any app's /api/tts works through the hub), or the device voice.
let playing;
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-say]");
  if (!b) return;
  const text = b.dataset.say;
  try { playing?.pause(); speechSynthesis?.cancel(); } catch { /* ignore */ }
  b.classList.add("saying");
  const done = () => b.classList.remove("saying");
  try {
    const r = await fetch(`/snap/api/tts?${new URLSearchParams({ text, voice: "", v: "4" })}`);
    if (!r.ok) throw new Error("voice");
    playing = new Audio(URL.createObjectURL(await r.blob()));
    playing.onended = done;
    await playing.play();
  } catch {
    try { const u = new SpeechSynthesisUtterance(text); u.onend = done; speechSynthesis.speak(u); } catch { done(); }
  }
});

// A soft halo chime on the first tap of a visit (browsers don't allow sound before a tap).
jingleOnce("angelio");

// "Copy our address": always the real one.
document.querySelector("[data-copy]")?.addEventListener("click", async (e) => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText("https://angelio.org"); b.textContent = "✅ Copied: angelio.org"; }
  catch { b.textContent = "angelio.org"; }
});

// Family code for speech checks: saved on this device (localStorage "angelio:code"); every game on
// angelio.org sends it with a speech check (header x-angelio-code), see worker/codes.js.
const codeForm = document.getElementById("code-form"), codeIn = document.getElementById("code-in"), codeStatus = document.getElementById("code-status");
const getCode = () => { try { return localStorage.getItem("angelio:code") || ""; } catch { return ""; } };
async function showCode(code, { fresh = false } = {}) {
  if (!code) { codeStatus.className = "code-status"; codeStatus.textContent = ""; codeForm.hidden = false; return; }
  codeStatus.className = "code-status"; codeStatus.textContent = "Checking…";
  try {
    const r = await (await fetch(`/api/code?c=${encodeURIComponent(code)}`)).json();
    if (!r.valid) {
      codeStatus.className = "code-status bad";
      codeStatus.textContent = r.revoked ? "That code has been turned off." : "That code doesn't work. Check the letters and try again.";
      if (!fresh) { try { localStorage.removeItem("angelio:code"); } catch { /* ignore */ } }
      codeForm.hidden = false;
      return;
    }
    try { localStorage.setItem("angelio:code", code); } catch { /* ignore */ }
    codeForm.hidden = true;
    codeStatus.className = "code-status ok";
    codeStatus.innerHTML = `✅ Code on for the ${esc(r.name)}: ${r.left} of ${r.limit} speech checks left this month. <button type="button" data-forget>Remove</button>`;
    codeStatus.querySelector("[data-forget]").onclick = () => { try { localStorage.removeItem("angelio:code"); } catch { /* ignore */ } codeIn.value = ""; showCode(""); };
  } catch {
    codeStatus.className = "code-status bad"; codeStatus.textContent = "Couldn't check the code right now. Try again in a minute.";
  }
}
// "Get a family code" (Stripe). While the link is a Stripe TEST link, the button only shows on
// angelio.org/?testbuy (for trying it out); with the live link it shows for everyone.
{
  const buy = document.querySelector("[data-buy]"), link = buy?.querySelector("a")?.href ?? "";
  let testing = false;
  try { testing = new URLSearchParams(location.search).has("testbuy") || sessionStorage.getItem("angelio:testbuy") === "1"; if (testing) sessionStorage.setItem("angelio:testbuy", "1"); } catch { /* ignore */ }
  if (buy && (!link.includes("/test_") || testing)) buy.hidden = false;
}

codeForm?.addEventListener("submit", (e) => { e.preventDefault(); showCode(codeIn.value.trim().toUpperCase(), { fresh: true }); });
if (codeForm) showCode(getCode());
