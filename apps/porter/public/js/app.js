// Monastery Porter: keep the monastery gate (his idea: ROADMAP.md, "Monastery Porter"). A demo: the gate is voxel
// (gate.js) with his people where he has made them and stand-ins for the rest; the rules are in porter.js, the stages
// (Sunday Mass, Guest Day, the Great Silence and the endless Feast Day Crowd) in stages.js and the visitors in visitors.js.
//
// A visitor knocks and says who they are (read aloud, with a picture over their head). One quick move per person:
// swipe up or tap the gate (or Welcome) to let people who belong in (the door opens by itself; important guests bring
// bonus points), or swipe sideways (or Send away) to kindly push the others off the path. Brothers also walk out through
// the gate to the garden, bakery or bell tower — wait for a brother to pass before welcoming the next visitor in!
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("porter:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { showLesson } from "./kit/lesson.js";
import { vary, todayKey, todayLabel, dailySeed, dailyStage } from "./kit/vary.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { newGame, tick, welcome, sendAway, ringBell, waiting, brotherInGate, speedOf, starsFor, multOf } from "./porter.js";
import { PORTERS, porterById, porterOpen } from "./porters.js";
import { WELCOMES, BUMP_LINES } from "./visitors.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { createGate, loadModels, MODELS } from "./gate.js";

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/"; // all the Angelio games (angelio.org/games/)
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Monastery Porter</b> is a little game about keeping the gate of a monastery, the way St. Benedict's
    porter did: he answered every knock with "Thanks be to God." Visitors knock and tell you who they are. Swipe up or tap the gate (or tap Welcome) to let
    people who belong in — important guests earn extra points — or swipe sideways (or tap Send away) to kindly send the others on their way. The door opens by
    itself, and brothers sometimes walk out through the gate, so you have to wait a moment before sending the next visitor in. Each stage has its own rule, and
    someone in trouble always comes in. It practices listening, thinking about rules, timing, and being kind even when the answer is "not now". An early demo:
    the people and the gate are partly stand-ins until they're drawn. Nothing is collected; the best scores stay on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "porter-game"); } });

// each stage's stars and best score
const progressId = (st) => st.progress ?? `porter-${st.id}`;
const bestKey = (st) => (st.id === "sunday" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;
const gamesLink = `<p class="center games-link"><a class="btn small ghosty" href="${GAMES}">🎮 All the Angelio games</a></p>`;

const PORTER_SHORT = { porter: "Br. Porter", "sister-porter": "Sr. Porter", andre: "Br. André", old: "Old Br.", dog: "Dog", sister: "Portress", bell: "Bell", respected: "Respected" };

function viewHome() {
  const cur = myPorter();
  const dKey = todayKey(), dStage = dailyStage(STAGES, "porter", dKey), dRec = S.dailyRecord(dKey);
  app.innerHTML = `
    <section class="home-head">
      <div class="home-title-wrap">
        <h1 class="home-title">Monastery Porter</h1>
        <p class="home-sub">Welcome guests at the gate &amp; wait for brothers</p>
      </div>
      <span class="demo-chip">🧪 Demo</span>
    </section>
    <a class="daily-card" href="#/play/daily">
      <span class="daily-left">
        <span class="daily-badge">📅 Today's Challenge</span>
        <b class="daily-stage">${dStage.icon} ${esc(dStage.name)}</b>
        <span class="daily-date">${esc(todayLabel())}</span>
      </span>
      <span class="daily-right">
        <span>${dRec.plays ? `${"★".repeat(dRec.stars)}${"☆".repeat(3 - dRec.stars)} · ${dRec.best}` : "Same run for all"}</span>
        <span class="daily-cta">${dRec.plays ? "Retry" : "Play"} →</span>
      </span>
    </a>
    <section class="stages stages-4">
      ${STAGES.map((st, i) => {
        const open = isOpen(i, starsOf), p = S.progress(progressId(st)), best = S.settings()[bestKey(st)] || 0;
        const req = st.opensAfter ? stageById(st.opensAfter) : STAGES[i - 1];
        const tag = st.endless ? "Endless" : "1:40";
        const cls = st.endless ? " endless" : st.night ? " night" : "";
        return open
          ? `<a class="stage card${cls}" href="#/play/${st.id}">
              <div class="stage-top"><span class="stage-icon">${st.icon}</span><span class="stage-tag">${tag}</span></div>
              <b class="stage-name">${esc(st.name)}</b>
              <span class="stage-stars">${"★".repeat(p.stars)}${"☆".repeat(3 - p.stars)}${best ? ` · ${best}` : " · Ready"}</span></a>`
          : `<div class="stage card locked" aria-disabled="true">
              <div class="stage-top"><span class="stage-icon">🔒</span><span class="stage-tag">Locked</span></div>
              <b class="stage-name">${esc(st.name)}</b>
              <span class="stage-req">2★ ${esc(req.name)}</span></div>`;
      }).join("")}
    </section>
    <section class="char-dock" aria-label="Your porter">
      <div class="char-pills">
        ${PORTERS.map((p) => {
          const open = porterOpen(p, starsFor2), picked = cur.id === p.id;
          const short = PORTER_SHORT[p.id] ?? p.name;
          const req = p.opens ? `Get ${p.opens.stars === 3 ? "3★" : "2★"} in ${stageById(p.opens.stage).name} to meet ${p.nun ? "her" : "him"}.` : "";
          return open
            ? `<button type="button" class="char-pill${picked ? " picked" : ""}" data-porter="${p.id}" aria-pressed="${picked}"><span>${p.icon}</span><span>${esc(short)}</span></button>`
            : `<button type="button" class="char-pill locked" data-locked="1" data-locked-name="${esc(p.name)}" data-locked-req="${esc(req)}" title="${esc(req)}"><span>🔒</span><span>${esc(short)}</span></button>`;
        }).join("")}
      </div>
      <p class="char-perk"><b>${cur.icon} ${esc(cur.name)}:</b> ${esc(cur.blurb)}</p>
    </section>
    ${stickerBook({ byStars: true })}
    ${gamesLink}`;
  const perk = app.querySelector(".char-perk");
  app.querySelectorAll("[data-porter]").forEach((b) => b.addEventListener("click", () => {
    const p = porterById(b.dataset.porter);
    S.setSetting("porter", p.id);
    app.querySelectorAll("[data-porter]").forEach((x) => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-pressed", on); });
    app.querySelectorAll(".peek-locked").forEach((x) => x.classList.remove("peek-locked"));
    if (perk) perk.innerHTML = `<b>${p.icon} ${esc(p.name)}:</b> ${esc(p.blurb)}`;
    speak(p.say);
  }));
  app.querySelectorAll("[data-locked]").forEach((b) => b.addEventListener("click", () => {
    app.querySelectorAll(".peek-locked").forEach((x) => x.classList.toggle("peek-locked", x === b));
    if (perk) perk.innerHTML = `<b>🔒 ${esc(b.dataset.lockedName)}:</b> ${esc(b.dataset.lockedReq)}`;
    speak(b.dataset.lockedReq);
  }));
  speak("Someone is knocking at the monastery gate! Can you keep the gate? Pick a day.");
}
/** The stars on a stage, by its id (for who is open). */
const starsFor2 = (id) => starsOf(stageById(id));
/** The porter you picked (if open; else the first). */
function myPorter() { const p = porterById(S.settings().porter); return porterOpen(p, starsFor2) ? p : PORTERS[0]; }

// what to say: most lines once a round, never too close together
function talker(bubble) {
  let quietUntil = 0;
  const said = new Set();
  const talk = (text, { urgent = false, mascot = null } = {}) => {
    const now = performance.now();
    if (!urgent && now < quietUntil) return false;
    quietUntil = now + 2500;
    if (mascot) bubble.querySelector(".mascot").textContent = mascot;
    say(bubble, text);
    return true;
  };
  talk.once = (key, text, opts) => { if (said.has(key)) return; if (talk(text, opts)) said.add(key); };
  return talk;
}

function viewPlay(stageId) {
  // "Play" in the top bar (#/play, no stage): the day played last; #/play/daily: Today's Challenge
  const daily = stageId === "daily", dateKey = todayKey();
  const stage = daily ? dailyStage(STAGES, "porter", dateKey) : stageById(stageId ?? S.settings().lastStage), si = STAGES.indexOf(stage);
  if (!daily && !isOpen(si, starsOf)) { location.hash = "#/"; return; }
  if (!daily) S.setSetting("lastStage", stage.id);
  document.body.classList.add("in-game", "porter-game");
  const who = myPorter(), unlockedBefore = new Set(PORTERS.filter((p) => porterOpen(p, starsFor2)).map((p) => p.id));
  const clock0 = stage.endless ? "0:00" : `${Math.floor(stage.length / 60)}:${String(stage.length % 60).padStart(2, "0")}`;
  app.innerHTML = `
    <section class="porter-play${stage.night ? " night" : ""}">
      <canvas class="gate" aria-label="The monastery gate: swipe up or tap the gate to welcome, swipe sideways to send away"></canvas>
      <div class="pins" aria-hidden="true"></div>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="${stage.endless ? "How long you've kept the gate" : "Time left"}"><span class="clock-label">${daily ? "📅 " : ""}${stage.endless ? "🎉 Feast" : esc(stage.name)}</span> <b data-clock>${clock0}</b></div>
        <div class="score"><b data-score>0</b><span data-combo class="streak"></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      ${stage.endless ? `<div class="line-meter" data-line aria-label="People waiting at the gate (when the row fills, the day is over)"></div>` : ""}
      <div class="brother-chip" data-brother hidden></div>
      <div class="answers" data-answers>
        <button type="button" class="answer in" data-act="welcome"><span aria-hidden="true">👋</span> Welcome</button>
        <button type="button" class="answer later" data-act="away"><span aria-hidden="true">🙋</span> Send away</button>
        ${who.bell ? `<button type="button" class="answer bell" data-act="bell"><span aria-hidden="true">🔔</span> Bell</button>` : ""}
      </div>
      <div class="bubble porter-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">⛪</span><p class="say"></p></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card porter-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const $ = (s) => app.querySelector(s);
  const bubble = $(".porter-bubble"), popsEl = $(".pops"), pinsEl = $(".pins"), canvas = $("canvas.gate"), answers = $("[data-answers]");
  const talk = talker(bubble);
  let alive = true, raf = 0, gate = null, stopListeners = () => {};

  (async () => {
    if (!daily && !S.progress(progressId(stage)).plays) {
      const card = $(".porter-lesson"); card.hidden = false;
      await showLesson(card, {
        emoji: stage.icon, title: stage.name,
        rule: `Visitors knock at the gate, and the door opens by itself! <b>Swipe up</b> or <b>tap the gate</b> (or <b>👋 Welcome</b>) for people who belong — special guests earn extra points. <b>Swipe sideways</b> (or <b>🙋 Send away</b>) to kindly send everyone else on their way. Watch for <b>brothers walking out</b> through the gate and wait for them first! ${esc(stage.rule)} Someone in <b>trouble</b> always comes in!`,
        exampleHtml: `<p class="center porter-example">🥕 🎩 ➜ ⬆️👋 &nbsp; 🐐 🏺 ➜ ⬅️➡️🙋</p>`,
        voice: `Visitors knock at the gate, and the door opens by itself! Swipe up or tap the gate, or tap Welcome, for people who belong. Special guests earn extra points. Swipe sideways, or tap Send away, to kindly send everyone else on their way. Wait when a brother walks out through the gate so nobody bumps! ${stage.rule} Someone in trouble always comes in!`,
      });
      card.hidden = true;
      if (!alive) return;
    }
    say(bubble, "Opening the gate…", { speakText: false });
    const models = await loadModels(MODELS);
    if (!alive) return;
    gate = createGate(canvas, { models, night: stage.night, porter: who });
    const side = matchMedia("(orientation: landscape) and (max-height: 520px)"); // sideways: the bubble and answers are in the right column
    const fitView = () => gate?.resize({ top: ($(".hud")?.offsetHeight ?? 56) + 6, bottom: side.matches ? 10 : (bubble.offsetHeight || 60) + (answers.offsetHeight || 70) + 26 });
    fitView(); addEventListener("resize", fitView);
    const g = newGame({ seed: daily ? dailySeed("porter", dateKey) : Math.floor(Math.random() * 1e9), stage, porter: who });
    window.__porter = { game: g, gate }; // (for the browser tests)
    gate.sync(g, speedOf(g));
    talk(stage.rule, { urgent: true, mascot: stage.icon });

    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1300); };
    const popAt = (id, text, cls) => { const p = gate.headOf(id); if (p) pop(text, p.x, p.y - 30, cls); };
    const popDoor = (text, cls) => { const p = gate.screenOf(0, 14, 0); pop(text, p.x, p.y, cls); };
    // the button that WOULD have been right shakes, so a mistake always points at it
    const rumbleTimers = new Map();
    const rumble = (act) => {
      const b = $(`[data-act="${act}"]`); if (!b) return;
      b.classList.remove("rumble"); void b.offsetWidth; b.classList.add("rumble");
      clearTimeout(rumbleTimers.get(b)); rumbleTimers.set(b, setTimeout(() => b.classList.remove("rumble"), 1600));
    };

    // ── what happened: the rules say, the screen shows it. Nothing here waits for the voice: the next line cuts the last one off ──
    const handle = (events, dir = 1) => {
      for (const ev of events) {
        if (ev.type === "step-up") {
          talk(ev.v.line, { urgent: true, mascot: ev.v.emoji }); // the voice starts while they walk up
        } else if (ev.type === "knock") {
          sfx.tap(); setTimeout(() => alive && sfx.tap(), 200);
        } else if (ev.type === "brother-start") {
          gate.brotherOut(ev.b);
          if (!waiting(g)) talk.once("brother-out", `Brother is heading out to ${ev.b.place}. Wait for him to pass the gate!`, { mascot: ev.b.emoji });
        } else if (ev.type === "brother-cross") {
          gate.flash(ev.b.crossDur);
        } else if (ev.type === "decided") {
          const v = ev.v, crowded = !!(g.front || g.queue.length);
          if (ev.dog) { gate.dogChase(); sfx.chime(); popAt(v.id, `+${ev.points} 🐕`, "quick"); gate.sendOn(v.id, 1); say(bubble, "Good dog! Woof!", { speakText: false }); continue; }
          if (ev.how === "away") { sfx.whoosh(); gate.sendOn(v.id, dir); } else gate.enter(v.id, speedOf(g));
          if (ev.bumped && ev.brother) gate.bump(v.id, ev.brother.id);
          if (ev.forgiven) { popAt(v.id, "Forgiven! 💛", "good"); stop(); talk(`That's all right! ${v.why}`, { urgent: true, mascot: "💛" }); continue; }
          if (ev.correct && ev.bumped) {
            sfx.bonk(); popDoor("Oops! Bump! 💫", "bump"); stop();
            talk(vary("bump", BUMP_LINES), { urgent: true, mascot: "💫" });
          } else if (ev.correct) {
            ev.how === "away" ? sfx.chime() : sfx.win();
            if (ev.special) gate.flash(1.2);
            popAt(v.id, `+${ev.points}${ev.mult > 1 ? ` ×${ev.mult}` : ""}${ev.quick ? " ⚡" : ""}`, ev.mult > 1 || ev.special ? "good" : ev.quick ? "quick" : "");
            if (ev.special) talk(v.reply, { urgent: true, mascot: v.emoji });
            else if (!crowded) talk(ev.how === "away" ? v.later : vary("welcome", WELCOMES), { urgent: true, mascot: "⛪" });
            else { stop(); say(bubble, ev.how === "away" ? v.later : vary("welcome", WELCOMES), { speakText: false }); } // busy: show it, don't wait for it
          } else {
            sfx.oops(); popAt(v.id, `${ev.points}`, "oops"); stop();
            rumble(v.answer === "away" ? "away" : "welcome"); // the button that would have been right
            if (ev.how === "welcome" && v.answer === "away") { gate.alarm(1.5); popDoor("✗", "bad"); } // someone who doesn't belong walked in
            talk(`${vary("oops", ["Oh dear! Not quite.", "Hmm, not this time.", "Oops, that wasn't it."])} ${v.why}`, { urgent: true, mascot: "⛪" });
          }
        } else if (ev.type === "leave") {
          gate.giveUp(ev.v.id); sfx.oops(); popAt(ev.v.id, "Gave up", "oops");
          if (ev.v.answer !== "away") rumble("welcome"); // they should have come in: show the button
          talk(vary("gaveup", ["They got tired of waiting and went home. That's okay!", "Oh, they went home. Try to answer a little faster!"]), { urgent: true, mascot: "⛪" });
        } else if (ev.type === "bell") {
          sfx.win(); popDoor("🔔 Ding, dong!", "good"); stop(); talk("Ding, dong! Everyone is patient again.", { urgent: true, mascot: "🔔" });
        } else if (ev.type === "end") ended = true;
      }
    };
    // ── one quick move per person: tap Welcome / Send away, swipe up / tap gate, swipe sideways ──
    const act = (what, dir = 1) => {
      if (ended || g.over) return;
      handle(what === "welcome" ? welcome(g) : what === "bell" ? ringBell(g) : sendAway(g), dir);
    };
    answers.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) act(b.dataset.act); });
    const keys = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if ((k === " " || k === "enter") && e.target.closest("button, a")) return;
      if (k === "w" || k === "arrowup" || k === " " || k === "enter") { if (k === " ") e.preventDefault(); act("welcome"); }
      else if (k === "s" || k === "arrowleft") act("away", -1);
      else if (k === "arrowright") act("away", 1);
      else if (k === "b") act("bell");
    };
    addEventListener("keydown", keys);
    let down = null;
    canvas.addEventListener("pointerdown", (e) => { if (!ended && !g.over) down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener("pointercancel", () => { down = null; });
    canvas.addEventListener("pointerup", (e) => {
      if (!down || ended || g.over) { down = null; return; }
      const down0 = down, dx = e.clientX - down0.x, dy = e.clientY - down0.y;
      down = null;
      const at = waiting(g);
      if (!at) return;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
        if (gate.isGate(e.clientX, e.clientY)) act("welcome");
        return;
      }
      if (Math.abs(dx) >= 28 && Math.abs(dx) >= Math.abs(dy)) {
        if (who.dog && g.t < g.dogUntil) { sfx.tap(); popAt(at.id, "Woof! 🐕", ""); return; }
        act("away", dx < 0 ? -1 : 1);
        return;
      }
      if (dy <= -28 && Math.abs(dy) > Math.abs(dx)) { act("welcome"); return; }
      if (dy >= 28 && Math.abs(dy) > Math.abs(dx) && (gate.isGate(down0.x, down0.y) || gate.isGate(e.clientX, e.clientY))) act("welcome");
    });
    stopListeners = () => { removeEventListener("keydown", keys); removeEventListener("resize", fitView); };

    // ── the clock and what's on screen ──
    let last = performance.now(), ended = false;
    const pins = new Map(); // actor id → {el, pic, bar}
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        const spd = speedOf(g);
        handle(tick(g, dt));
        gate.sync(g, spd);
        const secs = stage.endless ? Math.floor(g.t) : Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = Math.round(g.score);
        const m = multOf(g); $("[data-combo]").textContent = m > 1 ? `×${m}` : "";
        const at = waiting(g);
        for (const b of answers.querySelectorAll('[data-act="welcome"], [data-act="away"]')) b.disabled = !at;
        if (who.dog) { // the dog is barking: Send away says so (not just grayed out) for a moment
          const barking = g.t < g.dogUntil, aw = answers.querySelector('[data-act="away"]');
          if (barking) aw.disabled = true;
          if (aw.classList.contains("barking") !== barking) { aw.classList.toggle("barking", barking); aw.innerHTML = barking ? `<span aria-hidden="true">🐕</span> Woof!` : `<span aria-hidden="true">🙋</span> Send away`; }
        }
        const bb = answers.querySelector('[data-act="bell"]'); if (bb) bb.disabled = g.bellUsed;
        answers.classList.toggle("ready", !!at);
        const crossing = brotherInGate(g);
        $('[data-act="welcome"]').classList.toggle("wait-out", !!(crossing && !who.noBump));
        const bc = $("[data-brother]");
        bc.hidden = !crossing;
        if (crossing) bc.textContent = `${crossing.emoji} Brother heading to ${crossing.place}…`;
        const lm = $("[data-line]");
        if (lm) { const n = Math.min(g.queue.length, stage.maxLine), html = `<span>🚪</span>${"<i class=on></i>".repeat(n)}${"<i></i>".repeat(stage.maxLine - n)}`; if (lm.innerHTML !== html) lm.innerHTML = html; lm.classList.toggle("danger", n >= stage.maxLine - 2); }
        // the picture over each visitor's head, each outgoing brother, and (the one at the gate) how long they'll wait
        const seen = new Set();
        const getPin = (id) => {
          let p = pins.get(id);
          if (!p) { const el = document.createElement("div"); el.className = "pin"; el.innerHTML = `<span class="pin-pic"></span><span class="patience"><i></i></span>`; pinsEl.append(el); p = { el, pic: el.firstChild, bar: el.querySelector("i") }; pins.set(id, p); }
          return p;
        };
        for (const v of [...g.queue, g.front]) {
          if (!v || !["line", "arriving", "waiting"].includes(v.state)) continue;
          const at2 = gate.headOf(v.id); if (!at2) continue;
          seen.add(v.id);
          const p = getPin(v.id);
          if (p.pic.textContent !== v.emoji) p.pic.textContent = v.emoji;
          p.el.style.left = at2.x + "px"; p.el.style.top = at2.y + "px";
          const front = v === g.front && v.state === "waiting", f = v.patience / v.max;
          p.el.classList.remove("out", "crossing");
          p.el.classList.toggle("front", front);
          if (front) { p.bar.style.width = `${Math.max(0, f * 100)}%`; p.bar.style.background = f > 0.55 ? "#2fa866" : f > 0.28 ? "#e3b341" : "#e0453f"; }
        }
        for (const b of g.outgoing) {
          const at2 = gate.headOf(b.id); if (!at2) continue;
          seen.add(b.id);
          const p = getPin(b.id);
          const label = `${b.emoji} ↗`;
          if (p.pic.textContent !== label) p.pic.textContent = label;
          p.el.style.left = at2.x + "px"; p.el.style.top = at2.y + "px";
          p.el.classList.remove("front");
          p.el.classList.add("out");
          p.el.classList.toggle("crossing", b.state === "crossing");
        }
        for (const [id, p] of pins) if (!seen.has(id)) { p.el.remove(); pins.delete(id); }
        if (ended) finish();
      }
      gate.update(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    async function finish() {
      answers.hidden = true; pinsEl.replaceChildren(); $("[data-brother]").hidden = true;
      say(bubble, stage.bell);
      sfx.chime();
      await new Promise((r) => setTimeout(r, 3800));
      if (!alive) return;
      const score = Math.round(g.score), stars = starsFor(g), next = STAGES[si + 1];
      let newBest, bestLine, opens = !daily && next && !next.endless && Math.max(stars, starsOf(stage)) >= 2;
      if (daily) {
        const dr = S.saveDaily(dateKey, score, stars);
        newBest = dr.newBest;
        bestLine = `<p class="final-score">📅 Today (${esc(todayLabel())}) · <b>${score}</b>${dr.newBest ? " · new daily best!" : ` · today's best: ${dr.best}`}</p>`;
      } else {
        const old = S.settings()[bestKey(stage)] || 0;
        const best = Math.max(old, score);
        newBest = score > old;
        S.setSetting(bestKey(stage), best);
        bestLine = `<p class="final-score">You scored <b>${score}</b>${newBest ? " · a new best!" : ` · your best: ${best}`}</p>`;
      }
      cancelAnimationFrame(raf); gate.dispose(); gate = null; stopListeners();
      document.body.classList.remove("porter-game");
      showFinish(app, { id: daily ? `daily-${dateKey}` : progressId(stage), stars, mistakes: g.wrong, byStars: true,
        title: daily ? (newBest ? "New daily best!" : "Today's Challenge!") : newBest ? "A new best!" : stage.endless ? "What a feast day!" : "The gate is kept!",
        done: `You scored ${score}.`, again: daily ? "#/play/daily" : `#/play/${stage.id}`, onAgain: route, next: opens ? { href: `#/play/${next.id}`, label: `${next.icon} ${next.name}` } : null });
      const fresh = PORTERS.filter((p) => porterOpen(p, starsFor2) && !unlockedBefore.has(p.id));
      if (fresh.length) app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="finish-unlock">🎉 You can play as ${fresh.map((p) => `<b>${esc(p.name)}</b>`).join(" and ")} now!</p>`);
      const openPorters = PORTERS.filter((p) => porterOpen(p, starsFor2)), pickedId = myPorter().id;
      app.querySelector(".finish .row.center")?.insertAdjacentHTML("afterend", `
        <div class="finish-pick">
          <p class="finish-pick-label">Pick your porter for next time:</p>
          <div class="finish-picks">
            ${openPorters.map((p) => `<button type="button" class="pick-chip${p.id === pickedId ? " picked" : ""}" data-pick="${p.id}" aria-pressed="${p.id === pickedId}"><span>${p.icon}</span><b>${esc(p.name)}</b>${!unlockedBefore.has(p.id) ? `<span class="pick-new">✨ New!</span>` : ""}</button>`).join("")}
          </div>
        </div>`);
      app.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
        const p = porterById(b.dataset.pick); S.setSetting("porter", p.id);
        app.querySelectorAll("[data-pick]").forEach((x) => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-pressed", String(on)); });
        sfx.select(); speak(p.say);
      }));
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `${bestLine}
        <p class="muted">${stage.endless ? `kept the gate ${Math.floor(g.t / 60)}:${String(Math.floor(g.t % 60)).padStart(2, "0")} · ` : ""}${g.welcomed + g.greeted} welcomed · ${g.sentOn} sent on their way · best combo ${g.bestStreak} · ${g.wrong} not quite right${g.bumps ? ` · ${g.bumps} ${g.bumps === 1 ? "bump" : "bumps"}` : ""}${g.missed ? ` · ${g.missed} gave up waiting` : ""}${stars < 3 ? ` · ${stage.star3} for three stars` : ""}</p>`);
      // the finish screen's "All Angelio games" goes to the games page here, not the home page
      const all = app.querySelector(".finish .finish-links a[href=\"https://angelio.org/\"]"); if (all) all.href = GAMES;
    }
  })();
  return () => { alive = false; cancelAnimationFrame(raf); gate?.dispose(); gate = null; stopListeners(); };
}

installClickSounds();
jingleOnce("porter", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
