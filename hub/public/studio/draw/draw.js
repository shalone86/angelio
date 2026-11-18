// The Studio's Drawings page: a checklist of what each game needs drawn, and the Lesson Studio's Pixel art
// editor (pixels.js, a copy) to draw them on a phone. Drawings are saved online (R2, through the Worker's
// /api/admin/studio/art routes) and anyone can read them at /api/art, so Claude sees each one as soon as it's saved.
import { CHECKLISTS } from "/js/art-content.js";

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* fine */ } } };
let key = store.get("angelio:admin") || "";
let art = { drawings: {}, favorites: [], done: {} };
let tab = null; // the open editor
let listId = store.get("draw:list") || CHECKLISTS[0].id;

// ── talking to the Worker ──
async function studio(path, body) {
  const r = await fetch(`/api/admin/studio${path}`, body === undefined ? { headers: { "x-admin-key": key } }
    : { method: "POST", headers: { "x-admin-key": key, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { askKey("That key didn't work."); throw new Error("Wrong key"); }
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  if (j.drawings || j.art) art = j.art ?? { drawings: j.drawings, favorites: j.favorites, done: j.done };
  return j;
}
const sprites = () => Object.entries(art.drawings).map(([slug, d]) => ({ slug, favorite: art.favorites.includes(slug), at: Date.parse(d.saved) || 0, ...d }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

// The editor asks for the Lesson Studio's addresses; these answer them from angelio.org.
const MAC_ONLY = "That only works in the Lesson Studio on your Mac.";
async function api(path) {
  if (path === "/api/sprites") { await studio("/art"); return sprites(); }
  if (path === "/api/puppet-bases") return { bases: [], versions: {}, cast: [] };
  throw new Error(MAC_ONLY);
}
async function post(path, data) {
  if (path === "/api/sprite") { const j = await studio("/art/save", data); return { slug: j.slug, sprites: sprites() }; }
  if (path === "/api/sprite/delete") { await studio("/art/delete", data); return { sprites: sprites() }; }
  if (path === "/api/sprite/favorite") { await studio("/art/favorite", data); return { sprites: sprites() }; }
  throw new Error(MAC_ONLY);
}

// ── the key ──
function askKey(msg = "") { $("key").hidden = false; $("keyErr").textContent = msg; $("keyIn").focus(); }
$("keyGo").onclick = () => { key = $("keyIn").value.trim(); store.set("angelio:admin", key); $("key").hidden = true; load(); };
$("keyIn").onkeydown = (e) => { if (e.key === "Enter") $("keyGo").click(); };

// ── the editor ──
function openEditor(start) {
  $("list").hidden = true;
  tab = window.PixelTab.open($("editor"), api, post, window.DrawReference, { start });
  history.pushState({ editor: true }, "");
}
async function closeEditor(fromBack) {
  if (tab?.dirty() && !(await window.ask("Leave this drawing without saving?"))) { if (fromBack) history.pushState({ editor: true }, ""); return; }
  tab = null; $("editor").replaceChildren(); $("list").hidden = false;
  if (!fromBack && history.state?.editor) history.back();
  render();
}
$("go-home").onclick = () => closeEditor(false);
addEventListener("popstate", () => { if (tab) closeEditor(true); });
addEventListener("beforeunload", (e) => { if (tab?.dirty()) { e.preventDefault(); e.returnValue = ""; } });

// ── the checklist ──
const h = (tag, attrs = {}, kids = []) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); } e.append(...[].concat(kids).filter(Boolean)); return e; };
const CODES = "0123456789abcdefghijklmnopqrstuvwxyz";
function thumb(d) {
  const c = h("canvas", { class: "cl-thumb drawn", width: d.width, height: d.height, "aria-hidden": "true" });
  const g = c.getContext("2d");
  d.frames[d.frames.length > 1 ? 1 : 0].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") { g.fillStyle = d.palette[CODES.indexOf(ch)]; g.fillRect(x, y, 1, 1); } }));
  c.style.objectFit = "contain";
  return c;
}
function render() {
  const list = CHECKLISTS.find((l) => l.id === listId) ?? CHECKLISTS[0];
  const done = list.items.filter((i) => art.done[i.slug]).length;
  const tabs = h("div", { class: "cl-tabs", role: "group", "aria-label": "Checklists" }, CHECKLISTS.map((l) =>
    h("button", { type: "button", "aria-pressed": String(l.id === list.id), text: l.title.replace(/^Candle Rack: /, ""), onclick: () => { listId = l.id; store.set("draw:list", l.id); render(); } })));
  const rows = list.items.map((it) => {
    const d = art.drawings[it.slug], [w, hh] = it.size;
    const open = () => openEditor({ slug: it.slug, name: it.slug, width: w, height: hh });
    const check = h("button", { class: "cl-check", type: "button", "aria-pressed": String(!!art.done[it.slug]), "aria-label": `${it.label}: done`, text: art.done[it.slug] ? "✓" : "",
      disabled: !d || null, title: d ? "Tick when it's finished" : "Draw it first",
      onclick: async () => { try { await studio("/art/done", { slug: it.slug, on: !art.done[it.slug] }); render(); } catch (e) { if (e.message !== "Wrong key") alert("Couldn't tick it: " + e.message); } } });
    return h("li", { class: "cl-item" + (art.done[it.slug] ? " done" : "") }, [
      h("button", { class: "cl-open", type: "button", "aria-label": `Draw the ${it.label}`, onclick: open }, [
        d ? thumb(d) : h("span", { class: "cl-thumb", text: `${w}×${hh}` }),
        h("span", { class: "cl-text" }, [h("strong", { text: it.label }),
          h("small", { text: (d ? "Drawn · " : "Not drawn yet · ") + `${w} × ${hh}` + (it.note ? ". " + it.note : "") }),
          h("code", { text: it.slug })]),
      ]),
      check,
    ]);
  });
  $("list").replaceChildren(
    h("h1", {}, [h("img", { src: "/icon.svg", alt: "" }), "Drawings"]),
    tabs,
    h("div", { class: "cl-head" }, [h("b", { text: list.title }), h("span", { class: "small muted", text: `${done} of ${list.items.length} done` })]),
    h("div", { class: "cl-bar", "aria-hidden": "true" }, [h("i", { style: `width:${(100 * done / list.items.length).toFixed(1)}%` })]),
    list.note ? h("p", { class: "cl-note", text: list.note }) : null,
    h("details", { class: "cl-tips" }, [h("summary", { text: "Drawing for blocks (voxels)" }), h("ul", {}, [
      "Draw each piece on its own, from straight in front (no angle).",
      "No painted shadows or dithering: the 3D light does the shading.",
      "Keep pixels touching: a lone pixel becomes a floating block.",
      "A nun is 8 tall: size things to match her.",
      "Parts that change with the season: PICO-8 pink (#FF77A8), a darker pink for shade.",
    ].map((t) => h("li", { text: t })))]),
    h("ul", { class: "cl-list" }, rows),
    h("div", { class: "cl-more" }, [h("button", { class: "btn", type: "button", text: "All my drawings", onclick: () => openEditor(null) })]),
  );
}

async function load() {
  if (!key) { render(); return askKey(); }
  try { await studio("/art"); } catch (e) { if (e.message !== "Wrong key") alert("Couldn't load the drawings: " + e.message); }
  render();
}
load();
