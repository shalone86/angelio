// Monastery Porter: keep the monastery door (his idea: ROADMAP.md, "Monastery Porter"). A demo: the gate is voxel
// (gate.js) with his people where he has made them and stand-ins for the rest; the rules are in porter.js, the stages
// (Sunday Mass, Guest Day, the Great Silence and the endless Feast Day Crowd) in stages.js and the visitors in visitors.js.
//
// A visitor knocks and says who they are (read aloud, with a picture over their head). 🚪 Door opens or closes the door
// (people who belong walk in; a draft costs points if it's open too long), 👋 Welcome greets special guests, 🙋 Send away
// kindly sends the others on their way. Someone in trouble always comes in. Right answers in a row build a combo.
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("porter:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { showLesson } from "./kit/lesson.js";
import { vary } from "./kit/vary.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { newGame, tick, toggleDoor, greet, sendAway, ringBell, waiting, starsFor, multOf, FREE_OPEN } from "./porter.js";
import { PORTERS, porterById, porterOpen } from "./porters.js";
import { WELCOMES } from "./visitors.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { createGate, loadModels, MODELS } from "./gate.js";

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/"; // all the Angelio games (angelio.org/games/)
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Monastery Porter</b> is a little game about keeping the door of a monastery, the way St. Benedict's
    porter did: he answered every knock with "Thanks be to God." Visitors knock and tell you who they are. Open the door for people who belong, greet special
    guests, or kindly send the others on their way. Each stage has its own rule (who the brothers are expecting), and someone in trouble always comes in.
    It practices listening, thinking about rules, and being kind even when the answer is "not now". An early demo: the people
    and the gate are partly stand-ins until they're drawn. Nothing is collected; the best scores stay on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "porter-game"); } });

// each stage's stars and best score
const progressId = (st) => st.progress ?? `porter-${st.id}`;
const bestKey = (st) => (st.id === "sunday" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;
const gamesLink = `<p class="center games-link"><a class="btn" href="${GAMES}">🎮 All the Angelio games</a></p>`;

function viewHome() {
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Monastery Porter</h1>
      <p class="lede">Someone is knocking at the monastery door! Listen to who they are, then open the door, give special guests a proper welcome, or kindly send people on their way.</p>
      <p class="demo-chip">🧪 Demo: some stand-ins for now</p>
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
    <h2 class="center porters-title">Your porter</h2>
    <section class="porters">
      ${PORTERS.map((p) => {
        const open = porterOpen(p, starsFor2), picked = myPorter().id === p.id;
        return open
          ? `<button type="button" class="porter-pick card${picked ? " picked" : ""}" data-porter="${p.id}" aria-pressed="${picked}"><span class="stage-icon">${p.icon}</span><b>${esc(p.name)}</b><span class="muted">${esc(p.blurb)}</span>${picked ? `<span class="picked-tag">✓ Playing</span>` : ""}</button>`
          : `<div class="porter-pick card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(p.name)}</b><span class="muted">Get ${p.opens.stars === 3 ? "three" : "two"} stars in ${esc(stageById(p.opens.stage).name)} to meet ${/^(sister|bell|respected)$/.test(p.id) ? "her" : "him"}.</span></div>`;
      }).join("")}
    </section>
    ${stickerBook()}
    ${gamesLink}`;
  app.querySelectorAll("[data-porter]").forEach((b) => b.addEventListener("click", () => { const p = porterById(b.dataset.porter); S.setSetting("porter", p.id); viewHome(); speak(p.say); }));
  speak("Someone is knocking at the monastery door! Can you keep the door? Pick a day.");
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
  // "Play" in the top bar (#/play, no stage): the day played last
  const stage = stageById(stageId ?? S.settings().lastStage), si = STAGES.indexOf(stage);
  if (!isOpen(si, starsOf)) { location.hash = "#/"; return; }
  S.setSetting("lastStage", stage.id);
  document.body.classList.add("in-game", "porter-game");
  const who = myPorter(), unlockedBefore = new Set(PORTERS.filter((p) => porterOpen(p, starsFor2)).map((p) => p.id));
  const clock0 = stage.endless ? "0:00" : `${Math.floor(stage.length / 60)}:${String(stage.length % 60).padStart(2, "0")}`;
  app.innerHTML = `
    <section class="porter-play${stage.night ? " night" : ""}">
      <canvas class="gate" aria-label="The monastery gate: visitors line up on the path outside"></canvas>
      <div class="pins" aria-hidden="true"></div>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="${stage.endless ? "How long you've kept the door" : "Time left"}"><span class="clock-label">${stage.endless ? "🎉 Feast" : esc(stage.name)}</span> <b data-clock>${clock0}</b></div>
        <div class="score"><b data-score>0</b><span data-combo class="streak"></span></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      ${stage.endless ? `<div class="line-meter" data-line aria-label="People waiting at the gate (when the row fills, the day is over)"></div>` : ""}
      <div class="draft-chip" data-draft hidden>🍃 Draft! Close the door!</div>
      <div class="answers" data-answers>
        <button type="button" class="answer door" data-act="door" aria-pressed="false"><span aria-hidden="true">🚪</span> <b data-door-label>Open door</b></button>
        <button type="button" class="answer in" data-act="greet"><span aria-hidden="true">👋</span> Welcome</button>
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
  let alive = true, raf = 0, gate = null, stopKeys = () => {};

  (async () => {
    if (!S.progress(progressId(stage)).plays) {
      const card = $(".porter-lesson"); card.hidden = false;
      await showLesson(card, {
        emoji: stage.icon, title: stage.name,
        rule: `Visitors knock at the gate. <b>🚪 Door</b> opens it, and people who belong walk in (leave it open too long and a draft costs points!). <b>👋 Welcome</b> is for special guests, like a bishop. <b>🙋 Send away</b> kindly sends the others on their way. ${esc(stage.rule)} Someone in <b>trouble</b> always comes in!`,
        exampleHtml: `<p class="center porter-example">🥕 ➜ 🚪 &nbsp; 🎩 ➜ 👋 &nbsp; 🐐 ➜ 🙋</p>`,
        voice: `Visitors knock at the gate! The Door button opens the door, and people who belong walk in. But if you leave it open too long, a draft costs you points. Welcome is for special guests, like a bishop. Send away kindly sends everyone else on their way. ${stage.rule} Someone in trouble always comes in!`,
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
    const g = newGame({ seed: Math.floor(Math.random() * 1e9), stage, porter: who });
    window.__porter = { game: g, gate }; // (for the browser tests)
    gate.sync(g);
    talk(stage.rule, { urgent: true, mascot: stage.icon });

    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1300); };
    const popAt = (id, text, cls) => { const p = gate.headOf(id); if (p) pop(text, p.x, p.y - 30, cls); };
    const popDoor = (text, cls) => { const p = gate.screenOf(0, 14, 0); pop(text, p.x, p.y, cls); };
    const doorBtn = $('[data-act="door"]'), doorLabel = $("[data-door-label]");
    let lastSpoken = 0;

    // ── what happened: the rules say, the screen shows it. Nothing here waits for the voice: the next line cuts the last one off ──
    const handle = (events) => {
      for (const ev of events) {
        if (ev.type === "step-up") {
          talk(ev.v.line, { urgent: true, mascot: ev.v.emoji }); // the voice starts while they walk up
        } else if (ev.type === "knock") {
          sfx.tap(); setTimeout(() => alive && sfx.tap(), 200);
        } else if (ev.type === "door") {
          gate.setDoor(ev.open); (sfx.whoosh ?? sfx.tap)();
          doorBtn.setAttribute("aria-pressed", String(ev.open)); doorBtn.classList.toggle("open", ev.open); doorLabel.textContent = ev.open ? "Close door" : "Open door";
        } else if (ev.type === "decided") {
          const v = ev.v, crowded = !!(g.front || g.queue.length);
          if (ev.dog) { gate.dogChase(); sfx.chime(); popAt(v.id, `+${ev.points} 🐕`, "quick"); gate.sendOn(v.id); say(bubble, "Good dog! Woof!", { speakText: false }); continue; }
          if (ev.how === "away") gate.sendOn(v.id); else gate.enter(v.id);
          if (ev.forgiven) { popAt(v.id, "Forgiven! 💛", "good"); stop(); talk(`That's all right! ${v.why}`, { urgent: true, mascot: "💛" }); continue; }
          if (ev.how === "greet" && !ev.neutral && ev.correct) gate.flash(1.2);
          if (ev.correct && !ev.neutral) {
            ev.how === "away" ? sfx.chime() : sfx.win();
            popAt(v.id, `+${ev.points}${ev.mult > 1 ? ` ×${ev.mult}` : ""}${ev.quick ? " ⚡" : ""}`, ev.mult > 1 || ev.how === "greet" ? "good" : ev.quick ? "quick" : "");
            if (ev.how === "greet") talk(v.reply, { urgent: true, mascot: v.emoji });
            else if (!crowded) talk(ev.how === "away" ? v.later : vary("welcome", WELCOMES), { urgent: true, mascot: "⛪" });
            else { stop(); say(bubble, ev.how === "away" ? v.later : vary("welcome", WELCOMES), { speakText: false }); } // busy: show it, don't wait for it
          } else if (ev.neutral) {
            popAt(v.id, "Just the door was enough!", "oops"); stop();
          } else {
            sfx.oops(); popAt(v.id, `${ev.points}`, "oops"); stop();
            talk(`${vary("oops", ["Oh dear! Not quite.", "Hmm, not this time.", "Oops, that wasn't it."])} ${v.why}`, { urgent: true, mascot: "⛪" });
          }
        } else if (ev.type === "leave") {
          gate.giveUp(ev.v.id); sfx.oops(); popAt(ev.v.id, "Gave up", "oops");
          talk(vary("gaveup", ["They got tired of waiting and went home. That's okay!", "Oh, they went home. Try to answer a little faster!"]), { urgent: true, mascot: "⛪" });
        } else if (ev.type === "bell") {
          sfx.win(); popDoor("🔔 Ding, dong!", "good"); stop(); talk("Ding, dong! Everyone is patient again.", { urgent: true, mascot: "🔔" });
        } else if (ev.type === "draft") {
          popDoor(`−${ev.points} 🍃`, "oops"); sfx.oops();
        } else if (ev.type === "end") ended = true;
      }
    };
    // ── your three buttons ──
    const act = (what) => { if (ended) return; handle(what === "door" ? toggleDoor(g) : what === "greet" ? greet(g) : what === "bell" ? ringBell(g) : sendAway(g)); };
    answers.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && !b.disabled) act(b.dataset.act); });
    const keys = (e) => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === " " || k === "d" || k === "arrowleft") act("door"); else if (k === "w" || k === "g" || k === "arrowdown") act("greet"); else if (k === "s" || k === "arrowright") act("away"); else if (k === "b") act("bell"); };
    addEventListener("keydown", keys);
    stopKeys = () => removeEventListener("keydown", keys);

    // ── the clock and what's on screen ──
    let last = performance.now(), ended = false;
    const pins = new Map(); // visitor id → {el, pic, bar}
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        handle(tick(g, dt));
        gate.sync(g);
        const secs = stage.endless ? Math.floor(g.t) : Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = Math.round(g.score);
        const m = multOf(g); $("[data-combo]").textContent = m > 1 ? `×${m}` : "";
        const at = waiting(g);
        for (const b of answers.querySelectorAll('[data-act="greet"], [data-act="away"]')) b.disabled = !at;
        if (who.dog) { // the dog is barking: Send away says so (not just grayed out) for a moment
          const barking = g.t < g.dogUntil, aw = answers.querySelector('[data-act="away"]');
          if (barking) aw.disabled = true;
          if (aw.classList.contains("barking") !== barking) { aw.classList.toggle("barking", barking); aw.innerHTML = barking ? `<span aria-hidden="true">🐕</span> Woof!` : `<span aria-hidden="true">🙋</span> Send away`; }
        }
        const bb = answers.querySelector('[data-act="bell"]'); if (bb) bb.disabled = g.bellUsed;
        answers.classList.toggle("ready", !!at);
        const drafty = g.door && g.doorOpenFor > FREE_OPEN;
        $("[data-draft]").hidden = !drafty; gate.setDraft(drafty);
        const lm = $("[data-line]");
        if (lm) { const n = Math.min(g.queue.length, stage.maxLine), html = `<span>🚪</span>${"<i class=on></i>".repeat(n)}${"<i></i>".repeat(stage.maxLine - n)}`; if (lm.innerHTML !== html) lm.innerHTML = html; lm.classList.toggle("danger", n >= stage.maxLine - 2); }
        // the picture over each visitor's head, and (the one at the door) how long they'll wait
        const seen = new Set();
        for (const v of [...g.queue, g.front]) {
          if (!v || !["line", "arriving", "waiting"].includes(v.state)) continue;
          const at2 = gate.headOf(v.id); if (!at2) continue;
          seen.add(v.id);
          let p = pins.get(v.id);
          if (!p) { const el = document.createElement("div"); el.className = "pin"; el.innerHTML = `<span class="pin-pic"></span><span class="patience"><i></i></span>`; pinsEl.append(el); p = { el, pic: el.firstChild, bar: el.querySelector("i") }; p.pic.textContent = v.emoji; pins.set(v.id, p); }
          p.el.style.left = at2.x + "px"; p.el.style.top = at2.y + "px";
          const front = v === g.front && v.state === "waiting", f = v.patience / v.max;
          p.el.classList.toggle("front", front);
          if (front) { p.bar.style.width = `${Math.max(0, f * 100)}%`; p.bar.style.background = f > 0.55 ? "#2fa866" : f > 0.28 ? "#e3b341" : "#e0453f"; }
        }
        for (const [id, p] of pins) if (!seen.has(id)) { p.el.remove(); pins.delete(id); }
        if (ended) finish();
      }
      gate.update(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    async function finish() {
      answers.hidden = true; pinsEl.replaceChildren(); $("[data-draft]").hidden = true; gate.setDoor(false);
      say(bubble, stage.bell);
      sfx.chime();
      await new Promise((r) => setTimeout(r, 3800));
      if (!alive) return;
      const old = S.settings()[bestKey(stage)] || 0, score = Math.round(g.score), stars = starsFor(g), newBest = score > old;
      S.setSetting(bestKey(stage), Math.max(old, score));
      cancelAnimationFrame(raf); gate.dispose(); gate = null; stopKeys();
      document.body.classList.remove("porter-game");
      const next = STAGES[si + 1], opens = next && !next.endless && Math.max(stars, starsOf(stage)) >= 2;
      showFinish(app, { id: progressId(stage), stars, mistakes: g.wrong, title: newBest ? "A new best!" : stage.endless ? "What a feast day!" : "The door is kept!",
        done: `You scored ${score}.`, again: `#/play/${stage.id}`, onAgain: route, next: opens ? { href: `#/play/${next.id}`, label: `${next.icon} ${next.name}` } : null });
      const fresh = PORTERS.filter((p) => porterOpen(p, starsFor2) && !unlockedBefore.has(p.id));
      if (fresh.length) app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="final-score">🎉 You can play as ${fresh.map((p) => `<b>${esc(p.name)}</b>`).join(" and ")} now!</p>`);
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="final-score">You scored <b>${score}</b>${newBest ? " · a new best!" : ` · your best: ${Math.max(old, score)}`}</p>
        <p class="muted">${stage.endless ? `kept the door ${Math.floor(g.t / 60)}:${String(Math.floor(g.t % 60)).padStart(2, "0")} · ` : ""}${g.welcomed} came in · ${g.greeted} greeted · ${g.sentOn} sent on their way · best combo ${g.bestStreak} · ${g.wrong} not quite right${g.missed ? ` · ${g.missed} gave up waiting` : ""}${stars < 3 ? ` · ${stage.star3} for three stars` : ""}</p>`);
      // the finish screen's "All Angelio games" goes to the games page here, not the home page
      const all = app.querySelector(".finish .finish-links a[href=\"https://angelio.org/\"]"); if (all) all.href = GAMES;
    }
  })();
  return () => { alive = false; cancelAnimationFrame(raf); gate?.dispose(); gate = null; stopKeys(); };
}

installClickSounds();
jingleOnce("porter", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
