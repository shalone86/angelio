// Garden Givers: guard the monastery garden, orchard, and herbs from critters,
// harvest what the Food Bank requests, and watch the courier walk baskets down the path.
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("garden:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { showLesson } from "./kit/lesson.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { cropById } from "./crops.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { GARDENERS, gardenerById, gardenerOpen } from "./gardeners.js";
import { newGame, tick, tapSpot, tapPest, orderReward, multOf, starsFor, timeLeft } from "./garden.js";
import { createPlot, loadModels, MODELS } from "./plot.js";

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/";
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Garden Givers</b> is a monastery garden and harvest game with
    four 90-second stages (no endless mode): veggie beds, the fruit orchard, herbs, and Night Vigil. Tap critters to shoo them off
    before they nibble crops, pick ripe produce matching the Food Bank orders before points decay below zero, and watch the courier
    monk carry baskets to the Food Bank wagon. Start as Brother or Sister Gardener and unlock four specialist helpers! Nothing is
    collected; best scores stay on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "garden-game"); } });

const progressId = (st) => st.progress ?? `garden-${st.id}`;
const bestKey = (st) => (st.id === "garden" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;
const starsById = (id) => starsOf(stageById(id));
const myGardener = () => { const g = gardenerById(S.settings().gardener); return gardenerOpen(g, starsById) ? g : GARDENERS[0]; };
const gamesLink = `<p class="center games-link"><a class="btn" href="${GAMES}">🎮 All the Angelio games</a></p>`;

function viewHome() {
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Garden Givers</h1>
      <p class="lede">Keep bugs, birds, and critters off the garden and fruit trees, pick ripe produce for the Food Bank, and deliver orders fast before points tick negative!</p>
      <p class="demo-chip">🧪 Demo: some voxel stand-ins until critters &amp; plants are drawn</p>
    </section>
    <section class="stages">
      ${STAGES.map((st, i) => {
        const open = isOpen(i, starsOf), p = S.progress(progressId(st)), best = S.settings()[bestKey(st)] || 0;
        const req = st.after ? stageById(st.after) : STAGES[i - 1];
        return open
          ? `<a class="stage card${st.night ? " night" : ""}" href="#/play/${st.id}"><span class="stage-icon">${st.icon}</span><b>${esc(st.name)}</b>
              <span class="muted">${esc(st.blurb)}</span>
              <span class="stage-stars">${"★".repeat(p.stars)}${"☆".repeat(3 - p.stars)}${best ? ` · best ${best}` : ""}</span></a>`
          : `<div class="stage card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(st.name)}</b>
              <span class="muted">Get two stars in ${esc(req.name)} to open it.</span></div>`;
      }).join("")}
    </section>
    <h2 class="center gardeners-title">Your Gardener</h2>
    <section class="gardeners">
      ${GARDENERS.map((gd) => {
        const open = gardenerOpen(gd, starsById), picked = myGardener().id === gd.id;
        return open
          ? `<button type="button" class="gardener-pick card${picked ? " picked" : ""}" data-gd="${gd.id}" aria-pressed="${picked}"><span class="stage-icon">${gd.icon}</span><b>${esc(gd.name)}</b><span class="muted">${esc(gd.blurb)}</span>${picked ? `<span class="picked-tag">✓ Gardening</span>` : ""}</button>`
          : `<div class="gardener-pick card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(gd.name)}</b><span class="muted">Get two stars in ${esc(stageById(gd.opens.stage).name)} to meet ${gd.nun ? "her" : "him"}.</span></div>`;
      }).join("")}
    </section>
    ${stickerBook()}
    ${gamesLink}`;
  app.querySelectorAll("[data-gd]").forEach((b) => b.addEventListener("click", () => {
    const gd = gardenerById(b.dataset.gd);
    S.setSetting("gardener", gd.id);
    viewHome();
    speak(gd.say);
  }));
  speak("Pick a stage in Garden Givers!");
}

function viewPlay(stageId) {
  const stage = stageById(stageId ?? S.settings().lastStage), si = STAGES.indexOf(stage);
  if (!isOpen(si, starsOf)) { location.hash = "#/"; return; }
  S.setSetting("lastStage", stage.id);
  document.body.classList.add("in-game", "garden-game");
  const who = myGardener();
  const unlockedBefore = new Set(GARDENERS.filter((gd) => gardenerOpen(gd, starsById)).map((gd) => gd.id));

  app.innerHTML = `
    <section class="garden-play${stage.night ? " night" : ""}">
      <canvas class="plot" aria-label="The monastery garden: tap critters to shoo them, tap ripe produce for the Food Bank"></canvas>
      <div class="pins" data-pins></div>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="Time left"><span class="clock-label">${stage.icon} ${esc(stage.name)}</span> <b data-clock>1:30</b></div>
        <div class="score"><b data-score>0</b><span data-combo class="streak"></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="orders-bar" data-orders></div>
      <div class="bubble garden-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">${who.icon}</span><p class="say"></p></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card garden-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));

  const $ = (s) => app.querySelector(s);
  const bubble = $(".garden-bubble"), canvas = $("canvas.plot"), pinsEl = $("[data-pins]"), ordersEl = $("[data-orders]"), popsEl = $(".pops");
  let alive = true, ended = false, raf = 0, plot = null, g = null, stopListeners = () => {};

  function finish() {
    if (ended || !alive) return;
    ended = true;
    cancelAnimationFrame(raf);
    plot?.dispose();
    plot = null;
    stopListeners();
    const cl = $("[data-clock]");
    if (cl) cl.textContent = "0:00";
    document.body.classList.remove("garden-game");
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
      title: newBest ? "A new best!" : stage.vigil ? "Dawn is here!" : "Harvest blessed!",
      done: `You scored ${score}.`,
      again: `#/play/${stage.id}`,
      onAgain: route,
      next: opens ? { href: `#/play/${next.id}`, label: `${next.icon} ${next.name}` } : null,
    });
    const fresh = GARDENERS.filter((gd) => gardenerOpen(gd, starsById) && !unlockedBefore.has(gd.id));
    if (fresh.length) {
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend",
        `<p class="final-score">🎉 ${fresh.map((gd) => `<b>${esc(gd.name)}</b>`).join(" and ")} can garden with you now!</p>`);
    }
    const openGardeners = GARDENERS.filter((gd) => gardenerOpen(gd, starsById)), pickedId = myGardener().id;
    app.querySelector(".finish .row.center")?.insertAdjacentHTML("beforebegin", `
      <div class="finish-pick">
        <p class="finish-pick-label">Pick your gardener for next time:</p>
        <div class="finish-picks">
          ${openGardeners.map((gd) => `<button type="button" class="pick-chip${gd.id === pickedId ? " picked" : ""}" data-pick="${gd.id}" aria-pressed="${gd.id === pickedId}"><span>${gd.icon}</span><b>${esc(gd.name)}</b>${!unlockedBefore.has(gd.id) ? `<span class="pick-new">✨ New!</span>` : ""}</button>`).join("")}
        </div>
      </div>`);
    app.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
      const gd = gardenerById(b.dataset.pick);
      S.setSetting("gardener", gd.id);
      app.querySelectorAll("[data-pick]").forEach((x) => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-pressed", String(on)); });
      sfx.select();
      speak(gd.say);
    }));
    app.querySelector(".finish h1")?.insertAdjacentHTML("afterend",
      `<p class="final-score">You scored <b>${score}</b>${newBest ? " · a new best!" : ` · best: ${Math.max(old, score)}`}</p>
       <p class="muted">${stage.vigil ? `${g.shooed} critters shooed · ${g.eaten} nibbled · best combo ${g.bestStreak}` : `${g.delivered} baskets delivered · ${g.shooed + g.autoShooed} critters shooed · ${g.eaten} nibbled`}${stars < 3 ? ` · ${stage.star3} for three stars` : ""}</p>`);
    const all = app.querySelector('.finish .finish-links a[href="https://angelio.org/"]');
    if (all) all.href = GAMES;
  }

  const pop = (text, pt, cls = "") => {
    const el = document.createElement("div");
    el.className = `pop ${cls}`;
    el.textContent = text;
    el.style.left = `${pt?.x ?? window.innerWidth / 2}px`;
    el.style.top = `${(pt?.y ?? window.innerHeight * 0.45) - 18}px`;
    popsEl.append(el);
    setTimeout(() => el.remove(), 1150);
  };

  function handle(events) {
    for (const ev of events) {
      if (ev.type === "shoo") {
        sfx.tap();
        plot.shoo(ev.pest.id);
        if (ev.spot) plot.focusSpot(ev.spot.id);
        pop(`+${ev.points}${ev.mult > 1 ? ` ×${ev.mult}` : ""}`, plot.spotTop(ev.spot?.id), ev.quick ? "quick" : "");
      } else if (ev.type === "auto-shoo") {
        sfx.chime();
        plot.shoo(ev.pest.id);
        pop(`+${ev.points} 🪲`, plot.spotTop(ev.spot?.id), "quick");
      } else if (ev.type === "eat") {
        sfx.oops();
        pop(`${ev.pest.emoji} Nibbled!`, plot.spotTop(ev.spot?.id), "oops");
        say(bubble, `Oh! The ${esc(ev.pest.name.toLowerCase())} got the ${esc(cropById(ev.spot?.crop).name.toLowerCase())}!`, { speakText: false });
      } else if (ev.type === "pick") {
        sfx.pop();
        plot.focusSpot(ev.spot.id);
        const c = cropById(ev.spot.crop);
        pop(`${ev.count > 1 ? `${ev.count}× ` : ""}${c.emoji}`, plot.spotTop(ev.spot.id), "");
      } else if (ev.type === "deliver") {
        sfx.win();
        plot.deliver(ev.order.items.map((x) => x.crop));
        pop(`🧺 Delivered! +${ev.reward}`, plot.screenOf(20, 7, -2.5), "good");
        say(bubble, ev.late ? "Basket delivered! Try delivering before the Food Bank waits too long." : "Courier monk is walking the basket to the Food Bank!", { speakText: false });
      } else if (ev.type === "wrong-crop") {
        sfx.oops();
        pop("Not needed!", plot.spotTop(ev.spot.id), "oops");
        say(bubble, `Nobody ordered ${esc(cropById(ev.spot.crop).name.toLowerCase())} right now — check the Food Bank cards!`, { speakText: false });
      } else if (ev.type === "order-late") {
        sfx.away();
      } else if (ev.type === "guard-bonus") {
        sfx.chime();
        pop(`🌙 +${ev.points} (${ev.intact}/${ev.total} safe)`, plot.screenOf(0, 6, -4), "good");
      } else if (ev.type === "end") {
        finish();
      }
    }
  }

  (async () => {
    if (!S.progress(progressId(stage)).plays) {
      const card = $(".garden-lesson");
      card.hidden = false;
      await showLesson(card, {
        emoji: stage.icon,
        title: stage.name,
        rule: stage.vigil
          ? `Night falls on the monastery garden! Tap bugs, crows, squirrels, and raccoons quickly to guard every plant until dawn.`
          : `Bugs and critters come for your crops — tap them fast to shoo them off! Tap ripe produce matching the <b>Food Bank</b> orders above to pack each basket automatically before it waits too long!`,
        exampleHtml: `<p class="center garden-example">${stage.vigil ? "🐛 🐦 🐿️ 🦝 ➜ 👆" : "🐛 ➜ 👆 &nbsp; 🥕 🍎 ➜ 🧺 ➜ 🚐"}</p>`,
        voice: stage.vigil
          ? `Night falls on the garden! Tap critters quickly to guard every crop until dawn.`
          : `Tap bugs and critters fast to shoo them off! Then tap ripe fruits and veggies that the Food Bank ordered before they wait too long!`,
      });
      card.hidden = true;
      if (!alive) return;
    }

    say(bubble, "Opening the garden gate…", { speakText: false });
    const models = await loadModels(MODELS);
    if (!alive) return;

    plot = createPlot(canvas, { models, stage, gardener: who });
    const side = matchMedia("(orientation: landscape) and (max-height: 520px)");
    const fitView = () => plot?.resize({
      top: ($(".hud")?.offsetHeight ?? 52) + (ordersEl.offsetHeight || 56) + 12,
      bottom: side.matches ? 10 : (bubble.offsetHeight || 54) + 16,
    });
    g = newGame({ seed: Math.floor(Math.random() * 1e9), stage, gardener: who });
    window.__garden = { game: g, plot };
    plot.sync(g);
    fitView();
    addEventListener("resize", fitView);
    say(bubble, stage.rule, { speakText: false });

    const onCanvasTap = (e) => {
      if (ended || g.over) return;
      const hit = plot.pickAt(e.clientX, e.clientY);
      if (hit?.pestId) handle(tapPest(g, hit.pestId));
      else if (hit?.spotId) handle(tapSpot(g, hit.spotId));
    };
    canvas.addEventListener("pointerdown", onCanvasTap);

    const onPinClick = (e) => {
      if (ended || g.over) return;
      const b = e.target.closest("[data-pest], [data-spot]");
      if (!b) return;
      if (b.dataset.pest) handle(tapPest(g, Number(b.dataset.pest)));
      else if (b.dataset.spot) handle(tapSpot(g, b.dataset.spot));
    };
    pinsEl.addEventListener("click", onPinClick);

    stopListeners = () => {
      removeEventListener("resize", fitView);
      canvas.removeEventListener("pointerdown", onCanvasTap);
      pinsEl.removeEventListener("click", onPinClick);
    };

    const spotPins = new Map(), pestPins = new Map();
    let last = performance.now(), lastOrderHtml = "";

    function syncOrders() {
      if (stage.vigil) {
        const intact = g.spots.filter((s) => s.ripe).length;
        const html = `<div class="vigil-pill">🌙 Crops Safe: <b>${intact} / ${g.spots.length}</b></div>`;
        if (lastOrderHtml !== html) { ordersEl.innerHTML = html; lastOrderHtml = html; }
        return;
      }
      const needed = new Set(g.orders.flatMap((o) => o.items.filter((it) => !it.done).map((it) => it.crop)));
      const html = g.orders.map((o) => {
        const rew = orderReward(o);
        const late = o.age > o.fresh;
        const frac = late ? 0 : Math.max(0, 1 - o.age / o.fresh);
        const ptsText = rew > 0 ? `+${rew}` : rew === 0 ? "0" : `${rew}`;
        return `<div class="order-card${late ? " late" : frac < 0.35 ? " hurry" : ""}">
          <div class="order-items">${o.items.map((it) => `<span class="oi${it.done ? " done" : ""}">${cropById(it.crop).emoji}</span>`).join("")}</div>
          <span class="order-pts">${ptsText}</span>
          <span class="order-bar"><i style="width:${(frac * 100).toFixed(0)}%"></i></span>
        </div>`;
      }).join("");
      if (lastOrderHtml !== html) { ordersEl.innerHTML = html; lastOrderHtml = html; }
      return needed;
    }

    function syncPins(needed) {
      const seenSpot = new Set();
      for (const s of g.spots) {
        const hasPest = g.pests.some((p) => p.spotId === s.id);
        if (hasPest || stage.vigil || !s.ripe) continue;
        const pt = plot.spotTop(s.id);
        if (!pt) continue;
        seenSpot.add(s.id);
        let btn = spotPins.get(s.id);
        if (!btn) {
          btn = document.createElement("button");
          btn.type = "button";
          btn.className = "gpin crop";
          btn.dataset.spot = s.id;
          btn.textContent = cropById(s.crop).emoji;
          btn.setAttribute("aria-label", `Pick ${cropById(s.crop).name}`);
          pinsEl.append(btn);
          spotPins.set(s.id, btn);
        }
        btn.classList.toggle("wanted", needed?.has(s.crop));
        btn.style.left = `${pt.x}px`;
        btn.style.top = `${pt.y}px`;
      }
      for (const [id, b] of spotPins) if (!seenSpot.has(id)) { b.remove(); spotPins.delete(id); }

      const seenPest = new Set();
      for (const p of g.pests) {
        const pt = plot.pestTop(p);
        if (!pt) continue;
        seenPest.add(p.id);
        let btn = pestPins.get(p.id);
        if (!btn) {
          btn = document.createElement("button");
          btn.type = "button";
          btn.className = "gpin pest";
          btn.dataset.pest = String(p.id);
          btn.innerHTML = `<span>${p.emoji}</span><span class="pbar"><i></i></span>`;
          btn.setAttribute("aria-label", `Shoo ${p.name}`);
          pinsEl.append(btn);
          pestPins.set(p.id, btn);
        }
        const f = Math.max(0, p.left / p.max);
        btn.querySelector("i").style.width = `${(f * 100).toFixed(0)}%`;
        btn.classList.toggle("urgent", f < 0.35);
        btn.style.left = `${pt.x}px`;
        btn.style.top = `${pt.y}px`;
      }
      for (const [id, b] of pestPins) if (!seenPest.has(id)) { b.remove(); pestPins.delete(id); }
    }

    const frame = (now) => {
      if (!alive || ended) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      handle(tick(g, dt));
      if (ended || g.over) return;

      plot.sync(g);
      plot.update(dt);
      const secs = Math.ceil(timeLeft(g));
      $("[data-clock]").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      $("[data-score]").textContent = Math.round(g.score);
      const m = multOf(g);
      $("[data-combo]").textContent = m > 1 ? `×${m}` : "";
      const needed = syncOrders();
      syncPins(needed);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  })();

  return () => { alive = false; cancelAnimationFrame(raf); plot?.dispose(); plot = null; stopListeners(); };
}

installClickSounds();
jingleOnce("garden", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
