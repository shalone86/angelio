// Mass Usher: seat the families arriving before Mass (his notes: ROADMAP.md, "Mass Usher"). A DEMO: a flat
// top-down church to try the game itself; his voxel church and people come later. The rules are in usher.js.
//
// Tap a pew: you walk the family there. Swipe along the pew: the people sitting there scoot down and make room
// (someone with a 📌 likes their spot and won't move). Tap the pew again: the family sits. Anyone left over: tap
// another pew. Then you walk back to the doors for the next family.
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
import { newGame, tick, tapPew, scoot, current, starsFor, ROWS, SEATS, STAR3 } from "./usher.js";

const app = document.getElementById("app");
const route = createRouter([
  [/^$/, viewHome],
  [/^play$/, viewPlay],
  [/^grownups$/, () => viewGrownups(app, { about: `<p><b>Mass Usher</b> is a little game about seating families before Mass.
    Tap a pew to walk a family there, swipe along the pew so people scoot down and make room, and tap again to seat them.
    Families seated together score the most; splitting a family scores less, and less the farther apart. It practices
    counting, planning and making room for others. This is an early demo with simple pictures; the real church comes later.
    Nothing is collected; the best score stays on this device.</p>` })],
], { before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "usher-game"); } });

function viewHome() {
  const best = S.settings().best || 0, p = S.progress("usher");
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Mass Usher</h1>
      <p class="lede">Families are coming to Mass! Find each family a pew, help people scoot down to make room, and seat families together.</p>
      <p class="demo-chip">🧪 Demo: simple pictures for now</p>
      <a class="btn big primary play-btn" href="#/play">⛪ Play</a>
      ${best ? `<p class="muted">Your best: <b>${best}</b>${p.stars ? ` · ${"★".repeat(p.stars)}` : ""}</p>` : ""}
    </section>
    ${stickerBook()}`;
  speak("Families are coming to Mass! Can you find everyone a seat?");
}

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

function viewPlay() {
  document.body.classList.add("in-game", "usher-game");
  app.innerHTML = `
    <section class="ush-play">
      <div class="hud">
        <a class="icon-btn" href="#/" aria-label="Stop and go home">✕</a>
        <div class="clock" aria-label="Time until Mass"><span class="clock-label">Mass in</span> <b data-clock>2:00</b></div>
        <div class="score"><b data-score>0</b></div>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="church" data-church>
        <div class="altar" aria-hidden="true"><span class="cross">✝</span></div>
        <div class="rows" data-rows></div>
        <div class="doors"><span class="door-sign">🚪 Doors</span><span class="queue" data-queue></span></div>
        <div class="usher" data-usher aria-hidden="true"><span class="me">🧑‍💼</span><span class="with" data-with></span></div>
      </div>
      <div class="bubble ush-bubble" aria-live="polite"><span class="mascot" aria-hidden="true">⛪</span><p class="say"></p></div>
      <div class="pops" aria-hidden="true"></div>
      <div class="card ush-lesson" hidden></div>
    </section>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const $ = (s) => app.querySelector(s);
  const bubble = $(".ush-bubble"), popsEl = $(".pops"), church = $("[data-church]"), usherEl = $("[data-usher]");
  const talk = talker(bubble);
  let alive = true, raf = 0, walking = false, lastFront = null;

  (async () => {
    if (!S.progress("usher").plays) {
      const card = $(".ush-lesson"); card.hidden = false;
      await showLesson(card, {
        emoji: "⛪", title: "Seat the families",
        rule: "Tap a <b>pew</b> to walk a family there. <b>Swipe</b> along the pew so people scoot down. Tap the pew <b>again</b> to seat the family. Seat each family <b>together</b>!",
        exampleHtml: `<p class="center ush-example">👨‍👩‍👧 ➜ 🪑🪑🪑</p>`,
        voice: "Families are coming to Mass! Tap a pew to walk a family there. Swipe along the pew so the people sitting there scoot down and make room. Then tap the pew again to seat the family. Families like to sit together!",
      });
      card.hidden = true;
      if (!alive) return;
    }
    const g = newGame({ seed: Math.floor(Math.random() * 1e9) });
    window.__usher = { game: g }; // (for the browser tests)
    talk("Families are coming to Mass! Tap a pew to walk the first family there.", { urgent: true });

    // ── the church: rows of pews, a pew on each side of the aisle ──
    const rows = $("[data-rows]");
    rows.innerHTML = Array.from({ length: ROWS }, (_, r) => `<div class="row">
      <div class="pew left" data-pew="${r * 2}"></div><div class="aisle"></div><div class="pew right" data-pew="${r * 2 + 1}"></div></div>`).join("");
    const pewEl = (id) => rows.querySelector(`[data-pew="${id}"]`);
    function drawPew(id) {
      const p = g.pews[id], el = pewEl(id);
      // seat 0 is by the aisle: on a left pew it's drawn last (rightmost)
      const order = id % 2 === 0 ? [...Array(SEATS).keys()].reverse() : [...Array(SEATS).keys()];
      el.innerHTML = order.map((s) => { const who = p.seats[s]; const fam = who?.family ? g.families[who.family] : null;
        return `<span class="seat${who ? " full" : ""}${who?.stay ? " stay" : ""}" style="${who ? `--c:${fam ? fam.color : "#9aa3ad"}` : ""}">${who?.stay ? "📌" : ""}</span>`; }).join("");
      el.classList.toggle("here", g.at === id);
    }
    const drawAll = () => { for (let i = 0; i < ROWS * 2; i++) drawPew(i); };
    drawAll();

    // ── the usher: walks between the doors and the aisle end of a pew; the family walks with him ──
    function place(x, y, instant) {
      const from = usherEl._at ?? [x, y], d = Math.hypot(x - from[0], y - from[1]);
      const ms = instant ? 0 : Math.max(250, Math.min(1400, d * 2.2));
      usherEl.style.transition = `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out`;
      usherEl.style.left = `${x}px`; usherEl.style.top = `${y}px`; usherEl._at = [x, y];
      return new Promise((r) => setTimeout(r, ms));
    }
    const at = (el, side) => { const c = church.getBoundingClientRect(), b = el.getBoundingClientRect(); return [side === "left" ? b.right - c.left : side === "right" ? b.left - c.left : b.left - c.left + b.width / 2, b.top - c.top + b.height / 2]; };
    const toDoors = (instant) => place(...at($(".doors"), "mid"), instant);
    const toPew = (id) => place(...at(pewEl(id), id % 2 === 0 ? "left" : "right"));
    toDoors(true);
    addEventListener("resize", () => { if (g.at === null) toDoors(true); else toPew(g.at); });

    const pop = (text, x, y, cls = "") => { const el = document.createElement("div"); el.className = "pop " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; popsEl.append(el); setTimeout(() => el.remove(), 1200); };
    const popAt = (id, text, cls) => { const b = pewEl(id).getBoundingClientRect(); pop(text, b.left + b.width / 2, b.top, cls); };

    // ── tapping and swiping a pew ──
    let down = null;
    rows.addEventListener("pointerdown", (e) => { const el = e.target.closest("[data-pew]"); if (el) down = { id: +el.dataset.pew, x: e.clientX }; });
    rows.addEventListener("pointerup", async (e) => {
      if (!down || walking || g.over) { down = null; return; }
      const { id, x } = down; down = null;
      const dx = e.clientX - x;
      if (Math.abs(dx) > 24) {
        // a swipe toward the wall is +1 (left pews' wall is on the left, right pews' on the right)
        const dir = (id % 2 === 0 ? -dx : dx) > 0 ? 1 : -1;
        const r = scoot(g, id, dir);
        if (r.type === "scooted") { sfx.whoosh(); drawPew(id); talk.once("scooted", "Scoot over, please! Now tap the pew to seat the family."); }
        else if (r.type === "none") { sfx.tap(); talk.once("swipe-here", "Walk the family to this pew first, then swipe to make room."); }
        else sfx.tap();
        return;
      }
      const r = tapPew(g, id);
      if (r.type === "walk") {
        walking = true; sfx.tap(); drawAll();
        await toPew(id); walking = false;
        const fam = current(g), p = g.pews[id], empty = p.seats.filter((s) => !s).length;
        if (fam && empty === 0) talk("This pew is full. Tap a different pew!");
        else talk.once("at-pew", "Swipe along the pew to make room, then tap it again to seat them!");
        return;
      }
      if (r.type === "full") { sfx.tap(); talk("This pew is full. Tap a different pew!", { urgent: true }); return; }
      if (r.type === "some") {
        sfx.chime(); drawPew(id);
        talk(`${NUM[r.left] ?? r.left} more to seat. Tap another pew!`, { urgent: true });
        return;
      }
      if (r.type === "seated") {
        drawAll();
        if (r.together) { sfx.win(); popAt(id, `Together! +${r.points}`, "good"); talk(vary("together", ["Together! Wonderful!", "The whole family, side by side!", "Perfect, all together!"])); }
        else { sfx.chime(); popAt(id, `+${r.points}`); talk.once("split", "Seated! Families like to sit together, so try to keep them in one pew."); }
        if (r.quick) setTimeout(() => popAt(id, "Quick! ⚡", "quick"), 350);
        walking = true; await toDoors(); walking = false;
      }
    });

    // ── the clock, arrivals, and what's on screen ──
    let last = performance.now(), ended = false;
    const frame = (now) => {
      if (!alive) return;
      const dt = document.hidden ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
      if (!ended) {
        for (const ev of tick(g, dt)) {
          if (ev.type === "arrive") { sfx.pop(); talk.once("arrive", "Another family just came in!"); }
          else if (ev.type === "end") ended = true;
        }
        const fam = current(g);
        if (fam && fam.id !== lastFront && !walking && g.at === null) {
          lastFront = fam.id;
          talk(`A family of ${NUM[fam.size] ?? fam.size}! Tap a pew for them.`);
        }
        $("[data-with]").innerHTML = fam ? dots(fam) : "";
        $("[data-queue]").innerHTML = g.queue.slice(1, 5).map((id) => dots(g.families[id])).join("") + (g.queue.length > 5 ? `<b>+${g.queue.length - 5}</b>` : "");
        const left = Math.max(0, Math.ceil(g.length - g.t));
        $("[data-clock]").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        $("[data-score]").textContent = g.score;
        if (ended) finish();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    async function finish() {
      say(bubble, "Ding, dong! Mass is starting. Thank you for being such a kind usher!");
      await new Promise((r) => setTimeout(r, 2500));
      if (!alive) return;
      const old = S.settings().best || 0, stars = starsFor(g), newBest = g.score > old;
      S.setSetting("best", Math.max(old, g.score));
      cancelAnimationFrame(raf);
      document.body.classList.remove("usher-game");
      showFinish(app, { id: "usher", stars, mistakes: 3 - stars, title: newBest ? "A new best!" : "Everyone's ready for Mass!", done: `You scored ${g.score}.`, again: "#/play", onAgain: route });
      app.querySelector(".finish h1")?.insertAdjacentHTML("afterend", `<p class="final-score">You scored <b>${g.score}</b>${newBest ? " · a new best!" : ` · your best: ${Math.max(old, g.score)}`}</p>
        <p class="muted">${g.together} families together · ${g.split} split up · ${g.seatedPeople} people seated${stars < 3 ? ` · ${STAR3} for three stars` : ""}</p>`);
    }
  })();

  return () => { alive = false; cancelAnimationFrame(raf); };
}

installClickSounds();
jingleOnce("usher", () => S.settings().sounds);
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
