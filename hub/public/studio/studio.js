// Angelio Studio: edit Watch & Sing's lessons, songs, courses and albums. Changes show in the preview at once
// (the real Watch & Sing in an iframe, sent the unsaved library); Save makes them live (worker/studio.js).
// Unsaved work is kept on this device until it's saved. Content rules: /js/watch-content.js.
import { validateLibrary, newId } from "/js/watch-content.js";

const $ = (id) => document.getElementById(id);
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
/** Tiny element builder: h("button", { class: "x", onclick }, "text", child…) */
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
const media = (u) => (!u ? "" : /^https?:/.test(u) ? u : `/watch/${u}`);

// ───────── state ─────────
let key = (() => { try { return localStorage.getItem("angelio:admin") || sessionStorage.getItem("angelio:admin") || ""; } catch { return ""; } })();
let lib = null, version = null, saved = "", savedIds = new Set();
let tab = "lessons", sel = null, query = "";
const notes = new Set(); // what changed, for the history note
const DRAFT = "studio:watch:draft";

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
  try { j = await (await api("/watch")).json(); } catch (e) { if (e.message !== "key") $("editCol").innerHTML = `<div class="empty">Couldn't load the library. Check the internet and reload.</div>`; return; }
  lib = j.library; version = j.version; saved = JSON.stringify(lib);
  savedIds = new Set(["lessons", "songs", "courses", "albums"].flatMap((k) => lib[k].map((x) => `${k}:${x.id}`)));
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || "null");
    if (d?.base === version && JSON.stringify(d.lib) !== saved && confirm("You have changes that weren't saved yet. Keep working on them?")) { lib = d.lib; (d.notes ?? []).forEach((n) => notes.add(n)); }
    else if (d && d.base !== version) localStorage.removeItem(DRAFT);
  } catch { /* ignore */ }
  sel = lib[tab][0]?.id ?? null;
  renderList(); renderEditor(); state(); startPreview();
}

// ───────── changes, saving ─────────
const dirty = () => JSON.stringify(lib) !== saved;
let previewTimer;
function changed(note, { list = true, editor = false } = {}) {
  if (note) notes.add(note);
  try { localStorage.setItem(DRAFT, JSON.stringify({ base: version, lib, notes: [...notes] })); } catch { /* ignore */ }
  if (list) renderList();
  if (editor) renderEditor();
  state();
  clearTimeout(previewTimer); previewTimer = setTimeout(sendPreview, 350);
}
function state() {
  const { errors, warnings } = validateLibrary(lib);
  const d = dirty();
  $("saveBtn").disabled = !d || errors.length > 0;
  $("saveBtn").textContent = d ? "Save · make it live" : "Saved";
  $("state").textContent = errors.length ? `⚠️ ${errors.length} thing${errors.length > 1 ? "s" : ""} to fix before saving` : d ? "Not saved yet" : "Everything is live ✓";
  const box = $("problemsBox");
  if (box) box.innerHTML = (errors.length ? `<ul class="problems">${errors.slice(0, 12).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "")
    + (warnings.length && errors.length === 0 ? `<ul class="warns">${warnings.slice(0, 6).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "");
}
$("saveBtn").onclick = async () => {
  const note = [...notes].slice(0, 3).join(", ").slice(0, 60);
  $("saveBtn").disabled = true; $("state").textContent = "Saving…";
  let r;
  try { r = await api(`/watch?base=${encodeURIComponent(version)}&note=${encodeURIComponent(note)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lib) }); }
  catch (e) { if (e.message !== "key") toast("Couldn't save: no internet?"); state(); return; }
  const j = await r.json().catch(() => ({}));
  if (r.status === 409) { toast(j.error, 6000); $("state").textContent = "Changed somewhere else: reload the page"; return; }
  if (!r.ok) { toast(j.error ?? `Couldn't save (${r.status})`, 5000); state(); return; }
  version = j.version; saved = JSON.stringify(lib); notes.clear();
  savedIds = new Set(["lessons", "songs", "courses", "albums"].flatMap((k) => lib[k].map((x) => `${k}:${x.id}`)));
  try { localStorage.removeItem(DRAFT); } catch { /* ignore */ }
  state(); toast("Saved. It's live on angelio.org/watch ✓");
};
addEventListener("beforeunload", (e) => { if (lib && dirty()) e.preventDefault(); });
$("backupBtn").onclick = async () => {
  // The library, lead sheets and recorded sounds; sounds go a few at a time, so keep asking until none are left.
  const btn = $("backupBtn"); btn.disabled = true;
  let commits = 0;
  try {
    for (let round = 0; round < 60; round++) {
      const j = await (await api("/backup", { method: "POST" })).json();
      if (!j.ok) { toast(j.error, 7000); break; }
      commits += j.commits ?? 0;
      if (j.soundsLeft > 0) { toast(`Backing up the recorded sounds… ${j.soundsLeft} to go`, 60000); continue; }
      toast(commits ? "Backed up to GitHub ✓ (Watch & Sing, lead sheets and sounds)" : "Everything was already backed up ✓", 6000);
      break;
    }
  } catch { /* shown */ }
  btn.disabled = false;
};

// ───────── preview ─────────
const hashFor = () => (!sel ? "#/" : { lessons: `#/lesson/${sel}`, songs: `#/song/${sel}`, courses: `#/course/${sel}`, albums: `#/album/${sel}` }[tab]);
let previewReady = false;
function startPreview() { previewReady = false; $("frame").src = `/watch/?studio=1${hashFor()}`; }
addEventListener("message", (e) => { if (e.origin === location.origin && e.data?.type === "studio-ready") { previewReady = true; sendPreview(); } });
function sendPreview(extra) {
  if (!previewReady) return;
  $("frame").contentWindow.postMessage({ type: "studio", library: extra ?? lib, go: hashFor() }, location.origin);
}
$("wideBtn").onclick = () => $("frame").classList.toggle("wide");
$("openLive").onclick = () => open(`/watch/${hashFor()}`, "_blank");

// ───────── the list ─────────
document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => {
  tab = b.dataset.tab; document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
  sel = lib?.[tab][0]?.id ?? null; renderList(); renderEditor(); sendPreview();
});
$("search").oninput = () => { query = $("search").value.trim().toLowerCase(); renderList(); };
function renderList() {
  if (!lib) return;
  const items = lib[tab].filter((x) => !query || x.title.toLowerCase().includes(query));
  const box = $("list"); box.innerHTML = "";
  if (!items.length) box.append(h("p", { class: "muted" }, query ? "Nothing matches." : "Nothing here yet."));
  for (const x of items) {
    const chips = [];
    if (x.hidden) chips.push(h("span", { class: "chip hid" }, "hidden"));
    if (tab === "lessons") { if (!x.quiz?.length) chips.push(h("span", { class: "chip warn" }, "no quiz")); else if (x.quizDraft) chips.push(h("span", { class: "chip warn" }, "quiz to check")); }
    if (tab === "songs" && !(x.downloads ?? []).some((d) => /\.mp3$/i.test(d.url))) chips.push(h("span", { class: "chip warn" }, "no MP3"));
    if (tab === "courses" || tab === "albums") chips.push(h("span", { class: "chip" }, x.items.length));
    const pic = tab === "lessons" || tab === "songs" ? (x.poster ? h("img", { src: media(x.poster), alt: "", loading: "lazy" }) : h("span", { class: "noimg" })) : h("span", { style: "font-size:1.6rem;width:40px;text-align:center" }, x.emoji ?? "📁");
    box.append(h("button", { class: `item${x.id === sel ? " on" : ""}`, onclick: () => { sel = x.id; renderList(); renderEditor(); sendPreview(); } }, pic,
      h("span", { class: "t" }, h("span", { class: "tt" }, x.title), chips.length ? h("span", { class: "chips" }, ...chips) : null)));
  }
}
$("newBtn").onclick = () => {
  const today = new Date().toISOString().slice(0, 10);
  const make = {
    lessons: () => ({ id: newId("New lesson", lib.lessons), title: "New lesson", about: "", video: "", poster: "", tags: [], date: today, quiz: [], hidden: true }),
    songs: () => ({ id: newId("New song", lib.songs), title: "New song", about: "", video: "", poster: "", tags: [], date: today, credits: { written: ["Shalone Cason"] }, downloads: [], hidden: true }),
    courses: () => ({ id: newId("New course", lib.courses), title: "New course", emoji: "🎓", items: [] }),
    albums: () => ({ id: newId("New album", lib.albums), title: "New album", emoji: "💿", items: [] }),
  }[tab]();
  lib[tab].unshift(make); sel = make.id; query = ""; $("search").value = "";
  changed(`Added a ${tab.slice(0, -1)}`, { editor: true });
  toast(tab === "lessons" || tab === "songs" ? "New and hidden until you untick Hide." : "Added. Put some in it, then Save.");
};

// ───────── editors ─────────
const item = () => lib[tab].find((x) => x.id === sel);
const card = (title, ...kids) => h("div", { class: "card" }, h("h3", {}, ...[].concat(title)), ...kids);
const field = (label, value, set, { area = false, type, placeholder, rows } = {}) => {
  const input = area ? h("textarea", { rows: rows ?? 3, placeholder }) : h("input", { type: type ?? "text", placeholder });
  input.value = value ?? "";
  input.oninput = () => { set(input.value); changed(null); };
  return h("div", {}, h("label", { class: "f" }, label), input);
};
/** When something new gets its real title, its id follows (until the first save). */
function retitle(x, title) {
  x.title = title;
  if (savedIds.has(`${tab}:${x.id}`)) return;
  const old = x.id, id = newId(title, lib[tab].filter((y) => y !== x));
  if (id === old) return;
  x.id = id; sel = id;
  for (const g of [...lib.courses, ...lib.albums]) g.items = g.items.map((i) => (i === old ? id : i));
}
function renderEditor() {
  const col = $("editCol"); col.innerHTML = "";
  col.append(h("div", { id: "problemsBox" }));
  const x = item();
  if (!x) { col.append(h("div", { class: "empty" }, "Pick something on the left, or press + New.")); state(); return; }
  if (tab === "lessons") lessonEditor(col, x);
  if (tab === "songs") songEditor(col, x);
  if (tab === "courses" || tab === "albums") groupEditor(col, x);
  state();
}
function basics(col, x, what) {
  const title = h("input", { type: "text" }); title.value = x.title;
  title.oninput = () => { retitle(x, title.value); changed(`Edited “${x.title}”`); };
  const hide = h("input", { type: "checkbox", checked: !!x.hidden, onchange: (e) => { x.hidden = e.target.checked || undefined; changed(`${x.hidden ? "Hid" : "Showed"} “${x.title}”`); } });
  col.append(card([what === "lesson" ? "📚 Lesson" : "🎵 Song", h("span", { class: "space" }),
    h("label", { class: "row", style: "font-weight:800;font-size:.9rem" }, hide, "Hide"),
    h("button", { class: "small danger", onclick: () => removeItem(x) }, "🗑 Delete")],
    h("label", { class: "f" }, "Title"), title,
    field("About (shown under the video)", x.about, (v) => { x.about = v || null; }, { area: true, rows: 2 }),
    h("div", { class: "row" }, h("div", { class: "grow" }, field("Date", x.date, (v) => { x.date = v; }, { type: "date" })),
      what === "song" ? h("a", { class: "btn", href: `/admin/leadsheet?id=${encodeURIComponent(x.id)}`, target: "_blank", style: "margin-top:24px;font-weight:800" }, "📄 Lead sheet ↗") : null)));
}
function removeItem(x) {
  if (!confirm(`Delete “${x.title}”? (History can bring it back.)`)) return;
  lib[tab] = lib[tab].filter((y) => y !== x);
  for (const g of [...lib.courses, ...lib.albums]) g.items = g.items.filter((i) => i !== x.id);
  sel = lib[tab][0]?.id ?? null;
  changed(`Deleted “${x.title}”`, { editor: true });
}

// video and picture, with uploads
function mediaCard(col, x, what) {
  const vid = h("video", { src: media(x.video), controls: true, preload: "metadata", crossorigin: "anonymous" });
  const img = h("img", { src: media(x.poster), alt: "" });
  const vUrl = h("input", { type: "text", placeholder: "media/…mp4" }); vUrl.value = x.video ?? "";
  vUrl.oninput = () => { x.video = vUrl.value.trim(); vid.src = media(x.video); changed(`New video for “${x.title}”`); };
  const pUrl = h("input", { type: "text", placeholder: "media/…png" }); pUrl.value = x.poster ?? "";
  pUrl.oninput = () => { x.poster = pUrl.value.trim(); img.src = media(x.poster); changed(`New picture for “${x.title}”`); };
  const setVideo = (u) => { vUrl.value = u; vUrl.oninput(); };
  const setPoster = (u) => { pUrl.value = u; pUrl.oninput(); };
  col.append(card("🎬 Video", h("div", { class: "media" }, vid, h("div", { class: "grow", style: "flex:1;min-width:200px" },
    uploadButton("⬆ Upload a video", "video/mp4,video/quicktime,video/webm", setVideo, `${x.id}-video`), h("label", { class: "f" }, "or its address"), vUrl))));
  col.append(card("🖼 Picture", h("div", { class: "media" }, img, h("div", { class: "grow", style: "flex:1;min-width:200px" },
    uploadButton("⬆ Upload a picture", "image/png,image/jpeg,image/webp", setPoster, `${x.id}-picture`),
    h("button", { style: "margin-top:6px", onclick: () => framePicker(x, setPoster) }, "📸 Use a frame from the video"),
    h("label", { class: "f" }, "or its address"), pUrl))));
}
function uploadButton(label, accept, done, name) {
  const input = h("input", { type: "file", accept, hidden: true });
  const bar = h("div", { class: "prog", hidden: true }, h("i"));
  const btn = h("button", { class: "blue", onclick: () => input.click() }, label);
  input.onchange = async () => {
    const f = input.files[0]; input.value = "";
    if (!f) return;
    btn.disabled = true; bar.hidden = false;
    try { done(await upload(f, name, (p) => { bar.firstChild.style.width = `${Math.round(p * 100)}%`; })); toast("Uploaded ✓"); }
    catch (e) { toast(`Upload didn't work: ${e.message}`, 5000); }
    btn.disabled = false; bar.hidden = true;
  };
  return h("div", {}, btn, input, bar);
}
/** Upload in 20 MB parts; resolves to the file's address (media/studio/…). */
async function upload(file, name, progress = () => {}) {
  const type = file.type || (/\.mp3$/i.test(file.name) ? "audio/mpeg" : /\.pdf$/i.test(file.name) ? "application/pdf" : "");
  const start = await (await api("/upload/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name ?? file.name, type }) })).json();
  if (!start.key) throw new Error(start.error ?? "couldn't start");
  const q = `key=${encodeURIComponent(start.key)}&uploadId=${encodeURIComponent(start.uploadId)}`, SIZE = 20 * 1024 * 1024, parts = [];
  try {
    for (let i = 0, n = 1; i < file.size || n === 1; i += SIZE, n++) {
      const r = await api(`/upload/part?${q}&n=${n}`, { method: "PUT", body: file.slice(i, i + SIZE) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `part ${n}`);
      parts.push(await r.json()); progress(Math.min(1, (i + SIZE) / file.size));
      if (i + SIZE >= file.size) break;
    }
    const done = await (await api(`/upload/done?${q}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parts }) })).json();
    if (!done.url) throw new Error(done.error ?? "couldn't finish");
    return done.url;
  } catch (e) { api(`/upload/abort?${q}`, { method: "POST" }).catch(() => {}); throw e; }
}
function framePicker(x, setPoster) {
  if (!x.video) return toast("Add the video first.");
  const v = h("video", { src: media(x.video), controls: true, crossorigin: "anonymous", style: "width:100%;border-radius:12px;background:#000" });
  const m = h("div", { class: "modal" }, h("div", {}, h("h2", {}, "Pick a frame"),
    h("p", { class: "muted" }, "Play or drag to the moment you want, then press Use this frame."), v,
    h("div", { class: "row", style: "margin-top:10px;justify-content:flex-end" },
      h("button", { onclick: () => m.remove() }, "Cancel"),
      h("button", { class: "main", onclick: async (e) => {
        e.target.disabled = true;
        try {
          const c = h("canvas", { width: Math.min(1280, v.videoWidth), height: Math.round(Math.min(1280, v.videoWidth) * v.videoHeight / v.videoWidth) });
          c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
          const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
          setPoster(await upload(new File([blob], `${x.id}-frame.jpg`, { type: "image/jpeg" }), `${x.id}-frame`));
          m.remove(); toast("Picture set from the video ✓");
        } catch (err) { e.target.disabled = false; toast(`Couldn't take that frame: ${err.message}`, 5000); }
      } }, "Use this frame"))));
  document.body.append(m);
}
function membership(col, x, groups, label) {
  col.append(card(label, h("div", {}, ...groups.map((g) => h("label", { class: "row", style: "margin:4px 0;font-weight:700" },
    h("input", { type: "checkbox", checked: g.items.includes(x.id), onchange: (e) => {
      if (e.target.checked) g.items.push(x.id); else g.items = g.items.filter((i) => i !== x.id);
      changed(`Changed “${g.title}”`);
    } }), `${g.emoji ?? ""} ${g.title}`)))));
}

// ── lessons and their quiz ──
function lessonEditor(col, x) {
  basics(col, x, "lesson");
  mediaCard(col, x);
  membership(col, x, lib.courses, "🎓 In these courses");
  quizEditor(col, x);
  const tr = h("details", {}, h("summary", { style: "font-weight:800;cursor:pointer" }, "What the video says (the words)"),
    field("", x.transcript && x.transcript !== "None" ? x.transcript : "", (v) => { x.transcript = v || null; }, { area: true, rows: 8 }));
  col.append(h("div", { class: "card" }, tr));
}
const KINDS = { choice: "Pick the answer", tf: "True or false", blank: "Fill in the blank", order: "Put in order", match: "Match" };
function quizEditor(col, x) {
  x.quiz ??= [];
  const box = h("div");
  const reviewed = h("input", { type: "checkbox", checked: !x.quizDraft, onchange: (e) => { if (e.target.checked) delete x.quizDraft; else x.quizDraft = true; changed(`Checked the quiz of “${x.title}”`); } });
  const count = h("span", { class: "muted" });
  const redraw = () => { box.innerHTML = ""; x.quiz.forEach((q, i) => box.append(questionEditor(x, q, i, redraw))); count.textContent = `${x.quiz.length} question${x.quiz.length === 1 ? "" : "s"}`; };
  redraw();
  const add = (q) => { x.quiz.push(q); changed(`Quiz of “${x.title}”`); redraw(); box.lastChild?.querySelector("input")?.focus(); };
  col.append(card([`📝 Quiz`, count, h("span", { class: "space" }),
    h("label", { class: "row", style: "font-weight:800;font-size:.9rem" }, reviewed, "Checked, ready for kids")],
    box,
    h("div", { class: "add-q" }, h("b", { class: "muted", style: "align-self:center" }, "Add:"),
      h("button", { class: "small", onclick: () => add({ type: "choice", q: "", choices: ["", "", ""], answer: 0 }) }, "+ Pick the answer"),
      h("button", { class: "small", onclick: () => add({ type: "choice", q: "", choices: ["True", "False"], answer: 0 }) }, "+ True or false"),
      h("button", { class: "small", onclick: () => add({ type: "blank", q: " ____ ", words: ["", "", ""], answer: "" }) }, "+ Fill in the blank"),
      h("button", { class: "small", onclick: () => add({ type: "order", q: "Put these in order.", items: ["", "", ""] }) }, "+ Put in order"),
      h("button", { class: "small", onclick: () => add({ type: "match", q: "Match each one.", pairs: [["", ""], ["", ""], ["", ""]] }) }, "+ Match"))));
}
function questionEditor(x, q, i, redraw) {
  const touch = () => changed(`Quiz of “${x.title}”`, { list: false });
  const again = () => { touch(); redraw(); };
  const kind = q.type === "choice" && q.choices?.length === 2 && q.choices[0] === "True" && q.choices[1] === "False" ? "tf" : q.type;
  const head = h("div", { class: "qhead" }, h("b", {}, `${i + 1}. ${KINDS[kind]}`), h("span", { class: "grow", style: "flex:1" }),
    h("button", { class: "small", disabled: i === 0, onclick: () => { [x.quiz[i - 1], x.quiz[i]] = [x.quiz[i], x.quiz[i - 1]]; again(); } }, "↑"),
    h("button", { class: "small", disabled: i === x.quiz.length - 1, onclick: () => { [x.quiz[i + 1], x.quiz[i]] = [x.quiz[i], x.quiz[i + 1]]; again(); } }, "↓"),
    h("button", { class: "small danger", onclick: () => { if (confirm("Delete this question?")) { x.quiz.splice(i, 1); again(); } } }, "🗑"));
  const text = (v, set, ph) => { const el = h("input", { type: "text", placeholder: ph }); el.value = v ?? ""; el.oninput = () => { set(el.value); touch(); }; return el; };
  const body = h("div", { class: "opts" });
  body.append(h("label", { class: "f" }, q.type === "blank" ? "The sentence (____ where the missing word goes)" : "The question"), text(q.q, (v) => { q.q = v; }, "Question"));
  if (q.type === "choice") {
    body.append(h("label", { class: "f" }, kind === "tf" ? "Which is right?" : "Answers (tap the circle of the right one)"));
    q.choices.forEach((c, k) => body.append(h("div", { class: "row" },
      h("input", { type: "radio", name: `a-${x.id}-${i}`, checked: q.answer === k, onchange: () => { q.answer = k; touch(); } }),
      kind === "tf" ? h("span", { style: "font-weight:700" }, c) : text(c, (v) => { q.choices[k] = v; }, `Answer ${k + 1}`),
      kind === "tf" ? null : h("button", { class: "small danger", disabled: q.choices.length <= 2, onclick: () => { q.choices.splice(k, 1); if (q.answer >= q.choices.length || q.answer === k) q.answer = 0; else if (q.answer > k) q.answer--; again(); } }, "✕"))));
    if (kind !== "tf" && q.choices.length < 5) body.append(h("button", { class: "small", onclick: () => { q.choices.push(""); again(); } }, "+ another answer"));
  }
  if (q.type === "blank") {
    body.append(h("label", { class: "f" }, "Word tiles (tap the circle of the right word)"));
    q.words.forEach((w, k) => {
      const t = text(w, (v) => { if (q.answer === q.words[k]) q.answer = v; q.words[k] = v; });
      body.append(h("div", { class: "row" },
        h("input", { type: "radio", name: `a-${x.id}-${i}`, checked: q.answer === w && w !== "", onchange: () => { q.answer = q.words[k]; touch(); } }), t,
        h("button", { class: "small danger", disabled: q.words.length <= 2, onclick: () => { if (q.answer === q.words[k]) q.answer = ""; q.words.splice(k, 1); again(); } }, "✕")));
    });
    if (q.words.length < 5) body.append(h("button", { class: "small", onclick: () => { q.words.push(""); again(); } }, "+ another word"));
  }
  if (q.type === "order") {
    body.append(h("label", { class: "f" }, "In the right order (the game mixes them up)"));
    q.items.forEach((it, k) => body.append(h("div", { class: "row" }, h("b", { style: "width:22px" }, `${k + 1}.`), text(it, (v) => { q.items[k] = v; }),
      h("button", { class: "small", disabled: k === 0, onclick: () => { [q.items[k - 1], q.items[k]] = [q.items[k], q.items[k - 1]]; again(); } }, "↑"),
      h("button", { class: "small danger", disabled: q.items.length <= 2, onclick: () => { q.items.splice(k, 1); again(); } }, "✕"))));
    if (q.items.length < 6) body.append(h("button", { class: "small", onclick: () => { q.items.push(""); again(); } }, "+ another step"));
  }
  if (q.type === "match") {
    body.append(h("label", { class: "f" }, "Pairs (the game mixes up the right side)"));
    q.pairs.forEach((p, k) => body.append(h("div", { class: "row" }, text(p[0], (v) => { p[0] = v; }, "This…"), h("span", {}, "↔"), text(p[1], (v) => { p[1] = v; }, "…goes with this"),
      h("button", { class: "small danger", disabled: q.pairs.length <= 2, onclick: () => { q.pairs.splice(k, 1); again(); } }, "✕"))));
    if (q.pairs.length < 5) body.append(h("button", { class: "small", onclick: () => { q.pairs.push(["", ""]); again(); } }, "+ another pair"));
  }
  body.append(h("label", { class: "f" }, "Why (said after the answer)"), text(q.why, (v) => { q.why = v || undefined; }, "In the video: …"));
  return h("div", { class: "q" }, head, body);
}

// ── songs ──
const ROLES = { written: "Written by", sung: "Sung by", backing: "Backing vocals", music: "Music by", animation: "Animation", art: "Art", video: "Video" };
const DL_KINDS = ["🎧 Song (audio)", "🎼 Instrumental", "📄 Lead sheet", "🎬 Video", "📄 Words", "🎵 Other"];
function songEditor(col, x) {
  basics(col, x, "song");
  mediaCard(col, x);
  x.credits ??= {};
  const creds = h("div");
  const redrawCreds = () => {
    creds.innerHTML = "";
    for (const [role, names] of Object.entries(x.credits)) {
      const sel2 = h("select", { onchange: (e) => { const v = e.target.value; if (v === role || x.credits[v]) { e.target.value = role; return; } x.credits = Object.fromEntries(Object.entries(x.credits).map(([r, n]) => [r === role ? v : r, n])); changed(`Credits of “${x.title}”`); redrawCreds(); } },
        ...Object.entries(ROLES).map(([k, l]) => h("option", { value: k, selected: k === role }, l)));
      const inp = h("input", { type: "text", placeholder: "Names, with commas" }); inp.value = names.join(", ");
      inp.oninput = () => { x.credits[role] = inp.value.split(",").map((s) => s.trim()).filter(Boolean); changed(`Credits of “${x.title}”`); };
      creds.append(h("div", { class: "row", style: "margin:4px 0" }, h("div", { style: "width:170px;flex:none" }, sel2), h("div", { class: "grow" }, inp),
        h("button", { class: "small danger", onclick: () => { delete x.credits[role]; changed(`Credits of “${x.title}”`); redrawCreds(); } }, "✕")));
    }
    const free = Object.keys(ROLES).find((r) => !x.credits[r]);
    if (free) creds.append(h("button", { class: "small", onclick: () => { x.credits[free] = []; redrawCreds(); } }, "+ another credit"));
  };
  redrawCreds();
  col.append(card("👥 Who made it", creds));
  x.downloads ??= [];
  const dls = h("div");
  const redrawDl = () => {
    dls.innerHTML = "";
    x.downloads.forEach((d, k) => {
      const kind = h("select", { onchange: (e) => { d.kind = e.target.value; changed(`Downloads of “${x.title}”`); } }, ...[...new Set([d.kind, ...DL_KINDS])].map((o) => h("option", { selected: o === d.kind }, o)));
      const url = h("input", { type: "text", placeholder: "media/…" }); url.value = d.url ?? "";
      url.oninput = () => { d.url = url.value.trim(); changed(`Downloads of “${x.title}”`); };
      dls.append(h("div", { class: "q" }, h("div", { class: "row" }, h("div", { style: "width:170px;flex:none" }, kind),
        h("div", { class: "grow" }, field("", d.label, (v) => { d.label = v; })),
        h("button", { class: "small danger", onclick: () => { x.downloads.splice(k, 1); changed(`Downloads of “${x.title}”`); redrawDl(); } }, "✕")),
        h("div", { class: "row", style: "margin-top:6px" }, h("div", { class: "grow" }, url),
          uploadButton("⬆ File", "audio/mpeg,audio/mp4,application/pdf,video/mp4,image/png,image/jpeg", (u) => { url.value = u; url.oninput(); }, `${x.id}-download`))));
    });
    dls.append(h("button", { class: "small", onclick: () => { x.downloads.push({ kind: "🎧 Song (audio)", label: x.title, url: "" }); redrawDl(); } }, "+ a download"));
  };
  redrawDl();
  col.append(card("⬇️ Downloads (for grown-ups)", dls));
  membership(col, x, lib.albums, "💿 In these albums");
}

// ── courses and albums ──
function groupEditor(col, g) {
  const what = tab === "courses" ? "lesson" : "song", pool = tab === "courses" ? lib.lessons : lib.songs;
  const title = h("input", { type: "text" }); title.value = g.title;
  title.oninput = () => { retitle(g, title.value); changed(`Edited “${g.title}”`); };
  col.append(card([tab === "courses" ? "🎓 Course" : "💿 Album", h("span", { class: "space" }), h("button", { class: "small danger", onclick: () => removeItem(g) }, "🗑 Delete")],
    h("div", { class: "row" }, h("div", { style: "width:90px;flex:none" }, field("Emoji", g.emoji, (v) => { g.emoji = v; })), h("div", { class: "grow" }, h("label", { class: "f" }, "Title"), title))));
  const box = h("div");
  const redraw = () => {
    box.innerHTML = "";
    g.items.forEach((id, k) => {
      const x = pool.find((y) => y.id === id);
      box.append(h("div", { class: "list-item-row" }, h("b", { style: "width:26px" }, `${k + 1}.`), h("span", { class: "grow" }, x?.title ?? id, x?.hidden ? h("span", { class: "chip hid" }, "hidden") : null),
        h("button", { class: "small", disabled: k === 0, onclick: () => { [g.items[k - 1], g.items[k]] = [g.items[k], g.items[k - 1]]; changed(`Order of “${g.title}”`); redraw(); } }, "↑"),
        h("button", { class: "small", disabled: k === g.items.length - 1, onclick: () => { [g.items[k + 1], g.items[k]] = [g.items[k], g.items[k + 1]]; changed(`Order of “${g.title}”`); redraw(); } }, "↓"),
        h("button", { class: "small danger", onclick: () => { g.items.splice(k, 1); changed(`Changed “${g.title}”`); redraw(); } }, "✕")));
    });
    const left = pool.filter((y) => !g.items.includes(y.id)).sort((a, b) => a.title.localeCompare(b.title));
    const pick = h("select", {}, h("option", { value: "" }, `Add a ${what}…`), ...left.map((y) => h("option", { value: y.id }, y.title)));
    pick.onchange = () => { if (pick.value) { g.items.push(pick.value); changed(`Changed “${g.title}”`); redraw(); } };
    box.append(h("div", { style: "margin-top:8px" }, pick));
  };
  redraw();
  col.append(card(`${what === "lesson" ? "📚 Lessons" : "🎵 Songs"}, in order`, box));
}

// ───────── history ─────────
$("historyBtn").onclick = async () => {
  $("histModal").hidden = false; $("versions").innerHTML = `<p class="muted">Loading…</p>`;
  let j;
  try { j = await (await api("/watch/history")).json(); } catch { return; }
  $("versions").innerHTML = "";
  if (!j.versions.length) $("versions").append(h("p", { class: "muted" }, "Nothing yet: the first save starts the history."));
  for (const v of j.versions) {
    $("versions").append(h("div", { class: "ver" }, h("div", { class: "grow" }, h("b", {}, isNaN(Date.parse(v.at)) ? v.at : new Date(v.at).toLocaleString()), h("div", { class: "muted" }, `Before: ${v.note || "a save"}`)),
      h("button", { class: "small", onclick: async () => { sendPreview(await (await api(`/watch/version?key=${encodeURIComponent(v.key)}`)).json()); toast("The preview shows that version. Your work isn't changed."); } }, "👀 Look"),
      h("button", { class: "small blue", onclick: async () => {
        if (!confirm("Bring that version back? Press Save afterwards to make it live.")) return;
        lib = await (await api(`/watch/version?key=${encodeURIComponent(v.key)}`)).json();
        $("histModal").hidden = true; sel = lib[tab][0]?.id ?? null;
        changed(`Brought back the version from ${new Date(v.at).toLocaleDateString()}`, { editor: true });
      } }, "↩ Bring back")));
  }
};
document.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => { b.closest(".modal").hidden = true; sendPreview(); });

load();
