// Maps, Grids & Geometry (Grades K–5): directions, grid addresses, compass maps, polygons,
// symmetry, lines, angles, Quadrant I coordinates, and 3D unit-cube volume. Plain ES modules.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("maps:v1", {});

import { createRouter } from "./kit/router.js";
import { speak, stop, unmark } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { leadIn, praise, tryAgain, vary } from "./kit/vary.js";
import { esc, starsHtml, nextButton, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { GRADES, LEVELS, PER_LEVEL, levelById, makeLevel, starsFor, stepPos, checkMirrorGrid } from "./maps.js";
import { shapeSvg, linesSvg, angleSvg, compassSvg, coordPlaneSvg, volumeSvg, pathOverlaySvg } from "./maps-svg.js";
import { mountAnimatedDemo, viewWatch } from "./watch.js";

const app = document.getElementById("app");

const route = createRouter([
  [/^$/, viewHome],
  [/^play\/([\w-]+)(?:\/(go))?$/, (id, go) => viewPlay(id, { skipIntro: Boolean(go) })],
  [/^watch\/([\w-]+)$/, (id) => viewWatch(app, id)],
  [/^grownups$/, () => viewGrownups(app, { about: ABOUT })],
], {
  before() { stop({ count: false }); FX.clearFx(); document.body.classList.remove("in-game"); },
});

const ABOUT = `
  <p><b>Maps, Grids &amp; Geometry</b> builds spatial sense step by step from Kindergarten through Grade 5:</p>
  <ul>
    <li><b>Grades K–1:</b> position words (above, below, left of, right of), following grid steps, counting sides and corners,
      matching halves symmetry, and reading a Map Key on town and parish maps.</li>
    <li><b>2nd Grade:</b> reading and tapping grid addresses (A3, B4), compass directions (North, South, East, West),
      counting block distance with map scales, an interactive polygon explorer before naming shapes, and mirror grids.</li>
    <li><b>3rd Grade:</b> Montessori-style introductions before quizzing points, lines, rays, angles (with Corner Tester),
      quadrilaterals with side/angle marks, and lines of symmetry.</li>
    <li><b>Grades 4–5:</b> reading and plotting ordered pairs (x, y) on the Quadrant I coordinate plane,
      a protractor guide before measuring angles and finding missing degrees, and 3D unit-cube volume.</li>
  </ul>
  <p>Every prompt is read aloud (with K–1 answer choice audio previews), each level opens with an animated walkthrough
    or interactive shape explorer, and kids can open <b>🎬 Watch how</b> anytime.</p>`;

// ───────── home ─────────

function viewHome() {
  const next = LEVELS.find((l) => !S.progress(l.id).done) ?? LEVELS[0];
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Maps &amp; Grids</h1>
      <p class="lede">Maps, compasses, shapes, symmetry, angles, coordinates, and 3D cubes!</p>
      <a class="btn big primary play-btn" href="#/play/${next.id}">▶ Play</a>
      <nav class="grade-jump" aria-label="Jump to a grade">
        ${GRADES.map((g) => `<button type="button" class="grade-chip" data-grade="${g.n}">${g.emoji} ${esc(g.title)}</button>`).join("")}
      </nav>
    </section>
    ${GRADES.map((g) => {
      const lvs = [1, 2].map((lv) => ({ lv, list: LEVELS.filter((s) => s.grade === g.n && s.level === lv) })).filter((x) => x.list.length);
      return `
      <section class="grade" id="grade-${g.n}">
        <h2 class="grade-title"><span aria-hidden="true">${g.emoji}</span> ${esc(g.title)}</h2>
        <p class="muted grade-blurb">${esc(g.blurb)}</p>
        ${lvs.map(({ lv, list }) => `
        ${lvs.length > 1 ? `<h3 class="level-title">Level ${lv}<span>${esc(g.levels[lv - 1] ?? "")}</span></h3>` : ""}
        <div class="level-grid">
          ${list.map((s) => {
            const pr = S.progress(s.id);
            return `
            <div class="stage-card${pr.done ? " done" : ""}${s.id === next.id ? " next" : ""}">
              <a class="stage-main" href="#/play/${s.id}">
                ${s.introCards ? `<span class="intro-pill">✨ Intro</span>` : ""}
                <span class="emoji">${s.emoji}</span>
                <b>${esc(s.title)}</b>
                ${starsHtml(pr.stars)}
              </a>
              <a class="stage-watch" href="#/watch/${s.id}" aria-label="Watch how: ${esc(s.title)}">🎬 Watch how</a>
            </div>`;
          }).join("")}
        </div>`).join("")}
      </section>`;
    }).join("")}
    ${stickerBook()}`;
  app.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.onclick = () => {
      S.setSetting("lastGrade", Number(btn.dataset.grade));
      document.getElementById(`grade-${btn.dataset.grade}`)?.scrollIntoView({ behavior: "smooth" });
    };
  });
  const lastG = Number(S.settings().lastGrade || 0);
  if (lastG > 1) setTimeout(() => document.getElementById(`grade-${lastG}`)?.scrollIntoView({ behavior: "auto", block: "start" }), 0);
}

// ───────── shared visual & audio helpers ─────────

const COLS_AZ = ["A", "B", "C", "D", "E"];
const eqPos = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
const spokenChoice = (c) => String(c ?? "").replace(/[✓✗]/g, "").trim();

function wireHearBtns(root) {
  root?.querySelectorAll("[data-hear]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      sfx.click();
      FX.pop(btn, 1.12);
      speak(btn.dataset.hear, { force: true });
    };
  });
}

function cardVisualHtml(spec, size = 148) {
  if (spec.shape) return shapeSvg(spec.shape, { size, showDecor: Boolean(spec.showDecor), fold: spec.fold });
  if (spec.lineKind) return linesSvg(spec.lineKind, { size });
  if (spec.angle) return angleSvg({ ...spec.angle, size });
  return "";
}

// ───────── pre-game onboarding (Explorer or Animated Demo) ─────────

function showAnimatedLesson(board, dock, bubble, level, ctx) {
  if (bubble) bubble.style.display = "none";
  dock.innerHTML = "";
  board.innerHTML = `
    <div class="lesson-card anim-lesson" role="dialog" aria-label="How it works">
      <div class="lesson-head">
        <span class="lesson-emoji" aria-hidden="true">${level.emoji}</span>
        <div class="lesson-titles">
          <div class="lesson-kicker">Watch How It Works</div>
          <h2 class="lesson-title">${esc(level.title)}</h2>
        </div>
        <button type="button" class="btn small ghosty" data-lesson-skip>Skip ⏭</button>
      </div>
      <p class="lesson-rule">${level.teach}</p>
      <div class="lesson-demo-host" data-demo-host></div>
      <div class="lesson-actions">
        <button type="button" class="btn" data-own-sound data-lesson-replay>🔄 Replay</button>
        <button type="button" class="btn big primary pulse" data-lesson-start>Start ▶</button>
      </div>
    </div>`;

  const demo = mountAnimatedDemo(board.querySelector("[data-demo-host]"), level, { compact: true, speakSteps: true });
  ctx.onCleanup(demo.stop);

  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      demo.stop();
      if (bubble) bubble.style.display = "";
      document.removeEventListener("keydown", onKey);
      board.innerHTML = "";
      resolve();
    };
    const onKey = (e) => { if (e.key === "Enter") done(); };
    document.addEventListener("keydown", onKey);
    board.querySelector("[data-lesson-start]").onclick = done;
    board.querySelector("[data-lesson-skip]").onclick = done;
    board.querySelector("[data-lesson-replay]").onclick = () => { sfx.click(); demo.replay(); };
  });
}

function showMontessoriExplorer(board, dock, bubble, level, ctx) {
  const cards = level.introCards;
  if (bubble) bubble.style.display = "none";
  dock.innerHTML = "";

  let activeIdx = 0;
  let touring = false;
  let alive = true;
  const visited = new Set([0]);
  ctx.onCleanup(() => { alive = false; touring = false; });

  const render = () => {
    const cur = cards[activeIdx];
    board.innerHTML = `
      <div class="explorer-card" role="dialog" aria-label="Explore ${esc(level.title)}">
        <div class="lesson-head">
          <span class="lesson-emoji" aria-hidden="true">${level.emoji}</span>
          <div class="lesson-titles">
            <div class="lesson-kicker">Explore First · Tap Every Card</div>
            <h2 class="lesson-title">${esc(level.title)}</h2>
          </div>
          <button type="button" class="btn small ghosty" data-exp-skip>Skip ⏭</button>
        </div>
        <p class="lesson-rule">${level.teach}</p>
        <div class="explorer-spotlight">
          <div class="spotlight-svg">${cardVisualHtml(cur, 136)}</div>
          <div class="spotlight-info">
            <div class="spotlight-head">
              <b class="spotlight-name">${esc(cur.name)}</b>
              <span class="badge-pill">${esc(cur.badge)}</span>
            </div>
            <p class="spotlight-clue">${esc(cur.clue)}</p>
            <button type="button" class="btn small" data-own-sound data-spot-say>🔊 Say it</button>
          </div>
        </div>
        <div class="explorer-grid" role="list">
          ${cards.map((c, idx) => `
            <button type="button" class="explorer-chip${idx === activeIdx ? " active" : ""}${visited.has(idx) ? " seen" : ""}" data-own-sound data-card-idx="${idx}">
              <span class="chip-svg">${cardVisualHtml(c, 58)}</span>
              <span class="chip-name">${esc(c.name)}</span>
              <span class="chip-badge">${esc(c.badge)}</span>
            </button>`).join("")}
        </div>
        <div class="lesson-actions">
          <button type="button" class="btn" data-own-sound data-hear-all>${touring ? "⏹ Stop tour" : "🔊 Hear all"}</button>
          <a class="btn" href="#/watch/${level.id}">🎬 Watch how</a>
          <button type="button" class="btn big primary pulse" data-exp-start>▶ Let's Practice!</button>
        </div>
      </div>`;

    wireEvents();
  };

  let finishExplorer = () => {};
  const wireEvents = () => {
    board.querySelectorAll("[data-card-idx]").forEach((btn) => {
      btn.onclick = () => {
        touring = false;
        activeIdx = Number(btn.dataset.cardIdx);
        visited.add(activeIdx);
        sfx.pop();
        const cur = cards[activeIdx];
        render();
        speak(cur.say, { force: true });
      };
    });
    const spotSay = board.querySelector("[data-spot-say]");
    if (spotSay) spotSay.onclick = () => { sfx.click(); speak(cards[activeIdx].say, { force: true }); };
    const hearAll = board.querySelector("[data-hear-all]");
    if (hearAll) {
      hearAll.onclick = async () => {
        if (touring) { touring = false; stop({ count: false }); render(); return; }
        touring = true;
        render();
        for (let i = 0; i < cards.length && alive && touring; i++) {
          activeIdx = i;
          visited.add(i);
          sfx.pop();
          render();
          await Promise.race([speak(cards[i].say, { force: i === 0 }), new Promise((r) => setTimeout(r, 7500))]);
          if (!alive || !touring) return;
          await new Promise((r) => setTimeout(r, 350));
        }
        touring = false;
        if (alive) render();
      };
    }
    board.querySelector("[data-exp-start]").onclick = finishExplorer;
    board.querySelector("[data-exp-skip]").onclick = finishExplorer;
  };

  render();
  speak(level.say);

  return new Promise((resolve) => {
    let finished = false;
    finishExplorer = () => {
      if (finished) return;
      finished = true;
      alive = false;
      touring = false;
      stop({ count: false });
      if (bubble) bubble.style.display = "";
      document.removeEventListener("keydown", onKey);
      board.innerHTML = "";
      resolve();
    };
    const onKey = (e) => { if (e.key === "Enter") finishExplorer(); };
    document.addEventListener("keydown", onKey);
    wireEvents();
  });
}

// ───────── play ─────────

function viewPlay(id, { skipIntro = false } = {}) {
  const level = levelById(id);
  if (!level) { location.hash = "#/"; return; }
  S.setSetting("lastGrade", level.grade);
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play">
      <div class="play-top">
        <a class="icon-btn" href="#/" aria-label="Exit">✕</a>
        <div class="dots">${Array.from({ length: PER_LEVEL }, (_, k) => `<i data-dot="${k}"></i>`).join("")}</div>
        <a class="icon-btn" href="#/watch/${level.id}" title="Watch how" aria-label="Watch how">🎬</a>
        <button class="icon-btn" data-read title="Say it again" aria-label="Say it again">💬</button>
        <button class="icon-btn" data-hint title="Hint" aria-label="Hint">💡</button>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble" aria-live="polite"><span class="mascot" aria-hidden="true">${level.emoji}</span><p class="say"></p></div>
      <div class="card board"></div>
    </section>
    <div class="dock"></div>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const bubble = app.querySelector(".bubble"), dock = app.querySelector(".dock"), board = app.querySelector(".board");
  const cleanups = [];
  let alive = true, mistakes = 0, current = null;
  const tell = (text, voice = text) => {
    const sayEl = bubble.querySelector(".say");
    sayEl.innerHTML = esc(unmark(text));
    sayEl.animate?.([{ opacity: .55, transform: "translateY(2px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "ease-out" });
    speak(voice);
  };
  const ctx = { level, bubble, dock, board, tell, alive: () => alive, miss: () => mistakes++, onCleanup: (fn) => cleanups.push(fn) };
  app.querySelector("[data-read]").onclick = () => current && speak(current.say, { force: true });
  app.querySelector("[data-hint]").onclick = () => current && tell(`💡 ${current.hint}`);

  (async () => {
    if (!skipIntro) {
      if (level.introCards) {
        await showMontessoriExplorer(board, dock, bubble, level, ctx);
      } else {
        await showAnimatedLesson(board, dock, bubble, level, ctx);
      }
      if (!alive) return;
    }
    const qs = makeLevel(level);
    for (let k = 0; k < qs.length && alive; k++) {
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      const q = (current = qs[k]), before = mistakes;
      tell(q.prompt, `${k ? `${leadIn()} ` : ""}${q.say}`);
      await ASK[q.type](q, ctx);
      if (!alive) return;
      markDot(app, k, mistakes > before);
      S.solvedOne();
      await nextButton(dock, k < qs.length - 1 ? "Next ▶" : "Finish 🏁");
    }
    if (!alive) return;
    const i = LEVELS.indexOf(level), nx = LEVELS[i + 1];
    showFinish(app, {
      id: level.id, stars: starsFor(mistakes), mistakes,
      title: vary("finish", ["Great mapping!", "Super job!", "Sharp eyes!", "Way to go!"]),
      done: `${PER_LEVEL} done.`, again: `#/play/${level.id}`, onAgain: route,
      next: nx ? { href: `#/play/${nx.id}`, label: `Next: ${nx.emoji} ${nx.title} ▶` } : null,
    });
  })();
  return () => { alive = false; document.body.classList.remove("in-game"); cleanups.splice(0).forEach((fn) => fn()); };
}

// ───────── shared board visual renderers ─────────

function mapExtrasHtml(q) {
  const parts = [];
  if (q.showCompass) parts.push(`<div class="map-chip">${compassSvg({ size: 68 })}</div>`);
  if (q.scaleText) parts.push(`<span class="scale-pill">${esc(q.scaleText)}</span>`);
  if (q.mapKey) {
    parts.push(`<div class="map-key">${q.mapKey.map((lm) =>
      `<button type="button" class="key-item key-speak" data-own-sound data-hear="${esc(lm.name)}" aria-label="Hear ${esc(lm.name)}">${lm.e} ${esc(lm.name)}</button>`
    ).join("")}</div>`);
  }
  return parts.length ? `<div class="map-meta">${parts.join("")}</div>` : "";
}

function renderGridHtml(q, { clickable = false, trail = null, showNumbers = false } = {}) {
  const cells = [];
  for (let r = 0; r < q.rows; r++) {
    for (let c = 0; c < q.cols; c++) {
      const cell = q.grid?.[r]?.[c];
      const isHero = trail ? eqPos(trail.at(-1), [r, c]) : false;
      const isVisited = trail ? trail.slice(0, -1).some((p) => eqPos(p, [r, c])) : false;
      const isAnchor = eqPos(q.anchor, [r, c]);
      const isHi = eqPos(q.highlight, [r, c]);
      const cls = [
        "map-cell",
        isAnchor ? "anchor" : "",
        isHi ? "hi" : "",
        isVisited ? "visited" : "",
        isHero ? "hero-here" : "",
      ].filter(Boolean).join(" ");
      const inner = isHero
        ? `<span class="cell-hero">${q.hero}</span>`
        : cell ? `<span class="cell-emoji" aria-label="${esc(cell.name ?? "")}">${cell.e}</span>`
        : isVisited ? `<span class="trail-dot" aria-hidden="true">•</span>` : "";
      cells.push(clickable
        ? `<button type="button" class="${cls} tap-cell" data-own-sound data-r="${r}" data-c="${c}" aria-label="${q.labeledGrid ? `${COLS_AZ[c]}${r + 1}` : `row ${r + 1} column ${c + 1}`}">${inner}</button>`
        : `<div class="${cls}">${inner}</div>`);
    }
  }
  const boardCore = `<div class="grid-wrap" style="--cols:${q.cols};--rows:${q.rows}">
    ${cells.join("")}${pathOverlaySvg(q, { showNumbers })}
  </div>`;

  if (!q.labeledGrid) return `<div class="grid-stage">${mapExtrasHtml(q)}${boardCore}</div>`;
  return `<div class="grid-stage">${mapExtrasHtml(q)}
    <div class="addr-frame" style="--cols:${q.cols}">
      <div class="addr-corner" aria-hidden="true"></div>
      <div class="addr-cols">${COLS_AZ.slice(0, q.cols).map((L) => `<span>${L}</span>`).join("")}</div>
      <div class="addr-rows">${Array.from({ length: q.rows }, (_, r) => `<span>${r + 1}</span>`).join("")}</div>
      ${boardCore}
    </div>
  </div>`;
}

function boardVisualHtml(q, { cornerTest = false, revealAfter = false } = {}) {
  if (q.shape) {
    return `<div class="svg-stage">${shapeSvg(q.shape, { showDecor: q.showDecor, fold: q.fold, showSym: Boolean(revealAfter && q.revealSymAfter) })}</div>`;
  }
  if (q.lineKind) return `<div class="svg-stage">${linesSvg(q.lineKind)}</div>`;
  if (q.angle) {
    return `<div class="svg-stage">${angleSvg({ ...q.angle, showCornerTest: cornerTest, revealRight: revealAfter })}</div>`
      + (q.allowCornerTester ? `<button type="button" class="btn small corner-btn${cornerTest ? " on" : ""}" data-own-sound data-corner aria-pressed="${cornerTest}">📐 ${cornerTest ? "Hide corner" : "Corner tester"}</button>` : "");
  }
  if (q.coordRead) {
    const [x, y] = q.coordRead.point;
    return `<div class="svg-stage">${coordPlaneSvg({ points: [{ x, y, label: q.coordRead.label, color: "#e5484d" }], showDrops: revealAfter ? [x, y] : null })}</div>`;
  }
  if (q.volume) return `<div class="svg-stage">${volumeSvg(q.volume.heights, { dims: q.volume.dims })}</div>`;
  if (q.grid) return renderGridHtml(q, { clickable: false, showNumbers: revealAfter });
  if (q.text) return `<div class="passage">${esc(q.text)}</div>`;
  return "";
}

// ───────── 7 interactive question modes ─────────

const ASK = {
  // Multiple choice (short buttons, compass directions, or SVG picture cards, with K–1 audio previews).
  async choose(q, ctx) {
    let cornerTest = false;
    const drawBoard = (revealAfter = false) => {
      ctx.board.innerHTML = boardVisualHtml(q, { cornerTest, revealAfter });
      wireHearBtns(ctx.board);
      const cb = ctx.board.querySelector("[data-corner]");
      if (cb) cb.onclick = () => { cornerTest = !cornerTest; sfx.select(); drawBoard(revealAfter); };
    };
    drawBoard(false);

    const hasSvgs = Boolean(q.choiceSvgs);
    const showAudio = ctx.level.grade === 1 || Boolean(q.hearChoices);
    const kind = hasSvgs ? "svg-choices" : q.choices.length === 4 ? "compass-choices" : "short-choices";
    ctx.dock.innerHTML = `<div class="choices ${kind}">${q.choices.map((c) => {
      const btn = hasSvgs
        ? `<button type="button" class="choice-card svg-pick" data-v="${esc(c)}">${shapeSvg(q.choiceSvgs[c], { size: 92, fold: q.choiceSvgs[c].fold })}<span class="svg-lbl">${esc(c)}</span></button>`
        : `<button type="button" class="choice-card geo-choice" data-v="${esc(c)}">${esc(c)}</button>`;
      if (!showAudio) return btn;
      const hear = `<button type="button" class="icon-btn choice-hear" data-own-sound data-hear="${esc(spokenChoice(c))}" aria-label="Hear ${esc(spokenChoice(c))}">🔊</button>`;
      return `<div class="${hasSvgs ? "svg-pick-wrap" : "choice-audio-wrap"}">${btn}${hear}</div>`;
    }).join("")}</div>`;
    wireHearBtns(ctx.dock);

    let tries = 0;
    return new Promise((resolve) => {
      ctx.dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
        if (!ctx.alive() || b.disabled) return;
        sfx.select();
        const all = ctx.dock.querySelectorAll("[data-v]");
        if (b.dataset.v === q.answer) {
          all.forEach((x) => { x.disabled = true; });
          b.classList.add("right"); drawBoard(true);
          sfx.right(); FX.confetti(18);
          const p = praise(); ctx.tell(q.showWhy ? `${p} ${q.why}` : p, `${p} ${q.why}`);
          resolve(); return;
        }
        ctx.miss(); tries++;
        b.classList.add("wrong"); b.disabled = true; sfx.oops(); FX.shake(b);
        if (tries < 2) { const t = tryAgain(); ctx.tell(t, `${t} ${q.hint}`); return; }
        all.forEach((x) => { x.disabled = true; if (x.dataset.v === q.answer) x.classList.add("right"); });
        drawBoard(true);
        ctx.tell(q.showWhy ? q.why : "Here's the answer.", `Here's the answer. ${q.why}`);
        setTimeout(resolve, 1600);
      });
    });
  },

  // Montessori Intro Match: visual-pick or name-pick with optional Peek at Guide strip.
  async "intro-match"(q, ctx) {
    let peekOpen = false;
    const guideDrawerHtml = () => {
      const cards = ctx.level.introCards || [];
      return `
        <div class="peek-bar">
          <button type="button" class="btn small guide-toggle" data-own-sound data-peek aria-expanded="${peekOpen}">${peekOpen ? "Hide guide ▲" : "👀 Peek at guide"}</button>
        </div>
        <div class="peek-strip"${peekOpen ? "" : " hidden"}>
          ${cards.map((c) => `
            <button type="button" class="peek-item" data-own-sound data-hear="${esc(c.say)}" aria-label="${esc(c.name)}: ${esc(c.badge)}">
              <span class="peek-svg">${cardVisualHtml(c, 48)}</span>
              <b>${esc(c.name)}</b>
              <span class="peek-badge">${esc(c.badge)}</span>
            </button>`).join("")}
        </div>`;
    };

    const drawBoard = () => {
      if (q.askType === "visual") {
        ctx.board.innerHTML = `
          <div class="intro-prompt-card">
            <span class="badge-pill">${esc(q.target.badge)}</span>
            <h2 class="intro-term">${esc(q.target.name)}</h2>
            <p class="intro-clue">${esc(q.target.clue)}</p>
            <button type="button" class="btn small" data-own-sound data-hear="${esc(q.target.say)}">🔊 Hear clue</button>
          </div>
          ${guideDrawerHtml()}`;
      } else {
        ctx.board.innerHTML = `
          <div class="svg-stage">${cardVisualHtml(q, 165)}</div>
          ${guideDrawerHtml()}`;
      }
      wireHearBtns(ctx.board);
      const peekBtn = ctx.board.querySelector("[data-peek]");
      if (peekBtn) {
        peekBtn.onclick = () => {
          peekOpen = !peekOpen;
          sfx.click();
          drawBoard();
        };
      }
    };
    drawBoard();

    if (q.askType === "visual") {
      ctx.dock.innerHTML = `<div class="choices svg-choices">${q.choices.map((c) => `
        <button type="button" class="choice-card svg-pick" data-v="${esc(c)}" aria-label="Shape choice">${cardVisualHtml(q.choiceSpecs[c], 96)}</button>`
      ).join("")}</div>`;
    } else {
      ctx.dock.innerHTML = `<div class="choices short-choices">${q.choices.map((c) => `
        <div class="choice-audio-wrap">
          <button type="button" class="choice-card geo-choice" data-v="${esc(c)}">${esc(c)}</button>
          <button type="button" class="icon-btn choice-hear" data-own-sound data-hear="${esc(c)}" aria-label="Hear ${esc(c)}">🔊</button>
        </div>`).join("")}</div>`;
      wireHearBtns(ctx.dock);
    }

    let tries = 0;
    return new Promise((resolve) => {
      ctx.dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
        if (!ctx.alive() || b.disabled) return;
        sfx.select();
        const all = ctx.dock.querySelectorAll("[data-v]");
        if (b.dataset.v === q.answer) {
          all.forEach((x) => { x.disabled = true; });
          b.classList.add("right");
          sfx.right(); FX.confetti(18);
          const p = praise(); ctx.tell(p, `${p} ${q.why}`);
          resolve(); return;
        }
        ctx.miss(); tries++;
        b.classList.add("wrong"); b.disabled = true; sfx.oops(); FX.shake(b);
        if (tries < 2) { const t = tryAgain(); ctx.tell(t, `${t} ${q.hint}`); return; }
        all.forEach((x) => { x.disabled = true; if (x.dataset.v === q.answer) x.classList.add("right"); });
        ctx.tell("Here's the match!", `Here's the match! ${q.why}`);
        setTimeout(resolve, 1600);
      });
    });
  },

  // Tap the requested cell directly on a 3×3 or 4×4 map/grid.
  async "tap-cell"(q, ctx) {
    ctx.dock.innerHTML = "";
    ctx.board.innerHTML = renderGridHtml(q, { clickable: true });
    wireHearBtns(ctx.board);
    const cells = [...ctx.board.querySelectorAll(".tap-cell")];
    const [tr, tc] = q.target;
    const findCell = (r, c) => cells.find((el) => +el.dataset.r === r && +el.dataset.c === c);
    let tries = 0;

    return new Promise((resolve) => {
      cells.forEach((el) => el.onclick = () => {
        if (!ctx.alive() || el.disabled) return;
        const r = +el.dataset.r, c = +el.dataset.c;
        sfx.select();
        if (r === tr && c === tc) {
          cells.forEach((x) => { x.disabled = true; });
          el.classList.add("right-hit");
          sfx.right(); FX.confetti(18);
          const p = praise(); ctx.tell(p, `${p} ${q.why}`);
          resolve(); return;
        }
        ctx.miss(); tries++;
        el.classList.add("wrong-hit"); el.disabled = true; sfx.oops(); FX.shake(el);
        if (tries < 2) { const t = tryAgain(); ctx.tell(t, `${t} ${q.hint}`); return; }
        cells.forEach((x) => { x.disabled = true; });
        findCell(tr, tc)?.classList.add("right-hit");
        ctx.tell("Right here!", `Right here! ${q.why}`);
        setTimeout(resolve, 1600);
      });
    });
  },

  // Walk step-by-step across a grid using directional pad buttons or physical arrow keys.
  async "walk-grid"(q, ctx) {
    const trail = [q.start];
    let tries = 0, done = false;

    const dirs = q.compass
      ? [["N", "⬆️ N"], ["W", "⬅️ W"], ["E", "➡️ E"], ["S", "⬇️ S"]]
      : [["up", "⬆️ Up"], ["left", "⬅️ Left"], ["right", "➡️ Right"], ["down", "⬇️ Down"]];

    ctx.dock.innerHTML = `
      <div class="dpad">
        <div class="dpad-cross">
          <button type="button" class="btn dbtn d-up" data-own-sound data-dir="${dirs[0][0]}">${dirs[0][1]}</button>
          <button type="button" class="btn dbtn d-left" data-own-sound data-dir="${dirs[1][0]}">${dirs[1][1]}</button>
          <button type="button" class="btn dbtn d-right" data-own-sound data-dir="${dirs[2][0]}">${dirs[2][1]}</button>
          <button type="button" class="btn dbtn d-down" data-own-sound data-dir="${dirs[3][0]}">${dirs[3][1]}</button>
        </div>
        <div class="dpad-actions">
          <button type="button" class="btn small" data-own-sound data-undo>↺ Undo</button>
          <button type="button" class="btn primary check-btn" data-own-sound data-check>✓ Check</button>
        </div>
      </div>`;

    const paint = (hit = false) => {
      const stepCount = trail.length - 1;
      ctx.board.innerHTML = `${renderGridHtml(q, { trail })}<div class="step-pill">Steps taken: <b>${stepCount}</b></div>`;
      wireHearBtns(ctx.board);
      if (hit) ctx.board.querySelector(".hero-here")?.classList.add("right-hit");
      ctx.dock.querySelector("[data-undo]").disabled = done || stepCount === 0;
      ctx.dock.querySelectorAll("[data-dir], [data-check]").forEach((b) => { b.disabled = done; });
    };

    let unbind = () => {};
    const ok = await new Promise((resolve) => {
      const move = (dir) => {
        if (done || !ctx.alive()) return;
        const cur = trail.at(-1);
        const nxt = stepPos(cur, dir, q.rows, q.cols);
        if (eqPos(cur, nxt)) { sfx.oops(); FX.shake(ctx.board.querySelector(".grid-wrap")); return; }
        trail.push(nxt); sfx.key(Math.min(trail.length, 8)); paint();
      };
      const undo = () => {
        if (done || trail.length <= 1) return;
        trail.pop(); sfx.back?.(); paint();
      };
      const submit = () => {
        if (done || !ctx.alive()) return;
        const cur = trail.at(-1);
        if (eqPos(cur, q.target)) {
          done = true; unbind(); paint(true); resolve(true); return;
        }
        ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".grid-wrap"));
        if (tries < 2) {
          trail.length = 1; paint();
          const t = tryAgain(); ctx.tell(t, `${t} Back to start! ${q.hint}`);
          return;
        }
        done = true; unbind();
        trail.length = 1;
        let [r, c] = q.start;
        while (c !== q.target[1]) { c += Math.sign(q.target[1] - c); trail.push([r, c]); }
        while (r !== q.target[0]) { r += Math.sign(q.target[0] - r); trail.push([r, c]); }
        paint(true); resolve(false);
      };

      ctx.dock.querySelectorAll("[data-dir]").forEach((b) => b.onclick = () => move(b.dataset.dir));
      ctx.dock.querySelector("[data-undo]").onclick = undo;
      ctx.dock.querySelector("[data-check]").onclick = submit;

      const onKey = (e) => {
        if (!ctx.alive() || done || e.metaKey || e.ctrlKey || e.altKey) return;
        const map = { ArrowUp: dirs[0][0], ArrowLeft: dirs[1][0], ArrowRight: dirs[2][0], ArrowDown: dirs[3][0] };
        if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
        else if (e.key === "Backspace") { e.preventDefault(); undo(); }
        else if (e.key === "Enter") { e.preventDefault(); submit(); }
      };
      document.addEventListener("keydown", onKey);
      unbind = () => document.removeEventListener("keydown", onKey);
      ctx.onCleanup?.(unbind);
      paint();
    });

    if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${q.why}`); return; }
    ctx.tell("Here is the path!", `Here is the path! ${q.why}`);
    await new Promise((r) => setTimeout(r, 1700));
  },

  // Reflect left-half tiles across the center mirror line onto the right half of a 5×6 grid.
  async "mirror-grid"(q, ctx) {
    const leftSet = new Set(q.leftCells.map(([r, c]) => `${r},${c}`));
    let placed = new Set(), tries = 0, done = false;

    ctx.dock.innerHTML = `<div class="dpad-actions">
      <button type="button" class="btn small" data-own-sound data-clear>↺ Clear</button>
      <button type="button" class="btn big primary" data-own-sound data-check>✓ Check reflection</button>
    </div>`;

    const paint = (solved = false) => {
      const midCol = q.cols / 2 - 1;
      const cells = [];
      for (let r = 0; r < q.rows; r++) {
        for (let c = 0; c < q.cols; c++) {
          const key = `${r},${c}`;
          const isLeft = c < q.cols / 2;
          const mirrorEdge = c === midCol ? " mirror-edge" : "";
          if (isLeft) {
            const on = leftSet.has(key);
            cells.push(`<div class="mcell left${on ? " filled" : ""}${mirrorEdge}" style="${on ? `--fill:${q.color}` : ""}"></div>`);
          } else {
            const on = placed.has(key);
            cells.push(`<button type="button" class="mcell right-side${on ? " filled" : ""}${solved && on ? " right-ok" : ""}" style="${on ? `--fill:${q.color}` : ""}" data-own-sound data-m="${key}" aria-label="row ${r + 1} column ${c + 1}" aria-pressed="${on}" ${done ? "disabled" : ""}></button>`);
          }
        }
      }
      ctx.board.innerHTML = `<div class="order-head"><span class="order-emoji">🪞</span><span class="order-title">${esc(q.title)}</span></div>
        <div class="mirror-wrap" style="--cols:${q.cols};--rows:${q.rows}">${cells.join("")}</div>
        <div class="step-pill">Placed: <b>${placed.size}</b> / ${leftSet.size} tiles</div>`;
      ctx.board.querySelectorAll("[data-m]").forEach((btn) => btn.onclick = () => {
        if (done || !ctx.alive()) return;
        const k = btn.dataset.m;
        if (placed.has(k)) { placed.delete(k); sfx.back?.(); }
        else { placed.add(k); sfx.select(); }
        paint();
      });
      ctx.dock.querySelector("[data-clear]").disabled = done;
      ctx.dock.querySelector("[data-check]").disabled = done;
    };

    const ok = await new Promise((resolve) => {
      ctx.dock.querySelector("[data-clear]").onclick = () => { if (!done) { placed = new Set(); sfx.back?.(); paint(); } };
      ctx.dock.querySelector("[data-check]").onclick = () => {
        if (done || !ctx.alive()) return;
        if (placed.size === 0) { sfx.select(); FX.shake(ctx.board.querySelector(".mirror-wrap")); ctx.tell("Tap squares on the right side first!"); return; }
        const res = checkMirrorGrid(placed, q.leftCells, q.cols);
        if (res.ok) { done = true; paint(true); resolve(true); return; }
        ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".mirror-wrap"));
        if (tries < 2) {
          placed = new Set(res.keep);
          paint();
          const t = tryAgain(); ctx.tell(t, `${t} Matching squares stay! ${q.hint}`);
          return;
        }
        done = true; placed = res.expected; paint(true); resolve(false);
      };
      paint();
    });

    if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${q.why}`); return; }
    ctx.tell("Here is the mirror reflection!", `Here is the mirror reflection! ${q.why}`);
    await new Promise((r) => setTimeout(r, 1700));
  },

  // Click an intersection (x, y) on the interactive Quadrant I coordinate plane.
  async "plot-point"(q, ctx) {
    ctx.dock.innerHTML = "";
    const [tx, ty] = q.target;
    let wrong = null, selected = null, drops = null, tries = 0, done = false;

    const draw = () => {
      ctx.board.innerHTML = `<div class="svg-stage">${coordPlaneSvg({
        points: q.fixed ?? [], interactive: !done, selected, wrong, showDrops: drops,
      })}</div>`;
      if (!done) {
        ctx.board.querySelectorAll(".coord-hit").forEach((el) => {
          const hit = () => pickCoord(+el.dataset.x, +el.dataset.y);
          el.onclick = hit;
          el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(); } };
        });
      }
    };

    let pickCoord = () => {};
    const ok = await new Promise((resolve) => {
      pickCoord = (x, y) => {
        if (done || !ctx.alive()) return;
        sfx.select();
        if (x === tx && y === ty) {
          done = true; selected = [tx, ty]; wrong = null; drops = [tx, ty];
          draw(); resolve(true); return;
        }
        ctx.miss(); tries++; sfx.oops(); wrong = [x, y];
        draw(); FX.shake(ctx.board.querySelector(".coord-svg"));
        if (tries < 2) {
          const swapped = x === ty && y === tx && tx !== ty;
          const msg = swapped
            ? "Almost—those are swapped! Walk across along x first, then climb up y."
            : `${tryAgain()} You tapped (${x}, ${y}). ${q.hint}`;
          ctx.tell(msg, msg);
          return;
        }
        done = true; wrong = null; selected = [tx, ty]; drops = [tx, ty];
        draw(); resolve(false);
      };
      draw();
    });

    if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${q.why}`); return; }
    ctx.tell(`Here is (${tx}, ${ty})!`, `Here is (${tx}, ${ty}). ${q.why}`);
    await new Promise((r) => setTimeout(r, 1700));
  },

  // Interactive 3D isometric layer builder for Grade 5 unit-cube volume.
  async "build-volume"(q, ctx) {
    let layers = 1, tries = 0, done = false;

    ctx.dock.innerHTML = `<div class="dpad-actions">
      <button type="button" class="btn big" data-own-sound data-less>➖ Layer</button>
      <button type="button" class="btn big" data-own-sound data-more>➕ Layer</button>
      <button type="button" class="btn big primary" data-own-sound data-check>✓ Check</button>
    </div>`;

    const paint = () => {
      const heights = Array.from({ length: q.w }, () => Array(q.l).fill(layers));
      const curVol = layers * q.perLayer;
      ctx.board.innerHTML = `
        <div class="svg-stage">${volumeSvg(heights, { dims: { l: q.l, w: q.w, h: layers } })}</div>
        <div class="vol-readout${done ? " right" : ""}">
          <b>${layers}</b> ${layers === 1 ? "layer" : "layers"} × (${q.l} × ${q.w} = ${q.perLayer}) = <b>${curVol}</b> cubic units
        </div>`;
      ctx.dock.querySelector("[data-less]").disabled = done || layers <= 1;
      ctx.dock.querySelector("[data-more]").disabled = done || layers >= 5;
      ctx.dock.querySelector("[data-check]").disabled = done;
    };

    const ok = await new Promise((resolve) => {
      ctx.dock.querySelector("[data-less]").onclick = () => { if (!done && layers > 1) { layers--; sfx.back?.(); paint(); } };
      ctx.dock.querySelector("[data-more]").onclick = () => { if (!done && layers < 5) { layers++; sfx.key(layers); paint(); } };
      ctx.dock.querySelector("[data-check]").onclick = () => {
        if (done || !ctx.alive()) return;
        if (layers === q.targetLayers) { done = true; paint(); resolve(true); return; }
        ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".svg-stage"));
        if (tries < 2) {
          const curVol = layers * q.perLayer;
          const dirTip = curVol < q.targetVolume ? `You have ${curVol} cubes—add more layers!` : `You have ${curVol} cubes—remove a layer!`;
          ctx.tell(dirTip, `${tryAgain()} ${dirTip}`);
          return;
        }
        done = true; layers = q.targetLayers; paint(); resolve(false);
      };
      paint();
    });

    if (ok) { sfx.right(); FX.confetti(22); const p = praise(); ctx.tell(p, `${p} ${q.why}`); return; }
    ctx.tell(`Here is ${q.targetVolume} cubic units!`, `Here is ${q.targetVolume} cubic units! ${q.why}`);
    await new Promise((r) => setTimeout(r, 1700));
  },
};

installClickSounds();
jingleOnce("maps", () => S.settings().sounds);
route();
keepDockVisible();

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").then((reg) => reg.update()).catch(() => {});
}

if (location.protocol === "https:") {
  const version = () => fetch("sw.js", { cache: "no-store" }).then((r) => r.text())
    .then((t) => (t.match(/const VERSION = "([^"]+)"/) || [])[1] ?? null).catch(() => null);
  let mine = null, hiddenAt = 0;
  version().then((v) => { mine = v; });
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!mine || !hiddenAt || Date.now() - hiddenAt < 10 * 60 * 1000) return;
    const now = await version();
    const onHome = /^#?\/?$/.test(location.hash) && !document.body.classList.contains("in-game");
    if (now && now !== mine && onHome) location.reload();
  });
}
