// Candle Rack: get the church ready before Mass. Tap the candles to light them, keep the sanctuary lamp burning,
// and when someone kneels to pray in front of the candles, tap the priest or the server to light those from behind. Easy to play, hard to master: combos,
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
import { newGame, tick, tapCandle, tapLamp, tapBigCandle, chainBonus, lightFree, helperLight, blockedNeedy, blockerOf, COMBO_GAP, starsFor, needy, multFor, WALK_IN } from "./game.js";
import { seasonOf, byzantineSeasonOf, COLORS } from "./season.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { createChurch, loadModels, loadLayout, MODELS } from "./church.js";

const app = document.getElementById("app");
const season = seasonOf(new Date());


const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Candle Rack</b> is a little game about getting the church ready before Mass or the Divine
    Liturgy: lighting the votive candles (or the tapers, in a Byzantine church) and keeping the sanctuary lamp burning, while people come in to pray (tap the
    priest or the altar server to kindly send them to a pew). A round is a minute and a half. Anyone can play by tapping;
    a high score takes focus (combos, "just in time", swiping a row, watching the door for drafts). Two stars open the next
    stage: the Divine Liturgy in a Byzantine church (from here on the player's taper lights six candles before it must be
    lit again at the big candle), Christmas Midnight Mass (busier) and Pascha (it starts in the dark, and it's busiest).
    The colors in the church follow the Church year, worked out from the date. Nothing is collected; the best score stays on
    this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "candle-game"); } });

// each stage's stars and best score (Sunday Mass keeps the ones from before there were stages)
const progressId = (st) => st.progress ?? `rack-${st.id}`;
const bestKey = (st) => (st.id === "sunday" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;

function viewHome() {
  app.innerHTML = `
    <section class="hero candle-hero">
      <h1 class="title">Candle Rack</h1>
      <p class="lede">Mass starts soon! Light the candles, keep the sanctuary lamp burning, and get the church ready.</p>
      <p class="season-chip" style="--season:${season.hex}"><span></span>${esc(season.name)}</p>
    </section>
    <section class="stages">
      ${STAGES.map((st, i) => {
        const open = isOpen(i, starsOf), p = S.progress(progressId(st)), best = S.settings()[bestKey(st)] || 0;
        return open
          ? `<a class="stage card" href="#/play/${st.id}"><span class="stage-icon">${st.icon}</span><b>${esc(st.name)}</b>
              <span class="muted">${esc(st.blurb)}</span>
              <span class="stage-stars">${"★".repeat(p.stars)}${"☆".repeat(3 - p.stars)}${best ? ` · best ${best}` : ""}</span></a>`
          : `<div class="stage card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(st.name)}</b>
              <span class="muted">Get two stars in ${esc(STAGES[i - 1].name)} to open it.</span></div>`;
      }).join("")}
    </section>
    ${stickerBook()}`;
  speak(`${season.say} Mass starts soon. Can you get the church ready? Pick a church.`);
}

// what to say: most lines only once a round (after that a sound and a pop-up are enough), never too close together
function talker(bubble) {
  let quietUntil = 0;
  const said = new Set();
  const talk = (text, { urgent = false } = {}) => {
    const now = performance.now();
    if (!urgent && now < quietUntil) return false;
    quietUntil = now + 3000;
    say(bubble, text);
    return true;
  };
  talk.once = (key, text, opts) => { if (said.has(key)) return; if (talk(text, opts)) said.add(key); };
  return talk;
}

function viewPlay(stageId) {
  const stage = stageById(stageId), si = STAGES.indexOf(stage);
  if (!isOpen(si, starsOf)) { location.hash = "#/"; return; }
  // the feasts have their own color; otherwise the Church year's (a Byzantine church keeps its own calendar's colors)
  const hex = stage.color ? COLORS[stage.color] : stage.rite === "byzantine" ? byzantineSeasonOf(new Date()).hex : season.hex;
  document.body.classList.add("in-game", "candle-game");
  app.innerHTML = `
    <section class="candle-play">
      <canvas class="church" aria-label="The church: tap the candles to light them"></canvas>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="Time until Mass"><span class="clock-label">Mass in</span> <b data-clock>1:30</b></div>
        <div class="taper" data-taper hidden aria-label="Your taper"></div>
        <div class="score"><b data-score>0</b><span data-combo class="streak"></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble candle-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">🕯️</span><p class="say"></p></div>
      <div class="combo-meter" hidden aria-hidden="true"><b>0</b><em>COMBO</em><i>×1</i><span></span></div>
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
    if (!S.progress(progressId(stage)).plays && (si === 0 || stage.taper)) {
      const card = $(".candle-lesson"); card.hidden = false;
      await showLesson(card, si > 0 ? {
        emoji: stage.icon, title: stage.name,
        rule: `You carry a <b>taper</b> now. It lights <b>${stage.taper}</b> candles, then tap the <b>big candle</b> to light it again.${stage.dark ? " The church starts <b>dark</b>: bring the light to every candle!" : ""}`,
        exampleHtml: `<p class="center lesson-candles">${"🔥".repeat(Math.min(stage.taper, 6))} ➜ 🕯️</p>`,
        voice: `${stage.blurb} You carry a taper now. It lights ${stage.taper} candles. When it's out, tap the big candle to light it again.`,
      } : {
        emoji: "🕯️", title: "Get the church ready",
        rule: "Tap the <b>glowing</b> candles to light them, quickly for a <b>combo</b>. Tap the <b>red lamp</b> when it's low. If someone kneels in the way, tap the <b>priest</b> or the <b>server</b> to help.",
        exampleHtml: `<p class="center lesson-candles">🕯️ 🕯️ 🔴 🙏</p>`,
        voice: "Mass starts soon! Tap the glowing candles to light them. Light them quickly, one after another, for a combo! Tap the red lamp when it gets low; it must never go out. And if someone kneels in the way, tap the priest or the altar server, and he'll help.",
      });
      card.hidden = true;
      if (!alive) return;
    }
    say(bubble, "Getting the church ready…", { speakText: false });
    const [models, layout] = await Promise.all([loadModels(MODELS), loadLayout()]);
    if (!alive) return;
    church = createChurch(canvas, { season, models, rite: stage.rite, hex, dark: stage.dark, taper: !!stage.taper, layout });
    // keep the racks clear of the clock (top) and the speech bubble (bottom)
    const fitView = () => church?.resize({ top: ($(".hud")?.offsetHeight ?? 60) + 6, bottom: (bubble.offsetHeight || 60) + 16 });
    fitView(); addEventListener("resize", fitView);
    const g = newGame({ seed: Math.floor(Math.random() * 1e9), stage });
    const prayers = new Map(); // person id → 🙏 above their head
    window.__candleRack = { game: g, church }; // (for the browser tests; nothing reads it in the game)
    talk(stage.color ? stage.say : `${season.say} ${stage.say}`, { urgent: true });
    // the taper: one flame per candle it can still light
    const taperEl = $("[data-taper]");
    const showTaper = () => { if (!stage.taper) return; taperEl.hidden = false; taperEl.classList.toggle("out", g.taper === 0); taperEl.innerHTML = `<span class="taper-stick"></span>${Array.from({ length: stage.taper }, (_, i) => `<i class="${i < g.taper ? "on" : ""}"></i>`).join("")}`; };
    showTaper();

    // tapping and swiping (where tap areas overlap, the candle that can be lit wins)
    const needsLight = (id) => needy(g).includes(id);
    let swiping = null;
    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1100); };
    let lastMult = 1;
    const lightAt = (id, x, y) => {
      const r = tapCandle(g, id);
      if (r.type === "lit" || r.type === "just-in-time") {
        sfx.chime();
        pop(`+${r.points}`, x, y, r.type === "just-in-time" ? "jit" : "");
        if (r.type === "just-in-time") talk.once("jit", vary("jit", ["Just in time!", "Phew, just in time!", "Saved it!"]));
        if (r.mult > lastMult) { sfx.pop(); talk.once("combo", "A combo! Keep lighting quickly!"); }
        lastMult = r.mult;
        showTaper();
        if (stage.taper && g.taper === 0) talk.once("taper-out", "Your taper is out! Tap the big candle to light it again.", { urgent: true });
        return true;
      }
      if (r.type === "no-taper") { sfx.tap(); pop("🕯️", x, y); talk("Your taper is out! Tap the big candle.", { urgent: true }); return false; }
      if (r.type === "blocked") { sfx.tap(); pop("🙏", x, y); talk.once("blocked", "Someone is praying there. Tap the priest or the server, and he'll light those from behind!", { urgent: true }); }
      return false;
    };
    // the priest or the server goes behind the rack where someone is praying and lights the candles there (the person
    // with the most candles needing light behind them); the person keeps praying and leaves on their own
    // Tapping him always does something: someone in the way first, else a candle that's out, else a thumbs-up.
    const sendHelp = (who, x, y) => {
      if (church.helperBusy(who)) { sfx.tap(); pop("⏳", x, y); talk.once("busy", "He's busy. Just a moment!"); return; }
      const waiting = g.people.filter((p) => g.t >= p.at && blockedNeedy(g, p.id).length);
      if (!waiting.length) {
        const out = g.candles.filter((c) => c.active && !c.lit && !blockerOf(g, c.id));
        if (!out.length) { sfx.tap(); pop("👍", x, y); return; }
        const c = out[Math.floor(Math.random() * out.length)];
        sfx.pop();
        church.helpCandle(who, c.id, () => { if (alive && !ended && lightFree(g, c.id)) sfx.chime(); });
        return;
      }
      const p = waiting.sort((a, b) => blockedNeedy(g, b.id).length - blockedNeedy(g, a.id).length)[0];
      church.helpLight(who, p.id, () => {
        if (!alive || ended) return;
        const ids = helperLight(g, p.id);
        if (ids.length) { sfx.chime(); const at = church.personHead(p.id); if (at) pop(`+${ids.length}`, at.x, at.y - 20); talk.once("helped", who === "priest" ? "Thank you, Father!" : "Thank you! The server lit them from behind.") }
      });
      sfx.pop();
    };

    // the combo meter (like a fighting game's hit counter): the count, the multiplier, and a bar running out
    const meter = $(".combo-meter"), meterN = meter.querySelector("b"), meterX = meter.querySelector("i"), meterBar = meter.querySelector("span");
    let shown = 0;
    const showCombo = () => {
      const n = g.combo;
      if (n >= 2) {
        if (n !== shown) { meter.classList.remove("bump", "out"); void meter.offsetWidth; meter.classList.add("bump"); }
        meter.hidden = false; meterN.textContent = n; meterX.textContent = `×${multFor(n)}`;
        meter.dataset.m = multFor(n);
        meterBar.style.transform = `scaleX(${Math.max(0, 1 - (g.t - g.lastLight) / COMBO_GAP)})`;
      } else if (shown >= 2) { meter.classList.add("out"); setTimeout(() => { if (g.combo < 2) meter.hidden = true; }, 500); }
      shown = n;
    };
    canvas.addEventListener("pointerdown", (e) => {
      if (g.over) return;
      const hit = church.pick(e.clientX, e.clientY, needsLight);
      if (!hit) return;
      canvas.setPointerCapture(e.pointerId);
      if (hit.kind === "helper") { sendHelp(hit.who, e.clientX, e.clientY); return; }
      if (hit.kind === "big") { const r = tapBigCandle(g); if (r.type === "taper") { sfx.pop(); pop("🔥", e.clientX, e.clientY, "lamp"); showTaper(); } else sfx.tap(); return; }
      if (hit.kind === "lamp") {
        const r = tapLamp(g);
        if (r.type === "filled" || r.type === "relit") { sfx.pop(); pop(r.points ? `+${r.points}` : "🔥", e.clientX, e.clientY, "lamp"); if (r.type === "relit") talk.once("relit", "The lamp is burning again. Keep it lit!"); }
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
      if (b) { sfx.fanfare(); pop(`Chain of ${swiping.good}! +${b}`, e.clientX, e.clientY - 30, "chain"); }
      swiping = null;
    };
    canvas.addEventListener("pointerup", endSwipe); canvas.addEventListener("pointercancel", endSwipe);

    // the altar server helps now and then (more often at the start, for little ones): walks over and lights one
    let helpAt = 25, helping = false;
    async function help() {
      const out = g.candles.filter((c) => c.active && !c.lit && !blockerOf(g, c.id));
      if (!out.length || helping || ended || church.helperBusy("server")) return;
      helping = true;
      const c = out[Math.floor(Math.random() * out.length)];
      await church.helpCandle("server", c.id, () => { if (alive && !ended && lightFree(g, c.id)) talk.once("helper", "The altar server lit one for you!"); });
      helping = false;
    }

    // the clock and what happens
    let last = performance.now(), ended = false, said30 = false;
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        for (const ev of tick(g, dt)) {
          if (ev.type === "creak") { sfx.whoosh(); church.door(true); talk.once("creak", "The door is open! Watch out for the wind!", { urgent: true }); }
          else if (ev.type === "gust") { church.door(false); church.gust(ev.rack, ev.row); if (ev.ids.length) { sfx.crack(); talk.once("gust", "Whoosh! The wind blew some out."); } }
          else if (ev.type === "lamp-low") talk(vary("lamp-low", ["The sanctuary lamp needs oil! Tap the red lamp.", "The red lamp is getting low!", "Oil for the lamp, quick!"]), { urgent: true });
          else if (ev.type === "lamp-out") { sfx.oops(); talk(vary("lamp-out", ["Oh no, the sanctuary lamp went out! Tap it to light it again.", "The lamp went out! Tap it."]), { urgent: true }); }
          else if (ev.type === "out") talk.once("out", "A candle went out. You can light it again!");
          else if (ev.type === "combo-end") lastMult = 1;
          else if (ev.type === "person") {
            church.personArrive(ev, WALK_IN);
            const el = document.createElement("div"); el.className = "prayer"; el.textContent = "🙏"; prayersEl.append(el); prayers.set(ev.id, el);
            setTimeout(() => { if (alive && !ended && g.people.some((p) => p.id === ev.id)) talk.once("person", "Someone came to pray. Tap the priest or the server to light the candles behind them.", { urgent: true }); }, WALK_IN * 1000);
          }
          else if (ev.type === "person-left") { prayers.get(ev.id)?.remove(); prayers.delete(ev.id); church.personLeave(ev.id); }
          else if (ev.type === "end") ended = true;
        }
        const left = Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = g.score;
        $("[data-combo]").textContent = multFor(g.combo) > 1 ? ` ×${multFor(g.combo)}` : "";
        showCombo();
        if (!said30 && left <= 30) { said30 = true; talk("Thirty seconds until Mass!", { urgent: true }); }
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
      const old = S.settings()[bestKey(stage)] || 0;
      const stars = starsFor(g), best = Math.max(old, g.score), newBest = g.score > old;
      S.setSetting(bestKey(stage), best);
      cancelAnimationFrame(raf); church.dispose(); church = null;
      document.body.classList.remove("candle-game"); // the finish screen scrolls like any page
      const nextStage = STAGES[si + 1], opens = nextStage && Math.max(stars, starsOf(stage)) >= 2;
      showFinish(app, {
        id: progressId(stage), stars, mistakes: 3 - stars, title: newBest ? "A new best!" : "The church is ready!",
        done: `You scored ${g.score}.`, again: `#/play/${stage.id}`, onAgain: route,
        next: opens ? { href: `#/play/${nextStage.id}`, label: `${nextStage.icon} ${nextStage.name}` } : null,
      });
      const fin = app.querySelector(".finish h1");
      fin?.insertAdjacentHTML("afterend", `<p class="final-score">You scored <b>${g.score}</b>${newBest ? " · a new best!" : ` · your best: ${best}`}</p>
        <p class="muted">${g.lit + g.justInTime} candles lit · ${g.justInTime} just in time · best combo ${g.bestCombo} · ${g.ready} burning when Mass began${g.helperLit ? ` · ${g.helperLit} lit by the priest and server` : ""}${stars < 3 ? ` · ${stage.star3} for three stars` : ""}${g.tapers ? ` · taper lit ${g.tapers} times` : ""}</p>`);
    }
  })();

  return () => { alive = false; cancelAnimationFrame(raf); church?.dispose(); church = null; };
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
