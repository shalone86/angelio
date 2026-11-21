// A family member's recording page (angelio.org/voice/?t=…): the link the owner sent them is their only key
// (hub worker/voices.js). They record the lines every game says most ("Every game" in /admin/lines.json, made by
// tools/voice-lines.mjs), and more for each game if they like. Each line is matched in the games by its exact words
// (the kit's lineId), so a recording here plays wherever that line is said.
import { record, toWav } from "/js/record-wav.js";
import { lineId } from "/letters/js/kit/tts.js";

const $ = (id) => document.getElementById(id);
const t = new URLSearchParams(location.search).get("t") ?? "";
let me = null, recorded = {}, groups = [];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const showErr = (m) => { $("err").hidden = !m; $("err").textContent = m || ""; };

async function call(path, { method = "GET", body } = {}) {
  const r = await fetch(`${path}${path.includes("?") ? "&" : "?"}t=${encodeURIComponent(t)}`, { method, body, headers: body ? { "content-type": "audio/wav" } : {} });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Something went wrong (${r.status}).`);
  return j;
}
const mine = (id) => `/api/clip?set=${me.id}&id=${id}&v=${recorded[id]}`;
let player = null;
const play = (url) => { player?.pause(); player = new Audio(url); player.play().catch(() => {}); };

function lineHtml(l) {
  const has = recorded[l.id] != null;
  return `<div class="line${has ? " done" : ""}" data-line="${l.id}">
    <div><div class="t">${esc(l.text)}</div><div class="w">${esc(l.where)}</div></div>
    <div class="btns"><button class="b rec" data-rec="${l.id}">⏺ Record</button>
      <button class="b" data-play="${l.id}" ${has ? "" : "disabled"} aria-label="Play yours">▶</button>
      <button class="b" data-del="${l.id}" ${has ? "" : "disabled"} aria-label="Delete yours">🗑</button></div></div>`;
}
function render() {
  const main = groups[0], done = main.items.filter((l) => recorded[l.id] != null).length;
  $("progress").textContent = done === main.items.length ? `All ${done} done. Thank you! 🎉` : `${done} of ${main.items.length} recorded`;
  $("pct").textContent = `${Math.round((100 * done) / main.items.length)}%`;
  $("fill").style.width = `${(100 * done) / main.items.length}%`;
  $("main").innerHTML = `<b>${esc(main.name)}: the lines kids hear most</b>${main.items.map(lineHtml).join("")}`;
  $("extra").innerHTML = groups.slice(1).map((g) => `<h3>${esc(g.name)}</h3>${g.items.map(lineHtml).join("")}`).join("");
  // the next one to record stands out
  document.querySelector(".line:not(.done)")?.classList.add("now");
}

document.addEventListener("click", async (e) => {
  const rec = e.target.closest("[data-rec]"), pl = e.target.closest("[data-play]"), del = e.target.closest("[data-del]");
  if (pl) return play(mine(pl.dataset.play));
  if (del) {
    if (!confirm("Delete this recording?")) return;
    try { await call(`/api/voice/clip/delete?id=${del.dataset.del}`, { method: "POST" }); delete recorded[del.dataset.del]; render(); } catch (err) { showErr(err.message); }
    return;
  }
  if (!rec) return;
  if (rec.classList.contains("on")) return rec._stop?.();
  if (document.querySelector(".b.rec.on")) return;
  showErr("");
  const id = rec.dataset.rec;
  // "on" at once, so a second tap while the microphone is still starting stops it instead of starting another
  rec.classList.add("on"); rec.textContent = "⏹ Stop";
  let stopEarly = false; rec._stop = () => { stopEarly = true; };
  try {
    const r = await record(20000); // tap Stop when done (20 seconds at most)
    rec._stop = r.stop;
    if (stopEarly) setTimeout(r.stop, 600); // tapped Stop before it was listening: give it a moment, then stop
    const wav = await toWav(await r.done);
    rec.classList.remove("on"); rec.textContent = "Saving…"; rec.disabled = true;
    const j = await call(`/api/voice/clip?id=${id}`, { method: "POST", body: wav });
    recorded[id] = j.v;
    render();
    play(mine(id));
    document.querySelector(".line.now")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) { showErr(err.message || String(err)); render(); }
});

(async () => {
  try {
    if (!t) throw new Error("This page needs the link you were sent.");
    const j = await call("/api/voice");
    me = j.voice; recorded = j.recorded;
    $("hello").textContent = `${me.emoji} Hi, ${me.name}!`;
    $("privacyNote").innerHTML = me.private
      ? "<b>Family only:</b> your recordings play only on our family's devices."
      : "<b>Who hears it:</b> any child playing Angelio can pick your voice, shown by your first name. You can ask for your recordings to be removed any time.";
    const lines = await (await fetch("/admin/lines.json", { cache: "no-cache" })).json();
    groups = lines.groups.map((g) => ({ name: g.name, items: g.lines.filter((l) => !l.text.includes("{{")).map((l) => ({ ...l, id: lineId(l.text) })) }));
    render();
  } catch (err) {
    $("main").innerHTML = ""; $("progress").textContent = ""; showErr(err.message);
  }
})();
