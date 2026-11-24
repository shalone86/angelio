// Mass Usher: seat the families arriving before Mass (his notes: ROADMAP.md, "Mass Usher"). A demo: the church is
// voxel (nave.js) with his models where they exist and stand-ins for the rest. The rules are in usher.js, the stages
// (Sunday Mass, the Divine Liturgy, Christmas, Pascha, and the endless Adoration at Night) in stages.js.
//
// Tap a pew (or the round button by it): you walk the family there. Swipe anywhere: the people in that pew scoot down and make room
// (someone with a 📌 likes their spot and won't move); a swipe never picks a pew. Tap the button again: the family
// sits. Anyone left over: another pew. Then you walk back to the doors for the next family.
import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("usher:v1", { best: 0 });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { showLesson } from "./kit/lesson.js";
import { vary } from "./kit/vary.js";
import { esc, say, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { newGame, tick, tapPew, scoot, autoScoot, current, starsFor } from "./usher.js";
import { USHERS, usherById, usherOpen } from "./ushers.js";
import { STAGES, stageById, isOpen } from "./stages.js";
import { createNave, loadModels, MODELS } from "./nave.js";

const app = document.getElementById("app");
const GAMES = "https://angelio.org/games/"; // all the Angelio games (angelio.org/games/)
const route = createRouter([
  [/^$/, viewHome],
  [/^play(?:\/([a-z]+))?$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Mass Usher</b> is a little game about seating families before Mass.
    Tap a pew (or the round button by it) to walk a family there, swipe so people scoot down and make room, and tap again to seat them.
    Families seated together score the most; splitting a family scores less, and less the farther apart. Two stars open
    the next church: the Divine Liturgy, Christmas Midnight Mass (packed) and Pascha (busiest); Adoration at Night is
    endless, people come and go, and it ends when the line at the doors gets too long. It practices counting, planning and
    making room for others. An early demo: some people and parts of the church are stand-ins until they're drawn.
    Nothing is collected; the best scores stay on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "usher-game"); } });

// each stage's stars and best score (Sunday Mass keeps the ones from before there were stages)
const progressId = (st) => st.progress ?? `usher-${st.id}`;
const bestKey = (st) => (st.id === "sunday" ? "best" : `best-${st.id}`);
const starsOf = (st) => S.progress(progressId(st)).stars;
const gamesLink = `<p class="center games-link"><a class="btn" href="${GAMES}">🎮 All the Angelio games</a></p>`;

function viewHome() {
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Mass Usher</h1>
      <p class="lede">Families are coming to Mass! Find each family a pew, help people scoot down to make room, and seat families together.</p>
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
              <span class="muted">Get two stars in ${esc((st.opensAfter ? stageById(st.opensAfter) : STAGES[i - 1]).name)} to open it.</span></div>`;
      }).join("")}
    </section>
    <h2 class="center ushers-title">Your usher</h2>
    <section class="ushers">
      ${USHERS.map((u) => {
        const open = usherOpen(u, (id) => starsOf(stageById(id))), picked = myUsher().id === u.id;
        return open
          ? `<button type="button" class="usher-pick card${picked ? " picked" : ""}" data-usher="${u.id}" aria-pressed="${picked}"><span class="stage-icon">${u.icon}</span><b>${esc(u.name)}</b><span class="muted">${esc(u.blurb)}</span>${picked ? `<span class="picked-tag">✓ Playing</span>` : ""}</button>`
          : `<div class="usher-pick card locked" aria-disabled="true"><span class="stage-icon">🔒</span><b>${esc(u.name)}</b><span class="muted">Get two stars in ${esc(stageById(u.opensAfter).name)} to meet them.</span></div>`;
      }).join("")}
    </section>
    ${stickerBook({ byStars: true })}
    ${gamesLink}`;
  app.querySelectorAll("[data-usher]").forEach((b) => b.addEventListener("click", () => { const u = usherById(b.dataset.usher); S.setSetting("usher", u.id); viewHome(); speak(u.say); }));
  speak("Families are coming to Mass! Can you find everyone a seat? Pick a church.");
}
/** The usher you picked (if it's open; else the first). */
function myUsher() { const u = usherById(S.settings().usher); return usherOpen(u, (id) => starsOf(stageById(id))) ? u : USHERS[0]; }

// what to say: most lines once a round, never too close together
function talker(bubble) {
  let quietUntil = 0;
  const said = new Set();
  const talk = (text, { urgent = false } = {}) => {
    const now = performance.now();
    if (!urgent && now < quietUntil) return false;
    quietUntil = now + 2500;
    say(bubble, text);
    return true;
  };
  talk.once = (key, text, opts) => { if (said.has(key)) return; if (talk(text, opts)) said.add(key); };
  return talk;
}

const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
const dots = (fam, n = fam.size - fam.seated) => `<span class="fam" style="--c:${fam.color}">${"<i></i>".repeat(n)}</span>`;

function viewPlay(stageId) {
  // "Play" in the top bar (#/play, no stage): the church played last
  const stage = stageById(stageId ?? S.settings().lastStage), si = STAGES.indexOf(stage);
  if (!isOpen(si, starsOf)) { location.hash = "#/"; return; }
  S.setSetting("lastStage", stage.id);
  const service = stage.rite === "byzantine" ? "Liturgy" : "Mass"; // a Byzantine church: the Divine Liturgy, not Mass
  const starsById = (id) => starsOf(stageById(id));
  const unlockedBefore = new Set(USHERS.filter((u) => usherOpen(u, starsById)).map((u) => u.id));
  document.body.classList.add("in-game", "usher-game");
  app.innerHTML = `
    <section class="ush-play${stage.endless ? " night" : ""}">
      <canvas class="nave" aria-label="The church: tap a pew to walk the family there, swipe to make room"></canvas>
      <div class="pew-btns" data-pew-btns></div>
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="${stage.endless ? "How long you've been ushering" : `Time until ${service}`}"><span class="clock-label">${stage.endless ? "🌙 Night" : `${service} in`}</span> <b data-clock>${stage.endless ? "0:00" : "2:00"}</b></div>
        <div class="score"><b data-score>0</b></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="line-up" aria-label="Families waiting"><span data-with></span><span class="queue" data-queue></span>${stage.endless ? `<span class="wait-meter" data-wait aria-label="How long the line at the doors is"></span>` : ""}</div>
      <div class="pins" aria-hidden="true"></div>
      <div class="bubble ush-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">⛪</span><p class="say"></p></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card ush-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const $ = (s) => app.querySelector(s);
  const bubble = $(".ush-bubble"), popsEl = $(".pops"), pinsEl = $(".pins"), canvas = $("canvas.nave"), btns = $("[data-pew-btns]");
  const talk = talker(bubble);
  let alive = true, raf = 0, walking = false, nave = null;

  (async () => {
    if (!S.progress(progressId(stage)).plays && (si === 0 || stage.endless)) {
      const card = $(".ush-lesson"); card.hidden = false;
      await showLesson(card, stage.endless ? {
        emoji: stage.icon, title: stage.name,
        rule: "Late at night, people come to pray and <b>go home</b> again. Keep seating them! If the <b>line at the doors</b> gets too long, the night is over.",
        exampleHtml: `<p class="center ush-example">🌙 🧍🧍 ➜ 🪑🪑</p>`,
        voice: "It's late at night, and Jesus is on the altar for adoration. People come to pray, and after a while they go home again, so seats free up. Keep seating everyone! If the line at the doors gets too long, the night is over.",
      } : {
        emoji: "⛪", title: "Seat the families",
        rule: "Tap a <b>pew</b> (or the round button by it) to walk a family there. <b>Swipe</b> so the people in that pew scoot down. Tap it <b>again</b> to seat the family. Seat each family <b>together</b>!",
        exampleHtml: `<p class="center ush-example">👨‍👩‍👧 ➜ 🪑🪑🪑</p>`,
        voice: "Families are coming to Mass! Tap a pew to walk a family there. Swipe so the people in that pew scoot down and make room. Then tap the pew again to seat the family. Families like to sit together!",
      });
      card.hidden = true;
      if (!alive) return;
    }
    say(bubble, "Opening the church doors…", { speakText: false });
    const models = await loadModels(MODELS);
    if (!alive) return;
    const who = myUsher();
    nave = createNave(canvas, { models, rite: stage.rite, night: !!stage.endless, usherId: who.id, speed: who.speed });
    const fitView = () => nave?.resize({ top: ($(".hud")?.offsetHeight ?? 56) + 6, bottom: (bubble.offsetHeight || 60) + ($(".line-up")?.offsetHeight ?? 40) + 20 });
    fitView(); addEventListener("resize", fitView);
    const g = newGame({ seed: Math.floor(Math.random() * 1e9), stage, usher: who });
    window.__usher = { game: g, nave }; // (for the browser tests)
    nave.sync(g); nave.family(current(g));
    talk(stage.say, { urgent: true });

    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1200); };
    const popAt = (id, text, cls) => { const p = nave.pewScreen(id); pop(text, p.x, p.y - 20, cls); };

    // ── a big button by each pew (its empty seats on it): the only way to pick a pew, so taps land cleanly ──
    btns.innerHTML = g.pews.map((p) => `<button type="button" class="pew-btn${p.standing ? " stand" : ""}" data-pew="${p.id}" aria-label="${p.standing ? "Standing room" : `Pew ${p.id + 1}`}"></button>`).join("");
    const btnOf = (id) => btns.querySelector(`[data-pew="${id}"]`);
    // a pew is picked by its button or by tapping the pew itself (a swipe never picks one)
    const choose = async (id) => {
      if (walking || g.over || id == null) return;
      const r = tapPew(g, id);
      if (r.type === "walk") {
        walking = true; sfx.tap(); nave.sync(g);
        await nave.walkTo(id); walking = false;
        // the experienced usher: people scoot as soon as you get there
        if (autoScoot(g, id).type === "scooted") { sfx.whoosh(); nave.sync(g); talk.once("auto", "Scoot over, please! People make room right away for the experienced usher."); }
        const empty = g.pews[id].seats.filter((s) => !s).length;
        if (current(g) && empty === 0) talk("This pew is full. Tap a different pew!");
        else talk.once("at-pew", who.noScoot ? "Tap the pew again to seat them!" : "Swipe to make room, then tap the button again to seat them!");
        return;
      }
      if (r.type === "full") { sfx.tap(); talk("This pew is full. Tap a different pew!", { urgent: true }); return; }
      if (r.type === "some") { sfx.chime(); nave.sync(g); talk(`${NUM[r.left] ?? r.left} more to seat. Tap another pew!`, { urgent: true }); return; }
      if (r.type === "seated") {
        nave.sync(g);
        if (g.pews[id].standing) talk.once("stand", "They can stand at the back. A seat is better, but standing works when the pews are full!", { urgent: true });
        if (r.together) { sfx.win(); popAt(id, `Together! +${r.points}`, "good"); talk(vary("together", ["Together! Wonderful!", "The whole family, side by side!", "Perfect, all together!"])); }
        else { sfx.chime(); popAt(id, `+${r.points}`); talk.once("split", "Seated! Families like to sit together, so try to keep them in one pew."); }
        if (r.quick) setTimeout(() => popAt(id, "Quick! ⚡", "quick"), 350);
        walking = true; await nave.walkHome(); walking = false;
        nave.family(current(g));
      }
    };
    btns.addEventListener("click", (e) => { const b = e.target.closest("[data-pew]"); if (b) choose(+b.dataset.pew); });

    // ── a tap on a pew picks it; a swipe anywhere scoots the pew you're at (it never picks a different pew) ──
    let down = null;
    canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener("pointerup", (e) => {
      if (!down || g.over) { down = null; return; }
      const down0 = down, dx = e.clientX - down.x; down = null;
      if (Math.abs(dx) < 24) { if (Math.abs(e.clientY - down0.y) < 24) choose(nave.pick(e.clientX, e.clientY)); return; }
      if (g.at === null || walking) { sfx.tap(); talk.once("swipe-first", "Pick a pew first, then swipe to make room."); return; }
      // toward the wall is +1 (a left pew's wall is on the left of the screen, a right pew's on the right)
      const dir = (g.at % 2 === 0 ? -dx : dx) > 0 ? 1 : -1;
      const r = scoot(g, g.at, dir);
      if (r.type === "shy") { sfx.tap(); talk.once("shy", "The young usher is too shy to ask people to scoot. Find a pew with room!", { urgent: true }); return; }
      if (r.type === "scooted") { sfx.whoosh(); nave.sync(g); talk.once("scooted", "Scoot over, please! Now tap the button to seat the family."); }
      else sfx.tap();
    });

    // ── the clock, arrivals, people going home, and what's on screen ──
    let last = performance.now(), ended = false, endReason = null, lastFront = current(g)?.id ?? null;
    const pins = new Map();
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        for (const ev of tick(g, dt)) {
          if (ev.type === "arrive") { sfx.pop(); talk.once("arrive", stage.endless ? "Someone else came to pray!" : "Another family just came in!"); if (stage.endless && g.queue.length >= stage.maxLine - 1) talk("The line at the doors is getting long!", { urgent: true }); }
          else if (ev.type === "leave") { nave.personLeave(ev.pid); talk.once("leave", "Someone finished praying and went home. A seat is free!"); }
          else if (ev.type === "end") { ended = true; endReason = ev.reason ?? "mass"; }
        }
        const fam = current(g);
        if (fam && fam.id !== lastFront && !walking && g.at === null) { lastFront = fam.id; nave.family(fam); }
        if (fam && fam.id === lastFront && !walking && g.at === null && !fam.announced) { fam.announced = true; talk(`${fam.size === 1 ? "One person" : `A family of ${NUM[fam.size] ?? fam.size}`}! Tap a pew for them.`); }
        if (!fam && lastFront !== null && !walking) { lastFront = null; nave.family(null); }
        $("[data-with]").innerHTML = fam ? `<b>Now:</b> ${dots(fam)}` : "";
        // Adoration: the night ends when the line at the doors fills this meter (one box a person or family waiting)
        const meter = $("[data-wait]");
        if (meter) { const n = Math.min(g.queue.length, stage.maxLine), html = `🚪 ${"<i class=on></i>".repeat(n)}${"<i></i>".repeat(stage.maxLine - n)}`;
          if (meter.innerHTML !== html) meter.innerHTML = html; meter.classList.toggle("danger", n >= stage.maxLine - 2); }
        $("[data-queue]").innerHTML = g.queue.length > 1 ? `<b>Next:</b> ${g.queue.slice(1, 4).map((id) => dots(g.families[id])).join("")}${g.queue.length > 4 ? ` <b>+${g.queue.length - 4}</b>` : ""}` : "";
        const secs = stage.endless ? Math.floor(g.t) : Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = g.score;
        // the pew buttons: where each pew is on screen; the one you're at says "Sit!"
        for (const { id, standing } of g.pews) {
          const b = btnOf(id), at = nave.pewButton(id);
          b.style.left = at.x + "px"; b.style.top = at.y + "px";
          // no numbers on them: counting the empty seats is part of the game
          // standing room at the back shows a 🧍 (fewer points than a seat)
          const here = g.at === id, label = here ? (standing ? "Stand!" : "Sit!") : standing ? "🧍" : "";
          if (b.textContent !== label) b.textContent = label;
          b.classList.toggle("here", here); b.disabled = walking;
          b.setAttribute("aria-label", here ? (standing ? "Have them stand here" : "Seat them in this pew") : standing ? "Standing room at the back" : `Pew ${id + 1}`);
        }
        // the 📌 over anyone who won't scoot
        const seen = new Set();
        for (const st of nave.stayers()) {
          seen.add(st.pid);
          let el = pins.get(st.pid); if (!el) { el = document.createElement("span"); el.className = "pin"; el.textContent = "📌"; pinsEl.append(el); pins.set(st.pid, el); }
          el.style.left = st.x + "px"; el.style.top = st.y + "px";
        }
        for (const [pid, el] of pins) if (!seen.has(pid)) { el.remove(); pins.delete(pid); }
        if (ended) finish();
      }
      nave.update(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    async function finish() {
      btns.hidden = true;
      if (endReason === "full") {
        say(bubble, `The church is full! ${service === "Liturgy" ? "The Divine Liturgy" : "Mass"} can start early. Ding, dong! Thank you for being such a kind usher!`);
        await nave.procession();
        await new Promise((r) => setTimeout(r, 1200));
      } else if (endReason === "line") {
        const m = Math.floor(g.t / 60), sec = Math.floor(g.t % 60);
        say(bubble, `The line at the doors got too long. Time to rest! You ushered for ${m} minute${m === 1 ? "" : "s"} and ${sec} seconds.`);
        await new Promise((r) => setTimeout(r, 3500));
      } else {
        say(bubble, `Ding, dong! ${service === "Liturgy" ? "The Divine Liturgy" : "Mass"} is starting. Thank you for being such a kind usher!`);
        await nave.procession();
        await new Promise((r) => setTimeout(r, 1200));
      }
      if (!alive) return;
      const old = S.settings()[bestKey(stage)] || 0, stars = starsFor(g), newBest = g.score > old;
      S.setSetting(bestKey(stage), Math.max(old, g.score));
      cancelAnimationFrame(raf); nave.dispose(); nave = null;
      document.body.classList.remove("usher-game");
      const nextStage = STAGES[si + 1], opens = nextStage && !nextStage.endless && Math.max(stars, starsOf(stage)) >= 2;
      showFinish(app, { id: progressId(stage), stars, mistakes: 0, byStars: true, title: newBest ? "A new best!" : stage.endless ? "What a night!" : `Everyone's ready for ${service === "Liturgy" ? "the Liturgy" : "Mass"}!`,
        done: `You scored ${g.score}.`, again: `#/play/${stage.id}`, onAgain: route, next: opens ? { href: `#/play/${nextStage.id}`, label: `${nextStage.icon} ${nextStage.name}` } : null });
      const fresh = USHERS.filter((u) => usherOpen(u, starsById) && !unlockedBefore.has(u.id));
      if (fresh.length) app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="finish-unlock">🎉 You can play as ${fresh.map((u) => `<b>${esc(u.name)}</b>`).join(" and ")} now!</p>`);
      const openUshers = USHERS.filter((u) => usherOpen(u, starsById)), pickedId = myUsher().id;
      if (openUshers.length >= 2) {
        app.querySelector(".finish .row.center")?.insertAdjacentHTML("afterend", `
          <div class="finish-pick">
            <p class="finish-pick-label">Pick your usher for next time:</p>
            <div class="finish-picks">
              ${openUshers.map((u) => `<button type="button" class="pick-chip${u.id === pickedId ? " picked" : ""}" data-pick="${u.id}" aria-pressed="${u.id === pickedId}"><span>${u.icon}</span><b>${esc(u.name)}</b>${!unlockedBefore.has(u.id) ? `<span class="pick-new">✨ New!</span>` : ""}</button>`).join("")}
            </div>
          </div>`);
        app.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
          const u = usherById(b.dataset.pick); S.setSetting("usher", u.id);
          app.querySelectorAll("[data-pick]").forEach((x) => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-pressed", String(on)); });
          sfx.select(); speak(u.say);
        }));
      }
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="final-score">You scored <b>${g.score}</b>${newBest ? " · a new best!" : ` · your best: ${Math.max(old, g.score)}`}</p>
        <p class="muted">${stage.endless ? `ushered ${Math.floor(g.t / 60)}:${String(Math.floor(g.t % 60)).padStart(2, "0")} · ${g.left} went home · ` : ""}${g.together} families together · ${g.split} split up · ${g.seatedPeople} people seated${stars < 3 ? ` · ${stage.star3} for three stars` : ""}</p>`);
      // the finish screen's "All Angelio games" goes to the games page here, not the home page
      const all = app.querySelector(".finish .finish-links a[href=\"https://angelio.org/\"]"); if (all) all.href = "https://angelio.org/games/";
    }
  })();

  return () => { alive = false; cancelAnimationFrame(raf); nave?.dispose(); nave = null; };
}

installClickSounds();
jingleOnce("usher", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
