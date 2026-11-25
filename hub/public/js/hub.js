// The hub and subject pages share the same catalog and spoken app tiles.

import { SUBJECTS, APP_LIST } from "./apps.js";
import { jingleOnce } from "./jingle.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Each live game is a big icon tile (tap: play); 🔊 reads its name and what it is. Coming-soon games
// are one small row at the bottom, so the page stays short.
const tile = (a) => `
  <div class="tile">
    <a class="tile-go" href="/${a.path}/" aria-label="${esc(a.name)}: ${esc(a.blurb)}">
      <img src="/${a.path}/icon.svg" alt="" width="88" height="88" loading="lazy">
      <b>${esc(a.name)}</b><small>${esc(a.grades)}</small><p>${esc(a.blurb)}</p>
    </a>
    <button type="button" class="tile-say" data-say="${esc(`${a.name}. ${a.blurb}`)}" aria-label="Hear about ${esc(a.name)}">🔊</button>
  </div>`;

const catalog = document.getElementById("apps");
const subject = catalog.dataset.subject;
catalog.innerHTML = SUBJECTS.filter((s) => subject ? s.id === subject : !s.page).map((s) => {
  const live = APP_LIST.filter((a) => a.subject === s.id && a.path);
  if (!live.length) return "";
  const heading = subject ? "" : `<h2><span aria-hidden="true">${s.emoji}</span> ${esc(s.title)}</h2>`;
  return `<section class="subject" id="${s.id}" aria-label="${esc(s.title)} apps" style="--c:${s.color}">${heading}<div class="tiles">${live.map(tile).join("")}</div></section>`;
}).join("");

// Watch & Sing's box: the app, plus today's course, lesson and song (the same picks as inside the app).
const ofTheDay = (list, salt) => {
  const d = new Date(), day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return list.length ? list[(day * 7 + salt) % list.length] : null;
};
const dayTile = (href, label, title, pic, emoji) => `
  <div class="tile day">
    <a class="tile-go" href="${href}" aria-label="${esc(label)}: ${esc(title)}">
      <span class="day-pic">${pic ? `<img src="/watch/${esc(pic)}" alt="" loading="lazy">` : ""}${emoji ? `<span class="day-emoji" aria-hidden="true">${esc(emoji)}</span>` : ""}</span>
      <small>${esc(label)}</small><b>${esc(title)}</b>
    </a>
    <button type="button" class="tile-say" data-say="${esc(`${label}: ${title}`)}" aria-label="Hear it">🔊</button>
  </div>`;
const faithTiles = document.querySelector("#faith .tiles");
if (faithTiles) fetch("/watch/data/library.json").then((r) => r.json()).then((lib) => {
  const lessons = lib.lessons.filter((x) => !x.hidden), songs = lib.songs.filter((x) => !x.hidden);
  const ids = new Set(lessons.map((x) => x.id));
  const courses = lib.courses.map((c) => ({ ...c, items: c.items.filter((i) => ids.has(i)) })).filter((c) => c.items.length);
  const course = ofTheDay(courses, 5), lesson = ofTheDay(lessons, 0), song = ofTheDay(songs, 3);
  const first = course && lessons.find((l) => l.id === course.items[0]);
  faithTiles.insertAdjacentHTML("beforeend",
    (course ? dayTile(`/watch/#/course/${course.id}`, "Course of the day", course.title, first?.poster, course.emoji) : "")
    + (lesson ? dayTile(`/watch/#/lesson/${lesson.id}`, "Lesson of the day", lesson.title, lesson.poster) : "")
    + (song ? dayTile(`/watch/#/song/${song.id}`, "Song of the day", song.title, song.poster) : ""));
}).catch(() => {});

const soon = APP_LIST.filter((a) => !a.path && (subject ? a.subject === subject : a.subject !== "games")); // Games has its own coming-soon tiles
document.getElementById("soon").innerHTML = soon.length ? `<section class="soon-row" aria-label="Coming soon"><h3>Coming soon</h3>
  <div>${soon.map((a) => `<span class="chip" title="${esc(a.blurb)}"><span aria-hidden="true">${a.emoji}</span> ${esc(a.name)}</span>`).join("")}</div></section>` : "";

// 🔊 on a tile: the games' own voice (any app's /api/tts works through the hub), or the device voice.
let playing;
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-say]");
  if (!b) return;
  const text = b.dataset.say;
  try { playing?.pause(); speechSynthesis?.cancel(); } catch { /* ignore */ }
  b.classList.add("saying");
  const done = () => b.classList.remove("saying");
  try {
    const r = await fetch(`/snap/api/tts?${new URLSearchParams({ text, voice: "", v: "4" })}`);
    if (!r.ok) throw new Error("voice");
    playing = new Audio(URL.createObjectURL(await r.blob()));
    playing.onended = done;
    await playing.play();
  } catch {
    try { const u = new SpeechSynthesisUtterance(text); u.onend = done; speechSynthesis.speak(u); } catch { done(); }
  }
});

// A soft halo chime on the first tap of a visit (browsers don't allow sound before a tap).
jingleOnce("angelio");

// "Copy our address": always the real one.
document.querySelector("[data-copy]")?.addEventListener("click", async (e) => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText("https://angelio.org"); b.textContent = "✅ Copied: angelio.org"; }
  catch { b.textContent = "angelio.org"; }
});

// Family code for speech checks: saved on this device (localStorage "angelio:code"); every game on
// angelio.org sends it with a speech check (header x-angelio-code), see worker/codes.js.
const codeForm = document.getElementById("code-form"), codeIn = document.getElementById("code-in"), codeStatus = document.getElementById("code-status");
const getCode = () => { try { return localStorage.getItem("angelio:code") || ""; } catch { return ""; } };
async function showCode(code, { fresh = false } = {}) {
  if (!code) { codeStatus.className = "code-status"; codeStatus.textContent = ""; codeForm.hidden = false; return; }
  codeStatus.className = "code-status"; codeStatus.textContent = "Checking…";
  try {
    const r = await (await fetch(`/api/code?c=${encodeURIComponent(code)}`)).json();
    if (!r.valid) {
      codeStatus.className = "code-status bad";
      codeStatus.textContent = r.revoked ? "That code has been turned off." : "That code doesn't work. Check the letters and try again.";
      if (!fresh) { try { localStorage.removeItem("angelio:code"); } catch { /* ignore */ } }
      codeForm.hidden = false;
      return;
    }
    try { localStorage.setItem("angelio:code", code); } catch { /* ignore */ }
    codeForm.hidden = true;
    codeStatus.className = "code-status ok";
    codeStatus.innerHTML = `✅ Code on for the ${esc(r.name)}: ${r.left} of ${r.limit} speech checks left this month. <button type="button" data-forget>Remove</button>`;
    codeStatus.querySelector("[data-forget]").onclick = () => { try { localStorage.removeItem("angelio:code"); } catch { /* ignore */ } codeIn.value = ""; showCode(""); };
  } catch {
    codeStatus.className = "code-status bad"; codeStatus.textContent = "Couldn't check the code right now. Try again in a minute.";
  }
}
// "Get a family code" (Stripe). While the link is a Stripe TEST link, the button only shows on
// angelio.org/?testbuy (for trying it out); with the live link it shows for everyone.
{
  const buy = document.querySelector("[data-buy]"), link = buy?.querySelector("a")?.href ?? "";
  let testing = false;
  try { testing = new URLSearchParams(location.search).has("testbuy") || sessionStorage.getItem("angelio:testbuy") === "1"; if (testing) sessionStorage.setItem("angelio:testbuy", "1"); } catch { /* ignore */ }
  if (buy && (!link.includes("/test_") || testing)) buy.hidden = false;
}

codeForm?.addEventListener("submit", (e) => { e.preventDefault(); showCode(codeIn.value.trim().toUpperCase(), { fresh: true }); });
if (codeForm) showCode(getCode());

// Who reads to you? The family voices (Mom, Dad, and family and friends who recorded at angelio.org/voice/), picked
// here for every game ("angelio:voice", the same pick the games' grown-ups page makes; the games' kit/tts.js plays it).
(async () => {
  const box = document.getElementById("readers"), row = document.getElementById("reader-row");
  if (!box) return;
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const code = get("angelio:code");
  let j;
  try { j = await (await fetch("/api/clips", code ? { headers: { "x-angelio-code": code } } : undefined)).json(); } catch { return; }
  const voices = (j.voices ?? []).filter((v) => v.lines > 0 || v.id === "f" || v.id === "m");
  if (!voices.some((v) => v.lines > 0)) return;
  // a short sample in their own voice: the first of the shared lines they recorded ("Great job!" if they did)
  const lines = await fetch("/admin/lines.json").then((r) => r.json()).then((x) => x.groups[0].lines.map((l) => l.text)).catch(() => []);
  const { lineId } = await import("/letters/js/kit/tts.js");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const draw = () => {
    const now = get("angelio:voice") || "f";
    row.innerHTML = [...voices, { id: "robot", name: "Robot", emoji: "🤖" }].map((v) =>
      `<button type="button" class="reader" data-reader="${esc(v.id)}" aria-pressed="${v.id === now}"><span class="em" aria-hidden="true">${esc(v.emoji)}</span>${esc(v.name)}</button>`).join("");
  };
  draw();
  box.hidden = false;
  row.onclick = (e) => {
    const b = e.target.closest("[data-reader]");
    if (!b) return;
    try { localStorage.setItem("angelio:voice", b.dataset.reader); } catch { /* storage blocked */ }
    draw();
    const set = b.dataset.reader, idx = j.clips?.[set] ?? {};
    const sample = ["Great job!", ...lines].find((t) => idx[lineId(t)] != null);
    if (sample) new Audio(`/api/clip?set=${set}&id=${lineId(sample)}&v=${idx[lineId(sample)]}${set.startsWith("v-") && code ? `&code=${encodeURIComponent(code)}` : ""}`).play().catch(() => {});
  };
})();
