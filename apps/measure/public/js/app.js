// Measurement, Time & Money (Grades K–5) — screens, Montessori explorers, animated lessons, and 7 interactive play modes.
import * as S from "./kit/store.js";
import { createRouter } from "./kit/router.js";
import { speak, stop, isVoiceActive } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import {
  esc, starsHtml, nextButton, markDot, showFinish, stickerBook,
  viewGrownups, installClickSounds, wireVoiceToggle,
} from "./kit/ui.js";
import { keepDockVisible } from "./kit/dock.js";
import { leadIn, praise, tryAgain } from "./kit/vary.js";
import { jingleOnce } from "./kit/jingle.js";
import {
  PER_LEVEL, GRADES, LEVELS, levelById, makeLevel, starsFor,
  formatTime, formatMoney, checkMoney,
} from "./measure.js";
import {
  MONEY_META, fracLabel, compareLengthSvg, rulerSvg, clockSvg, coinSvg,
  moneyTraySvg, scaleSvg, pitcherSvg, chartSvg, calendarSvg, rectGridSvg,
  conversionCardSvg,
} from "./measure-svg.js";
import { mountAnimatedDemo, viewWatch } from "./watch.js";

S.init("measure:v1", {});
installClickSounds();
keepDockVisible();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

const app = document.getElementById("app");
let activeRun = 0;

document.addEventListener("pointerdown", () => jingleOnce("measure", () => S.settings().sounds), { once: true });

// ───────── shared visual spec renderer ─────────

function renderSpecVisual(spec, { compact = false, interactivePlot = false } = {}) {
  const parts = [];
  if (spec.text) parts.push(`<div class="problem-banner">${esc(spec.text)}</div>`);
  if (spec.coin) parts.push(`<div class="vis-box">${coinSvg(spec.coin, { size: compact ? 76 : 114 })}</div>`);
  if (spec.clock) parts.push(`<div class="vis-box">${clockSvg({ ...spec.clock, size: compact ? 116 : 204 })}</div>`);
  if (spec.ruler) parts.push(`<div class="vis-box">${rulerSvg({ ...spec.ruler, size: compact ? 190 : 352 })}</div>`);
  if (spec.pitcher) parts.push(`<div class="vis-box">${pitcherSvg({ ...spec.pitcher, size: compact ? 104 : 178 })}</div>`);
  if (spec.scale) parts.push(`<div class="vis-box">${scaleSvg({ ...spec.scale, size: compact ? 150 : 272 })}</div>`);
  if (spec.convert) parts.push(`<div class="vis-box">${conversionCardSvg({ ...spec.convert, size: compact ? 162 : 228 })}</div>`);
  if (spec.comparePair) {
    parts.push(`<div class="vis-box">${compareLengthSvg(spec.comparePair.a, spec.comparePair.b, { vertical: !!spec.comparePair.vertical, size: 306 })}</div>`);
  }
  if (spec.moneyTray) parts.push(`<div class="vis-box">${moneyTraySvg(spec.moneyTray, { size: 332 })}</div>`);
  if (spec.calendar) parts.push(`<div class="vis-box">${calendarSvg({ ...spec.calendar, size: 280 })}</div>`);
  if (spec.chart) parts.push(`<div class="vis-box">${chartSvg({ ...spec.chart, interactive: interactivePlot, size: 336 })}</div>`);
  if (spec.rectGrid) parts.push(`<div class="vis-box">${rectGridSvg({ ...spec.rectGrid, size: 224 })}</div>`);
  return parts.join("");
}

function showMsg(bubble, htmlText, spokenText, { doSpeak = true, force = false } = {}) {
  const sayEl = bubble.querySelector(".say");
  if (sayEl) sayEl.innerHTML = htmlText;
  bubble.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.025)" }, { transform: "scale(1)" }], { duration: 240 });
  if (doSpeak && spokenText) speak(spokenText, { force });
}

// ───────── home & grown-ups ─────────

function viewHome() {
  activeRun++;
  document.body.classList.remove("in-game");
  const nextLvl = LEVELS.find((l) => S.progress(l.id).stars < 3) || LEVELS[0];

  app.innerHTML = `
    <section class="hero">
      <h1 class="title" aria-label="Measurement, Time &amp; Money"><span>📏</span> Measure <span>&amp;</span> Time <span>🪙</span></h1>
      <p class="lede">Compare lengths, count coins and dollars, tell time on clocks, pour liquids, read charts, convert units, and build fractional line plots.</p>
      <a class="btn big primary pulse play-btn" href="#/play/${esc(nextLvl.id)}">▶ Play ${esc(nextLvl.emoji)} ${esc(nextLvl.title)}</a>
    </section>
    ${GRADES.map((g) => {
      const items = LEVELS.filter((l) => l.grade === g.n);
      return `
        <section class="grade-sec">
          <h2>${esc(g.emoji)} ${esc(g.title)} <small>${esc(g.blurb)}</small></h2>
          <div class="stage-grid">
            ${items.map((l) => {
              const p = S.progress(l.id);
              const isNext = l.id === nextLvl.id;
              return `
                <article class="stage-card${isNext ? " next" : ""}">
                  <a class="stage-main" href="#/play/${esc(l.id)}">
                    ${l.introCards ? `<span class="intro-pill">✨ Intro</span>` : ""}
                    <span class="stage-emoji">${esc(l.emoji)}</span>
                    <span class="stage-title">${esc(l.title)}</span>
                    <span class="stage-meta">${p.stars ? starsHtml(p.stars) : `<span class="muted small">Set ${l.level}</span>`}</span>
                  </a>
                  <a class="watch-bar" href="#/watch/${esc(l.id)}">🎬 Watch how</a>
                </article>`;
            }).join("")}
          </div>
        </section>`;
    }).join("")}
    ${stickerBook()}`;
}

function viewGrownupsPage() {
  activeRun++;
  document.body.classList.remove("in-game");
  return viewGrownups(app, {
    about: `
      <p><b>Measurement, Time &amp; Money</b> builds Grades K–5 measurement skills step by step: aligning on the <b>0 mark</b> instead of a ruler's blank edge, counting coins from largest to smallest, reading clocks before jumping ahead on elapsed time, pouring and balancing liquid/mass units, and building fractional line plots.</p>
      <p>Every new concept begins with either an interactive <b>Montessori intro shelf</b> (<code>✨ Intro</code>) or an animated worked example (<code>🎬 Watch how</code>) so children always see how the tool works first.</p>`,
  });
}

// ───────── pre-quiz intros ─────────

function showMontessoriExplorer(stage, dock, bubble, level, isAlive) {
  return new Promise((resolve) => {
    const cards = level.introCards;
    const seen = new Set();
    showMsg(bubble, `<b>${esc(level.emoji)} ${esc(level.title)}</b> — tap every card to explore!`, level.say, { doSpeak: isVoiceActive() });

    stage.innerHTML = `
      <div class="card explorer-card">
        <div class="explorer-head">
          <div>
            <div class="lesson-kicker">✨ Hands-on Intro</div>
            <h2 class="explorer-title">${esc(level.emoji)} ${esc(level.title)}</h2>
          </div>
          <a class="btn small" href="#/watch/${esc(level.id)}">🎬 Watch how</a>
        </div>
        <div class="explore-grid">
          ${cards.map((c, idx) => `
            <button type="button" class="explore-item" data-idx="${idx}">
              <span class="explore-art">${renderSpecVisual(c, { compact: true })}</span>
              <span class="explore-name">${esc(c.name)}</span>
              <span class="explore-badge">${esc(c.badge)}</span>
            </button>`).join("")}
        </div>
        <div class="explore-detail" data-detail>Tap any card above to inspect it closely and hear how it works!</div>
      </div>`;

    const drawDock = () => {
      const doneCount = seen.size;
      const ready = doneCount >= cards.length;
      dock.innerHTML = `
        <button type="button" class="btn big primary${ready ? " pulse" : ""}" data-start-quiz>
          ▶ ${ready ? "Start the Quiz!" : `Start Quiz (${doneCount}/${cards.length} explored)`}
        </button>`;
      dock.querySelector("[data-start-quiz]").onclick = () => {
        if (!isAlive()) return;
        sfx.go();
        resolve();
      };
    };

    const detailEl = stage.querySelector("[data-detail]");
    stage.querySelectorAll(".explore-item").forEach((btn) => {
      btn.onclick = () => {
        if (!isAlive()) return;
        const c = cards[Number(btn.dataset.idx)];
        seen.add(c.id);
        sfx.tap();
        stage.querySelectorAll(".explore-item").forEach((el) => el.classList.remove("active"));
        btn.classList.add("active", "seen");
        detailEl.innerHTML = `<b>${esc(c.name)}</b> <span class="badge-inline">${esc(c.badge)}</span><br>${esc(c.clue)}`;
        speak(c.say, { force: true });
        drawDock();
      };
    });

    drawDock();
  });
}

function showAnimatedLesson(stage, dock, bubble, level, isAlive) {
  return new Promise((resolve) => {
    showMsg(bubble, `<b>${esc(level.emoji)} ${esc(level.title)}</b> — watch how it works first!`, level.say, { doSpeak: isVoiceActive() });

    stage.innerHTML = `
      <div class="card anim-lesson">
        <div class="anim-info">
          <div class="lesson-kicker">${esc(level.emoji)} Quick Lesson</div>
          <h2 class="lesson-title">${esc(level.title)}</h2>
          <p class="lesson-rule">${level.teach}</p>
          ${level.example || ""}
          <div class="row" style="margin-top:10px">
            <button type="button" class="btn small" data-hear-lesson>🔊 Hear rule</button>
            <a class="btn small" href="#/watch/${esc(level.id)}">🎬 Full-screen demo</a>
          </div>
        </div>
        <div class="anim-demo-slot" data-demo-slot></div>
      </div>`;

    const cleanupDemo = mountAnimatedDemo(stage.querySelector("[data-demo-slot]"), level, { autoplay: true, compact: true });
    stage.querySelector("[data-hear-lesson]").onclick = () => speak(level.say, { force: true });

    dock.innerHTML = `<button type="button" class="btn big primary pulse" data-go>▶ Let's Practice!</button>`;
    dock.querySelector("[data-go]").onclick = () => {
      cleanupDemo();
      if (!isAlive()) return;
      sfx.go();
      resolve();
    };
  });
}

// ───────── 7 interactive question modes ─────────

async function askChoose(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });
  stage.innerHTML = `<div class="stage-visual">${renderSpecVisual(q)}</div>`;

  let mistakesHere = 0;
  let helped = false;

  await new Promise((resolve) => {
    dock.innerHTML = `
      <div class="choices">
        ${q.choices.map((c) => q.hearChoices
          ? `<div class="choice-audio-wrap">
               <button type="button" class="choice-card" data-ans="${esc(c)}">${esc(c)}</button>
               <button type="button" class="choice-hear" data-hear="${esc(c)}" aria-label="Hear ${esc(c)}">🔊</button>
             </div>`
          : `<button type="button" class="choice-card" data-ans="${esc(c)}">${esc(c)}</button>`
        ).join("")}
      </div>`;

    dock.querySelectorAll("[data-hear]").forEach((h) => {
      h.onclick = (e) => {
        e.stopPropagation();
        sfx.tap();
        speak(h.dataset.hear, { force: true });
      };
    });

    dock.querySelectorAll("[data-ans]").forEach((btn) => {
      btn.onclick = () => {
        if (!ctx.isAlive() || btn.disabled) return;
        const val = btn.dataset.ans;
        if (val === q.answer) {
          sfx.right();
          btn.classList.add("right");
          dock.querySelectorAll("[data-ans]").forEach((b) => (b.disabled = true));
          showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
          resolve();
        } else {
          sfx.oops();
          mistakesHere++;
          helped = true;
          btn.classList.add("wrong");
          btn.disabled = true;
          const msg = tryAgain();
          showMsg(bubble, `${esc(msg)} ${esc(q.hint)}`, `${msg} ${q.hint}`, { doSpeak: isVoiceActive() });
        }
      };
    });
  });

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

async function askIntroMatch(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });

  const renderPeekModal = () => {
    const cards = ctx.level.introCards || [];
    const overlay = document.createElement("div");
    overlay.className = "peek-backdrop";
    overlay.innerHTML = `
      <div class="card peek-modal" role="dialog" aria-label="Guide cards">
        <div class="peek-head">
          <b>👀 Quick Guide — ${esc(ctx.level.title)}</b>
          <button type="button" class="btn small" data-close-peek>✕ Close</button>
        </div>
        <div class="peek-grid">
          ${cards.map((c) => `
            <div class="peek-card">
              ${renderSpecVisual(c, { compact: true })}
              <div><b>${esc(c.name)}</b><br><span class="muted small">${esc(c.clue)}</span></div>
            </div>`).join("")}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.querySelector("[data-close-peek]").onclick = close;
  };

  let mistakesHere = 0;
  let helped = false;

  if (q.askType === "visual") {
    stage.innerHTML = `
      <div class="peek-row"><button type="button" class="btn small" data-peek>👀 Peek at guide</button></div>
      <div class="svg-pick-grid">
        ${q.choices.map((name) => {
          const spec = q.choiceSpecs[name];
          return `<button type="button" class="svg-pick-card" data-ans="${esc(name)}" aria-label="${esc(name)}">${renderSpecVisual(spec, { compact: true })}</button>`;
        }).join("")}
      </div>`;
    stage.querySelector("[data-peek]").onclick = renderPeekModal;
    dock.innerHTML = `<p class="hint">Tap the picture card that shows <b>${esc(q.answer)}</b>!</p>`;

    await new Promise((resolve) => {
      stage.querySelectorAll("[data-ans]").forEach((btn) => {
        btn.onclick = () => {
          if (!ctx.isAlive() || btn.disabled) return;
          if (btn.dataset.ans === q.answer) {
            sfx.right();
            btn.classList.add("right");
            stage.querySelectorAll("[data-ans]").forEach((b) => (b.disabled = true));
            showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
            resolve();
          } else {
            sfx.oops();
            mistakesHere++;
            helped = true;
            btn.classList.add("wrong");
            btn.disabled = true;
            const msg = tryAgain();
            showMsg(bubble, `${esc(msg)} ${esc(q.hint)}`, `${msg} ${q.hint}`, { doSpeak: isVoiceActive() });
          }
        };
      });
    });
  } else {
    stage.innerHTML = `
      <div class="peek-row"><button type="button" class="btn small" data-peek>👀 Peek at guide</button></div>
      <div class="stage-visual">${renderSpecVisual(q)}</div>`;
    stage.querySelector("[data-peek]").onclick = renderPeekModal;

    const hear = ctx.level.grade <= 1;
    await new Promise((resolve) => {
      dock.innerHTML = `
        <div class="choices">
          ${q.choices.map((c) => hear
            ? `<div class="choice-audio-wrap">
                 <button type="button" class="choice-card" data-ans="${esc(c)}">${esc(c)}</button>
                 <button type="button" class="choice-hear" data-hear="${esc(c)}" aria-label="Hear ${esc(c)}">🔊</button>
               </div>`
            : `<button type="button" class="choice-card" data-ans="${esc(c)}">${esc(c)}</button>`
          ).join("")}
        </div>`;

      dock.querySelectorAll("[data-hear]").forEach((h) => {
        h.onclick = (e) => {
          e.stopPropagation();
          sfx.tap();
          speak(h.dataset.hear, { force: true });
        };
      });

      dock.querySelectorAll("[data-ans]").forEach((btn) => {
        btn.onclick = () => {
          if (!ctx.isAlive() || btn.disabled) return;
          if (btn.dataset.ans === q.answer) {
            sfx.right();
            btn.classList.add("right");
            dock.querySelectorAll("[data-ans]").forEach((b) => (b.disabled = true));
            showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
            resolve();
          } else {
            sfx.oops();
            mistakesHere++;
            helped = true;
            btn.classList.add("wrong");
            btn.disabled = true;
            const msg = tryAgain();
            showMsg(bubble, `${esc(msg)} ${esc(q.hint)}`, `${msg} ${q.hint}`, { doSpeak: isVoiceActive() });
          }
        };
      });
    });
  }

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

async function askAlignRuler(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });
  let offset = q.ruler.startOffset ?? 1;
  let mistakesHere = 0;
  let helped = false;
  let solved = false;

  const drawStage = () => {
    const aligned = offset === 0;
    stage.innerHTML = `
      <div class="ruler-stage">
        <div class="vis-box">${rulerSvg({ ...q.ruler, rulerOffset: offset, showZeroGuide: true, showAnswer: solved, size: 368 })}</div>
        <div class="ruler-controls">
          <button type="button" class="btn small" data-slide="-1" ${offset <= -2 || solved ? "disabled" : ""}>⬅️ Slide Left</button>
          <span class="align-pill ${aligned ? "ok" : "warn"}">${aligned ? "0 mark ✓ Aligned!" : "Slide ruler to line up 0"}</span>
          <button type="button" class="btn small" data-slide="1" ${offset >= 2 || solved ? "disabled" : ""}>Slide Right ➡️</button>
        </div>
      </div>`;

    stage.querySelectorAll("[data-slide]").forEach((b) => {
      b.onclick = () => {
        if (!ctx.isAlive() || solved) return;
        offset += Number(b.dataset.slide);
        sfx.tap();
        if (offset === 0) sfx.snap();
        drawStage();
      };
    });
  };

  drawStage();

  await new Promise((resolve) => {
    dock.innerHTML = `
      <div class="choices">
        ${q.choices.map((c) => `<button type="button" class="choice-card" data-ans="${esc(c)}">${esc(c)}</button>`).join("")}
      </div>`;

    dock.querySelectorAll("[data-ans]").forEach((btn) => {
      btn.onclick = () => {
        if (!ctx.isAlive() || btn.disabled) return;
        if (offset !== 0) {
          sfx.oops();
          mistakesHere++;
          helped = true;
          const warn = "Watch out — zero is not lined up yet! Slide the ruler until the green 0 mark lines up first.";
          showMsg(bubble, esc(warn), warn, { doSpeak: isVoiceActive() });
          stage.querySelector(".ruler-stage")?.animate?.([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 240 });
          return;
        }
        if (btn.dataset.ans === q.answer) {
          solved = true;
          sfx.right();
          drawStage();
          btn.classList.add("right");
          dock.querySelectorAll("[data-ans]").forEach((b) => (b.disabled = true));
          showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
          resolve();
        } else {
          sfx.oops();
          mistakesHere++;
          helped = true;
          btn.classList.add("wrong");
          btn.disabled = true;
          const msg = tryAgain();
          showMsg(bubble, `${esc(msg)} ${esc(q.hint)}`, `${msg} ${q.hint}`, { doSpeak: isVoiceActive() });
        }
      };
    });
  });

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

async function askSetClock(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });
  let totalMin = ((((q.startHour % 12) + 12) % 12) * 60 + q.startMinute) % 720;
  const step = q.stepMinutes || 5;
  const targetStr = formatTime(q.targetHour, q.targetMinute);
  let mistakesHere = 0;
  let helped = false;
  let solved = false;

  const curHM = () => {
    const m = ((totalMin % 720) + 720) % 720;
    return { hour: Math.floor(m / 60) || 12, minute: m % 60 };
  };

  const drawClock = () => {
    const hm = curHM();
    const btns = step >= 30
      ? [
          { d: -60, lbl: "−1 hr" },
          { d: -30, lbl: "−30m" },
          { d: 30, lbl: "+30m" },
          { d: 60, lbl: "+1 hr" },
        ]
      : [
          { d: -60, lbl: "−1 hr" },
          { d: -step, lbl: `−${step}m` },
          { d: step, lbl: `+${step}m` },
          { d: 60, lbl: "+1 hr" },
        ];

    stage.innerHTML = `
      <div class="clock-stage">
        <div class="vis-box">${clockSvg({ hour: hm.hour, minute: hm.minute, showMinuteRing: !!q.showMinuteRing || step < 30, size: 224 })}</div>
        <div class="clock-controls">
          ${btns.map((b) => `<button type="button" class="btn small" data-delta="${b.d}" ${solved ? "disabled" : ""}>${b.lbl}</button>`).join("")}
        </div>
      </div>`;

    stage.querySelectorAll("[data-delta]").forEach((b) => {
      b.onclick = () => {
        if (!ctx.isAlive() || solved) return;
        totalMin = (totalMin + Number(b.dataset.delta) + 720) % 720;
        sfx.tap();
        drawClock();
      };
    });
  };

  drawClock();

  await new Promise((resolve) => {
    dock.innerHTML = `
      <button type="button" class="btn big primary" data-check-clock>✓ Check Clock</button>
      <p class="hint">Red short hand = hour · Blue long hand = minutes</p>`;

    dock.querySelector("[data-check-clock]").onclick = () => {
      if (!ctx.isAlive() || solved) return;
      const hm = curHM();
      const got = formatTime(hm.hour, hm.minute);
      if (got === targetStr) {
        solved = true;
        sfx.right();
        drawClock();
        showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
        resolve();
      } else {
        sfx.oops();
        mistakesHere++;
        helped = true;
        const msg = `Right now the clock shows ${got}. ${q.hint}`;
        showMsg(bubble, esc(msg), msg, { doSpeak: isVoiceActive() });
      }
    };
  });

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

async function askBuildMoney(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });
  const counts = {};
  const history = [];
  let mistakesHere = 0;
  let helped = false;
  let solved = false;

  const totalItems = () => Object.values(counts).reduce((a, b) => a + b, 0);

  const drawMoney = () => {
    stage.innerHTML = `
      <div class="money-stage">
        <div class="vis-box">${moneyTraySvg(counts, { size: 332 })}</div>
        <div class="denom-row">
          ${q.denominations.map((k) => {
            const m = MONEY_META[k];
            return `<button type="button" class="denom-btn" data-add="${k}" ${solved || totalItems() >= 20 ? "disabled" : ""}>
              ${coinSvg(k, { size: 40 })}
              <span>+${esc(m.tag)}</span>
            </button>`;
          }).join("")}
        </div>
        <div class="tray-tools">
          <button type="button" class="btn small" data-undo ${!history.length || solved ? "disabled" : ""}>↩ Undo</button>
          <button type="button" class="btn small" data-clear ${!history.length || solved ? "disabled" : ""}>🗑️ Clear</button>
        </div>
      </div>`;

    stage.querySelectorAll("[data-add]").forEach((b) => {
      b.onclick = () => {
        if (!ctx.isAlive() || solved || totalItems() >= 20) return;
        const k = b.dataset.add;
        counts[k] = (counts[k] || 0) + 1;
        history.push(k);
        sfx.add(history.length);
        drawMoney();
      };
    });
    stage.querySelector("[data-undo]").onclick = () => {
      if (!history.length || solved) return;
      const k = history.pop();
      counts[k] = Math.max(0, (counts[k] || 0) - 1);
      sfx.away(history.length);
      drawMoney();
    };
    stage.querySelector("[data-clear]").onclick = () => {
      if (!history.length || solved) return;
      for (const k of Object.keys(counts)) delete counts[k];
      history.length = 0;
      sfx.back();
      drawMoney();
    };
  };

  drawMoney();

  await new Promise((resolve) => {
    dock.innerHTML = `<button type="button" class="btn big primary" data-check-money>✓ Check Tray</button>`;
    dock.querySelector("[data-check-money]").onclick = () => {
      if (!ctx.isAlive() || solved) return;
      const res = checkMoney(counts, q.targetCents);
      if (res.ok) {
        solved = true;
        sfx.right();
        drawMoney();
        showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
        resolve();
      } else {
        sfx.oops();
        mistakesHere++;
        helped = true;
        const rel = res.diff > 0 ? "Need a little more!" : "Too much — remove or clear some!";
        const msg = `Your tray totals ${formatMoney(res.total)}. ${rel} ${q.hint}`;
        showMsg(bubble, esc(msg), msg, { doSpeak: isVoiceActive() });
      }
    };
  });

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

async function askPourJug(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });
  let fill = q.start;
  let mistakesHere = 0;
  let helped = false;
  let solved = false;

  const drawJug = () => {
    stage.innerHTML = `
      <div class="jug-stage">
        <div class="vis-box">${pitcherSvg({ capacity: q.capacity, fill, target: q.target, unit: q.unit, size: 196 })}</div>
        <div class="jug-controls">
          <button type="button" class="btn" data-pour="-1" ${fill <= 0 || solved ? "disabled" : ""}>− Pour Out ${q.step} ${esc(q.unit)}</button>
          <button type="button" class="btn primary" data-pour="1" ${fill >= q.capacity || solved ? "disabled" : ""}>+ Pour In ${q.step} ${esc(q.unit)}</button>
        </div>
      </div>`;

    stage.querySelectorAll("[data-pour]").forEach((b) => {
      b.onclick = () => {
        if (!ctx.isAlive() || solved) return;
        const next = Math.max(0, Math.min(q.capacity, fill + Number(b.dataset.pour) * q.step));
        if (next === fill) return;
        fill = next;
        sfx.add(Math.round((fill / q.capacity) * 10));
        drawJug();
      };
    });
  };

  drawJug();

  await new Promise((resolve) => {
    dock.innerHTML = `<button type="button" class="btn big primary" data-check-jug>✓ Check Pitcher</button>`;
    dock.querySelector("[data-check-jug]").onclick = () => {
      if (!ctx.isAlive() || solved) return;
      if (fill === q.target) {
        solved = true;
        sfx.right();
        drawJug();
        showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
        resolve();
      } else {
        sfx.oops();
        mistakesHere++;
        helped = true;
        const msg = `The pitcher holds ${fill} ${q.unit} — line the water up with the red ${q.target} ${q.unit} Goal line!`;
        showMsg(bubble, esc(msg), msg, { doSpeak: isVoiceActive() });
      }
    };
  });

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

async function askPlotX(stage, dock, bubble, q, ctx) {
  showMsg(bubble, esc(q.prompt), `${ctx.lead}${q.say}`, { doSpeak: isVoiceActive() });
  let pickedVal = null;
  let mistakesHere = 0;
  let helped = false;
  let solved = false;

  const drawPlot = () => {
    const pts = pickedVal == null ? q.chart.points : [...q.chart.points, pickedVal];
    stage.innerHTML = `
      <div class="plot-stage">
        <div class="vis-box">${chartSvg({ ...q.chart, points: pts, interactive: !solved, size: 356 })}</div>
        <p class="muted small" style="margin:6px 0 0">${pickedVal == null ? "Tap any column on the line plot to place your X." : `Selected X at <b>${esc(fracLabel(pickedVal))} ${esc(q.chart.unit || "")}</b>.`}</p>
      </div>`;

    stage.querySelectorAll(".plot-hit[data-val]").forEach((hit) => {
      hit.style.cursor = solved ? "default" : "pointer";
      const pickHit = () => {
        if (!ctx.isAlive() || solved) return;
        pickedVal = Number(hit.dataset.val);
        sfx.tap();
        drawPlot();
        updateDockBtn();
      };
      hit.onclick = pickHit;
      hit.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickHit(); }
      };
    });
  };

  let updateDockBtn = () => {};

  await new Promise((resolve) => {
    dock.innerHTML = `<button type="button" class="btn big primary" data-check-plot disabled>✓ Check Plot</button>`;
    const checkBtn = dock.querySelector("[data-check-plot]");
    updateDockBtn = () => {
      checkBtn.disabled = pickedVal == null || solved;
    };

    checkBtn.onclick = () => {
      if (!ctx.isAlive() || solved || pickedVal == null) return;
      if (Math.abs(pickedVal - q.targetVal) < 1e-6) {
        solved = true;
        sfx.right();
        drawPlot();
        checkBtn.disabled = true;
        showMsg(bubble, `<b>${esc(praise())}</b> ${esc(q.why)}`, `${praise()} ${q.why}`, { doSpeak: isVoiceActive() });
        resolve();
      } else {
        sfx.oops();
        mistakesHere++;
        helped = true;
        const msg = `You placed X at ${fracLabel(pickedVal)} ${q.chart.unit || ""}. ${q.hint}`;
        showMsg(bubble, esc(msg), msg, { doSpeak: isVoiceActive() });
      }
    };

    drawPlot();
  });

  if (ctx.onSolved) await ctx.onSolved(helped, mistakesHere);
}

const ASK = {
  choose: askChoose,
  "intro-match": askIntroMatch,
  "align-ruler": askAlignRuler,
  "set-clock": askSetClock,
  "build-money": askBuildMoney,
  "pour-jug": askPourJug,
  "plot-x": askPlotX,
};

// ───────── round orchestrator ─────────

async function play(id, { skipIntro = false } = {}) {
  const token = ++activeRun;
  const isAlive = () => token === activeRun;
  const level = levelById(id) || LEVELS[0];

  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play">
      <div class="play-top">
        <a class="icon-btn" href="#/" aria-label="Home">✕</a>
        <div class="dots">${Array.from({ length: PER_LEVEL }, (_, i) => `<i data-dot="${i}"></i>`).join("")}</div>
        <button type="button" class="icon-btn" data-repeat aria-label="Say again">💬</button>
        <button type="button" class="icon-btn" data-hint aria-label="Hint">💡</button>
        <button type="button" class="icon-btn toggle" data-voice aria-label="Read aloud">🔊</button>
      </div>
      <div class="bubble">
        <span class="mascot" aria-hidden="true">🧭</span>
        <p class="say"></p>
      </div>
      <div class="stage" data-stage></div>
      <div class="dock" data-dock></div>
    </section>`;

  const topEl = app.querySelector(".play-top");
  const bubble = app.querySelector(".bubble");
  const stage = app.querySelector("[data-stage]");
  const dock = app.querySelector("[data-dock]");
  const voiceBtn = app.querySelector("[data-voice]");
  wireVoiceToggle(voiceBtn);

  let currentQ = null;
  let currentHelped = false;
  app.querySelector("[data-repeat]").onclick = () => {
    const t = currentQ ? (currentQ.say || currentQ.prompt) : level.say;
    speak(t, { force: true });
  };
  app.querySelector("[data-hint]").onclick = () => {
    if (!currentQ) { speak(level.say, { force: true }); return; }
    currentHelped = true;
    const h = currentQ.hint || level.say;
    showMsg(bubble, `💡 ${esc(h)}`, h, { doSpeak: true, force: true });
  };

  if (!skipIntro) {
    if (level.introCards) await showMontessoriExplorer(stage, dock, bubble, level, isAlive);
    else await showAnimatedLesson(stage, dock, bubble, level, isAlive);
    if (!isAlive()) return;
  }

  const questions = makeLevel(level);
  let totalMistakes = 0;

  for (let i = 0; i < questions.length; i++) {
    if (!isAlive()) return;
    currentQ = questions[i];
    currentHelped = false;
    topEl.querySelectorAll("[data-dot]").forEach((d, idx) => d.classList.toggle("now", idx === i));

    const askFn = ASK[currentQ.type] || askChoose;
    const lead = i === 0 ? "" : `${leadIn()} `;
    await askFn(stage, dock, bubble, currentQ, {
      level,
      lead,
      isAlive,
      onSolved: async (helped, mistakesHere) => {
        if (!isAlive()) return;
        totalMistakes += mistakesHere;
        markDot(topEl, i, helped || currentHelped);
        S.solvedOne();
        await nextButton(dock, i === questions.length - 1 ? "Finish ★" : "Next ➜");
      },
    });
  }

  if (!isAlive()) return;
  const idx = LEVELS.findIndex((x) => x.id === level.id);
  const nextLvl = LEVELS[idx + 1] || null;
  const stars = starsFor(totalMistakes);
  showFinish(app, {
    id: level.id,
    stars,
    mistakes: totalMistakes,
    title: level.title,
    done: `Completed ${level.title}!`,
    again: `#/play/${level.id}/go`,
    onAgain: () => play(level.id, { skipIntro: true }),
    next: nextLvl ? { href: `#/play/${nextLvl.id}`, label: `Next: ${nextLvl.emoji} ${nextLvl.title} →` } : null,
  });
}

// ───────── router boot ─────────

const route = createRouter(
  [
    [/^$/, () => viewHome()],
    [/^play\/([\w-]+)(?:\/(go))?$/, (id, go) => play(id, { skipIntro: go === "go" })],
    [/^watch\/([\w-]+)$/, (id) => viewWatch(app, id)],
    [/^grownups$/, () => viewGrownupsPage()],
  ],
  { before: () => { activeRun++; stop({ count: false }); } }
);
route();
