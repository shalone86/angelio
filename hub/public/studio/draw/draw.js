// The Studio's Drawings page: a checklist of what each game needs, with his MagicaVoxel models (.vox, uploaded
// here) and the Lesson Studio's Pixel art editor (pixels.js, a copy) for pixel drawings. Everything is saved online
// (R2, through the Worker's /api/admin/studio/art routes); anyone can read it at /api/art and /api/art/vox?slug=…,
// so Claude sees each one as soon as it's saved.
import { CHECKLISTS } from "/js/art-content.js";
import { readVox } from "/js/vox.js";
import { readVoxMaterials, usedMaterials } from "./voxmat.js";
import { voxThumb, voxViewer } from "./voxview.js";
import { pewVox } from "/js/voxwrite.js";

// Pieces the games already draw themselves, ready to download as .vox (to try his people beside them in MagicaVoxel)
const GAME_PIECES = { pew: { make: pewVox, file: "game-pew.vox", label: "Download the game's pew (.vox)" } };
function download(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  const a = h("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* fine */ } } };
let key = store.get("angelio:admin") || "";
let art = { drawings: {}, voxels: {}, favorites: [], done: {} };
let detail = null; // the item open in the detail view
let viewer = null; // its turning preview
const voxCache = new Map(); // slug → {saved, vox, materials, matInfo, thumb}
let tab = null; // the open editor
let listId = store.get("draw:list") || CHECKLISTS[0].id;
let previewMatl = true;
let previewDark = false;

// ── talking to the Worker ──
async function studio(path, body) {
  const r = await fetch(`/api/admin/studio${path}`, body === undefined ? { headers: { "x-admin-key": key } }
    : { method: "POST", headers: { "x-admin-key": key, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { askKey("That key didn't work."); throw new Error("Wrong key"); }
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  if (j.drawings || j.art) art = j.art ?? { drawings: j.drawings, voxels: j.voxels ?? {}, favorites: j.favorites, done: j.done };
  art.voxels ??= {};
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

// ── voxel models ──
/** His model for a slug, read once per save. */
async function model(slug) {
  const v = art.voxels[slug];
  if (!v) return null;
  const c = voxCache.get(slug);
  if (c?.saved === v.saved) return c;
  const r = await fetch(`/api/art/vox?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(v.saved)}`);
  if (!r.ok) return null;
  const bytes = await r.arrayBuffer();
  const vox = readVox(bytes);
  const materials = readVoxMaterials(bytes);
  const matInfo = usedMaterials(vox, materials);
  const got = { saved: v.saved, vox, materials, matInfo, thumb: voxThumb(vox, 128, materials) };
  voxCache.set(slug, got);
  return got;
}
async function uploadVox(slug, file) {
  const bytes = await file.arrayBuffer();
  try { readVox(bytes); } catch (e) { alert(e.message); return; } // say what's wrong before sending it
  const r = await fetch(`/api/admin/studio/art/vox?slug=${encodeURIComponent(slug)}`, { method: "POST", headers: { "x-admin-key": key, "content-type": "application/octet-stream" }, body: bytes });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) return askKey("That key didn't work.");
  if (!r.ok) return alert("Couldn't upload it: " + (j.error || r.status));
  art = j.art;
  voxCache.delete(slug);
}

// ── the key ──
function askKey(msg = "") { $("key").hidden = false; $("keyErr").textContent = msg; $("keyIn").focus(); }
$("keyGo").onclick = () => { key = $("keyIn").value.trim(); store.set("angelio:admin", key); $("key").hidden = true; load(); };
$("keyIn").onkeydown = (e) => { if (e.key === "Enter") $("keyGo").click(); };

// ── the editor ──
function openEditor(start) {
  stopViewer();
  $("list").hidden = true;
  tab = window.PixelTab.open($("editor"), api, post, window.DrawReference, { start });
  history.pushState({ editor: true }, "");
}
async function closeEditor(fromBack) {
  if (tab?.dirty() && !(await window.ask("Leave this drawing without saving?"))) { if (fromBack) history.pushState({ editor: true }, ""); return; }
  tab = null; $("editor").replaceChildren(); $("list").hidden = false;
  if (!fromBack && history.state?.editor) history.back();
  try { await studio("/art"); } catch { /* keep what we have */ }
  detail ? renderDetail() : render();
}
$("go-home").onclick = () => closeEditor(false);
function stopViewer() { viewer?.stop(); viewer = null; }
addEventListener("popstate", () => { if (tab) closeEditor(true); });
// (the detail view's back is handled after renderDetail)
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
const made = (slug) => !!(art.voxels[slug] || art.drawings[slug]);
function status(it) {
  const v = art.voxels[it.slug], d = art.drawings[it.slug];
  if (v) {
    const c = voxCache.get(it.slug);
    const matl = c?.saved === v.saved && c.matInfo?.totalSpecial ? ` · ✨ MATL: ${c.matInfo.summary}` : "";
    return `Model · ${v.frames} frame${v.frames === 1 ? "" : "s"}, ${v.size.join(" × ")}${matl}`;
  }
  if (d) return `Pixel drawing · ${d.width} × ${d.height}`;
  return "Not made yet";
}
function picture(it) {
  const c = voxCache.get(it.slug);
  if (art.voxels[it.slug] && c?.saved === art.voxels[it.slug].saved && c.thumb) return h("img", { class: "cl-thumb drawn", src: c.thumb, alt: "" });
  if (art.voxels[it.slug]) { model(it.slug).then((m) => { if (m && !detail && !tab) render(); }).catch(() => {}); return h("span", { class: "cl-thumb drawn", text: "…" }); }
  if (art.drawings[it.slug]) return thumb(art.drawings[it.slug]);
  return h("span", { class: "cl-thumb", text: it.size ? `${it.size[0]}×${it.size[1]}` : "" });
}
const tick = (it) => h("button", { class: "cl-check", type: "button", "aria-pressed": String(!!art.done[it.slug]), "aria-label": `${it.label}: done`, text: art.done[it.slug] ? "✓" : "",
  disabled: !made(it.slug) || null, title: made(it.slug) ? "Tick when it's finished" : "Make it first",
  onclick: async () => { try { await studio("/art/done", { slug: it.slug, on: !art.done[it.slug] }); detail ? renderDetail() : render(); } catch (e) { if (e.message !== "Wrong key") alert("Couldn't tick it: " + e.message); } } });

function render() {
  stopViewer(); detail = null;
  const list = CHECKLISTS.find((l) => l.id === listId) ?? CHECKLISTS[0];
  const done = list.items.filter((i) => art.done[i.slug]).length;
  const tabs = h("div", { class: "cl-tabs", role: "group", "aria-label": "Checklists" }, CHECKLISTS.map((l) =>
    h("button", { type: "button", "aria-pressed": String(l.id === list.id), text: l.title.replace(/^Candle Rack: (.)/, (_, c) => c.toUpperCase()), onclick: () => { listId = l.id; store.set("draw:list", l.id); render(); } })));
  const rows = list.items.map((it) => h("li", { class: "cl-item" + (art.done[it.slug] ? " done" : "") }, [
    h("button", { class: "cl-open", type: "button", "aria-label": `Open ${it.label}`, onclick: () => { detail = it; history.pushState({ detail: true }, ""); renderDetail(); } }, [
      picture(it),
      h("span", { class: "cl-text" }, [h("strong", { text: it.label }), h("small", { text: status(it) + (it.note ? ". " + it.note : "") }), h("code", { text: it.slug + ".vox" })]),
    ]),
    tick(it),
  ]));
  $("list").replaceChildren(
    h("h1", {}, [h("img", { src: "/icon.svg", alt: "" }), "Drawings"]),
    tabs,
    h("div", { class: "cl-head" }, [h("b", { text: list.title }), h("span", { class: "small muted", text: `${done} of ${list.items.length} done` })]),
    h("div", { class: "cl-bar", "aria-hidden": "true" }, [h("i", { style: `width:${(100 * done / list.items.length).toFixed(1)}%` })]),
    list.note ? h("p", { class: "cl-note", text: list.note }) : null,
    h("details", { class: "cl-tips" }, [h("summary", { text: "Making models in MagicaVoxel" }), h("ul", {}, [
      "Name each file like the list: priest-idle.vox, server-light.vox. Uploading by the item works too.",
      "People are 8 × 8 × 8 and face the front. Things can be any size; a nun is 8 tall, so match her.",
      "Each animation frame is its own model, in order, in one file.",
      "Parts that change with the season: pink (#FF77A8), a darker pink for shade.",
      "Experiment: MagicaVoxel Render materials (Emit, Glass, Metal, Cloud) show up in this checklist preview, not in the games yet.",
      "You can drop several .vox files here at once: each goes to the item with its name.",
    ].map((t) => h("li", { text: t })))]),
    h("label", { class: "btn cl-drop" }, ["Upload .vox files…", h("input", { type: "file", accept: ".vox", multiple: true, hidden: true, onchange: (e) => uploadMany(e.target.files) })]),
    h("ul", { class: "cl-list" }, rows),
    h("div", { class: "cl-more" }, [h("button", { class: "btn", type: "button", text: "All my pixel drawings", onclick: () => openEditor(null) })]),
  );
}
/** Several files at once: each goes to the item named like it (priest-idle.vox → priest-idle). */
async function uploadMany(files) {
  const known = new Set(CHECKLISTS.flatMap((l) => l.items.map((i) => i.slug)));
  const odd = [];
  for (const f of files) {
    const slug = f.name.replace(/\.vox$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!known.has(slug)) { odd.push(f.name); continue; }
    await uploadVox(slug, f);
  }
  if (odd.length) alert(`Not on a checklist, so not uploaded: ${odd.join(", ")}. Open the item and upload it there, or rename the file.`);
  render();
}

function renderDetail() {
  stopViewer();
  const it = detail, v = art.voxels[it.slug];
  const stageEl = h("div", { class: "dt-stage" + (v && previewDark ? " dark" : "") });
  const matNote = v ? h("p", { class: "matl-note", text: "Loading model preview…" }) : null;
  let loadedModel = null, currentFps = v?.fps ?? 4;
  const startViewer = () => {
    if (!loadedModel || detail !== it) return;
    stopViewer();
    viewer = voxViewer(stageEl, loadedModel.vox, {
      fps: currentFps,
      materials: previewMatl ? loadedModel.materials : null,
      dark: previewDark,
    });
  };
  const matBtn = v ? h("button", { class: "btn small", type: "button", "aria-pressed": String(previewMatl), text: "✨ Preview MATL",
    onclick: () => { previewMatl = !previewMatl; matBtn.setAttribute("aria-pressed", String(previewMatl)); startViewer(); } }) : null;
  const darkBtn = v ? h("button", { class: "btn small", type: "button", "aria-pressed": String(previewDark), text: "🌙 Dark stage",
    onclick: () => { previewDark = !previewDark; darkBtn.setAttribute("aria-pressed", String(previewDark)); stageEl.classList.toggle("dark", previewDark); startViewer(); } }) : null;
  const back = () => { if (history.state?.detail) history.back(); else render(); };
  $("list").replaceChildren(...[ // (a missing piece is left out, not shown as "null")
    h("div", { class: "dt-top" }, [h("button", { class: "btn", type: "button", text: "← Checklist", onclick: back }), h("span", { style: "flex:1" }), tick(it)]),
    h("h1", { text: it.label }),
    h("p", { class: "cl-note", text: [status(it), it.note].filter(Boolean).join(". ") }),
    stageEl,
    v ? h("div", { class: "dt-toggles" }, [matBtn, darkBtn]) : null,
    matNote,
    h("div", { class: "cl-more" }, [
      h("label", { class: "btn primary" }, [v ? "Replace the .vox…" : "Upload a .vox…", h("input", { type: "file", accept: ".vox", hidden: true, onchange: async (e) => { if (e.target.files[0]) { await uploadVox(it.slug, e.target.files[0]); renderDetail(); } } })]),
      h("button", { class: "btn", type: "button", text: art.drawings[it.slug] ? "Open the pixel drawing" : "Draw it in pixels", onclick: () => openEditor({ slug: it.slug, name: it.slug, width: it.size?.[0] ?? 16, height: it.size?.[1] ?? 16 }) }),
      v ? h("button", { class: "btn", type: "button", text: "Remove the model", onclick: async () => {
        if (!(await window.ask("Remove this model? It's kept in the trash, so Claude can bring it back."))) return;
        try { await studio("/art/vox-delete", { slug: it.slug }); voxCache.delete(it.slug); renderDetail(); } catch (e) { alert("Couldn't remove it: " + e.message); } } }) : null,
    ]),
    GAME_PIECES[it.download] ? h("div", { class: "cl-more" }, [h("button", { class: "btn", type: "button", text: GAME_PIECES[it.download].label, onclick: () => download(GAME_PIECES[it.download].make(), GAME_PIECES[it.download].file) })]) : null,
    v && v.frames > 1 ? speedControl(it.slug, v, (n) => { currentFps = n; }) : null,
    h("code", { class: "small muted", text: `${it.slug}.vox` }),
  ].filter(Boolean));
  if (v) model(it.slug).then((m) => {
    if (detail !== it || !m) return;
    loadedModel = m;
    matNote.textContent = m.matInfo?.totalSpecial
      ? `✨ MATL experiment (preview only — not in games yet): ${m.matInfo.summary}`
      : "MATL experiment ready: all voxels are Diffuse. Try Emit, Glass, Metal, or Cloud in MagicaVoxel's Render tab.";
    startViewer();
  }).catch((e) => { stageEl.textContent = "Couldn't show it: " + e.message; });
  else if (art.drawings[it.slug]) { const c = thumb(art.drawings[it.slug]); c.className = "dt-pixels"; stageEl.replaceChildren(c); }
  else if (GAME_PIECES[it.download]) { viewer = voxViewer(stageEl, readVox(GAME_PIECES[it.download].make()), { fps: 4 }); stageEl.append(h("p", { class: "small muted center", text: "The game's own pew, until you upload yours." })); }
  else stageEl.replaceChildren(h("span", { class: "muted", text: "Nothing here yet. Upload the model from MagicaVoxel, or draw it in pixels." }));
}
addEventListener("popstate", () => { if (detail && !tab) render(); });

/** How fast an animation plays in the games: a slider that changes the preview at once and saves when let go. */
function speedControl(slug, v, onFps) {
  const label = h("span", { text: "" });
  const say = (n) => { label.textContent = `Speed: ${n} frame${n === 1 ? "" : "s"} a second` + (n === 4 ? " (the usual)" : ""); };
  say(v.fps ?? 4);
  const range = h("input", { type: "range", min: 1, max: 12, step: 1, value: v.fps ?? 4, "aria-label": "Animation speed",
    oninput: (e) => { const n = Number(e.target.value); say(n); onFps?.(n); viewer?.setFps(n); },
    onchange: async (e) => { try { await studio("/art/vox-speed", { slug, fps: Number(e.target.value) }); } catch (err) { if (err.message !== "Wrong key") alert("Couldn't save the speed: " + err.message); } } });
  return h("label", { class: "dt-speed" }, [label, range]);
}

async function load() {
  if (!key) { render(); return askKey(); }
  try { await studio("/art"); } catch (e) { if (e.message !== "Wrong key") alert("Couldn't load the drawings: " + e.message); }
  render();
}
load();
