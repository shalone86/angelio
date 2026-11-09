// The hub page: one card per app, in a section per subject (the menu links to #math, #language,
// #history). Live apps open at angelio.org/<path>/; the rest show as "soon".

import { SUBJECTS, APP_LIST } from "./apps.js";
import { jingleOnce } from "./jingle.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const card = (a) => a.path
  ? `<a class="cardc" href="/${a.path}/"><img src="/${a.path}/icon.svg" alt="" width="72" height="72" loading="lazy"><b>${esc(a.name)}</b><small>${esc(a.grades)}</small><p>${esc(a.blurb)}</p></a>`
  : `<div class="cardc soon" aria-disabled="true"><span class="em" aria-hidden="true">${a.emoji}</span><b>${esc(a.name)}</b><small>${esc(a.grades)} · soon</small><p>${esc(a.blurb)}</p></div>`;

document.getElementById("apps").innerHTML = SUBJECTS.map((s) => {
  const apps = APP_LIST.filter((a) => a.subject === s.id).sort((x, y) => Number(!x.path) - Number(!y.path));
  return apps.length ? `<section class="subject" id="${s.id}"><h2>${s.emoji} ${esc(s.title)}</h2><div class="grid">${apps.map(card).join("")}</div></section>` : "";
}).join("");

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
codeForm?.addEventListener("submit", (e) => { e.preventDefault(); showCode(codeIn.value.trim().toUpperCase(), { fresh: true }); });
if (codeForm) showCode(getCode());
