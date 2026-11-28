// Procession!: run ahead of the parish procession, clear hazards, and steer past trouble.
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("procession:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { todayKey, todayLabel, dailySeed, dailyStage } from "./kit/vary.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { CREW, crewById, crewOpen } from "./crew.js";
import {
  newGame, tick, steerProcession, setTarget, setStick,
  starsFor, multiplierOf, KINDS, MOVING_KINDS, isNight, FRONT_Z, SPAWN_Z,
} from "./procession.js";
import { createRoad, loadModels, MODELS } from "./road.js";

// Preload Shalone's .vox art immediately on launch so starting a stage never flashes stand-ins.
const modelsPromise = loadModels(MODELS);

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/";
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Procession!</b> is a fast, gentle touch arcade game built from the
    Pico Parish PICO-8 game. Walk ahead of the procession to patch potholes, light street lamps, repair broken bridges, and wave cars &amp; pups off the road — or tap <b>◀ / ▶</b> to steer the procession cleanly around single-lane hazards! Unlock five helpers with special skills. Nothing is collected; best scores and Parish Bells stay on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("proc-game"); } });

const progressId = (st) => st.progress ?? `procession-${st.id}`;
const bestKey = (st) => (st.id === "town" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;
const starsById = (id) => starsOf(stageById(id));
const myCrew = () => { const c = crewById(S.settings().crew); return crewOpen(c, starsById) ? c : CREW[0]; };
const gamesLink = `<p class="center games-link"><a class="btn small ghosty" href="${GAMES}">🎮 All the Angelio games</a></p>`;

function viewHome() {
  const cur = myCrew();
  const dKey = todayKey(), dStage = dailyStage(STAGES, "procession", dKey), dRec = S.dailyRecord(dKey);
  app.innerHTML = `
    <section class="home-head">
      <div class="home-title-wrap">
        <h1 class="home-title">Procession!</h1>
        <p class="home-sub">Clear the road &amp; guide the parish</p>
      </div>
    </section>
    <a class="daily-card" href="#/play/daily">
      <span class="daily-left">
        <span class="daily-badge">📅 Today's Challenge</span>
        <b class="daily-stage">${dStage.icon} ${esc(dStage.name)}</b>
        <span class="daily-date">${esc(todayLabel())}</span>
      </span>
      <span class="daily-right">
        <span>${dRec.plays ? `${"★".repeat(dRec.stars)}${"☆".repeat(3 - dRec.stars)} · ${dRec.best}` : "Same road for all"}</span>
        <span class="daily-cta">${dRec.plays ? "Retry" : "Play"} →</span>
      </span>
    </a>
    <section class="stages stages-5">
      ${STAGES.map((st, i) => {
        const open = isOpen(i, starsOf), p = S.progress(progressId(st)), best = S.settings()[bestKey(st)] || 0;
        const req = st.after ? stageById(st.after) : STAGES[i - 1];
        const tag = st.endless ? "Endless" : `${Math.floor(st.length / 60)}:${String(st.length % 60).padStart(2, "0")}`;
        return open
          ? `<a class="stage card${st.night ? " night" : ""}${st.endless ? " endless" : ""}" href="#/play/${st.id}">
              <div class="stage-top"><span class="stage-icon">${st.icon}</span><span class="stage-tag">${tag}</span></div>
              <b class="stage-name">${esc(st.name)}</b>
              <span class="stage-stars">${"★".repeat(p.stars)}${"☆".repeat(3 - p.stars)}${best ? ` · ${best}` : " · Ready"}</span></a>`
          : `<div class="stage card locked" aria-disabled="true">
              <div class="stage-top"><span class="stage-icon">🔒</span><span class="stage-tag">Locked</span></div>
              <b class="stage-name">${esc(st.name)}</b>
              <span class="stage-req">2★ ${esc(req.name)}</span></div>`;
      }).join("")}
    </section>
    <section class="char-dock" aria-label="Your Advance Crew">
      <div class="char-pills">
        ${CREW.map((c) => {
          const open = crewOpen(c, starsById), picked = cur.id === c.id;
          const req = c.opens ? `Get 2★ in ${stageById(c.opens.stage).name} to unlock ${c.name}.` : "";
          return open
            ? `<button type="button" class="char-pill${picked ? " picked" : ""}" data-crew="${c.id}" aria-pressed="${picked}"><span>${c.icon}</span><span>${esc(c.short)}</span></button>`
            : `<button type="button" class="char-pill locked" data-locked="1" data-locked-name="${esc(c.name)}" data-locked-req="${esc(req)}" title="${esc(req)}"><span>🔒</span><span>${esc(c.short)}</span></button>`;
        }).join("")}
      </div>
      <p class="char-perk"><b>${cur.icon} ${esc(cur.name)}:</b> ${esc(cur.blurb)}</p>
    </section>
    ${stickerBook({ byStars: true })}
    ${gamesLink}`;

  const perk = app.querySelector(".char-perk");
  app.querySelectorAll("[data-crew]").forEach((b) => b.addEventListener("click", () => {
    const c = crewById(b.dataset.crew);
    S.setSetting("crew", c.id);
    app.querySelectorAll("[data-crew]").forEach((x) => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-pressed", on); });
    app.querySelectorAll(".peek-locked").forEach((x) => x.classList.remove("peek-locked"));
    if (perk) perk.innerHTML = `<b>${c.icon} ${esc(c.name)}:</b> ${esc(c.blurb)}`;
    speak(c.say);
  }));
  app.querySelectorAll("[data-locked]").forEach((b) => b.addEventListener("click", () => {
    app.querySelectorAll(".peek-locked").forEach((x) => x.classList.toggle("peek-locked", x === b));
    if (perk) perk.innerHTML = `<b>🔒 ${esc(b.dataset.lockedName)}:</b> ${esc(b.dataset.lockedReq)}`;
    speak(b.dataset.lockedReq);
  }));
  speak("Pick a route in Procession!");
}

function viewPlay(stageId) {
  const daily = stageId === "daily", dateKey = todayKey();
  const stage = daily ? dailyStage(STAGES, "procession", dateKey) : stageById(stageId ?? S.settings().lastStage), si = STAGES.indexOf(stage);
  if (!daily && !isOpen(si, starsOf)) { location.hash = "#/"; return; }
  if (!daily) S.setSetting("lastStage", stage.id);
  document.body.classList.add("proc-game");
  const who = myCrew();
  const unlockedBefore = new Set(CREW.filter((c) => crewOpen(c, starsById)).map((c) => c.id));
  const initSec = stage.endless ? 0 : stage.length;
  const clock0 = `${Math.floor(initSec / 60)}:${String(initSec % 60).padStart(2, "0")}`;

  app.innerHTML = `
    <section class="proc-play${stage.night ? " night" : ""}">
      <canvas class="road" aria-label="Road ahead of the procession: tap hazards to fix or drag to run"></canvas>
      <div class="pins" aria-hidden="true"></div>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock"><span class="clock-label">${daily ? "📅 " : ""}${stage.endless ? "🚩" : esc(stage.name)}</span> <b data-clock>${clock0}</b></div>
        <div class="score"><b data-score>0</b><span data-mult class="streak"></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="sub-hud">
        <div class="candles-pill" data-candles aria-label="Candles"></div>
      </div>
      <div class="proc-bottom">
        <div class="steer-bar" aria-label="Steer procession lanes">
          <button type="button" class="steer-btn" id="steer-l" aria-label="Steer procession left">◀</button>
          <div class="lane-dots">
            <button type="button" class="lane-pill" data-lane="0" aria-pressed="false">Left</button>
            <button type="button" class="lane-pill" data-lane="1" aria-pressed="true">Mid</button>
            <button type="button" class="lane-pill" data-lane="2" aria-pressed="false">Right</button>
          </div>
          <button type="button" class="steer-btn" id="steer-r" aria-label="Steer procession right">▶</button>
        </div>
        <div class="bubble proc-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">🚩</span><p class="say"></p></div>
      </div>
      <div class="pops" aria-hidden="true"></div>
    </section>`;

  wireVoiceToggle(app.querySelector("[data-voice]"));
  const canvas = app.querySelector("canvas.road");
  const pins = app.querySelector(".pins");
  const pops = app.querySelector(".pops");
  const bubble = app.querySelector(".proc-bubble");
  const clockEl = app.querySelector("[data-clock]");
  const scoreEl = app.querySelector("[data-score]");
  const multEl = app.querySelector("[data-mult]");
  const candlesEl = app.querySelector("[data-candles]");

  const rng = daily ? dailySeed("procession", dateKey) : Math.random;
  const g = newGame(stage, { crewId: who.id, rng });
  let road = null;
  let alive = true, ended = false, raf = 0, prevTime = performance.now();
  const keysHeld = new Set();

  const popAt = (x, y, text, cls = "") => {
    const el = document.createElement("div");
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    pops.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  };

  function renderSteering() {
    app.querySelector("#steer-l").disabled = g.procLane <= 0;
    app.querySelector("#steer-r").disabled = g.procLane >= 2;
    app.querySelectorAll("[data-lane]").forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.lane) === g.procLane));
    });
  }
  renderSteering();

  function doSteer(dir, rel = true) {
    if (!road || g.over || g.arriving) return;
    if (steerProcession(g, dir, rel)) {
      sfx.tap();
      renderSteering();
    }
  }
  app.querySelector("#steer-l").onclick = () => doSteer(-1, true);
  app.querySelector("#steer-r").onclick = () => doSteer(1, true);
  app.querySelectorAll("[data-lane]").forEach((b) => { b.onclick = () => doSteer(Number(b.dataset.lane), false); });

  let dragStart = null;
  let dragged = false;
  canvas.addEventListener("pointerdown", (e) => {
    if (!road || g.over || g.arriving) return;
    dragStart = { x: e.clientX, y: e.clientY };
    dragged = false;
    const pt = road.pickRoadPoint(e.clientX, e.clientY);
    if (pt) {
      if (pt.z >= FRONT_Z - 4) {
        const targetLane = pt.x < -10 ? 0 : pt.x > 10 ? 2 : 1;
        doSteer(targetLane, false);
      } else {
        const nearOb = g.obs.reduce((best, o) => {
          if (o.done) return best;
          const d = Math.hypot(o.x - pt.x, o.z - pt.z);
          return d < Math.max(10, o.halfW + 4) && (!best || d < best.d) ? { o, d } : best;
        }, null)?.o;
        const lockOb = nearOb && !MOVING_KINDS.has(nearOb.kind) ? nearOb : null;
        setTarget(g, lockOb ? lockOb.x : pt.x, lockOb ? lockOb.z : pt.z, lockOb?.id ?? null);
      }
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragStart || !road || g.over || g.arriving) return;
    if (!dragged && Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) < 10) return;
    dragged = true;
    const pt = road.pickRoadPoint(e.clientX, e.clientY);
    if (pt && pt.z < FRONT_Z - 3) setTarget(g, pt.x, pt.z, null);
  });
  const endRoadDrag = () => { dragStart = null; dragged = false; };
  addEventListener("pointerup", endRoadDrag);
  addEventListener("pointercancel", endRoadDrag);

  pins.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ob]");
    if (!btn || !road || g.over || g.arriving) return;
    const ob = g.obs.find((o) => o.id === Number(btn.dataset.ob) && !o.done);
    if (ob) { sfx.tap(); setTarget(g, ob.x, ob.z, MOVING_KINDS.has(ob.kind) ? null : ob.id); }
  });

  function updateKeyMove() {
    const dx = (keysHeld.has("arrowright") || keysHeld.has("d") ? 1 : 0) - (keysHeld.has("arrowleft") || keysHeld.has("a") ? 1 : 0);
    const dz = (keysHeld.has("arrowdown") || keysHeld.has("s") ? 1 : 0) - (keysHeld.has("arrowup") || keysHeld.has("w") ? 1 : 0);
    setStick(g, dx, dz);
  }
  const onKeyDown = (e) => {
    if (!alive || !road || g.over || g.arriving) return;
    const k = e.key.toLowerCase();
    if (k === "q" || k === "[") { doSteer(-1, true); return; }
    if (k === "e" || k === "]") { doSteer(1, true); return; }
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(k)) {
      if (k.startsWith("arrow")) e.preventDefault();
      keysHeld.add(k);
      updateKeyMove();
    }
  };
  const onKeyUp = (e) => {
    if (!alive) return;
    keysHeld.delete(e.key.toLowerCase());
    updateKeyMove();
  };
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  const onResize = () => road?.resize();
  addEventListener("resize", onResize);

  const pinMap = new Map();
  let lastCandlesKey = "";

  function syncHud() {
    const sec = stage.endless ? Math.floor(g.elapsed) : Math.max(0, Math.ceil(stage.length - g.elapsed));
    clockEl.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
    scoreEl.textContent = g.score;
    const mult = multiplierOf(g);
    multEl.textContent = mult > 1 ? ` ×${mult}` : "";

    const ck = `${g.candles}|${g.maxCandles}`;
    if (ck !== lastCandlesKey) {
      lastCandlesKey = ck;
      candlesEl.innerHTML = Array.from({ length: g.maxCandles }, (_, i) =>
        i < g.candles ? `<span>🕯️</span>` : i < 5 ? `<span class="off">🕯️</span>` : ""
      ).join("");
    }
  }

  function renderPins() {
    if (!road) return;
    const liveIds = new Set();
    for (const o of g.obs) {
      if (o.done || o.z <= SPAWN_Z + 8 || o.z >= FRONT_Z - 2) continue;
      liveIds.add(o.id);
      let btn = pinMap.get(o.id);
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        const urgentLamp = o.kind === "lamp" && isNight(g);
        btn.className = `opin${o.boss ? " boss" : ""}${urgentLamp ? " urgent" : ""}`;
        btn.dataset.ob = String(o.id);
        const lbl = o.kind === "pothole" ? "🕳️" : o.kind === "lamp" ? (urgentLamp ? "💡!" : "💡")
          : o.kind === "person" ? "🚶" : o.kind === "wanderer" ? "🚶↔"
          : o.kind === "car" ? "🚗" : o.kind === "truck" ? "🚚" : o.kind === "dog" ? "🐕" : o.kind === "cat" ? "🐱"
          : o.kind === "puddle" ? "💧" : o.kind === "brokenBridge" ? "🪵"
          : o.kind === "bossBridge" ? "🌉 Bridge!" : "🎺 Band!";
        btn.innerHTML = `<span class="opin-tag">${lbl}</span><div class="opin-bar" hidden><i></i></div>`;
        pins.appendChild(btn);
        pinMap.set(o.id, btn);
      }
      const pt = road.project(o.x, 4.5, o.z);
      btn.style.left = `${pt.x}px`;
      btn.style.top = `${pt.y}px`;
      const bar = btn.querySelector(".opin-bar");
      if (o.pr > 0) {
        bar.hidden = false;
        bar.firstElementChild.style.width = `${Math.min(100, Math.round((o.pr / Math.max(0.01, o.need)) * 100))}%`;
      } else bar.hidden = true;
    }
    for (const [id, btn] of pinMap) {
      if (!liveIds.has(id)) { btn.remove(); pinMap.delete(id); }
    }
  }

  function handleEvents(events) {
    for (const ev of events) {
      if (ev.type === "fixed") {
        sfx.pop();
        const pt = road.project(ev.o.x, 6, ev.o.z);
        popAt(pt.x, pt.y, `+${ev.pts}`, ev.mult > 1 ? "good" : "");
      } else if (ev.type === "dodged") {
        sfx.chime?.();
        const pt = road.project(ev.o.x, 6, FRONT_Z - 4);
        popAt(pt.x, pt.y, "Dodged! 💨", "good");
      } else if (ev.type === "milestone") {
        sfx.win();
        say(bubble, `${ev.streak} fixes in a row! Score ×${ev.mult}!`, { speakText: false });
      } else if (ev.type === "stumble") {
        sfx.oops();
        const pt = road.project(g.procX, 8, FRONT_Z);
        popAt(pt.x, pt.y, "-1 🕯️", "oops");
        say(bubble, esc(ev.msg), { speakText: false });
      } else if (ev.type === "boss" || ev.type === "stretch" || ev.type === "warning" || ev.type === "wind" || ev.type === "stormClear") {
        say(bubble, esc(ev.msg || ev.say), { speakText: false });
        if (ev.type === "boss") sfx.oops();
        else if (ev.type === "stretch") sfx.win();
      } else if (ev.type === "bell") {
        sfx.chime?.();
        road.flashBellAt(ev.o.x, ev.o.z);
      } else if (ev.type === "church") {
        sfx.win();
        say(bubble, `⛪ ${esc(ev.msg)}`, { speakText: false });
      } else if (ev.type === "end") {
        finishRound();
      }
    }
  }

  function cleanup() {
    alive = false;
    cancelAnimationFrame(raf);
    removeEventListener("keydown", onKeyDown);
    removeEventListener("keyup", onKeyUp);
    removeEventListener("resize", onResize);
    road?.dispose();
    road = null;
  }

  function finishRound() {
    if (ended) return;
    ended = true;
    cleanup();

    const stars = starsFor(stage, g.score, g.won);
    const prevBest = S.settings()[bestKey(stage)] || 0;
    if (g.score > prevBest) S.setSetting(bestKey(stage), g.score);
    const dailyRec = daily ? S.saveDaily(dateKey, g.score, stars) : null;
    const dailyNote = daily ? (dailyRec.newBest ? `New Today's Challenge best: ${g.score}!` : `Today's best: ${dailyRec.best}`) : "";
    const starsAfter = (st) => (!daily && st.id === stage.id) ? Math.max(starsOf(st), stars) : starsOf(st);
    const nextStage = !daily && STAGES[si + 1] && isOpen(si + 1, starsAfter) ? STAGES[si + 1] : null;

    document.body.classList.remove("proc-game");
    showFinish(app, {
      id: daily ? `daily-${dateKey}` : progressId(stage),
      stars,
      mistakes: g.candles < 5 ? 5 - g.candles : 0,
      byStars: true,
      title: g.won ? `Way Cleared! ${g.score}` : `Procession Ended · ${g.score}`,
      done: `${g.fixes} hazards cleared · ${g.dodges} dodged · ${g.candles}🕯️ left`,
      again: `#/play/${daily ? "daily" : stage.id}`,
      onAgain: () => viewPlay(daily ? "daily" : stage.id),
      next: nextStage ? { label: `Play ${nextStage.name} →`, href: `#/play/${nextStage.id}` } : null,
    });
    const newlyOpen = CREW.filter((c) => !unlockedBefore.has(c.id) && crewOpen(c, starsById));
    if (dailyNote) app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="muted">${esc(dailyNote)}</p>`);
    if (newlyOpen.length) app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="finish-unlock">${newlyOpen.map((c) => `${c.icon} ${esc(c.name)} joined!`).join(" · ")}</p>`);

    const openCrew = CREW.filter((c) => crewOpen(c, starsById));
    if (openCrew.length > 1) {
      const picked = myCrew();
      const pickHtml = `<div class="finish-pick">
        <p class="finish-pick-label">Advance crew for next run</p>
        <div class="finish-picks">${openCrew.map((c) => `<button type="button" class="pick-chip${picked.id === c.id ? " picked" : ""}" data-pick-crew="${c.id}" aria-pressed="${picked.id === c.id}">${c.icon} ${esc(c.short)}${newlyOpen.some((n) => n.id === c.id) ? ` <span class="pick-new">NEW!</span>` : ""}</button>`).join("")}</div>
      </div>`;
      app.querySelector(".finish .row.center")?.insertAdjacentHTML("afterend", pickHtml);
      app.querySelectorAll("[data-pick-crew]").forEach((b) => b.onclick = () => {
        S.setSetting("crew", b.dataset.pickCrew);
        app.querySelectorAll("[data-pick-crew]").forEach((x) => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-pressed", on); });
        sfx.pop();
      });
    }
  }

  function frame(now) {
    if (!alive || !canvas.isConnected) { cleanup(); return; }
    const dt = Math.min(0.08, (now - prevTime) / 1000);
    prevTime = now;
    const events = tick(g, dt);
    road?.sync(g);
    syncHud();
    renderPins();
    if (events.length) handleEvents(events);
    if (alive) raf = requestAnimationFrame(frame);
  }

  window.__procession = {
    getState: () => ({
      ready: !!road, score: g.score, procLane: g.procLane, candles: g.candles,
      fixes: g.fixes, dir: g.crew.dir, x: g.crew.x, z: g.crew.z, obs: g.obs.length,
      arriving: g.arriving, churchZ: g.churchZ,
      targetOb: g.crew.target?.obId ?? null,
      firstObDist: g.obs[0] ? Number(Math.hypot(g.crew.x - g.obs[0].x, g.crew.z - g.obs[0].z).toFixed(2)) : null,
    }),
    steer: (d, r = true) => doSteer(d, r),
    walkTo: (x, z) => setTarget(g, x, z, null),
    toChurch: () => { if (!stage.endless) { g.elapsed = Math.max(0, stage.length - 3.0); g.obs = []; } },
    finish: (score = g.score) => { g.score = score; g.won = true; g.over = true; finishRound(); },
    spawnTest: (kind, x = 0, z = -42) => {
      const q = KINDS[kind];
      if (!q) return;
      g.obs.push({
        id: g.nextId++, kind, cat: q.cat, x, z, halfW: q.halfW, halfZ: q.halfZ,
        need: q.need, pts: q.pts, hz: q.hz, slow: q.slow ?? 1, boss: !!q.boss,
        moveOut: q.moveOut ?? 0, pr: 0, done: false, miss: false, dodged: false,
        vx: kind === "wanderer" ? 10.5 : kind === "cat" ? 20 : 0, targetX: null, tintIdx: 0,
      });
    },
  };

  syncHud();
  say(bubble, "Getting the road ready…", { speakText: false });

  // Wait for decoded .vox models BEFORE building the 3D scene so stand-in characters never flash.
  modelsPromise.then((models) => {
    if (!alive || !canvas.isConnected) return;
    road = createRoad(canvas, { models, crewInfo: who });
    road.sync(g);
    syncHud();
    renderPins();
    say(bubble, stage.rule);
    prevTime = performance.now();
    raf = requestAnimationFrame(frame);
  });

  return cleanup;
}

installClickSounds();
jingleOnce("procession", () => S.settings().sounds);
route();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
