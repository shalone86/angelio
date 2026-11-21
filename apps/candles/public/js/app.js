// Candle Rack: get the church ready before Mass. Tap the candles to light them, keep the sanctuary lamp burning,
// light a candle in the right color for each person who comes to pray. Easy to play, hard to master: the streak,
// "just in time", chains and the best score. The rules are in game.js, the church on screen in church.js, the
// Church year (the vestments' and cloths' color) in season.js.
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("candles:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { showLesson } from "./kit/lesson.js";
import { vary } from "./kit/vary.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { newGame, tick, tapCandle, tapLamp, chainBonus, lightFree, starsFor, needy, STAR3 } from "./game.js";
import { seasonOf } from "./season.js";
import { createChurch, loadModels } from "./church.js";

const app = document.getElementById("app");
const season = seasonOf(new Date());
const MODELS = ["priest-idle", "priest-walk-fast", "priest-mass-walk", "priest-walk-slow", "priest-mass-idle",
  "server-idle", "server-walk", "server-light", "server-cross-walk", "server-cross-idle", "server-candle-walk", "server-candle-idle",
  "man-kneel", "woman-kneel", "child-kneel", "grandparent-kneel"];
const HEART = { red: "❤️", blue: "💙", white: "🤍" };
const COLOR_WORD = { red: "red", blue: "blue", white: "white" };

const route = createRouter([
  [/^$/, viewHome],
  [/^play$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Candle Rack</b> is a little game about getting the church ready before Mass or the Divine
    Liturgy: lighting the votive candles, keeping the sanctuary lamp burning, and lighting a candle for each person's prayer.
    Anyone can play by tapping; a high score takes focus (streaks, "just in time", swiping a row, watching the door for drafts).
    The colors in the church follow the Church year, worked out from the date. Nothing is collected; the best score stays on
    this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "candle-game"); } });

function viewHome() {
  const best = S.settings().best || 0, p = S.progress("rack");
  app.innerHTML = `
    <section class="hero candle-hero">
      <h1 class="title">Candle Rack</h1>
      <p class="lede">Mass starts soon! Light the candles, keep the sanctuary lamp burning, and light a candle for everyone who comes to pray.</p>
      <p class="season-chip" style="--season:${season.hex}"><span></span>${esc(season.name)}</p>
      <a class="btn big primary play-btn" href="#/play">🕯️ Play</a>
      ${best ? `<p class="muted">Your best: <b>${best}</b>${p.stars ? ` · ${"★".repeat(p.stars)}` : ""}</p>` : ""}
    </section>
    ${stickerBook()}`;
  speak(`${season.say} Mass starts soon. Can you get the church ready?`);
}

// what to say, and not too often
function talker(bubble) {
  let quietUntil = 0;
  return (text, { urgent = false } = {}) => {
    const now = performance.now();
    if (!urgent && now < quietUntil) return;
    quietUntil = now + (urgent ? 2500 : 4000);
    say(bubble, text);
  };
}

function viewPlay() {
  document.body.classList.add("in-game", "candle-game");
  app.innerHTML = `
    <section class="candle-play">
      <canvas class="church" aria-label="The church: tap the candles to light them"></canvas>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="Time until Mass"><span class="clock-label">Mass in</span> <b data-clock>3:00</b></div>
        <div class="score"><b data-score>0</b><span data-streak class="streak"></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble candle-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">🕯️</span><p class="say"></p></div>
      <div class="prayers" aria-hidden="true"></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card candle-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const $ = (s) => app.querySelector(s);
  const canvas = $("canvas.church"), bubble = $(".candle-bubble"), prayersEl = $(".prayers"), popsEl = $(".pops");
  const talk = talker(bubble);
  let alive = true, church = null, raf = 0;

  (async () => {
    // "How it works", the first time (and whenever asked again from the card)
    if (!S.progress("rack").plays) {
      const card = $(".candle-lesson"); card.hidden = false;
      await showLesson(card, {
        emoji: "🕯️", title: "Get the church ready",
        rule: "Tap a candle to <b>light</b> it. Tap one that <b>flickers</b> just in time! Tap the <b>red lamp</b> when it's low. Light a candle in the <b>color</b> each person asks for.",
        exampleHtml: `<p class="center lesson-candles">🕯️ 🕯️ 💙 🔴</p>`,
        voice: "Mass starts soon! Tap a candle to light it. If a candle flickers, tap it just in time! Tap the red lamp when it gets low; it must never go out. And when someone comes to pray, light a candle in the color they ask for.",
      });
      card.hidden = true;
      if (!alive) return;
    }
    say(bubble, "Getting the church ready…", { speakText: false });
    const models = await loadModels(MODELS);
    if (!alive) return;
    church = createChurch(canvas, { season, models });
    // keep the racks clear of the clock (top) and the speech bubble (bottom)
    const fitView = () => church.resize({ top: ($(".hud")?.offsetHeight ?? 60) + 6, bottom: (bubble.offsetHeight || 60) + 16 });
    fitView(); addEventListener("resize", fitView);
    const g = newGame({ seed: Math.floor(Math.random() * 1e9) });
    const prayers = new Map(); // person id → bubble element
    window.__candleRack = { game: g, church }; // (for the browser tests; nothing reads it in the game)
    talk(`${season.say} Mass starts in three minutes. Light the candles!`, { urgent: true });

    // tapping and swiping (where tap areas overlap, the candle that needs lighting wins)
    const needsLight = (id) => { const c = g.candles[id]; return c.active && (!c.lit || c.life < 0.25); };
    let swiping = null;
    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1100); };
    const lightAt = (id, x, y) => {
      const r = tapCandle(g, id);
      if (r.type === "lit" || r.type === "just-in-time") {
        sfx.chime();
        pop(`+${r.points}`, x, y, r.type === "just-in-time" ? "jit" : "");
        if (r.type === "just-in-time") talk(vary("jit", ["Just in time!", "Phew, just in time!", "Saved it!"]));
        if (r.prayer) { sfx.win(); prayers.get(r.prayer.id)?.remove(); prayers.delete(r.prayer.id); church.personLeave(r.prayer.id); talk(vary("prayer", ["Thank you! A candle for their prayer.", "Your candle carries their prayer!", "They're so happy. Thank you!"]), { urgent: true }); }
        return true;
      }
      return false;
    };
    canvas.addEventListener("pointerdown", (e) => {
      if (g.over) return;
      const hit = church.pick(e.clientX, e.clientY, needsLight);
      if (!hit) return;
      canvas.setPointerCapture(e.pointerId);
      if (hit.kind === "lamp") {
        const r = tapLamp(g);
        if (r.type === "filled" || r.type === "relit") { sfx.pop(); pop(r.points ? `+${r.points}` : "🔥", e.clientX, e.clientY, "lamp"); if (r.type === "relit") talk("The lamp is burning again. Keep it lit!"); }
        else sfx.tap();
        return;
      }
      swiping = { seen: new Set([hit.id]), good: lightAt(hit.id, e.clientX, e.clientY) ? 1 : 0 };
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!swiping || g.over) return;
      const hit = church.pick(e.clientX, e.clientY, needsLight);
      if (hit?.kind === "candle" && !swiping.seen.has(hit.id)) { swiping.seen.add(hit.id); if (lightAt(hit.id, e.clientX, e.clientY)) swiping.good++; }
    });
    const endSwipe = (e) => {
      if (!swiping) return;
      const b = chainBonus(g, swiping.good);
      if (b) { sfx.fanfare(); pop(`Chain of ${swiping.good}! +${b}`, e.clientX, e.clientY - 30, "chain"); talk(`A chain of ${swiping.good}!`); }
      swiping = null;
    };
    canvas.addEventListener("pointerup", endSwipe); canvas.addEventListener("pointercancel", endSwipe);

    // the altar server helps now and then (more often at the start, for little ones): walks over and lights one
    let helpAt = 25, helping = false;
    async function help() {
      const out = g.candles.filter((c) => c.active && !c.lit);
      if (!out.length || helping || ended) return;
      helping = true;
      const c = out[Math.floor(Math.random() * out.length)];
      await church.serverLights(c.id, () => { if (alive && !ended && lightFree(g, c.id)) talk(vary("helper", ["The altar server lit one for you!", "The server is helping get ready too."])); });
      helping = false;
    }

    // the clock and what happens
    let last = performance.now(), ended = false, saidMinute = false, saidTen = false, lastOutTalk = -99;
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        for (const ev of tick(g, dt)) {
          if (ev.type === "creak") { sfx.whoosh(); church.door(true); talk("The door is open! Watch out for the wind!", { urgent: true }); }
          else if (ev.type === "gust") { church.door(false); if (ev.ids.length) { sfx.crack(); talk(vary("gust", ["Whoosh! The wind blew some out. Light them again!", "Brr, a draft! Light those candles again!"]), { urgent: true }); } }
          else if (ev.type === "lamp-low") talk("The sanctuary lamp needs oil! Tap the red lamp.", { urgent: true });
          else if (ev.type === "lamp-out") { sfx.oops(); talk("Oh no, the sanctuary lamp went out! Tap it to light it again.", { urgent: true }); }
          else if (ev.type === "out" && g.t - lastOutTalk > 12) { lastOutTalk = g.t; talk(vary("out", ["A candle went out. Light it again!", "Oops, one went out. You can light it!"])); }
          else if (ev.type === "person") {
            church.personArrive(ev);
            const el = document.createElement("div"); el.className = "prayer"; el.textContent = HEART[ev.glass]; prayersEl.append(el); prayers.set(ev.id, el);
            talk(`Someone came to pray. Light a ${COLOR_WORD[ev.glass]} candle for them!`, { urgent: true });
          }
          else if (ev.type === "person-left") { prayers.get(ev.id)?.remove(); prayers.delete(ev.id); church.personLeave(ev.id); }
          else if (ev.type === "end") ended = true;
        }
        const left = Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = g.score;
        $("[data-streak]").textContent = g.streak >= 5 ? ` ×${1 + Math.min(4, Math.floor(g.streak / 5))}` : "";
        if (!saidMinute && left <= 60) { saidMinute = true; talk("One minute until Mass!", { urgent: true }); }
        if (!saidTen && left <= 10) { saidTen = true; talk("Ten seconds! The bells are about to ring!", { urgent: true }); }
        if (g.t >= helpAt) { helpAt = g.t + 22 + g.t / 6; help(); }
        for (const [id, el] of prayers) { const at = church.personHead(id); if (at) { el.style.left = at.x + "px"; el.style.top = at.y + "px"; } }
        if (ended) finish();
      }
      church.update(g, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    async function finish() {
      for (const [id, el] of prayers) { el.remove(); church.personLeave(id); }
      prayers.clear();
      bells();
      say(bubble, "Ding, dong! Mass is starting. Thank you for getting the church ready!");
      await church.procession();
      await new Promise((r) => setTimeout(r, 1200));
      if (!alive) return;
      const stars = starsFor(g), best = Math.max(S.settings().best || 0, g.score), newBest = g.score > (S.settings().best || 0);
      S.setSetting("best", best);
      cancelAnimationFrame(raf); church.dispose(); church = null;
      showFinish(app, {
        id: "rack", stars, mistakes: 3 - stars, title: newBest ? "A new best!" : "The church is ready!",
        done: `You scored ${g.score}.`, again: "#/play", onAgain: route,
      });
      const fin = app.querySelector(".finish h1");
      fin?.insertAdjacentHTML("afterend", `<p class="final-score">You scored <b>${g.score}</b>${newBest ? " · a new best!" : ` · your best: ${best}`}</p>
        <p class="muted">${g.lit + g.justInTime} candles lit · ${g.justInTime} just in time · ${g.prayers} prayers · best streak ${g.bestStreak}${stars < 3 ? ` · ${STAR3} for three stars` : ""}</p>`);
    }
  })();

  return () => { alive = false; cancelAnimationFrame(raf); church?.dispose(); };
}

// church bells: a few soft rings, made with Web Audio (no files)
function bells() {
  if (!S.settings().sounds) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.9, 1.8, 2.7].forEach((t, i) => {
      for (const [f, v] of [[i % 2 ? 392 : 523.25, 0.22], [i % 2 ? 784 : 1046.5, 0.07], [i % 2 ? 1175 : 1568, 0.04]]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = f; o.type = "sine";
        g.gain.setValueAtTime(0, ac.currentTime + t); g.gain.linearRampToValueAtTime(v, ac.currentTime + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 2.4);
        o.connect(g).connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 2.5);
      }
    });
  } catch { /* no sound, still fine */ }
}

installClickSounds();
jingleOnce("candles", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
