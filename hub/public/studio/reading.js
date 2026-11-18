// Angelio Studio: the reading lessons of Letter Lane (Kindergarten) and Read Aloud (1st to 3rd grade). A lesson
// teaches some chunks (sh, ai, -ing…) with picture words, more words and sentences; the games make the questions.
// The preview runs the real game (/letters/ or /read/ with ?studio) on the unsaved lessons. Save makes them live:
// both apps load them from /api/content/reading. Rules: /js/reading-content.js (the same ones the server uses).
import * as P from "/letters/js/phonics.js";
import { validateReading, checkPattern, GRADE_NAMES, SENTENCE_WORDS } from "/js/reading-content.js";

const $ = (id) => document.getElementById(id);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k in el && typeof v !== "string") el[k] = v;
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const toast = (t, ms = 2600) => { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, ms); };
const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "lesson";

let key = (() => { try { return localStorage.getItem("angelio:admin") || sessionStorage.getItem("angelio:admin") || ""; } catch { return ""; } })();
let doc = null, version = null, saved = "", savedIds = new Set(), sel = null, query = "";
const notes = new Set(), DRAFT = "studio:reading:draft";
const lessons = () => doc.patterns;
const lesson = () => lessons().find((p) => p.id === sel);

async function api(path, opts = {}) {
  const r = await fetch(`/api/admin/studio${path}`, { ...opts, headers: { "x-admin-key": key, ...(opts.headers ?? {}) } });
  if (r.status === 401) { askKey("That admin key didn't work."); throw new Error("key"); }
  return r;
}
function askKey(msg = "") { $("keyModal").hidden = false; $("keyErr").textContent = msg; $("keyIn").focus(); }
$("keyGo").onclick = () => { key = $("keyIn").value.trim(); try { localStorage.setItem("angelio:admin", key); } catch { /* ignore */ } $("keyModal").hidden = true; load(); };
$("keyIn").onkeydown = (e) => { if (e.key === "Enter") $("keyGo").click(); };

async function load() {
  if (!key) return askKey();
  let j;
  try { j = await (await api("/reading")).json(); } catch (e) { if (e.message !== "key") $("editCol").innerHTML = `<div class="empty">Couldn't load the lessons. Check the internet and reload.</div>`; return; }
  doc = j.library; version = j.version; saved = JSON.stringify(doc);
  savedIds = new Set(lessons().map((p) => p.id));
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || "null");
    if (d?.base === version && JSON.stringify(d.doc) !== saved && confirm("You have changes that weren't saved yet. Keep working on them?")) { doc = d.doc; (d.notes ?? []).forEach((n) => notes.add(n)); }
    else if (d && d.base !== version) localStorage.removeItem(DRAFT);
  } catch { /* ignore */ }
  sel = new URLSearchParams(location.search).get("id") ?? lessons()[0]?.id;
  renderList(); renderEditor(); state(); startPreview();
}

// ───────── changes and saving ─────────
const dirty = () => JSON.stringify(doc) !== saved;
let previewTimer;
function changed(note, { list = true, editor = false } = {}) {
  if (note) notes.add(note);
  try { localStorage.setItem(DRAFT, JSON.stringify({ base: version, doc, notes: [...notes] })); } catch { /* ignore */ }
  if (list) renderList();
  if (editor) renderEditor(); else lessonProblems();
  state();
  clearTimeout(previewTimer); previewTimer = setTimeout(sendPreview, 500);
}
function state() {
  const { errors } = validateReading(doc, P);
  const d = dirty();
  $("saveBtn").disabled = !d || errors.length > 0;
  $("saveBtn").textContent = d ? "Save · make it live" : "Saved";
  $("state").textContent = errors.length ? `⚠️ ${errors.length} thing${errors.length > 1 ? "s" : ""} to fix before saving` : d ? "Not saved yet" : "Everything is live ✓";
}
$("saveBtn").onclick = async () => {
  const note = [...notes].slice(0, 3).join(", ").slice(0, 60);
  $("saveBtn").disabled = true; $("state").textContent = "Saving…";
  let r;
  try { r = await api(`/reading?base=${encodeURIComponent(version)}&note=${encodeURIComponent(note)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(doc) }); }
  catch (e) { if (e.message !== "key") toast("Couldn't save: no internet?"); state(); return; }
  const j = await r.json().catch(() => ({}));
  if (r.status === 409) { toast(j.error, 6000); $("state").textContent = "Changed somewhere else: reload the page"; return; }
  if (!r.ok) { toast(j.errors?.[0] ?? j.error ?? `Couldn't save (${r.status})`, 6000); state(); return; }
  version = j.version; saved = JSON.stringify(doc); notes.clear(); savedIds = new Set(lessons().map((p) => p.id));
  try { localStorage.removeItem(DRAFT); } catch { /* ignore */ }
  state(); toast("Saved. It's live in Letter Lane and Read Aloud ✓");
};
addEventListener("beforeunload", (e) => { if (doc && dirty()) e.preventDefault(); });

// ───────── preview: the real game ─────────
const appFor = (p) => (p?.grade <= 2 ? "letters" : "read");
let previewApp = null, previewReady = false;
function startPreview() {
  const p = lesson();
  previewApp = appFor(p); previewReady = false;
  $("frame").src = `/${previewApp}/?studio=1${p ? `#/play/${p.id}` : "#/"}`;
}
addEventListener("message", (e) => { if (e.origin === location.origin && e.data?.type === "studio-ready") { previewReady = true; sendPreview(); } });
function sendPreview() {
  const p = lesson();
  if (p && appFor(p) !== previewApp) return startPreview();
  if (!previewReady) return;
  // Show this lesson even while it's hidden, so it can be tried before it's ready.
  const patterns = lessons().map((x) => (x === p ? { ...x, hidden: undefined } : x));
  $("frame").contentWindow.postMessage({ type: "studio", patterns, go: p ? `#/play/${p.id}` : "#/" }, location.origin);
}
$("wideBtn").onclick = () => $("frame").classList.toggle("wide");
$("restartBtn").onclick = () => startPreview();

// ───────── the list, by grade and level ─────────
$("search").oninput = () => { query = $("search").value.trim().toLowerCase(); renderList(); };
function renderList() {
  const box = $("list"); box.innerHTML = "";
  for (const g of [2, 3, 4, 5]) for (const lv of [1, 2]) {
    const items = lessons().filter((p) => p.grade === g && p.level === lv && (!query || `${p.title} ${p.focus?.join(" ")}`.toLowerCase().includes(query)));
    if (!items.length) continue;
    box.append(h("div", { class: "group-title" }, `${GRADE_NAMES[g]} · Level ${lv}`));
    for (const p of items) {
      const n = checkPattern(p, P).errors.length;
      box.append(h("button", { class: `item${p.id === sel ? " on" : ""}`, onclick: () => { sel = p.id; history.replaceState(null, "", `?id=${p.id}`); renderList(); renderEditor(); sendPreview(); } },
        h("span", { class: "em" }, p.emoji ?? "🔤"),
        h("span", { class: "t" }, h("span", { class: "tt" }, p.title), (p.hidden || n) ? h("span", { class: "chips" },
          p.hidden ? h("span", { class: "chip hid" }, "hidden") : null, n ? h("span", { class: "chip warn" }, `${n} to fix`) : null) : null)));
    }
  }
}
$("newBtn").onclick = () => {
  const base = lesson() ?? lessons()[0];
  let id = "new-lesson", k = 2;
  while (lessons().some((p) => p.id === id)) id = `new-lesson-${k++}`;
  const p = { id, grade: base?.grade ?? 2, level: base?.level ?? 1, title: "New lesson", emoji: "🔤", focus: [], teach: "", say: "",
    pictures: [["", ""]], words: [""], sentences: [["", ""]], hidden: true };
  lessons().splice(lessons().indexOf(base) + 1, 0, p);
  sel = id; changed("Added a lesson", { editor: true });
  toast("New and hidden: fill it in, try it in the preview, then untick Hide.");
};

// ───────── the editor ─────────
const card = (title, ...kids) => h("div", { class: "card" }, h("h3", {}, ...[].concat(title)), ...kids);
function input(value, set, attrs = {}) {
  const el = h(attrs.area ? "textarea" : "input", { type: attrs.area ? undefined : "text", placeholder: attrs.placeholder, rows: attrs.rows });
  el.value = value ?? "";
  el.oninput = () => { set(el.value); attrs.after?.(); changed(attrs.note ?? null, { list: attrs.list ?? false }); };
  return el;
}
const labeled = (label, el) => h("div", {}, h("label", { class: "f" }, label), el);
function lessonProblems() {
  const box = $("lessonProblems"), p = lesson();
  if (!box || !p) return;
  const { errors, warnings } = checkPattern(p, P);
  box.innerHTML = "";
  if (errors.length) box.append(h("ul", { class: p.hidden ? "warns" : "problems" }, ...errors.slice(0, 10).map((e) => h("li", {}, e.replace(/^“[^”]*”: /, "")))));
  else if (warnings.length) box.append(h("ul", { class: "warns" }, ...warnings.map((e) => h("li", {}, e.replace(/^“[^”]*”: /, "")))));
  if (p.hidden && errors.length) box.prepend(h("p", { class: "muted", style: "margin:0 0 4px" }, "While it's hidden you can save it unfinished. These need fixing before it can be shown:"));
}
/** "sh|i|p" drawn as chunks, the ones the lesson teaches highlighted. */
function chunkPreview(p, spec) {
  const out = h("span", { class: "chunks" });
  const fill = () => {
    out.innerHTML = "";
    if (!spec()) return;
    let ch; try { ch = P.chunks(spec(), p.syllables); } catch { return; }
    const f = new Set(P.focusIndexes({ focus: [], ...p }, ch));
    ch.forEach((c, i) => out.append(h("span", { class: `${f.has(i) ? "f" : ""}${c.silent ? " s" : ""}`, title: c.silent ? "quiet" : `says ${c.s}` }, c.t)));
  };
  fill();
  return Object.assign(out, { refresh: fill });
}
function renderEditor() {
  const col = $("editCol"); col.innerHTML = "";
  const p = lesson();
  if (!p) { col.append(h("div", { class: "empty" }, "Pick a lesson on the left, or press + New.")); return; }
  const where = `${p.grade <= 2 ? "Letter Lane" : "Read Aloud"}`;
  // basics
  const title = input(p.title, (v) => {
    p.title = v;
    if (!savedIds.has(p.id)) { let id = slug(v), k = 2; while (lessons().some((x) => x !== p && x.id === id)) id = `${slug(v)}-${k++}`; p.id = id; sel = id; }
  }, { note: "Edited a lesson", list: true });
  const grade = h("select", { onchange: () => { p.grade = Number(grade.value); changed(`Moved “${p.title}”`, { editor: true }); } }, ...[2, 3, 4, 5].map((g) => h("option", { value: g, selected: p.grade === g }, GRADE_NAMES[g])));
  const level = h("select", { onchange: () => { p.level = Number(level.value); changed(`Moved “${p.title}”`, { editor: true }); } }, ...[1, 2].map((l) => h("option", { value: l, selected: p.level === l }, `Level ${l}`)));
  const move = (d) => {
    const same = lessons().filter((x) => x.grade === p.grade && x.level === p.level), i = same.indexOf(p), other = same[i + d];
    if (!other) return;
    const L = lessons(), a = L.indexOf(p), b = L.indexOf(other);
    [L[a], L[b]] = [L[b], L[a]];
    changed(`Order of ${GRADE_NAMES[p.grade]}`, { editor: true });
  };
  col.append(h("div", { id: "lessonProblems" }));
  col.append(card([`🔤 Lesson`, h("span", { class: "muted" }, `in ${where}`), h("span", { class: "space" }),
    h("label", { class: "row", style: "font-weight:800;font-size:.9rem" }, h("input", { type: "checkbox", checked: !!p.hidden, onchange: (e) => { if (e.target.checked) p.hidden = true; else delete p.hidden; changed(`${p.hidden ? "Hid" : "Showed"} “${p.title}”`, { editor: true }); } }), "Hide"),
    h("button", { class: "small", title: "Earlier", onclick: () => move(-1) }, "↑"), h("button", { class: "small", title: "Later", onclick: () => move(1) }, "↓"),
    h("button", { class: "small danger", onclick: () => { if (!confirm(`Delete “${p.title}”? (History can bring it back.)`)) return; lessons().splice(lessons().indexOf(p), 1); sel = lessons()[0]?.id; changed(`Deleted “${p.title}”`, { editor: true }); } }, "🗑 Delete")],
    h("div", { class: "row" }, h("div", { style: "width:80px;flex:none" }, labeled("Emoji", input(p.emoji, (v) => { p.emoji = v; }, { list: true }))), h("div", { class: "grow" }, labeled("Title", title))),
    h("div", { class: "row" }, h("div", { class: "grow" }, labeled("Grade", grade)), h("div", { class: "grow" }, labeled("Level", level)))));
  // what it teaches
  const focus = input((p.focus ?? []).join(", "), (v) => { p.focus = v.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean); }, { placeholder: "sh, ch, th", after: refreshChunks });
  const flag = (k, label, hint) => h("label", { class: "row", style: "margin:4px 0;font-weight:700", title: hint },
    h("input", { type: "checkbox", checked: !!p[k], onchange: (e) => { if (e.target.checked) p[k] = true; else delete p[k]; refreshChunks(); changed(null, { list: false }); } }), label, h("span", { class: "muted" }, hint));
  col.append(card("🎯 What it teaches",
    labeled("The chunks it teaches (highlighted in the words)", focus),
    h("details", {}, h("summary", { style: "cursor:pointer;font-weight:800;margin-top:8px" }, "Special kinds of lessons"),
      flag("syllables", "Word parts", "words split into parts (rab|bit), not sounds"),
      flag("wordParts", "Parts are whole words", "sun|set, jump|ing: the voice says them, nothing to record"),
      flag("magic", "Magic e", "highlights the vowel that says its name and the quiet e"),
      flag("soft", "Soft c and g", "highlights c and g that say s and j"),
      flag("start", "Beginnings", "the taught part is at the start (un|lock)"))));
  // how it works card
  col.append(card("💡 How it works card",
    labeled("On the card (you can use <b>bold</b>)", input(p.teach, (v) => { p.teach = v; }, { area: true, rows: 3 })),
    labeled("Said aloud (put a sound in {{ }} to play your recording: {{shh}})", input(p.say, (v) => { p.say = v; }, { area: true, rows: 3 })),
    h("p", { class: "muted", style: "margin:6px 0 0" }, "After it, the game says “Let's practice:” and the first three picture words.")));
  // words
  const help = h("div", { class: "help" }, "Split a word into its chunks with ", h("code", {}, "|"), ": ", h("code", {}, "sh|i|p"),
    ". Give a chunk its own sound after a colon, and leave it empty for a quiet letter: ", h("code", {}, "c|a:ay|k|e:"), " (a says ay, the e is quiet).");
  const refreshers = [];
  function refreshChunks() { refreshers.flat().forEach((f) => f()); }
  const wordRows = (list, withEmoji, note) => {
    const box = h("div"), mine = [];
    refreshers.push(mine);
    const draw = () => {
      box.innerHTML = ""; mine.length = 0;
      list.forEach((item, k) => {
        const get = () => (withEmoji ? list[k][0] : list[k]);
        const prev = chunkPreview(p, get);
        mine.push(prev.refresh);
        const spec = input(get(), (v) => { if (withEmoji) list[k][0] = v.trim(); else list[k] = v.trim(); prev.refresh(); }, { placeholder: withEmoji ? "sh|i|p" : "sh|o|p", note });
        box.append(h("div", { class: `wrow${withEmoji ? "" : " noemoji"}` }, spec,
          withEmoji ? input(list[k][1], (v) => { list[k][1] = v.trim(); }, { placeholder: "🚢", note }) : null, prev,
          h("button", { class: "small danger", title: "Remove", onclick: () => { list.splice(k, 1); draw(); changed(note); } }, "✕")));
      });
      box.append(h("button", { class: "small", onclick: () => { list.push(withEmoji ? ["", ""] : ""); draw(); box.querySelectorAll("input")[withEmoji ? box.querySelectorAll("input").length - 2 : box.querySelectorAll("input").length - 1]?.focus(); } }, withEmoji ? "+ a picture word" : "+ a word"));
    };
    draw();
    return box;
  };
  col.append(card(["🖼 Picture words", h("span", { class: "muted" }, "(at least 6; the first three are on the How it works card)")], help, wordRows(p.pictures, true, `Words of “${p.title}”`)));
  col.append(card(["📝 More words", h("span", { class: "muted" }, "(at least 8, for “find the word you hear”)")], wordRows(p.words, false, `Words of “${p.title}”`)));
  // sentences
  const [lo, hi] = SENTENCE_WORDS[p.grade] ?? [1, 40];
  const sbox = h("div");
  const drawS = () => {
    sbox.innerHTML = "";
    p.sentences.forEach((s, k) => {
      const count = h("span", { class: "count" });
      const upd = () => { const n = String(s[0] ?? "").trim().split(/\s+/).filter(Boolean).length; count.textContent = n; count.classList.toggle("bad", n < lo || n > hi); };
      upd();
      sbox.append(h("div", { class: "wrow sent" }, input(s[0], (v) => { s[0] = v; upd(); }, { placeholder: p.grade === 5 ? "Two sentences. Like this one." : "The ship is red.", note: `Sentences of “${p.title}”` }),
        input(s[1], (v) => { s[1] = v.trim(); }, { placeholder: "🚢", note: `Sentences of “${p.title}”` }), count,
        h("button", { class: "small danger", onclick: () => { p.sentences.splice(k, 1); drawS(); changed(`Sentences of “${p.title}”`); } }, "✕")));
    });
    sbox.append(h("button", { class: "small", onclick: () => { p.sentences.push(["", ""]); drawS(); } }, "+ a sentence"));
  };
  drawS();
  col.append(card(["💬 Sentences", h("span", { class: "muted" }, `(at least 5; ${GRADE_NAMES[p.grade] ?? ""}: ${lo} to ${hi} words${p.grade === 5 ? ", two sentences" : ""}; each with its own picture)`)], sbox));
  lessonProblems();
}

// ───────── history ─────────
$("historyBtn").onclick = async () => {
  $("histModal").hidden = false; $("versions").innerHTML = `<p class="muted">Loading…</p>`;
  let j;
  try { j = await (await api("/reading/history")).json(); } catch { return; }
  $("versions").innerHTML = "";
  if (!j.versions.length) $("versions").append(h("p", { class: "muted" }, "Nothing yet: the first save starts the history."));
  for (const v of j.versions) $("versions").append(h("div", { class: "ver" },
    h("div", { class: "grow" }, h("b", {}, isNaN(Date.parse(v.at)) ? v.at : new Date(v.at).toLocaleString()), h("div", { class: "muted" }, `Before: ${v.note || "a save"}`)),
    h("button", { class: "small blue", onclick: async () => {
      if (!confirm("Bring that version back? Press Save afterwards to make it live.")) return;
      doc = await (await api(`/reading/version?key=${encodeURIComponent(v.key)}`)).json();
      $("histModal").hidden = true; sel = lessons()[0]?.id;
      changed(`Brought back the version from ${new Date(v.at).toLocaleDateString()}`, { editor: true });
    } }, "↩ Bring back")));
};
document.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => { b.closest(".modal").hidden = true; });

load();
