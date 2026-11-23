// Saints Match: arcade memory cards with Catholic saints and their signs (apps/match).
// Rules live in match.js, saints in saints.js, stages in stages.js, Patron Helpers in helpers.js,
// and voxel portrait baking in portraits.js. Everything is read aloud and built for fast play.
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("match:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { showLesson } from "./kit/lesson.js";
import { vary } from "./kit/vary.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { saintById, saintsForStage } from "./saints.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { HELPERS, helperById, helperOpen } from "./helpers.js";
import { newGame, tick, flip, useHint, multOf, starsFor, timeLeft, cardById } from "./match.js";
import { loadPortraits } from "./portraits.js";

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/";
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z-]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Saints Match</b> is a fast arcade matching game with Catholic saints
    from East and West and the signs by which we recognize them — like St. Peter's keys, St. Paul's sword, and St. Thérèse's roses.
    Every board opens with a quick two-second peek, rewards speedy combos, lights up with a Golden Halo Feast Rush, and adds visible
    Wind Swaps on later boards. Every flip is read aloud so pre-readers can play too. An early demo with voxel stand-ins until custom
    saint models are drawn. Nothing is collected; progress stays on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "match-game"); } });

const progressId = (st) => st.progress ?? `match-${st.id}`;
const bestKey = (st) => (st.id === "apostles" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;
const starsById = (id) => starsOf(stageById(id));
const myHelper = () => { const h = helperById(S.settings().helper); return helperOpen(h, starsById) ? h : HELPERS[0]; };
const gamesLink = `<p class="center games-link"><a class="btn" href="${GAMES}">🎮 All the Angelio games</a></p>`;

function viewHome() {
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Saints Match</h1>
      <p class="lede">Take a quick peek, then match the saints and their signs before the clock runs out! Spot the Golden Halo for Feast Rush and watch out when the wind swaps two cards.</p>
      <p class="demo-chip">🧪 Demo: voxel stand-ins until custom saints are drawn</p>
    </section>
    <section class="stages">
      ${STAGES.map((st, i) => {
        const open = isOpen(i, starsOf), p = S.progress(progressId(st)), best = S.settings()[bestKey(st)] || 0;
        const req = st.after ? stageById(st.after) : STAGES[i - 1];
        return open
          ? `<a class="stage card${st.endless ? " endless" : ""}" href="#/play/${st.id}"><span class="stage-icon">${st.icon}</span><b>${esc(st.name)}</b>
              <span class="muted">${esc(st.blurb)}</span>
              <span class="stage-stars">${"★".repeat(p.stars)}${"☆".repeat(3 - p.stars)}${best ? ` · best ${best}` : ""}</span></a>`
          : `<div class="stage card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(st.name)}</b>
              <span class="muted">Get two stars in ${esc(req.name)} to open it.</span></div>`;
      }).join("")}
    </section>
    <h2 class="center helpers-title">Your Patron Helper</h2>
    <section class="helpers">
      ${HELPERS.map((h) => {
        const open = helperOpen(h, starsById), picked = myHelper().id === h.id;
        return open
          ? `<button type="button" class="helper-pick card${picked ? " picked" : ""}" data-helper="${h.id}" aria-pressed="${picked}"><span class="stage-icon">${h.icon}</span><b>${esc(h.name)}</b><span class="muted">${esc(h.blurb)}</span>${picked ? `<span class="picked-tag">✓ Helping</span>` : ""}</button>`
          : `<div class="helper-pick card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(h.name)}</b><span class="muted">Get two stars in ${esc(stageById(h.opens.stage).name)} to meet ${h.sex === "f" ? "her" : "him"}.</span></div>`;
      }).join("")}
    </section>
    ${stickerBook()}
    ${gamesLink}`;
  app.querySelectorAll("[data-helper]").forEach((b) => b.addEventListener("click", () => {
    const h = helperById(b.dataset.helper);
    S.setSetting("helper", h.id);
    viewHome();
    speak(h.say);
  }));
  speak("Pick a stage for Saints Match!");
}

function viewPlay(stageId) {
  const stage = stageById(stageId ?? S.settings().lastStage), si = STAGES.indexOf(stage);
  if (!isOpen(si, starsOf)) { location.hash = "#/"; return; }
  S.setSetting("lastStage", stage.id);
  document.body.classList.add("in-game", "match-game");
  const helper = myHelper();
  const unlockedBefore = new Set(HELPERS.filter((h) => helperOpen(h, starsById)).map((h) => h.id));
  const initSec = stage.endless ? (stage.startTime ?? 40) : (stage.length ?? 90);
  const clock0 = `${Math.floor(initSec / 60)}:${String(initSec % 60).padStart(2, "0")}`;

  app.innerHTML = `
    <section class="match-play${stage.endless ? " endless-mode" : ""}">
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="Time left"><span class="clock-label" data-wave>${stage.icon} Wave 1</span> <b data-clock>${clock0}</b></div>
        <div class="score"><div class="score-row"><b data-score>0</b><span data-combo class="streak"></span></div><span class="combo-bar"><i data-combobar></i></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="status-strip">
        <div class="status-pill" data-status>Get ready…</div>
        ${helper.hint ? `<button type="button" class="btn hint-btn" data-hint>🔍 Find Pair</button>` : ""}
      </div>
      <div class="board" data-board></div>
      <div class="bubble match-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">${helper.icon}</span><p class="say"></p></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card match-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));

  const $ = (s) => app.querySelector(s);
  const bubble = $(".match-bubble"), boardEl = $("[data-board]"), popsEl = $(".pops"), statusEl = $("[data-status]");
  const hintBtn = $("[data-hint]");
  let alive = true, raf = 0, cardEls = new Map(), g = null, stopListeners = () => {};

  const pop = (text, targetEl, cls = "") => {
    const r = targetEl ? targetEl.getBoundingClientRect() : boardEl.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + Math.min(r.height * 0.4, 48)}px`;
    popsEl.append(el);
    setTimeout(() => el.remove(), 1200);
  };

  let portraits = new Map();
  const cardSpeech = (card, s) => (card.kind === "saint" ? s.name : `${s.symbolLabel}! ${s.clue}`);

  function renderBoard() {
    boardEl.replaceChildren();
    cardEls = new Map();
    const pairs = g.cards.length / 2;
    boardEl.dataset.pairs = String(pairs);
    for (const c of g.cards) {
      const s = saintById(c.saintId);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mcard";
      btn.dataset.id = c.id;
      btn.style.order = String(c.slot);
      if (c.golden) btn.classList.add("golden");
      if (c.faceUp) btn.classList.add("face-up");

      const faceHtml = c.kind === "saint"
        ? `<img class="saint-vox" src="${portraits.get(s.id) ?? ""}" alt="${esc(s.name)}" draggable="false">
           <span class="card-name">${esc(s.short)}</span>
           <span class="card-badge">${c.golden ? "✨" : ""}</span>`
        : `<span class="symbol-medallion" aria-hidden="true">${s.symbol}</span>
           <span class="card-name">${esc(s.symbolLabel)}</span>
           <span class="card-badge">${c.golden ? "✨" : "Sign"}</span>`;

      btn.innerHTML = `
        <span class="mcard-inner">
          <span class="mcard-face mcard-back" aria-hidden="true">
            <span class="back-cross">✝</span>
            <span class="back-swap" hidden>💨</span>
          </span>
          <span class="mcard-face mcard-front" style="--card-bg:${esc(s.cardBg)}">
            ${faceHtml}
          </span>
        </span>`;
      btn.setAttribute("aria-label", c.faceUp ? cardSpeech(c, s) : "Hidden saint card");
      boardEl.append(btn);
      cardEls.set(c.id, btn);
    }
    if (hintBtn) hintBtn.disabled = false;
  }

  function syncCards() {
    for (const c of g.cards) {
      const el = cardEls.get(c.id);
      if (!el) continue;
      const s = saintById(c.saintId);
      el.classList.toggle("face-up", c.faceUp || c.matched);
      el.classList.toggle("matched", c.matched);
      el.classList.toggle("hinted", c.hinted);
      el.classList.toggle("swapped", c.swapped && !c.matched);
      const swapTag = el.querySelector(".back-swap");
      if (swapTag) swapTag.hidden = !c.swapped || c.matched;
      el.disabled = c.matched;
      el.setAttribute("aria-label", c.faceUp || c.matched ? cardSpeech(c, s) : "Hidden saint card");
    }
  }

  let swapTimer = 0;
  function animateWindSwap(ids) {
    const els = ids.map((id) => cardEls.get(id)).filter(Boolean);
    if (els.length !== 2) return;
    const before = els.map((el) => el.getBoundingClientRect());
    ids.forEach((id) => {
      const c = cardById(g, id), el = cardEls.get(id);
      if (c && el) el.style.order = String(c.slot);
    });
    const after = els.map((el) => el.getBoundingClientRect());
    els.forEach((el, i) => {
      const dx = before[i].left - after[i].left;
      const dy = before[i].top - after[i].top;
      el.classList.remove("swapping");
      el.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    });
    void boardEl.offsetWidth;
    requestAnimationFrame(() => {
      els.forEach((el) => {
        el.classList.add("swapping", "just-swapped");
        el.style.transform = "";
      });
    });
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => els.forEach((el) => el.classList.remove("swapping", "just-swapped")), 950);
  }

  let windBannerUntil = 0;
  const MISS_LINES = ["Not quite yet!", "Almost! Keep looking.", "Try another pair!"];

  function handle(events) {
    let lastFlip = null;
    for (const ev of events) {
      if (ev.type === "peek-end") {
        sfx.tap();
        syncCards();
        say(bubble, stage.rule, { speakText: false });
      } else if (ev.type === "flip") {
        sfx.tap();
        syncCards();
        lastFlip = ev.card;
        const s = saintById(ev.card.saintId);
        // On first card of a pair, read it aloud cleanly; second card is handled by match / mismatch below.
        if (g.open.length === 1) say(bubble, cardSpeech(ev.card, s), { speakText: true });
      } else if (ev.type === "match") {
        const s = saintById(ev.saintId);
        ev.golden ? sfx.fanfare() : sfx.win();
        syncCards();
        const tags = [
          `+${ev.points}`,
          ev.mult > 1 ? `×${ev.mult}` : "",
          ev.golden ? "✨ FEAST RUSH!" : "",
          ev.sharpEye ? "⚡ Sharp Eye!" : "",
          ev.timeAdded ? `+${ev.timeAdded.toFixed(1)}s` : "",
        ].filter(Boolean).join(" ");
        pop(tags, cardEls.get(ev.ids[1]), ev.golden || ev.rush ? "good" : ev.sharpEye ? "quick" : "");
        say(bubble, `<b>${esc(s.name)}!</b> ${esc(s.blurb)}`, { speakText: true, spokenOverride: `${s.name}! ${s.blurb}` });
      } else if (ev.type === "mismatch") {
        sfx.oops();
        syncCards();
        ev.ids.forEach((id) => {
          const el = cardEls.get(id);
          if (el) { el.classList.remove("mismatch"); void el.offsetWidth; el.classList.add("mismatch"); }
        });
        const cardLine = lastFlip ? cardSpeech(lastFlip, saintById(lastFlip.saintId)) : "";
        if (ev.forgiven) {
          pop("☀️ Combo kept!", cardEls.get(ev.ids[1]), "good");
          say(bubble, `${esc(cardLine ? `${cardLine} — ` : "")}St. Clare kept your combo!`, { speakText: true });
        } else {
          say(bubble, `${esc(cardLine ? `${cardLine} — ` : "")}${vary("miss", MISS_LINES)}`, { speakText: true });
        }
      } else if (ev.type === "close") {
        syncCards();
      } else if (ev.type === "wind-swap") {
        sfx.whoosh();
        animateWindSwap(ev.ids);
        syncCards();
        windBannerUntil = performance.now() + 2400;
        pop("🌬️ Wind Swap!", boardEl, "quick");
      } else if (ev.type === "hint") {
        sfx.chime();
        syncCards();
        pop("🔍 Found one!", cardEls.get(ev.ids[0]), "good");
        say(bubble, `Look at the glowing cards for <b>${esc(saintById(ev.saintId).name)}</b>!`, { speakText: true });
      } else if (ev.type === "hint-end") {
        syncCards();
      } else if (ev.type === "wave-clear") {
        sfx.chime();
        pop(`🎉 Wave ${ev.wave} Clear! +${ev.bonus}${ev.flawless ? " Flawless!" : ""}`, boardEl, "good");
      } else if (ev.type === "deal") {
        renderBoard();
        pop(`Wave ${ev.wave}! 👀 Look!`, boardEl, "quick");
      } else if (ev.type === "end") {
        finish();
      }
    }
  }

  (async () => {
    if (!S.progress(progressId(stage)).plays) {
      const card = $(".match-lesson");
      card.hidden = false;
      await showLesson(card, {
        emoji: stage.icon,
        title: stage.name,
        rule: `Every board flashes face-up for <b>2 seconds</b> — look fast! Then match pairs of saints (or a <b>Saint</b> and their <b>Sign</b>) to build your combo multiplier. Match the shimmering <b>✨ Golden Halo</b> pair for double-points <b>Feast Rush</b>, and track <b>🌬️ Wind Swaps</b> for Sharp Eye bonus points!`,
        exampleHtml: `<p class="center match-example">🧔🔑 ➜ 🗝️ &nbsp; ✨ ➜ <b>2×</b> &nbsp; 🌬️ ➜ ⚡</p>`,
        voice: `Every board flashes face-up for two seconds, so look fast! Match pairs of saints, or a saint and their sign, to build your combo. Match the Golden Halo pair for double points Feast Rush, and spot cards moved by the wind for Sharp Eye bonus points!`,
      });
      card.hidden = true;
      if (!alive) return;
    }

    say(bubble, "Getting the saint cards ready…", { speakText: false });
    portraits = await loadPortraits(saintsForStage(stage.id));
    if (!alive) return;

    g = newGame({ seed: Math.floor(Math.random() * 1e9), stage, helper });
    window.__match = { game: g };
    renderBoard();
    say(bubble, `Peek fast! ${esc(stage.name)} starts!`, { speakText: true });

    const onBoardClick = (e) => {
      const btn = e.target.closest(".mcard");
      if (!btn || btn.disabled || g.over) return;
      handle(flip(g, btn.dataset.id));
    };
    boardEl.addEventListener("click", onBoardClick);
    const onHintClick = () => { if (!g.over) { handle(useHint(g)); if (hintBtn) hintBtn.disabled = g.hintUsedThisWave; } };
    hintBtn?.addEventListener("click", onHintClick);
    stopListeners = () => {
      boardEl.removeEventListener("click", onBoardClick);
      hintBtn?.removeEventListener("click", onHintClick);
      clearTimeout(swapTimer);
    };

    let last = performance.now(), ended = false;
    const frame = (now) => {
      if (!alive || ended) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      handle(tick(g, dt));
      if (ended || g.over) return;

      const secs = Math.ceil(timeLeft(g));
      $("[data-wave]").textContent = `${stage.icon} Wave ${g.wave}`;
      $("[data-clock]").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      $("[data-clock]").closest(".clock")?.classList.toggle("urgent", secs <= 10);
      $("[data-score]").textContent = Math.round(g.score);
      const mult = multOf(g);
      $("[data-combo]").textContent = mult > 1 ? `×${mult}` : "";
      $("[data-combobar]").style.width = `${Math.max(0, Math.min(100, (g.comboLeft / g.comboWindow) * 100))}%`;

      boardEl.classList.toggle("peeking", g.phase === "peek");
      boardEl.classList.toggle("feast-rush", g.rushLeft > 0);
      if (hintBtn) hintBtn.disabled = g.phase !== "play" || g.hintUsedThisWave;

      if (g.phase === "peek") statusEl.textContent = `👀 Look closely! ${Math.max(0, g.peekLeft).toFixed(1)}s`;
      else if (g.rushLeft > 0) statusEl.textContent = `✨ FEAST RUSH 2× points! ${g.rushLeft.toFixed(1)}s`;
      else if (now < windBannerUntil) statusEl.textContent = "🌬️ Wind Swap! Spot the moved cards!";
      else statusEl.textContent = g.swapInterval ? "Match saints & signs — watch for wind swaps!" : "Match the saints fast to keep your combo!";
      statusEl.className = `status-pill${g.phase === "peek" ? " peek" : g.rushLeft > 0 ? " rush" : now < windBannerUntil ? " wind" : ""}`;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    function finish() {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      stopListeners();
      document.body.classList.remove("match-game");
      const old = S.settings()[bestKey(stage)] || 0;
      const score = Math.round(g.score);
      const stars = starsFor(g);
      const newBest = score > old;
      S.setSetting(bestKey(stage), Math.max(old, score));
      const next = STAGES[si + 1];
      const opens = next && Math.max(stars, starsOf(stage)) >= 2;
      showFinish(app, {
        id: progressId(stage),
        stars,
        mistakes: g.wrong,
        title: newBest ? "A new best!" : stage.endless ? "What a rush!" : "Well matched!",
        done: `You scored ${score}.`,
        again: `#/play/${stage.id}`,
        onAgain: route,
        next: opens ? { href: `#/play/${next.id}`, label: `${next.icon} ${next.name}` } : null,
      });
      const fresh = HELPERS.filter((h) => helperOpen(h, starsById) && !unlockedBefore.has(h.id));
      if (fresh.length) {
        app.querySelector(".finish h1")?.insertAdjacentHTML("afterend",
          `<p class="final-score">🎉 ${fresh.map((h) => `<b>${esc(h.name)}</b>`).join(" and ")} can help you play now!</p>`);
      }
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend",
        `<p class="final-score">You scored <b>${score}</b>${newBest ? " · a new best!" : ` · best: ${Math.max(old, score)}`}</p>
         <p class="muted">${g.wavesCleared} waves cleared · ${g.matches} matches · best streak ${g.bestStreak}${g.sharpEyes ? ` · ${g.sharpEyes} Sharp Eye` : ""}${stars < 3 ? ` · ${stage.star3} for three stars` : ""}</p>`);
      const all = app.querySelector('.finish .finish-links a[href="https://angelio.org/"]');
      if (all) all.href = GAMES;
    }
  })();

  return () => { alive = false; cancelAnimationFrame(raf); stopListeners(); };
}

installClickSounds();
jingleOnce("match", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
