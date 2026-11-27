// The games page (angelio.org/games/): every game in the app list's "games" group (hub/public/js/apps.js), each with
// your best score and stars on this device (each game keeps them in its own saved progress, on the same site), and
// the coming-soon games. Later this page can become a map of a little parish, each game a building (ROADMAP.md).
import { APP_LIST } from "/js/apps.js";
import { jingleOnce } from "/js/jingle.js";
import { BOX_COST, DEFAULT_BASES, PIECES, mergeBases } from "/games/diorama/catalog.js";
import { loadBells, loadDiorama, canOpenBox } from "/games/diorama/store.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const games = APP_LIST.filter((a) => a.subject === "games");

/** Your best score and stars in a game, from its saved progress ("<path>:v1"), if you've played it here. */
function mine(path) {
  try {
    const s = JSON.parse(localStorage.getItem(`${path}:v1`) ?? "null");
    if (!s) return null;
    const best = Math.max(0, ...Object.entries(s.settings ?? {}).filter(([k]) => /^best/.test(k)).map(([, v]) => Number(v) || 0));
    const stars = Math.max(0, ...Object.values(s.levels ?? {}).map((l) => l.stars ?? 0));
    return best || stars ? { best, stars } : null;
  } catch { return null; }
}

const tile = (a) => {
  const m = a.path ? mine(a.path) : null;
  const spoken = a.say ?? `${a.name}. ${a.blurb}`;
  return `<article class="game-tile${a.path ? "" : " soon"}" data-game="${esc(a.path || "soon")}">
    <a class="game-link" href="${a.path ? `/${a.path}/` : "#soon"}" ${a.path ? "" : 'aria-disabled="true" tabindex="-1"'} aria-label="${esc(a.name)}: ${esc(a.blurb)}">
      <div class="game-cover">
        ${a.path ? `<img src="/${a.path}/icon.svg" alt="" width="84" height="84">` : `<span class="big-emoji" aria-hidden="true">${a.emoji}</span>`}
        ${!a.path ? `<span class="game-badge">Soon</span>` : ""}
      </div>
      <div class="game-meta">
        <b>${esc(a.name)}</b>
        <p>${esc(a.blurb)}</p>
        <div class="game-foot">
          ${m ? `<span class="mine">${"★".repeat(m.stars)}${"☆".repeat(3 - m.stars)}${m.best ? ` · ${m.best}` : ""}</span>` : `<span class="game-cta">${a.path ? "Tap to play" : "Coming soon"}</span>`}
        </div>
      </div>
    </a>
    <button type="button" class="tile-say" data-say="${esc(spoken)}" aria-label="Hear about ${esc(a.name)}">🔊</button>
  </article>`;
};
document.getElementById("games").innerHTML = games.filter((a) => a.path).map(tile).join("");
document.getElementById("soon").innerHTML = games.filter((a) => !a.path).map(tile).join("");
document.getElementById("soon").addEventListener("click", (e) => { if (e.target.closest('a[aria-disabled="true"]')) e.preventDefault(); });

// Parish Bells + Prize Box + 3D Voxel Diorama progress across the arcade games
function renderDioramaBanner(bases = DEFAULT_BASES) {
  const bells = loadBells();
  const diorama = loadDiorama(null, bases);
  const check = canOpenBox(bells, diorama, bases);
  const pill = document.getElementById("bell-pill");
  if (pill) {
    pill.href = check.ok ? "/games/diorama/#box" : "/games/diorama/";
    pill.innerHTML = check.reason === "welcome"
      ? `🔔 ${bells.bells} <span class="bell-ready">🎁 FREE!</span>`
      : check.ok
        ? `🔔 ${bells.bells} <span class="bell-ready">🎁 Open!</span>`
        : `🔔 ${bells.bells}/${BOX_COST}`;
  }
  const banner = document.getElementById("diorama-banner");
  if (banner) {
    const pct = check.reason === "welcome" || check.reason === "complete" ? 100 : Math.min(100, Math.round((bells.bells / BOX_COST) * 100));
    const ctaHref = check.ok ? "/games/diorama/#box" : "/games/diorama/";
    const ctaText = check.reason === "welcome"
      ? "🎁 Open Welcome Box! (FREE)"
      : check.ok
        ? `🎁 Open Prize Box! (${BOX_COST} 🔔)`
        : "🧱 Build Your Diorama";
    const status = check.reason === "welcome"
      ? "A free welcome figurine or world is waiting in your Prize Box!"
      : check.ok
        ? `You have ${bells.bells} 🔔 — ready to unlock a new figurine or world!`
        : check.reason === "complete"
          ? `All ${PIECES.length} figurines & ${bases.length} worlds unlocked — build away!`
          : `${check.need} more 🔔 from any game to unlock more figurines & worlds!`;
    banner.innerHTML = `
      <div class="dio-info">
        <div class="dio-title"><span class="dio-ic" aria-hidden="true">🧱</span><div><b>Voxel Diorama &amp; Prize Box</b><small>${diorama.unlocked.length}/${PIECES.length} figurines · ${diorama.unlockedBases.length}/${bases.length} worlds · 🔔 ${bells.bells}</small></div></div>
        <p class="dio-sub">${status}</p>
        <div class="dio-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </div>
      <div class="dio-actions">
        <a class="dio-cta${check.ok ? " ready" : ""}" href="${ctaHref}">${ctaText}</a>
      </div>
    `;
  }
}
renderDioramaBanner();
fetch("/api/diorama/scenes")
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => { if (Array.isArray(j?.scenes) && j.scenes.length) renderDioramaBanner(mergeBases(DEFAULT_BASES, j.scenes)); })
  .catch(() => {});

// 🔊: the games' own voice (any app's /api/tts works through the hub), or the device voice
let playing;
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-say]");
  if (!b) return;
  const text = b.dataset.say;
  try { playing?.pause(); speechSynthesis?.cancel(); } catch { /* ignore */ }
  try {
    const r = await fetch(`/snap/api/tts?${new URLSearchParams({ text, voice: "", v: "4" })}`);
    if (!r.ok) throw new Error("voice");
    playing = new Audio(URL.createObjectURL(await r.blob()));
    await playing.play();
  } catch { try { speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch { /* no voice */ } }
});
jingleOnce("angelio");

// The Games page is its own home-screen app: save it so it opens offline.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("/games/sw.js", { scope: "/games/" }).catch(() => {});
}
