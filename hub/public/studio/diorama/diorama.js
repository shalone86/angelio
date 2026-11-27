// Angelio Studio Diorama Scene Editor (/studio/diorama/).
import { DEFAULT_BASES, STYLE_OPTIONS, cleanScene } from "/games/diorama/catalog.js";
import { createDioramaScene, loadModels } from "/games/diorama/scene.js";
import { dioramaBackdropVox } from "/js/voxwrite.js";

const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
let key = store.get("angelio:admin") || "";

function askKey(msg = "") {
  $("keyErr").textContent = msg;
  $("key").hidden = false;
  $("keyIn").focus();
}
$("keyGo").onclick = () => {
  key = $("keyIn").value.trim();
  store.set("angelio:admin", key);
  $("key").hidden = true;
  boot();
};
$("keyIn").onkeydown = (e) => { if (e.key === "Enter") $("keyGo").click(); };

async function studio(path, body) {
  const r = await fetch(`/api/admin/studio${path}`, body === undefined
    ? { headers: { "x-admin-key": key } }
    : { method: "POST", headers: { "x-admin-key": key, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { askKey("That key didn't work."); throw new Error("Wrong key"); }
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

// Style dropdown
$("f-style").innerHTML = STYLE_OPTIONS.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");

let scenes = [];
let idx = 0;
let models = {};
let artVoxels = {};

const sceneView = createDioramaScene($("stage"));
addEventListener("resize", () => sceneView.resize());

const newBlankScene = () => ({
  id: `custom-${scenes.length + 1}`,
  name: `New Scene ${scenes.length + 1}`,
  short: `Scene ${scenes.length + 1}`,
  emoji: "🌟",
  starter: false,
  rarity: "special",
  say: "A brand-new diorama world!",
  blurb: "Custom 3D voxel world from Angelio Studio.",
  backdropSlug: `diorama-bg-custom-${scenes.length + 1}`,
  style: "plain",
  palette: { ...DEFAULT_BASES[0].palette },
});

function renderPreview() {
  const s = scenes[idx] ?? DEFAULT_BASES[0];
  const clean = cleanScene(s) ?? DEFAULT_BASES[0];
  sceneView.setBase(clean, models);
  sceneView.syncPlaced([
    { uid: "p1", id: "server-candle", gx: 3, gz: 3, rot: 0 },
    { uid: "p2", id: "parish-boy", gx: 4, gz: 4, rot: 0 },
  ], models);
  const v = artVoxels[clean.backdropSlug];
  $("vox-info").textContent = v
    ? `✓ Using uploaded "${clean.backdropSlug}.vox" (${v.size?.join(" × ") ?? "custom"})`
    : `No custom "${clean.backdropSlug}.vox" uploaded yet — showing preset "${clean.style}".`;
}

function renderBar() {
  const bar = $("scene-bar");
  const btns = scenes.map((s, i) => `<button type="button" class="pill" data-idx="${i}" aria-pressed="${i === idx}">${s.emoji || "🧱"} ${s.name || s.id}</button>`).join("");
  bar.innerHTML = `${btns}<button type="button" class="pill" id="add-btn">+ New Scene</button>`;
  bar.querySelectorAll("[data-idx]").forEach((b) => {
    b.onclick = () => { idx = Number(b.dataset.idx); syncForm(); renderBar(); renderPreview(); };
  });
  $("add-btn").onclick = () => {
    scenes.push(newBlankScene());
    idx = scenes.length - 1;
    syncForm();
    renderBar();
    renderPreview();
  };
}

function syncForm() {
  const s = scenes[idx];
  const has = !!s;
  $("editor-form").style.opacity = has ? "1" : ".55";
  const cur = s ?? newBlankScene();
  $("f-name").value = cur.name ?? "";
  $("f-short").value = cur.short ?? "";
  $("f-emoji").value = cur.emoji ?? "🧱";
  $("f-id").value = cur.id ?? "";
  $("f-rarity").value = cur.rarity ?? "special";
  $("f-style").value = cur.style ?? "plain";
  $("f-backdrop").value = cur.backdropSlug ?? "";
  $("f-say").value = cur.say ?? "";
  $("f-blurb").value = cur.blurb ?? "";
  $("f-starter").checked = !!cur.starter;
  const p = cur.palette ?? DEFAULT_BASES[0].palette;
  $("c-sky").value = p.sky;
  $("c-tileA").value = p.tileA;
  $("c-tileB").value = p.tileB;
  $("c-rim").value = p.rim;
  $("c-slab").value = p.slab;
  $("c-accent").value = p.accent;
  $("del-btn").disabled = !has;
}

function readForm() {
  const s = scenes[idx];
  if (!s) return;
  s.name = $("f-name").value;
  s.short = $("f-short").value || s.name;
  s.emoji = $("f-emoji").value || "🧱";
  s.id = $("f-id").value || s.id;
  s.rarity = $("f-rarity").value;
  s.style = $("f-style").value;
  s.backdropSlug = $("f-backdrop").value;
  s.say = $("f-say").value;
  s.blurb = $("f-blurb").value;
  s.starter = $("f-starter").checked;
  s.palette = {
    sky: $("c-sky").value,
    tileA: $("c-tileA").value,
    tileB: $("c-tileB").value,
    rim: $("c-rim").value,
    slab: $("c-slab").value,
    accent: $("c-accent").value,
  };
  renderBar();
  renderPreview();
}

["f-name", "f-short", "f-emoji", "f-id", "f-rarity", "f-style", "f-backdrop", "f-say", "f-blurb", "f-starter",
  "c-sky", "c-tileA", "c-tileB", "c-rim", "c-slab", "c-accent"].forEach((id) => {
  $(id).addEventListener("input", readForm);
  $(id).addEventListener("change", readForm);
});

$("dl-template").onclick = () => {
  const url = URL.createObjectURL(new Blob([dioramaBackdropVox()], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "diorama-backdrop-80x12x28.vox";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

$("vox-up").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!scenes.length) scenes.push(newBlankScene()), idx = 0, syncForm();
  const slug = cleanScene(scenes[idx])?.backdropSlug || "diorama-bg-custom";
  $("status").textContent = "Uploading .vox…";
  try {
    const r = await fetch(`/api/admin/studio/art/vox?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "x-admin-key": key },
      body: await file.arrayBuffer(),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    artVoxels = j.art?.voxels ?? artVoxels;
    await refreshModels();
    renderPreview();
    $("status").textContent = `Uploaded ${slug}.vox!`;
  } catch (err) {
    $("status").textContent = `Upload failed: ${err.message}`;
  }
};

$("dup-btn").onclick = () => {
  const names = DEFAULT_BASES.map((b, i) => `${i + 1}. ${b.emoji} ${b.name}`).join("\n");
  const pick = prompt(`Copy which built-in world? Enter 1–${DEFAULT_BASES.length}:\n${names}`, "1");
  const n = Number(pick);
  if (!Number.isInteger(n) || n < 1 || n > DEFAULT_BASES.length) return;
  const src = structuredClone(DEFAULT_BASES[n - 1]);
  scenes.push(src);
  idx = scenes.length - 1;
  syncForm();
  renderBar();
  renderPreview();
};

$("del-btn").onclick = () => {
  if (!scenes.length) return;
  scenes.splice(idx, 1);
  idx = Math.max(0, Math.min(idx, scenes.length - 1));
  syncForm();
  renderBar();
  renderPreview();
};

$("save-btn").onclick = async () => {
  $("status").textContent = "Saving…";
  try {
    const j = await studio("/diorama", { scenes });
    scenes = j.scenes ?? scenes;
    idx = Math.max(0, Math.min(idx, scenes.length - 1));
    syncForm();
    renderBar();
    renderPreview();
    $("status").textContent = "Saved & live at /games/diorama/!";
  } catch (err) {
    if (err.message !== "Wrong key") $("status").textContent = `Couldn't save: ${err.message}`;
  }
};

async function refreshModels() {
  try {
    const r = await fetch("/api/art");
    if (r.ok) {
      artVoxels = (await r.json()).voxels ?? {};
      $("vox-list").innerHTML = Object.keys(artVoxels).sort().map((s) => `<option value="${s}">`).join("");
    }
  } catch { /* offline */ }
  const slugs = new Set(["server-candle-idle", "child-idle", ...Object.keys(artVoxels)]);
  models = await loadModels([...slugs]);
}

async function boot() {
  refreshModels().then(() => renderPreview());
  if (!key) { renderBar(); syncForm(); renderPreview(); return askKey(); }
  try {
    const j = await studio("/diorama");
    scenes = Array.isArray(j.scenes) ? j.scenes : [];
    idx = 0;
  } catch (err) {
    if (err.message !== "Wrong key") $("status").textContent = `Loaded defaults (${err.message})`;
  }
  renderBar();
  syncForm();
  renderPreview();
}
boot();
