// Shared screens and bits: escaping, stars, the "Next" button, the finish screen with stickers,
// the grown-ups settings card, and a click sound for every button.

import * as S from "./store.js";
import { speak, stop, resetCutoffs, browserVoices, whenQuiet, chooseVoice, chosenVoice, familyVoices } from "./tts.js";
import { health } from "./api.js";
import { sfx } from "./sound.js";
import { confetti } from "./fx.js";
import { spoken } from "./speech.js";
import { vary } from "./vary.js";
import { STICKER_WORLD, DIORAMA_WORLD, BOX_COST, bellsForRound, loadBells, awardBells } from "./stickers.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
// Things that are fun to place in the Sticker World: animals, vehicles, buildings, nature, treats.
export const STICKERS = ["🦄", "🚀", "🦖", "🌈", "🐙", "🎈", "🦋", "🐢", "🌟", "🐝", "🦕", "🐼", "🐬", "🐶", "🐱", "🐴", "🐑", "🐸",
  "🦉", "🐞", "🦊", "🐻", "🐧", "🐳", "🦒", "🐘", "🐰", "🦆", "🚂", "🚁", "⛵", "🚒", "🚜", "🎠", "🏰", "🏡", "⛪", "🌳", "🌻",
  "🍄", "🌷", "⛲", "🧸", "🪁", "🍩", "🍦", "🍉", "🕊️", "👼", "🐟",
  // From our faith (about one sticker in four): church, cross, rosary, candle, praying hands, bread and
  // grapes, the Lamb, a bell, a rose for Mary, the star of Bethlehem, the ox and donkey at the manger.
  "⛪", "✝️", "📿", "🕯️", "🙏", "🍞", "🍇", "🐑", "🔔", "🌹", "🌟", "🐂", "🫏", "👼", "🕊️",
  // Our own drawings (emoji have no Mary, chalice or Sacred Heart): angelio.org/stickers/art/
  "art:mary", "art:baby-jesus", "art:sacred-heart", "art:chalice", "art:monstrance", "art:bible", "art:lily",
  "art:st-joseph", "art:st-francis", "art:guardian-angel", "art:holy-family", "art:rosary", "art:agnus-dei", "art:advent-wreath", "art:loaves-fishes"];

/** A sticker as HTML: an emoji, or one of our drawings ("art:mary") or voxel stickers ("vox:priest-bless"). Sized by font-size, like emoji. */
const ART = { mary: "Mary", "baby-jesus": "Baby Jesus", "sacred-heart": "Sacred Heart", chalice: "Chalice", monstrance: "Monstrance", bible: "Holy Bible", lily: "Lily",
  "st-joseph": "St. Joseph", "st-francis": "St. Francis", "guardian-angel": "Guardian angel", "holy-family": "The Holy Family", rosary: "Rosary", "agnus-dei": "Lamb of God", "advent-wreath": "Advent wreath", "loaves-fishes": "Loaves and fishes" };
export const VOX_NAMES = {
  "priest-bless": "Father Blessing", "priest-mass-idle": "Father at Mass", "priest-idle": "Father",
  "east-priest-cense": "Father Censing", "east-priest-phelonion-idle": "Eastern Priest",
  "server-candle-idle": "Candle Server", "server-cross-idle": "Cross Server", "server-light": "Lighting Server",
  "east-server-ripidion-idle": "Ripidion Server", "east-server-cross-idle": "Eastern Cross Server",
  "child-walk": "Boy", "child-girl-walk": "Girl", "child-kneel": "Boy Praying", "child-girl-kneel": "Girl Praying",
  "man-walk": "Man", "woman-kneel": "Woman Praying", "grandfather-idle": "Grandfather", "grandmother-idle": "Grandmother",
};
export const VOX_STICKERS = Object.keys(VOX_NAMES).map((k) => `vox:${k}`);
export const stickerHtml = (e) => {
  const s = String(e ?? "");
  if (s.startsWith("art:")) return `<img class="art-sticker" src="https://angelio.org/stickers/art/${esc(s.slice(4))}.svg" alt="${esc(ART[s.slice(4)] ?? "sticker")}" draggable="false">`;
  if (s.startsWith("vox:")) return `<img class="art-sticker" src="https://angelio.org/stickers/vox/${esc(s.slice(4))}.svg" alt="${esc(VOX_NAMES[s.slice(4)] ?? "voxel sticker")}" draggable="false">`;
  return esc(s);
};

export const starsHtml = (n) => `<span class="stars" aria-label="${n} of 3 stars">${"★".repeat(n)}<span class="off">${"★".repeat(3 - n)}</span></span>`;
// 3 stars only with no mistakes, matching the giant sticker (any mistake: a mini sticker and a yellow dot).
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);

/** A big pulsing button in the dock; resolves when pressed (or Enter). */
export function nextButton(dock, label) {
  dock.innerHTML = `<button class="btn big primary pulse next-auto" data-next><span class="next-fill" aria-hidden="true"></span><span class="next-label">${label}</span></button>`;
  const btn = dock.querySelector("[data-next]");
  return new Promise((resolve) => {
    let done = false, timer = 0;
    const go = () => { if (done) return; done = true; clearTimeout(timer); document.removeEventListener("keydown", onKey); resolve(); };
    const onKey = (e) => { if (e.key === "Enter") go(); };
    btn.onclick = go;
    document.addEventListener("keydown", onKey);
    // Little ones may not know to tap Next: once the voice is done, the button fills up and goes on by itself.
    // Wait for the voice, but never forever (a device voice can forget to say it's finished).
    if (S.settings().autoNext !== false) Promise.race([whenQuiet(), new Promise((r) => setTimeout(r, 20000))]).then(() => {
      if (done || !btn.isConnected) return;
      btn.style.setProperty("--auto-next", `${AUTO_NEXT_MS}ms`);
      btn.classList.add("counting");
      timer = setTimeout(() => { if (btn.isConnected) go(); }, AUTO_NEXT_MS);
    });
  });
}
const AUTO_NEXT_MS = 5000;

/** Show a message in the speech bubble and say it. */
export function say(bubble, text, { speakText = true, spokenOverride = null } = {}) {
  const p = bubble.querySelector(".say");
  p.innerHTML = text;
  bubble.lastSaid = spoken(spokenOverride ?? text);
  bubble.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }], { duration: 300 });
  if (speakText) speak(bubble.lastSaid);
}

/** Mark a progress dot: green when solved alone, yellow when it needed a mistake or a hint. */
export function markDot(root, k, helped) {
  const d = root.querySelector(`[data-dot="${k}"]`);
  d?.classList.remove("now");
  d?.classList.add(helped ? "assisted" : "done");
}

/**
 * Stars, the level's sticker, confetti and "play again / next". One sticker per level:
 * when `byStars` is true, 3 stars earns a giant sticker (regardless of mistakes), 2 stars earns
 * a mini sticker, and <2 stars earns no new sticker. Otherwise 0 mistakes (or 3 stars) makes it giant.
 */
export function showFinish(app, { id, stars, mistakes, title, done, again, next, onAgain, byStars = false, voxelStickers = byStars, bells = byStars }) {
  document.body.classList.remove("in-game");
  const big = byStars ? stars >= 3 : (stars >= 3 || mistakes === 0);
  const perfect = !byStars && mistakes === 0;
  let pool = STICKERS;
  if (voxelStickers) {
    const owned = new Set(S.stickers().map((s) => s.e));
    try {
      const shared = JSON.parse(localStorage.getItem("angelio:stickers") ?? "{}");
      for (const v of Object.values(shared)) if (v?.e) owned.add(v.e);
    } catch { /* ignore */ }
    const fresh = VOX_STICKERS.filter((v) => !owned.has(v));
    pool = fresh.length ? fresh : VOX_STICKERS;
  }
  const earn = byStars && stars < 2 ? null : pick(pool);
  const st = S.finishLevel(id, stars, earn, big);
  const isDaily = String(id ?? "").startsWith("daily-");
  const bellGain = bells ? awardBells(bellsForRound(stars, isDaily)) : null;
  const bellNeed = bellGain ? Math.max(0, BOX_COST - bellGain.bells) : 0;
  const bellPct = bellGain ? Math.min(100, Math.round((bellGain.bells / BOX_COST) * 100)) : 0;
  const bellCard = bellGain ? `
      <div class="bell-reward" style="max-width:440px;margin:12px auto 16px;padding:12px 16px;border-radius:18px;background:var(--surface);border:2px solid var(--yellow-dark);box-shadow:0 3px 0 var(--border);display:grid;gap:8px;text-align:left">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:800">
          <span>🔔 +${bellGain.added} Parish Bells${isDaily ? ` <small style="color:var(--yellow-ink)">· Daily bonus!</small>` : ""}</span>
          <span style="color:var(--yellow-ink)">${bellGain.bells} 🔔</span>
        </div>
        <div style="height:10px;border-radius:99px;background:var(--yellow-soft);overflow:hidden;border:1px solid var(--border)"><i style="display:block;height:100%;width:${bellPct}%;background:linear-gradient(90deg,var(--yellow-dark),var(--yellow))"></i></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:.9rem;font-weight:700">
          <span class="muted">${bellGain.ready ? "A 3D Prize Box is waiting for your Voxel Diorama!" : `${bellNeed} more 🔔 for a Prize Box!`}</span>
          ${bellGain.ready ? `<a class="btn small primary" href="${DIORAMA_WORLD}#box">🎁 Open Prize Box!</a>` : `<a class="btn small" href="${DIORAMA_WORLD}">🧱 Diorama</a>`}
        </div>
      </div>` : "";
  sfx.fanfare();
  confetti(big ? 100 : st.e ? 45 : 20);
  const line = byStars
    ? (!st.e ? "Get two stars for a mini sticker, or three stars for a giant one!"
      : st.grew ? "Three stars! Your sticker grew into a GIANT sticker!"
      : st.isNew && st.big ? "Three stars! You earned a giant sticker!"
      : st.isNew ? "Two stars! A mini sticker! Get three stars next time to make it giant."
      : st.big ? (big ? "Three stars! Awesome job!" : done)
      : "Get three stars next time, and your mini sticker grows giant!")
    : (st.grew ? "Your sticker grew into a GIANT sticker!"
      : st.isNew && st.big ? (perfect ? "A giant sticker! No mistakes at all!" : "Three stars! You earned a giant sticker!")
      : st.isNew ? "A mini sticker! Play again with no mistakes to make it giant."
      : st.big ? (perfect ? "No mistakes at all. Wow!" : done)
      : perfect ? "" : "No mistakes next time, and your mini sticker grows giant!");
  const label = st.grew ? "It grew! 🌟" : st.isNew ? (st.big ? "Giant sticker!" : "Mini sticker!") : st.big ? "Your giant sticker" : "Your mini sticker";
  const heading = byStars
    ? (big ? vary("threeStars", ["Three stars!", "Super star!", "Amazing!"]) : title)
    : (perfect ? vary("perfect", ["Perfect!", "No mistakes!", "Super star!"]) : title);
  const againLabel = st.big ? "Play again" : st.e ? "Try for giant!" : "Try again!";
  const spokenLine = byStars
    ? (!st.e ? "Good try! Get two stars for a mini sticker, or three stars for a giant one!"
      : st.grew ? "Wow! Three stars! Your sticker grew into a giant sticker!"
      : st.isNew && st.big ? vary("giantStars", ["Three stars! You earned a giant sticker!", "Super star! Here's a giant sticker!"])
      : st.isNew ? vary("miniStars", ["Two stars! You got a mini sticker. Get three stars next time to make it giant!", "Nice work! Here's a mini sticker. Three stars next time makes it giant!"])
      : big ? "Three stars! Awesome job!" : stars >= 2 ? "Two stars! Three stars next time makes your sticker giant!" : "Good try!")
    : (st.grew ? "Wow! Your sticker grew into a giant sticker!"
      : st.isNew && st.big ? vary("giant", ["You did it with no mistakes! You got a giant sticker!", "Perfect! Here's a giant sticker!"])
      : st.isNew ? vary("mini", ["You did it! You got a mini sticker. Play again with no mistakes to make it giant!", "Nice work! Here's a mini sticker. No mistakes next time makes it giant!"])
      : perfect ? "You did it! No mistakes!" : "You did it!");
  app.innerHTML = `
    <section class="finish">
      <div class="big-stars">${starsHtml(stars)}</div>
      <h1>${heading}</h1>
      ${st.e ? `<p class="new-sticker ${st.big ? "big-sticker" : "mini-sticker"}${st.grew ? " grew" : ""}"><span>${stickerHtml(st.e)}</span><br>${label}</p>` : ""}
      ${line ? `<p class="muted">${esc(line)}</p>` : ""}
      ${bellCard}
      <div class="row center">
        <a class="btn big${st.big ? "" : " primary"}" href="${again}" data-again>🔁 ${againLabel}</a>
        <a class="btn big" href="#/">🏠 Home</a>
        ${next ? `<a class="btn big${st.big ? " primary" : ""}" href="${next.href}">${next.label}</a>` : ""}
      </div>
      <p class="finish-links" style="display:flex;flex-wrap:wrap;justify-content:center;align-items:stretch;gap:10px"><a class="btn world-link" href="https://angelio.org/"><img src="https://angelio.org/icon.svg" alt="" width="22" height="22" style="vertical-align:-5px;border-radius:6px"> All Angelio games</a>${bells ? ` <a class="btn world-link" href="${DIORAMA_WORLD}">🧱 Voxel Diorama</a>` : ""}${STICKER_WORLD ? ` <a class="btn world-link" href="${STICKER_WORLD}">🌍 Sticker World</a>` : ""}</p>
    </section>`;
  speak(spokenLine);
  if (onAgain) app.querySelector("[data-again]").onclick = (e) => { e.preventDefault(); onAgain(); };
}

export function stickerBook({ byStars = false } = {}) {
  const st = S.stickers();
  const emptyHint = byStars
    ? "Get two stars on a stage for a mini voxel sticker, or three stars for a giant one!"
    : "Finish a level to get your first sticker! No mistakes makes it a giant one.";
  const title = byStars ? "My voxel stickers" : "My stickers";
  const count = byStars ? `${st.length} ${st.length === 1 ? "sticker" : "stickers"}` : `${S.solved()} solved`;
  const worldLink = STICKER_WORLD && st.length ? `<a class="btn world-link" href="${STICKER_WORLD}">🌍 Play in Sticker World</a>` : "";
  const bellAction = byStars ? (() => {
    const b = loadBells();
    return b.bells >= BOX_COST
      ? `<a class="btn world-link" href="${DIORAMA_WORLD}#box" style="background:var(--yellow-soft);border-color:var(--yellow-dark);color:var(--yellow-ink)">🎁 Prize Box Ready! (${b.bells} 🔔)</a>`
      : `<a class="btn world-link" href="${DIORAMA_WORLD}">🧱 Voxel Diorama · 🔔 ${b.bells}/${BOX_COST}</a>`;
  })() : "";
  const links = byStars ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;align-items:center">${worldLink}${bellAction}</div>` : worldLink;
  return `<section class="sticker-book">
      <h2>${title} <small>${count}</small></h2>
      ${st.length ? `<div class="stickers">${st.map((s) => `<span class="${s.big ? "big" : "mini"}" title="${s.big ? "giant" : "mini"} sticker">${stickerHtml(s.e)}</span>`).join("")}</div>`
        : `<p class="muted small" style="order:3">${emptyHint}</p>`}
      ${links}
    </section>`;
}

/** The grown-ups page: settings shared by every app, plus an app-specific "how it teaches" note. */
export async function viewGrownups(app, { extraToggles = [], about = "" } = {}) {
  const s = S.settings();
  const toggle = (k, label, sub) => `<label class="set"><span><b>${label}</b>${sub ? `<br><span class="muted small">${sub}</span>` : ""}</span><input type="checkbox" data-k="${k}" ${s[k] ? "checked" : ""}></label>`;
  app.innerHTML = `
    <section>
      <h1>For grown-ups</h1>
      <div class="card" data-voice-picker hidden></div>
      <div class="card">
        ${toggle("readAloud", "Read aloud", "Says every step out loud, for kids who are still learning to read.")}
        ${toggle("slow", "Slower voice", "")}
        ${toggle("sounds", "Sound effects", "")}
        <label class="set"><span><b>Go on by itself</b><br><span class="muted small">After each question, the Next button fills up and goes on after a few seconds, for little ones who don't tap it yet.</span></span><input type="checkbox" data-k="autoNext" ${s.autoNext !== false ? "checked" : ""}></label>
        ${extraToggles.map(([k, label, sub]) => toggle(k, label, sub)).join("")}
        <label class="set"><span><b>Voice</b><br><span class="muted small" data-voice-status>Checking…</span></span>
          <select data-k="ttsSource"><option value="auto">Best available</option><option value="server">Cloudflare voice</option><option value="browser">This device's voice</option></select></label>
        <label class="set"><span><b>Cloudflare Voice Character</b><br><span class="muted small">Aura-2 Neural Voice (Helena is warm & clear for single numbers)</span></span>
          <select data-k="voice">
            <option value="helena">Helena (Warm & Natural)</option>
            <option value="thalia">Thalia (Clear & Bright)</option>
            <option value="luna">Luna (Gentle & Calm)</option>
            <option value="asteria">Asteria (Lively)</option>
            <option value="aurora">Aurora (Expressive)</option>
            <option value="apollo">Apollo (Friendly)</option>
            <option value="orion">Orion (Deep)</option>
          </select></label>
        <label class="set"><span><b>Passcode</b><br><span class="muted small">Only if APP_PASSCODE is set on the Worker.</span></span><input type="password" data-k="passcode" value="${esc(s.passcode)}" autocomplete="off"></label>
        <div class="row"><button class="btn small" data-test>🔊 Test the voice</button><button class="btn small danger" data-reset>Reset progress</button></div>
      </div>
      ${about ? `<h2>How it teaches</h2><div class="card prose">${about}</div>` : ""}
      <p class="muted small">Progress is saved in this browser only. Nothing is sent anywhere except the sentences read aloud, if the Cloudflare voice is on (they aren't stored).</p>
    </section>`;
  app.querySelector('[data-k="ttsSource"]').value = s.ttsSource;
  const voiceSelect = app.querySelector('[data-k="voice"]');
  if (voiceSelect && s.voice) voiceSelect.value = s.voice;
  app.querySelectorAll("[data-k]").forEach((el) => {
    el.onchange = () => {
      const val = el.type === "checkbox" ? el.checked : el.value;
      S.setSetting(el.dataset.k, val);
      if (el.dataset.k === "readAloud") resetCutoffs();
    };
  });
  showVoicePicker(app.querySelector("[data-voice-picker]"));
  app.querySelector("[data-test]").onclick = () => speak("Hello! Let's learn something fun.", { force: true });
  app.querySelector("[data-reset]").onclick = () => {
    if (confirm("Reset all stars and stickers?")) { S.resetProgress(); location.hash = "#/"; }
  };
  const h = await health();
  const st = app.querySelector("[data-voice-status]");
  if (st) st.textContent = h.tts ? "Cloudflare voice is available." : `Using this device's voice${browserVoices().length ? "" : " (if it has one)"}.`;
}

/**
 * "Who reads to you?": Mom, Dad, the family and friends who recorded lines (angelio.org/voice/), or the robot. The
 * pick is shared by every game on angelio.org; a line that person didn't record is read by Mom, Dad, then the robot.
 * Fills `el` (and shows it) once the voices are known; stays hidden when there's nobody but the robot.
 */
export async function showVoicePicker(el) {
  if (!el) return;
  const voices = await familyVoices();
  if (!voices.some((v) => v.lines > 0)) return;
  const draw = () => {
    const now = chosenVoice();
    el.innerHTML = `<p style="margin:0 0 8px"><b>Who reads to you?</b><br><span class="muted small">Real people we know recorded the lines the games say most. Pick one!</span></p>
      <div class="row" style="margin-top:0">${[...voices, { id: "robot", name: "Robot", emoji: "🤖" }].map((v) =>
        `<button class="btn${v.id === now ? " primary" : ""}" data-voice-id="${esc(v.id)}" aria-pressed="${v.id === now}">${esc(v.emoji)} ${esc(v.name)}</button>`).join("")}</div>`;
    el.querySelectorAll("[data-voice-id]").forEach((b) => b.onclick = () => { chooseVoice(b.dataset.voiceId); draw(); speak("Great job!", { force: true }); });
  };
  draw();
  el.hidden = false;
}

/** Every button and link clicks, except ones that make their own sound (mark them data-own-sound). */
export function installClickSounds(skip = "[data-own-sound], .key, .choice-card, .toggle") {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, a");
    if (!el || el.matches(skip) || el.disabled) return;
    sfx.click();
  }, true);
}

let muteNoticeInstalled = false;
let muteNoticeTimer = 0;
function showVoiceAutoMutedNotice() {
  if (typeof document === "undefined") return;
  let el = document.getElementById("angelio-voice-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "angelio-voice-toast";
    el.setAttribute("role", "status");
    el.style.cssText = "position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;padding:8px 14px;border-radius:999px;background:#183153;color:#fff;border:2px solid #ffc93c;box-shadow:0 8px 24px rgb(0 0 0 /.28);font:800 14px/1.3 Nunito,system-ui,sans-serif;pointer-events:none;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis";
    document.body.appendChild(el);
  }
  el.textContent = "🔇 Voice muted for fast play — tap 🔊 anytime";
  el.hidden = false;
  clearTimeout(muteNoticeTimer);
  muteNoticeTimer = setTimeout(() => { el.hidden = true; }, 3800);
}

/** A voice / read-aloud toggle button. */
export function wireVoiceToggle(btn) {
  if (!btn) return;
  if (!muteNoticeInstalled && typeof window !== "undefined") {
    muteNoticeInstalled = true;
    window.addEventListener("angelio:voice-auto-muted", () => {
      document.querySelectorAll("[data-voice]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      showVoiceAutoMutedNotice();
    });
  }
  btn.setAttribute("aria-pressed", S.settings().readAloud);
  btn.onclick = () => {
    const on = !S.settings().readAloud;
    S.setSetting("readAloud", on);
    btn.setAttribute("aria-pressed", on);
    resetCutoffs();
    sfx.toggle();
    if (!on) stop({ count: false });
  };
}
