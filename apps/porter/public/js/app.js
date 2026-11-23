// Monastery Porter: keep the monastery door (his idea: ROADMAP.md, "Monastery Porter"). A demo: the gate is voxel
// (gate.js) with his people where he has made them and stand-ins for the rest; the rules are in porter.js, the stages
// (Sunday Mass, Guest Day, the Great Silence) in stages.js and the visitors in visitors.js.
//
// A visitor knocks and says who they are (read aloud, with a picture over their head). Tap 👋 Welcome (they come in) or
// 🙋 Come back later (they're kindly sent on their way). Someone in trouble always comes in. Quick right answers score more.
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
import { newGame, tick, decide, waiting, starsFor } from "./porter.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { createGate, loadModels, MODELS } from "./gate.js";

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/"; // all the Angelio games (angelio.org/games/)
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Monastery Porter</b> is a little game about keeping the door of a monastery, the way St. Benedict's
    porter did: he answered every knock with "Thanks be to God." Visitors knock and tell you who they are. Welcome them in, or kindly
    ask them to come back later. Each stage has its own rule (who the brothers are expecting), and someone in trouble always comes in.
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
      <p class="lede">Someone is knocking at the monastery door! Listen to who they are, then welcome them in, or kindly ask them to come back later.</p>
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
    ${stickerBook()}
    ${gamesLink}`;
  speak("Someone is knocking at the monastery door! Can you keep the door? Pick a day.");
}

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
  app.innerHTML = `
    <section class="porter-play${stage.night ? " night" : ""}">
      <canvas class="gate" aria-label="The monastery gate: visitors line up on the path outside"></canvas>
      <div class="pins" aria-hidden="true"></div>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="Time left"><span class="clock-label">${esc(stage.name)}</span> <b data-clock>${Math.round(stage.length / 60 * 10) / 10 | 0}:00</b></div>
        <div class="score"><b data-score>0</b></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="answers" data-answers>
        <button type="button" class="answer in" data-choice="in"><span aria-hidden="true">👋</span> Welcome</button>
        <button type="button" class="answer later" data-choice="later"><span aria-hidden="true">🙋</span> Come back later</button>
      </div>
      <div class="bubble porter-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">⛪</span><p class="say"></p></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card porter-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const $ = (s) => app.querySelector(s);
  const bubble = $(".porter-bubble"), popsEl = $(".pops"), pinsEl = $(".pins"), canvas = $("canvas.gate"), answers = $("[data-answers]");
  const talk = talker(bubble);
  let alive = true, raf = 0, gate = null;

  (async () => {
    if (!S.progress(progressId(stage)).plays) {
      const card = $(".porter-lesson"); card.hidden = false;
      await showLesson(card, {
        emoji: stage.icon, title: stage.name,
        rule: `Visitors knock at the door. Tap <b>👋 Welcome</b> to let them in, or <b>🙋 Come back later</b>. ${esc(stage.rule)} Someone in <b>trouble</b> always comes in!`,
        exampleHtml: `<p class="center porter-example">🐐 ➜ 🙋 &nbsp; · &nbsp; 🤕 ➜ 👋</p>`,
        voice: `Someone is knocking at the monastery door! Listen to who it is. Tap Welcome to let them in, or Come back later. ${stage.rule} Someone in trouble always comes in!`,
      });
      card.hidden = true;
      if (!alive) return;
    }
    say(bubble, "Opening the gate…", { speakText: false });
    const models = await loadModels(MODELS);
    if (!alive) return;
    gate = createGate(canvas, { models, night: stage.night });
    const side = matchMedia("(orientation: landscape) and (max-height: 520px)"); // sideways: the bubble and answers are in the right column
    const fitView = () => gate?.resize({ top: ($(".hud")?.offsetHeight ?? 56) + 6, bottom: side.matches ? 10 : (bubble.offsetHeight || 60) + (answers.offsetHeight || 70) + 26 });
    fitView(); addEventListener("resize", fitView);
    const g = newGame({ seed: Math.floor(Math.random() * 1e9), stage });
    window.__porter = { game: g, gate }; // (for the browser tests)
    gate.sync(g);
    talk(stage.say, { urgent: true, mascot: stage.icon });

    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1300); };
    const popAt = (id, text, cls) => { const p = gate.headOf(id); if (p) pop(text, p.x, p.y - 30, cls); };

    // ── your answer ──
    let busy = false;
    const choose = (choice) => {
      const r = decide(g, choice);
      if (r.type !== "decided") return;
      const v = r.v;
      if (choice === "in") gate.welcome(v.id); else gate.sendOn(v.id);
      if (r.correct) {
        sfx.win();
        popAt(v.id, `+${r.points}${r.quick ? " ⚡" : ""}`, r.quick ? "quick" : "good");
        talk(choice === "in" ? vary("welcome", ["Thanks be to God! Welcome, friend!", "Come in, come in! Peace to you!", "Thanks be to God! The brothers will be glad to see you!"]) : v.later, { urgent: true, mascot: "⛪" });
      } else {
        sfx.oops();
        popAt(v.id, "Oops!", "oops");
        talk(`${vary("oops", ["Oh dear! Not quite.", "Hmm, not this time.", "Oops, that wasn't it."])} ${v.why}`, { urgent: true, mascot: "⛪" });
      }
      answers.dataset.picked = choice; setTimeout(() => { delete answers.dataset.picked; }, 600);
    };
    answers.addEventListener("click", (e) => { const b = e.target.closest("[data-choice]"); if (b && !b.disabled) choose(b.dataset.choice); });
    const keys = (e) => { if (e.key === "ArrowLeft" || e.key === "w") choose("in"); else if (e.key === "ArrowRight" || e.key === "l") choose("later"); };
    addEventListener("keydown", keys);

    // ── the clock, the knocking, and what's on screen ──
    let last = performance.now(), ended = false;
    const pins = new Map(); // visitor id → {el, bar}
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        for (const ev of tick(g, dt)) {
          if (ev.type === "knock") {
            sfx.tap(); setTimeout(() => alive && sfx.tap(), 260);
            talk(ev.v.line, { urgent: true, mascot: ev.v.emoji });
          } else if (ev.type === "leave") {
            gate.giveUp(ev.v.id); sfx.oops(); popAt(ev.v.id, "Gave up", "oops");
            talk(vary("gaveup", ["They got tired of waiting and went home. That's okay!", "Oh, they went home. Try to answer a little faster!"]), { urgent: true, mascot: "⛪" });
          } else if (ev.type === "end") ended = true;
        }
        gate.sync(g);
        const secs = Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = g.score;
        const at = waiting(g);
        for (const b of answers.querySelectorAll("button")) b.disabled = !at;
        answers.classList.toggle("ready", !!at);
        // the picture over each visitor's head, and the front one's patience
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
    stopKeys = () => removeEventListener("keydown", keys);

    async function finish() {
      answers.hidden = true; pinsEl.replaceChildren();
      say(bubble, stage.bell);
      sfx.chime();
      await new Promise((r) => setTimeout(r, 3800));
      if (!alive) return;
      const old = S.settings()[bestKey(stage)] || 0, stars = starsFor(g), newBest = g.score > old;
      S.setSetting(bestKey(stage), Math.max(old, g.score));
      cancelAnimationFrame(raf); gate.dispose(); gate = null; stopKeys();
      document.body.classList.remove("porter-game");
      const next = STAGES[si + 1], opens = next && Math.max(stars, starsOf(stage)) >= 2;
      showFinish(app, { id: progressId(stage), stars, mistakes: g.wrong, title: newBest ? "A new best!" : "The door is kept!",
        done: `You scored ${g.score}.`, again: `#/play/${stage.id}`, onAgain: route, next: opens ? { href: `#/play/${next.id}`, label: `${next.icon} ${next.name}` } : null });
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="final-score">You scored <b>${g.score}</b>${newBest ? " · a new best!" : ` · your best: ${Math.max(old, g.score)}`}</p>
        <p class="muted">${g.welcomed} welcomed · ${g.sentOn} sent on their way · ${g.wrong} not quite right${g.missed ? ` · ${g.missed} gave up waiting` : ""}${stars < 3 ? ` · ${stage.star3} for three stars` : ""}</p>`);
      // the finish screen's "All Angelio games" goes to the games page here, not the home page
      const all = app.querySelector(".finish .finish-links a[href=\"https://angelio.org/\"]"); if (all) all.href = GAMES;
    }
  })();
  let stopKeys = () => {};
  return () => { alive = false; cancelAnimationFrame(raf); gate?.dispose(); gate = null; stopKeys(); };
}

installClickSounds();
jingleOnce("porter", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
