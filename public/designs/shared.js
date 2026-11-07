// Design previews: same app list as the real hub. Each page calls render(cardFn).
import { SUBJECTS, APP_LIST } from "../js/apps.js";
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
export function render(card, { group = true } = {}) {
  const el = document.getElementById("apps");
  if (!group) { el.innerHTML = APP_LIST.map(card).join(""); return; }
  el.innerHTML = SUBJECTS.map((s) => {
    const apps = APP_LIST.filter((a) => a.subject === s.id).sort((x, y) => Number(!x.path) - Number(!y.path));
    return `<section class="subject"><h2>${s.emoji} ${esc(s.title)}</h2><div class="grid">${apps.map(card).join("")}</div></section>`;
  }).join("");
}
