// The Studio's Candle Rack page: see where everyone stands in the game's churches and move them. It draws the real game
// church (Candle Rack's own church.js, from /candles/), so what he sees here is what the game shows. Saved online
// (POST /api/admin/studio/candles, the old one kept); the game reads it at /api/candles/layout and lays it over its own
// spots (SPOTS in apps/candles/public/js/church.js).
import { createChurch, loadModels, SPOTS, spotsFor } from "/candles/js/church.js";
import { newGame } from "/candles/js/game.js";
import { seasonOf } from "/candles/js/season.js";

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* fine */ } } };
let key = store.get("angelio:admin") || "";

const RITES = [["roman", "⛪ Roman church"], ["byzantine", "☦️ Byzantine church"]];
const VIEWS = [["before", "Before Mass"], ["end", "Start of Mass"]];
// the spots, by moment; `turn`: a person who can face another way; `up`: something that hangs (higher / lower)
const NAMES = {
  priestHome: "The priest waits here", serverHome: "The server waits here", big: "The big candle", lamp: "The sanctuary lamp",
  priestStart: "Priest, behind the royal doors", endPriest: "The priest", endCross: "The cross bearer",
  endCandleL: "Candle bearer (left)", endCandleR: "Candle bearer (right)",
};
const IN_VIEW = { before: ["priestHome", "serverHome", "big", "lamp"], end: ["priestStart", "endPriest", "endCross", "endCandleL", "endCandleR"] };

let rite = store.get("candles:rite") || "roman", view = "before", pick = null, fine = false, people = false;
let edits = {}, saved = "{}", models = {}, church = null, canvas = null, raf = 0, last = 0;
const season = seasonOf(new Date());
const fake = newGame({ seed: 1, stage: { taper: 6 } });
fake.people = []; fake.nextPerson = Infinity;
for (const c of fake.candles) { c.active = true; c.lit = true; c.life = 1; }

const spots = () => spotsFor(rite, edits);
const changed = () => JSON.stringify(edits) !== saved;

function buttons(el, list, current, onPick) {
  el.innerHTML = "";
  for (const [id, label] of list) {
    const b = document.createElement("button"); b.className = "pill"; b.textContent = label; b.setAttribute("aria-pressed", String(id === current));
    b.onclick = () => onPick(id); el.append(b);
  }
}
function drawMenus() {
  buttons($("rites"), RITES, rite, (r) => { rite = r; store.set("candles:rite", r); pick = null; rebuild(); });
  buttons($("views"), VIEWS, view, (v) => { view = v; pick = null; rebuild(); });
  const list = IN_VIEW[view].filter((k) => SPOTS[rite][k]).map((k) => [k, NAMES[k]]);
  buttons($("spots"), list, pick, (k) => { pick = pick === k ? null : k; drawMenus(); showPick(); });
  $("save").disabled = !changed();
  $("status").textContent = changed() ? "Not saved yet" : "";
}

// ── the church ──
function rebuild() {
  cancelAnimationFrame(raf);
  church?.dispose();
  canvas?.remove();
  canvas = document.createElement("canvas");
  $("stage").prepend(canvas);
  church = createChurch(canvas, { season, models, rite, hex: season.hex, taper: true, layout: edits });
  church.resize({ top: 10, bottom: 10 });
  church.studioView(view === "end");
  church.studioPeople(people);
  showPick();
  drawMenus();
  last = performance.now();
  const frame = (now) => { church.update(fake, Math.min(0.1, (now - last) / 1000)); last = now; raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
}
let soon = 0;
const rebuildSoon = () => { clearTimeout(soon); soon = setTimeout(rebuild, 120); };

function showPick() {
  $("controls").hidden = !pick;
  church?.mark(pick ? spots()[pick] : null);
  if (!pick) return;
  const s = spots()[pick];
  $("what").textContent = NAMES[pick];
  $("nums").textContent = `left–right ${s.x.toFixed(1)} · front–back ${s.z.toFixed(1)}${s.y !== undefined ? ` · height ${s.y.toFixed(1)}` : ""}${s.turn !== undefined ? ` · facing ${Math.round((s.turn * 180) / Math.PI)}°` : ""}`;
  $("turns").hidden = s.turn === undefined;
  $("heights").hidden = s.y === undefined;
  $("step").textContent = fine ? "Big steps" : "Small steps";
}
function nudge(f, by) {
  const s = { ...spots()[pick] };
  s[f] = Math.round((s[f] + by) * 100) / 100;
  ((edits[rite] ??= {})[pick] = s);
  showPick(); drawMenus(); rebuildSoon();
}
for (const b of document.querySelectorAll("[data-move]")) b.onclick = () => { const [dx, dz] = b.dataset.move.split(",").map(Number), step = fine ? 0.1 : 0.5; if (dx) nudge("x", dx * step); if (dz) nudge("z", dz * step); };
for (const b of document.querySelectorAll("[data-turn]")) b.onclick = () => nudge("turn", Number(b.dataset.turn) * (fine ? Math.PI / 36 : Math.PI / 8));
for (const b of document.querySelectorAll("[data-up]")) b.onclick = () => nudge("y", Number(b.dataset.up) * (fine ? 0.1 : 0.5));
$("step").onclick = () => { fine = !fine; showPick(); };
$("reset").onclick = () => { if (edits[rite]) delete edits[rite][pick]; showPick(); drawMenus(); rebuild(); };
$("people").onchange = (e) => { people = e.target.checked; church?.studioPeople(people); };
$("play").onclick = async () => { view = "end"; pick = null; rebuild(); church.studioView(false); await church.procession(); };
addEventListener("keydown", (e) => {
  if (!pick || e.target.tagName === "INPUT") return;
  const step = e.shiftKey ? 0.1 : 0.5, k = { ArrowLeft: ["x", -step], ArrowRight: ["x", step], ArrowUp: ["z", -step], ArrowDown: ["z", step] }[e.key];
  if (k) { e.preventDefault(); nudge(...k); }
});
addEventListener("resize", () => church?.resize({ top: 10, bottom: 10 }));
addEventListener("beforeunload", (e) => { if (changed()) e.preventDefault(); });

// ── saving ──
function askKey(msg = "") { $("key").hidden = false; $("keyErr").textContent = msg; $("keyIn").focus(); }
$("keyGo").onclick = () => { key = $("keyIn").value.trim(); store.set("angelio:admin", key); $("key").hidden = true; save(); };
$("keyIn").onkeydown = (e) => { if (e.key === "Enter") $("keyGo").click(); };
async function save() {
  if (!key) return askKey();
  $("status").textContent = "Saving…";
  try {
    const r = await fetch("/api/admin/studio/candles", { method: "POST", headers: { "x-admin-key": key, "content-type": "application/json" }, body: JSON.stringify({ layout: edits }) });
    if (r.status === 401) return askKey("That key didn't work.");
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    edits = j.layout; saved = JSON.stringify(edits);
    drawMenus(); $("status").textContent = "Saved: the game uses it now.";
  } catch (e) { $("status").textContent = `Couldn't save: ${e.message}`; }
}
$("save").onclick = save;

// ── start ──
(async () => {
  try { edits = await (await fetch("/api/candles/layout")).json(); } catch { edits = {}; }
  saved = JSON.stringify(edits);
  models = await loadModels();
  $("loading").remove();
  rebuild();
})();
