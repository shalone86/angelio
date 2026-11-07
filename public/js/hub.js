// The hub page: one card per app, grouped by subject. Live apps open at angelio.org/<path>/.

import { SUBJECTS, APP_LIST } from "./apps.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const card = (a) => a.path
  ? `<a class="app-card" href="/${a.path}/">
      <img class="app-icon" src="/${a.path}/icon.svg" alt="" width="64" height="64" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'app-icon emoji',textContent:'${a.emoji}'}))">
      <span class="app-text"><b class="app-name">${esc(a.name)}</b><span class="app-grades">${esc(a.grades)}</span><span class="app-blurb">${esc(a.blurb)}</span></span>
      <span class="app-go" aria-hidden="true">▶</span>
    </a>`
  : `<div class="app-card soon" aria-disabled="true">
      <span class="app-icon emoji" aria-hidden="true">${a.emoji}</span>
      <span class="app-text"><b class="app-name">${esc(a.name)}</b><span class="app-grades">${esc(a.grades)} · Coming soon</span><span class="app-blurb">${esc(a.blurb)}</span></span>
    </div>`;

document.getElementById("apps").innerHTML = SUBJECTS.map((s) => {
  const apps = APP_LIST.filter((a) => a.subject === s.id).sort((x, y) => Number(!x.path) - Number(!y.path));
  return apps.length ? `<section class="subject"><h2>${s.emoji} ${esc(s.title)}</h2><div class="app-grid">${apps.map(card).join("")}</div></section>` : "";
}).join("");
