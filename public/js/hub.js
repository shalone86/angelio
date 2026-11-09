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
