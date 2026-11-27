// Writing Skills: grades 1 to 4 (sentences, combining, run-ons, letters, paragraphs, keyboard writing). Plain ES modules, no build step.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("writing:v1", { keyHints: "auto" });

import { createRouter } from "./kit/router.js";
import { speak, stop, unmark } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { showLesson } from "./kit/lesson.js";
import { leadIn, praise, tryAgain, vary } from "./kit/vary.js";
import { esc, starsHtml, nextButton, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { GRADES, LEVELS, PER_LEVEL, levelById, makeLevel, starsFor, QWERTY_ROWS, normalizeSpaces, nextGuidedKey, checkTypedSentence, evaluateChecklist, checkFreeWrite } from "./writing.js";

const app = document.getElementById("app");

const route = createRouter([
  [/^$/, viewHome],
  [/^play\/([\w-]+)$/, viewPlay],
  [/^grownups$/, () => {
    viewGrownups(app, { about: ABOUT });
    addKeyHintsSetting();
  }],
], {
  before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "has-qwerty"); },
});

function addKeyHintsSetting() {
  const card = app.querySelector(".card:not([data-voice-picker])");
  const row = card?.querySelector(".row");
  if (!row) return;
  row.insertAdjacentHTML("beforebegin", `
    <label class="set"><span><b>Keyboard key hints</b><br><span class="muted small">Lights up the next key on beginner typing levels or after a pause.</span></span>
      <select data-key-hints><option value="auto">Auto (beginners)</option><option value="always">Always on</option><option value="off">Off</option></select></label>`);
  const sel = card.querySelector("[data-key-hints]");
  sel.value = S.settings().keyHints ?? "auto";
  sel.onchange = () => S.setSetting("keyHints", sel.value);
}

const ABOUT = `
  <p><b>Writing Skills</b> guides kids step by step from sentences to paragraphs, friendly letters, and real keyboard writing:</p>
  <ul>
    <li><b>1st Grade:</b> complete sentences vs. fragments, building sentences, <b>Meet the Keyboard</b> (short words with gentle glowing key hints),
      <b>Type a Sentence</b> (Shift, Space, and ending marks), describing words, picture stories, and parts of a letter.</li>
    <li><b>2nd Grade:</b> stretching and combining sentences, <b>Fix &amp; Type</b> (capitals, apostrophes, commas, ending marks),
      <b>Combine &amp; Type</b>, fixing run-ons, story order, how-to steps, and friendly letters.</li>
    <li><b>3rd Grade:</b> topic and closing sentences, <b>Fix &amp; Rewrite</b> run-ons, transitions, facts vs. opinions, ordering paragraphs,
      and <b>Write Your Sentence</b> with a live Writer's Checklist.</li>
    <li><b>4th Grade:</b> "show, don't tell" sensory writing (both multiple choice and <b>Write It Vivid</b>), revising drafts right inside the editor box, and writing 1-sentence summaries.</li>
  </ul>
  <p>Every prompt, passage, and sentence choice has a 🔊 button, and kids can listen back to what they wrote anytime.
    Our custom QWERTY keyboard stays right in the app with zero OS autocorrect, and responds to both touch and physical keyboards.</p>`;

// ───────── home ─────────

function viewHome() {
  const next = LEVELS.find((l) => !S.progress(l.id).done) ?? LEVELS[0];
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Writing Skills</h1>
      <p class="lede">From strong sentences to clear paragraphs, friendly letters, and real keyboard writing!</p>
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
          ${list.map((s) => `
            <a class="level-card${s.id === next.id ? " next" : ""}" href="#/play/${s.id}">
              <span class="emoji">${s.emoji}</span>${esc(s.title)}${s.writeLevel ? `<span class="write-pill">⌨️ Write</span>` : ""}${starsHtml(S.progress(s.id).stars)}
            </a>`).join("")}
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

// ───────── play ─────────

function viewPlay(id) {
  const level = levelById(id);
  if (!level) { location.hash = "#/"; return; }
  S.setSetting("lastGrade", level.grade);
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play">
      <div class="play-top">
        <a class="icon-btn" href="#/" aria-label="Exit">✕</a>
        <div class="dots">${Array.from({ length: PER_LEVEL }, (_, k) => `<i data-dot="${k}"></i>`).join("")}</div>
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
  const ctx = { level, bubble, dock, board, tell, alive: () => alive, miss: () => mistakes++, qIndex: 0, onHint: null, onCleanup: (fn) => cleanups.push(fn) };
  app.querySelector("[data-read]").onclick = () => current && speak(current.say, { force: true });
  app.querySelector("[data-hint]").onclick = () => { if (!current) return; ctx.onHint?.(); tell(`💡 ${current.hint}`); };

  (async () => {
    await showLesson(board, { emoji: level.emoji, title: level.title, rule: level.teach, exampleHtml: level.example, voice: level.say });
    if (!alive) return;
    const qs = makeLevel(level);
    for (let k = 0; k < qs.length && alive; k++) {
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      const q = (current = qs[k]), before = mistakes;
      ctx.qIndex = k; ctx.onHint = null;
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
      title: vary("finish", ["Great writing!", "Super job!", "Well written!", "Way to go!"]),
      done: `${PER_LEVEL} done.`, again: `#/play/${level.id}`, onAgain: route,
      next: nx ? { href: `#/play/${nx.id}`, label: `Next: ${nx.emoji} ${nx.title} ▶` } : null,
    });
  })();
  return () => { alive = false; document.body.classList.remove("in-game", "has-qwerty"); cleanups.splice(0).forEach((fn) => fn()); };
}

// ───────── board content helpers ─────────

const blankHtml = (s) => esc(s).replace(/___/g, `<span class="blank" aria-label="blank"></span>`);

function formatPassage(text) {
  const m = /^(Plain sentence|Short sentence|Fix|Run-on|Telling sentence|Opinion|Draft):\s*(.+)$/s.exec(text);
  if (!m) return `<div class="passage">${blankHtml(text)}</div>`;
  return `<div class="passage"><span class="tag-label">${esc(m[1])}</span><div class="passage-text">${blankHtml(m[2])}</div></div>`;
}

function paperHtml(p) {
  const line = (cls, val) => val == null ? "" : `<div class="${cls}">${val === "___" ? `<span class="blank" aria-label="blank"></span>` : esc(val)}</div>`;
  return `<div class="letter-paper">${line("lp-date", p.date)}${line("lp-greet", p.greeting)}${line("lp-body", p.body)}${line("lp-close", p.closing)}${line("lp-sig", p.signature)}</div>`;
}

function envelopeHtml(e) {
  const line = (cls, val) => `<div class="${cls}">${val === "___" ? `<span class="blank" aria-label="blank"></span>` : esc(val)}</div>`;
  return `<div class="envelope"><span class="stamp" aria-hidden="true">📮</span>${line("env-name", e.name)}${line("env-street", e.street)}${line("env-city", e.city)}</div>`;
}

function boardVoiceText(q) {
  if (q.base) return q.base.join(" ");
  if (q.paper) return [q.paper.date, q.paper.greeting, q.paper.body, q.paper.closing, q.paper.signature].filter(Boolean).join(". ").replace(/___/g, "blank");
  if (q.envelope) return [q.envelope.name, q.envelope.street, q.envelope.city].join(". ").replace(/___/g, "blank");
  if (q.text) return q.text.replace(/___/g, "blank");
  return q.say;
}

function boardContextHtml(q) {
  const parts = [];
  if (q.emoji) parts.push(`<div class="scene-badge" aria-hidden="true">${q.emoji}</div>`);
  if (q.base) {
    parts.push(`<div class="base-pair">${q.base.map((s) => `<div class="base-card">${esc(s)}</div>`).join('<span class="join-plus" aria-hidden="true">+</span>')}</div>`);
  } else if (q.paper) {
    parts.push(paperHtml(q.paper));
  } else if (q.envelope) {
    parts.push(envelopeHtml(q.envelope));
  } else if (q.text) {
    parts.push(formatPassage(q.text));
  }
  if (q.base || q.paper || q.envelope || q.text) {
    parts.push(`<button type="button" class="btn small read-me" data-own-sound data-read-board>🔊 Read it to me</button>`);
  }
  return parts.join("");
}

function wireSayRow(root) {
  root.querySelectorAll("[data-say-row]").forEach((b) => b.onclick = () => {
    FX.pop(b, 1.12);
    speak(b.dataset.sayRow, { force: true });
  });
}

// ───────── QWERTY keyboard & interactive writing box ─────────

function buildKeyboard(dock, { sentence = false } = {}) {
  const rows = QWERTY_ROWS.map((row, r) => {
    const keys = row.map((l) => `<button type="button" class="qkey${l === "f" || l === "j" ? " home-key" : ""}" data-own-sound data-key="${l}" aria-label="letter ${l}"><span class="abc">${l}</span></button>`).join("");
    if (!sentence && r === 2) return `<div class="qwerty-row">${keys}<button type="button" class="qkey qkey-back" data-own-sound data-back aria-label="Backspace">⌫</button></div>`;
    if (sentence && r === 2) return `<div class="qwerty-row"><button type="button" class="qkey qkey-shift" data-own-sound data-shift aria-label="Shift" aria-pressed="false">⇧</button>${keys}<button type="button" class="qkey qkey-back" data-own-sound data-back aria-label="Backspace">⌫</button></div>`;
    return `<div class="qwerty-row">${keys}</div>`;
  });
  if (sentence) {
    rows.push(`<div class="qwerty-row qwerty-bottom">
      <button type="button" class="qkey qkey-punct" data-own-sound data-char="," aria-label="comma">,</button>
      <button type="button" class="qkey qkey-punct" data-own-sound data-char="'" aria-label="apostrophe">'</button>
      <button type="button" class="qkey qkey-space" data-own-sound data-char=" " aria-label="Space">space</button>
      <button type="button" class="qkey qkey-punct" data-own-sound data-char="." aria-label="period">.</button>
      <button type="button" class="qkey qkey-punct" data-own-sound data-char="?" aria-label="question mark">?</button>
      <button type="button" class="qkey qkey-punct" data-own-sound data-char="!" aria-label="exclamation mark">!</button>
      <button type="button" class="qkey qkey-check" data-own-sound data-check aria-label="Check sentence">✓ Check</button>
    </div>`);
  }
  dock.innerHTML = `<div class="qwerty">${rows.join("")}</div>`;
}

function updateKeyboardState(dock, { shift = false, guideKey = null, disabled = false } = {}) {
  const shiftBtn = dock.querySelector("[data-shift]");
  if (shiftBtn) {
    shiftBtn.classList.toggle("on", shift);
    shiftBtn.setAttribute("aria-pressed", String(shift));
  }
  dock.querySelectorAll("[data-key]").forEach((k) => {
    const ch = k.dataset.key;
    const abc = k.querySelector(".abc");
    if (abc) abc.textContent = shift ? ch.toUpperCase() : ch;
    k.classList.toggle("guide", guideKey === ch);
  });
  dock.querySelectorAll("[data-char]").forEach((k) => k.classList.toggle("guide", guideKey === k.dataset.char));
  shiftBtn?.classList.toggle("guide", guideKey === "shift");
  dock.querySelector("[data-back]")?.classList.toggle("guide", guideKey === "back");
  dock.querySelector("[data-check]")?.classList.toggle("guide", guideKey === "check");
  dock.querySelectorAll(".qkey").forEach((k) => { k.disabled = disabled; });
}

function bindWritingKeys(ctx, { sentence = false, onChar, onBackspace, onDelete, onMove, onCheck }) {
  const onKey = (e) => {
    if (!ctx.alive() || e.metaKey || e.ctrlKey || e.altKey || e.target?.matches?.("input, textarea, select")) return;
    if (!sentence) {
      if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); onChar(e.key.toLowerCase()); }
      else if (e.key === "Backspace") { e.preventDefault(); onBackspace(); }
      return;
    }
    if (/^[a-zA-Z .,?!']$/.test(e.key)) { e.preventDefault(); onChar(e.key, { physical: true }); }
    else if (e.key === "Backspace") { e.preventDefault(); onBackspace(); }
    else if (e.key === "Delete") { e.preventDefault(); onDelete?.(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); onMove?.(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); onMove?.(1); }
    else if (e.key === "Home") { e.preventDefault(); onMove?.(-Infinity); }
    else if (e.key === "End") { e.preventDefault(); onMove?.(Infinity); }
    else if (e.key === "Enter") { e.preventDefault(); onCheck?.(); }
  };
  document.addEventListener("keydown", onKey);
  const unbind = () => document.removeEventListener("keydown", onKey);
  ctx.onCleanup?.(unbind);
  return unbind;
}

function renderWriteBox(box, { text, pos, ghostRest = "", placeholder = "Tap keys or type here…", disabled = false }) {
  const caret = disabled ? "" : `<span class="caret" aria-hidden="true"></span>`;
  if (!text && !ghostRest) {
    box.innerHTML = `${caret}<span class="wb-placeholder">${esc(placeholder)}</span>`;
    return;
  }
  const parts = [];
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " ") {
      if (i === pos) { parts.push(caret); }
      if (inWord) { parts.push("</span>"); inWord = false; }
      parts.push(`<span class="wb-ch wb-sp" data-pos="${i}"> </span>`);
    } else {
      if (!inWord) { parts.push(`<span class="wb-word">`); inWord = true; }
      if (i === pos) parts.push(caret);
      parts.push(`<span class="wb-ch" data-pos="${i}">${esc(ch)}</span>`);
    }
  }
  if (pos === text.length) parts.push(caret);
  if (inWord) parts.push("</span>");
  if (ghostRest) parts.push(`<span class="ghost-rest" aria-hidden="true">${esc(ghostRest)}</span>`);
  box.innerHTML = parts.join("");
  box.querySelector(".caret")?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

function wireWriteBoxCaret(box, getLen, setPos, isDisabled) {
  box.onclick = (e) => {
    if (isDisabled()) return;
    const ch = e.target.closest("[data-pos]");
    if (ch) {
      const idx = Number(ch.dataset.pos);
      const r = ch.getBoundingClientRect();
      setPos(e.clientX > r.left + r.width / 2 ? idx + 1 : idx);
      return;
    }
    const chars = box.querySelectorAll("[data-pos]");
    if (!chars.length) { setPos(0); return; }
    const firstRect = chars[0].getBoundingClientRect();
    setPos(e.clientY < firstRect.top ? 0 : getLen());
  };
}

function wireSentenceSession(ctx, { writeBox, initial = "", onActivity, render, onSubmit }) {
  buildKeyboard(ctx.dock, { sentence: true });
  let text = initial, pos = text.length, shift = false, done = false;
  const paint = () => render({ text, pos, shift, done });

  ctx.board.querySelector("[data-read-mine]").onclick = () => {
    const spokenText = normalizeSpaces(text);
    if (spokenText) speak(spokenText, { force: true });
    else ctx.tell("Type a sentence first, and I'll read it back!");
  };
  ctx.board.querySelector("[data-reset-box]").onclick = () => {
    if (done) return;
    text = initial; pos = text.length; shift = false; sfx.back?.(); onActivity?.(); paint();
  };
  wireWriteBoxCaret(writeBox, () => text.length, (p) => { pos = p; paint(); }, () => done);

  const insert = (ch, { physical = false } = {}) => {
    if (done || !ctx.alive()) return;
    let out = ch;
    if (/^[a-z]$/.test(ch) && !physical && shift) out = ch.toUpperCase();
    if (/^[a-zA-Z]$/.test(out)) shift = false;
    text = text.slice(0, pos) + out + text.slice(pos);
    pos += out.length;
    sfx.key(Math.min(pos, 8));
    onActivity?.(); paint();
  };
  const backspace = () => {
    if (done || !ctx.alive() || pos <= 0) return;
    text = text.slice(0, pos - 1) + text.slice(pos);
    pos--; sfx.back?.(); onActivity?.(); paint();
  };
  const delForward = () => {
    if (done || !ctx.alive() || pos >= text.length) return;
    text = text.slice(0, pos) + text.slice(pos + 1);
    sfx.back?.(); onActivity?.(); paint();
  };
  const move = (d) => {
    if (done) return;
    pos = Math.max(0, Math.min(text.length, d === -Infinity ? 0 : d === Infinity ? text.length : pos + d));
    paint();
  };
  const submit = () => {
    if (done || !ctx.alive()) return;
    onSubmit({
      text,
      lock: (finalText) => {
        done = true; unbind();
        if (finalText != null) { text = finalText; pos = text.length; }
        shift = false; paint();
      },
      clearShift: () => { shift = false; paint(); },
    });
  };

  ctx.dock.querySelectorAll("[data-key]").forEach((k) => k.onclick = () => insert(k.dataset.key));
  ctx.dock.querySelectorAll("[data-char]").forEach((k) => k.onclick = () => insert(k.dataset.char));
  ctx.dock.querySelector("[data-shift]").onclick = () => { if (!done) { shift = !shift; sfx.select(); paint(); } };
  ctx.dock.querySelector("[data-back]").onclick = backspace;
  ctx.dock.querySelector("[data-check]").onclick = submit;
  const unbind = bindWritingKeys(ctx, {
    sentence: true,
    onChar: (ch, opts) => {
      const btn = /^[a-z]$/i.test(ch)
        ? ctx.dock.querySelector(`[data-key="${ch.toLowerCase()}"]`)
        : ctx.dock.querySelector(`[data-char="${ch === '"' ? "'" : ch}"]`);
      if (btn) FX.pop(btn, 1.08);
      insert(ch, opts);
    },
    onBackspace: () => { const b = ctx.dock.querySelector("[data-back]"); if (b) FX.pop(b, 1.08); backspace(); },
    onDelete: delForward, onMove: move, onCheck: submit,
  });
  paint();
  return { paint, unbind };
}

// ───────── question modes ─────────

const ASK = {
  // Choose the right answer from 2 or 3 choices (short buttons side-by-side, or full sentences with 🔊).
  async choose(q, ctx) {
    ctx.board.innerHTML = boardContextHtml(q);
    const rb = ctx.board.querySelector("[data-read-board]");
    if (rb) rb.onclick = () => speak(boardVoiceText(q), { force: true });

    const isShort = q.choices.length === 2 && q.choices.every((c) => c.length <= 20 && !/[.!?]$/.test(c));
    const kind = isShort ? "short-choices" : "sentence-choices";
    const choiceHtml = q.choices.map((c) => isShort
      ? `<button type="button" class="choice-card short-card" data-v="${esc(c)}">${esc(c)}</button>`
      : `<div class="pick-row"><button type="button" class="choice-card sentence-card" data-v="${esc(c)}">${esc(c)}</button><button type="button" class="icon-btn say-row" data-own-sound data-say-row="${esc(c)}" aria-label="Hear choice">🔊</button></div>`
    ).join("");
    ctx.dock.innerHTML = `<div class="choices ${kind}">${choiceHtml}</div>`;
    wireSayRow(ctx.dock);

    const fillBlank = () => {
      const b = ctx.board.querySelector(".blank");
      if (b) { b.textContent = q.answer; b.classList.add("filled"); FX.pop(b, 1.08); }
    };

    let tries = 0;
    return new Promise((resolve) => {
      ctx.dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
        if (!ctx.alive() || b.disabled) return;
        sfx.select();
        const all = ctx.dock.querySelectorAll("[data-v]");
        if (b.dataset.v === q.answer) {
          all.forEach((x) => { x.disabled = true; });
          b.classList.add("right"); sfx.right(); FX.confetti(18); fillBlank();
          const p = praise(); ctx.tell(p, `${p} ${q.why}`);
          resolve();
          return;
        }
        ctx.miss(); tries++;
        b.classList.add("wrong"); b.disabled = true; sfx.oops(); FX.shake(b);
        if (tries < 2) { const t = tryAgain(); ctx.tell(t, `${t} ${q.hint}`); return; }
        all.forEach((x) => { x.disabled = true; if (x.dataset.v === q.answer) x.classList.add("right"); });
        fillBlank();
        ctx.tell("Here's the answer.", `Here's the answer. ${q.why}`);
        setTimeout(resolve, 1700);
      });
    });
  },

  // Build a sentence by tapping shuffled word tiles into sentence slots.
  async build(q, ctx) {
    ctx.board.innerHTML = `
      <div class="build-head">
        <span class="scene-badge" aria-hidden="true">${q.emoji}</span>
        <button type="button" class="btn small" data-own-sound data-clue>🔊 Hear clue</button>
      </div>
      <div class="word-slots">${q.words.map((_, i) => `<button type="button" class="word-slot empty" data-own-sound aria-label="word ${i + 1}"></button>`).join("")}</div>`;
    ctx.board.querySelector("[data-clue]").onclick = () => speak(q.say, { force: true });
    ctx.dock.innerHTML = `<div class="word-tiles">${q.tiles.map((w, i) => `<button type="button" class="choice-card word-tile" data-own-sound data-t="${i}">${esc(w)}</button>`).join("")}</div>`;

    const slots = [...ctx.board.querySelectorAll(".word-slot")];
    const tiles = [...ctx.dock.querySelectorAll(".word-tile")];
    const filled = Array(q.words.length).fill(null);
    let tries = 0, done = false;

    const paint = () => slots.forEach((s, i) => {
      const ti = filled[i];
      s.classList.toggle("empty", ti == null);
      s.textContent = ti == null ? "" : q.tiles[ti];
    });

    return new Promise((resolve) => {
      const check = () => {
        if (filled.some((t) => t == null)) return;
        const built = filled.map((t) => q.tiles[t]).join(" ");
        if (built === q.answer) {
          done = true; tiles.forEach((t) => { t.disabled = true; });
          slots.forEach((s) => s.classList.add("right"));
          sfx.right(); FX.confetti(20);
          const p = praise(); ctx.tell(p, `${p} ${q.why}`);
          resolve(); return;
        }
        ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".word-slots"));
        if (tries < 2) {
          filled.forEach((ti, i) => {
            if (q.tiles[ti] !== q.words[i]) { tiles[ti].disabled = false; filled[i] = null; }
          });
          paint();
          const t = tryAgain(); ctx.tell(t, `${t} The right words stay! ${q.hint}`);
          return;
        }
        done = true;
        tiles.forEach((t) => { t.disabled = true; });
        const used = new Set();
        q.words.forEach((w, i) => {
          const j = q.tiles.findIndex((x, k) => x === w && !used.has(k));
          used.add(j); filled[i] = j;
        });
        paint();
        slots.forEach((s) => s.classList.add("right"));
        ctx.tell("Here's the sentence.", `Here's the sentence: ${q.why}`);
        setTimeout(resolve, 1800);
      };

      tiles.forEach((t, ti) => t.onclick = () => {
        if (done || t.disabled || !ctx.alive()) return;
        const i = filled.indexOf(null);
        if (i < 0) return;
        filled[i] = ti; t.disabled = true; sfx.key(i + 1);
        speak(q.tiles[ti].replace(/[.,!?]+$/, ""), { force: true });
        paint(); check();
      });
      slots.forEach((s, i) => s.onclick = () => {
        if (done || filled[i] == null) return;
        tiles[filled[i]].disabled = false; filled[i] = null; sfx.back?.(); paint();
      });
    });
  },

  // Order story parts, how-to steps, friendly letters, or paragraphs into labeled slots.
  async order(q, ctx) {
    ctx.board.innerHTML = `
      <div class="order-head">
        <span class="order-emoji" aria-hidden="true">${q.emoji ?? "📝"}</span>
        <span class="order-title">${esc(q.title)}</span>
      </div>
      <div class="order-slots">${q.labels.map((lb, i) => `
        <div class="order-row">
          <span class="order-label">${i + 1}. ${esc(lb)}</span>
          <button type="button" class="order-slot empty" data-own-sound aria-label="${esc(lb)}"></button>
        </div>`).join("")}
      </div>`;
    ctx.dock.innerHTML = `<div class="order-cards">${q.items.map((text, i) => `
      <div class="pick-row">
        <button type="button" class="choice-card order-card" data-own-sound data-t="${i}">${esc(text)}</button>
        <button type="button" class="icon-btn say-row" data-own-sound data-say-row="${esc(text)}" aria-label="Hear card">🔊</button>
      </div>`).join("")}</div>`;
    wireSayRow(ctx.dock);

    const slots = [...ctx.board.querySelectorAll(".order-slot")];
    const cards = [...ctx.dock.querySelectorAll(".order-card")];
    const rows = [...ctx.dock.querySelectorAll(".pick-row")];
    const filled = Array(q.steps.length).fill(null);
    let tries = 0, done = false;

    const paint = () => slots.forEach((s, i) => {
      const ti = filled[i];
      s.classList.toggle("empty", ti == null);
      s.textContent = ti == null ? "" : q.items[ti];
    });

    return new Promise((resolve) => {
      const check = () => {
        if (filled.some((t) => t == null)) return;
        const built = filled.map((t) => q.items[t]).join(" ");
        if (built === q.answer) {
          done = true; cards.forEach((c) => { c.disabled = true; });
          slots.forEach((s) => s.classList.add("right"));
          sfx.right(); FX.confetti(20);
          const p = praise(); ctx.tell(p, `${p} ${q.why}`);
          resolve(); return;
        }
        ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".order-slots"));
        if (tries < 2) {
          filled.forEach((ti, i) => {
            if (q.items[ti] !== q.steps[i]) {
              cards[ti].disabled = false;
              rows[ti].classList.remove("used");
              filled[i] = null;
            }
          });
          paint();
          const t = tryAgain(); ctx.tell(t, `${t} The right parts stay! ${q.hint}`);
          return;
        }
        done = true;
        cards.forEach((c) => { c.disabled = true; });
        rows.forEach((r) => r.classList.add("used"));
        const used = new Set();
        q.steps.forEach((st, i) => {
          const j = q.items.findIndex((x, k) => x === st && !used.has(k));
          used.add(j); filled[i] = j;
        });
        paint();
        slots.forEach((s) => s.classList.add("right"));
        ctx.tell("Here's the order.", `Here's the order. ${q.why}`);
        setTimeout(resolve, 1800);
      };

      cards.forEach((c, ci) => c.onclick = () => {
        if (done || c.disabled || !ctx.alive()) return;
        const i = filled.indexOf(null);
        if (i < 0) return;
        filled[i] = ci; c.disabled = true; rows[ci].classList.add("used");
        sfx.key(i + 1);
        paint(); check();
      });
      slots.forEach((s, i) => s.onclick = () => {
        if (done || filled[i] == null) return;
        const ci = filled[i];
        cards[ci].disabled = false; rows[ci].classList.remove("used");
        filled[i] = null; sfx.back?.(); paint();
      });
    });
  },

  // Tap the one sentence inside a 4-sentence paragraph that does NOT belong.
  async "tap-sentence"(q, ctx) {
    ctx.dock.innerHTML = "";
    ctx.board.innerHTML = `
      <div class="order-head">
        <span class="order-emoji" aria-hidden="true">${q.emoji ?? "🚫"}</span>
        <span class="order-title">${esc(q.title)}</span>
        <button type="button" class="btn small" data-own-sound data-read-para>🔊 Read paragraph</button>
      </div>
      <div class="para-list">${q.sentences.map((s, i) => `
        <div class="para-row">
          <button type="button" class="choice-card para-sent" data-idx="${i}">${esc(s)}</button>
          <button type="button" class="icon-btn say-row" data-own-sound data-say-row="${esc(s)}" aria-label="Hear sentence">🔊</button>
        </div>`).join("")}
      </div>`;
    ctx.board.querySelector("[data-read-para]").onclick = () => speak(`${q.title}. ${q.sentences.join(" ")}`, { force: true });
    wireSayRow(ctx.board);

    const btns = [...ctx.board.querySelectorAll(".para-sent")];
    let tries = 0;
    return new Promise((resolve) => {
      btns.forEach((b) => b.onclick = () => {
        if (!ctx.alive() || b.disabled) return;
        const idx = Number(b.dataset.idx);
        sfx.select();
        if (idx === q.oddIndex) {
          btns.forEach((x) => { x.disabled = true; });
          b.classList.add("odd-hit");
          sfx.right(); FX.confetti(18);
          const p = praise(); ctx.tell(p, `${p} ${q.why}`);
          resolve(); return;
        }
        ctx.miss(); tries++;
        b.classList.add("wrong"); b.disabled = true; sfx.oops(); FX.shake(b);
        if (tries < 2) {
          const t = tryAgain(); ctx.tell(t, `${t} That sentence fits the topic! ${q.hint}`);
          return;
        }
        btns.forEach((x) => {
          x.disabled = true;
          if (Number(x.dataset.idx) === q.oddIndex) x.classList.add("odd-hit");
        });
        ctx.tell("Here's the sentence that doesn't belong.", `Here's the sentence that doesn't belong. ${q.why}`);
        setTimeout(resolve, 1800);
      });
    });
  },

  // Grade 1 beginner keyboard: type each letter of the missing word into inline boxes.
  async "type-word"(q, ctx) {
    document.body.classList.add("has-qwerty");
    let unbind = () => {}, idleTimer = 0;
    try {
      const [before, after] = q.text.split("___");
      const letters = [...q.answer];
      ctx.board.innerHTML = `
        <div class="build-head">
          <span class="scene-badge" aria-hidden="true">${q.emoji}</span>
          <button type="button" class="btn small" data-own-sound data-clue>🔊 Hear sentence</button>
        </div>
        <div class="type-sentence-inline">
          <span>${esc(before)}</span><span class="word-slots type-boxes">${letters.map((_, i) => `<button type="button" class="word-slot type-box empty" data-own-sound aria-label="letter ${i + 1}"></button>`).join("")}</span><span>${esc(after ?? "")}</span>
        </div>`;
      ctx.board.querySelector("[data-clue]").onclick = () => speak(q.text.replace("___", q.answer), { force: true });

      buildKeyboard(ctx.dock, { sentence: false });
      const slots = [...ctx.board.querySelectorAll(".type-box")];
      const filled = Array(letters.length).fill(null);
      const keyHints = S.settings().keyHints ?? "auto";
      let tries = 0, done = false, manualGuide = false, idleGuide = false;

      const guideForWord = () => {
        if (done || keyHints === "off") return null;
        if (filled.some((c, i) => c != null && c !== letters[i])) {
          return (keyHints === "always" || ctx.qIndex < 3 || manualGuide || idleGuide) ? "back" : null;
        }
        const ni = filled.indexOf(null);
        if (ni < 0) return null;
        return (keyHints === "always" || ctx.qIndex < 3 || manualGuide || idleGuide) ? letters[ni] : null;
      };

      const armIdle = () => {
        clearTimeout(idleTimer);
        idleGuide = false;
        if (done || keyHints !== "auto" || ctx.qIndex < 3) return;
        idleTimer = setTimeout(() => { if (!done && ctx.alive()) { idleGuide = true; paint(); } }, 4500);
      };

      const showGhost = keyHints !== "off" && ctx.qIndex < 2;
      const paint = () => {
        const nextEmpty = filled.indexOf(null);
        const prefixOk = !filled.some((c, i) => c != null && c !== letters[i]);
        slots.forEach((s, i) => {
          const c = filled[i];
          s.classList.toggle("empty", c == null);
          if (c != null) {
            s.textContent = c;
          } else if (showGhost && prefixOk && i === nextEmpty) {
            s.innerHTML = `<span class="ghost-letter" aria-hidden="true">${esc(letters[i])}</span>`;
          } else {
            s.textContent = "";
          }
        });
        updateKeyboardState(ctx.dock, { guideKey: guideForWord(), disabled: done });
      };

      ctx.onHint = () => { manualGuide = true; paint(); };
      const cleanTimer = () => clearTimeout(idleTimer);
      ctx.onCleanup?.(cleanTimer);

      const ok = await new Promise((resolve) => {
        const check = () => {
          if (filled.some((c) => c == null)) return;
          if (filled.join("") === q.answer) {
            done = true; clearTimeout(idleTimer); unbind();
            slots.forEach((s) => s.classList.add("right"));
            paint(); resolve(true); return;
          }
          ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".type-boxes"));
          if (tries < 2) {
            filled.forEach((c, i) => { if (c !== letters[i]) filled[i] = null; });
            manualGuide = true; paint();
            const t = tryAgain(); ctx.tell(t, `${t} The right letters stay! ${q.hint}`);
            return;
          }
          done = true; clearTimeout(idleTimer); unbind();
          letters.forEach((c, i) => { filled[i] = c; });
          slots.forEach((s) => s.classList.add("right"));
          paint(); resolve(false);
        };
        const place = (ch) => {
          if (done || !ctx.alive()) return;
          const i = filled.indexOf(null);
          if (i < 0) return;
          filled[i] = ch; sfx.key(i + 1);
          speak(ch.toUpperCase(), { force: true });
          armIdle(); paint(); check();
        };
        const backspace = () => {
          if (done || !ctx.alive()) return;
          for (let i = filled.length - 1; i >= 0; i--) {
            if (filled[i] != null) { filled[i] = null; sfx.back?.(); armIdle(); paint(); break; }
          }
        };
        ctx.dock.querySelectorAll("[data-key]").forEach((k) => k.onclick = () => place(k.dataset.key));
        ctx.dock.querySelector("[data-back]").onclick = backspace;
        slots.forEach((s, i) => s.onclick = () => { if (done || filled[i] == null) return; filled[i] = null; sfx.back?.(); armIdle(); paint(); });
        unbind = bindWritingKeys(ctx, {
          sentence: false,
          onChar: (ch) => { const k = ctx.dock.querySelector(`[data-key="${ch}"]`); if (k) FX.pop(k, 1.08); place(ch); },
          onBackspace: () => { const b = ctx.dock.querySelector("[data-back]"); if (b) FX.pop(b, 1.08); backspace(); },
        });
        armIdle(); paint();
      });
      if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${q.why}`); return; }
      ctx.tell("Here's the word.", `Here's the word: ${q.why}`);
      await new Promise((r) => setTimeout(r, 1600));
    } finally {
      clearTimeout(idleTimer); unbind();
      document.body.classList.remove("has-qwerty");
    }
  },

  // Type a full sentence (exact/multi-variant match with smart capital, punctuation & word diagnostics).
  async "type-sentence"(q, ctx) {
    document.body.classList.add("has-qwerty");
    let unbind = () => {}, idleTimer = 0;
    try {
      const promptCard = q.model
        ? `<div class="scene-badge" aria-hidden="true">${q.emoji ?? "✍️"}</div>
           <div class="passage"><span class="tag-label">Type this sentence</span><div class="passage-text">${esc(q.model)}</div></div>
           <button type="button" class="btn small read-me" data-own-sound data-read-board>🔊 Read it to me</button>`
        : boardContextHtml(q);
      ctx.board.innerHTML = `${promptCard}
        <div class="write-box" role="textbox" aria-multiline="true" aria-label="Type your sentence here"></div>
        <div class="write-tools">
          <button type="button" class="btn small ghosty" data-own-sound data-read-mine>🔊 Read my writing</button>
          <button type="button" class="btn small ghosty" data-own-sound data-reset-box>${q.prefill ? "↺ Reset draft" : "↺ Clear"}</button>
        </div>`;

      const rb = ctx.board.querySelector("[data-read-board]");
      if (rb) rb.onclick = () => speak(q.model ?? boardVoiceText(q), { force: true });

      const writeBox = ctx.board.querySelector(".write-box");
      const keyHints = S.settings().keyHints ?? "auto";
      let tries = 0, manualGuide = false, idleGuide = false, ed = null;

      const guideFor = (text, shift, done) => {
        if (done || !q.answer || keyHints === "off") return null;
        const cand = nextGuidedKey(text, q.answer, shift);
        if (!cand) return null;
        if (keyHints === "always") return cand;
        if (q.model) {
          if (ctx.qIndex < 2 || manualGuide || idleGuide) return cand;
          if (ctx.qIndex === 2 && !/^[a-z]$/.test(cand)) return cand;
        }
        return null;
      };
      const ghostFor = (text, pos, done) => {
        if (done || !q.model || keyHints === "off" || ctx.qIndex >= (ctx.level.ghostCount ?? 0)) return "";
        return (pos === text.length && q.answer.startsWith(text)) ? q.answer.slice(text.length) : "";
      };
      const armIdle = (done = false) => {
        clearTimeout(idleTimer);
        idleGuide = false;
        if (done || keyHints !== "auto" || !q.model || ctx.qIndex < 2) return;
        idleTimer = setTimeout(() => { if (ctx.alive()) { idleGuide = true; ed?.paint(); } }, 4500);
      };

      ctx.onHint = () => { manualGuide = true; ed?.paint(); };
      ctx.onCleanup?.(() => clearTimeout(idleTimer));

      const ok = await new Promise((resolve) => {
        ed = wireSentenceSession(ctx, {
          writeBox, initial: q.prefill ?? "",
          onActivity: () => armIdle(false),
          render: ({ text, pos, shift, done }) => {
            renderWriteBox(writeBox, {
              text, pos, ghostRest: ghostFor(text, pos, done),
              placeholder: "Tap keys or type your sentence here…", disabled: done,
            });
            updateKeyboardState(ctx.dock, { shift, guideKey: guideFor(text, shift, done), disabled: done });
          },
          onSubmit: ({ text, lock, clearShift }) => {
            const res = checkTypedSentence(text, q);
            if (res.empty) { sfx.select(); FX.shake(writeBox); ctx.tell(res.msg); return; }
            if (res.ok) {
              clearTimeout(idleTimer); writeBox.classList.add("right"); lock(); resolve(true); return;
            }
            ctx.miss(); tries++; sfx.oops(); FX.shake(writeBox);
            if (tries < 2) { clearShift(); ctx.tell(res.msg, res.msg); return; }
            clearTimeout(idleTimer); writeBox.classList.add("right"); lock(q.answer); resolve(false);
          },
        });
        unbind = ed.unbind;
        armIdle(false);
      });

      if (ok) { sfx.right(); FX.confetti(22); const p = praise(); ctx.tell(p, `${p} ${q.why}`); return; }
      ctx.tell("Here's one great way to write it.", `Here's one great way to write it. ${q.answer}`);
      await new Promise((r) => setTimeout(r, 1800));
    } finally {
      clearTimeout(idleTimer); unbind();
      document.body.classList.remove("has-qwerty");
    }
  },

  // Open-ended Grades 3–4 original sentence writing checked live by the 4-part Writer's Checklist.
  async "write-free"(q, ctx) {
    document.body.classList.add("has-qwerty");
    let unbind = () => {};
    try {
      ctx.board.innerHTML = `${boardContextHtml(q)}
        <div class="checklist" aria-live="polite"></div>
        <div class="write-box" role="textbox" aria-multiline="true" aria-label="Write your sentence here"></div>
        <div class="write-tools">
          <button type="button" class="btn small ghosty" data-own-sound data-read-mine>🔊 Read my writing</button>
          <button type="button" class="btn small ghosty" data-own-sound data-reset-box>↺ Clear</button>
        </div>
        <div class="model-slot" hidden></div>`;

      const rb = ctx.board.querySelector("[data-read-board]");
      if (rb) rb.onclick = () => speak(boardVoiceText(q), { force: true });

      const checklistEl = ctx.board.querySelector(".checklist");
      const writeBox = ctx.board.querySelector(".write-box");
      const modelSlot = ctx.board.querySelector(".model-slot");
      let tries = 0;

      const showModel = () => {
        modelSlot.hidden = false;
        modelSlot.innerHTML = `<div class="model-box"><span class="tag-label">Sample writer's sentence</span><div class="model-text">${esc(q.sample)}</div><p class="muted small" style="margin:4px 0 0">${esc(q.why)}</p></div>`;
      };

      const ok = await new Promise((resolve) => {
        const ed = wireSentenceSession(ctx, {
          writeBox, initial: "",
          render: ({ text, pos, shift, done }) => {
            const checks = evaluateChecklist(text, q);
            checklistEl.innerHTML = checks.map((c) =>
              `<span class="chk-pill${c.ok ? " ok" : ""}" data-chk="${c.id}">${c.ok ? "✓" : "○"} ${esc(c.label)}</span>`
            ).join("");
            renderWriteBox(writeBox, {
              text, pos, placeholder: "Tap keys or type your own sentence here…", disabled: done,
            });
            updateKeyboardState(ctx.dock, { shift, disabled: done });
          },
          onSubmit: ({ text, lock, clearShift }) => {
            const res = checkFreeWrite(text, q);
            if (res.empty) { sfx.select(); FX.shake(writeBox); ctx.tell(res.msg); return; }
            if (res.ok) {
              writeBox.classList.add("right"); showModel(); lock(); resolve(res.typed); return;
            }
            ctx.miss(); tries++; sfx.oops(); FX.shake(writeBox);
            const firstBad = checklistEl.querySelector(".chk-pill:not(.ok)");
            if (firstBad) FX.shake(firstBad);
            if (tries < 2) { clearShift(); ctx.tell(res.msg, res.msg); return; }
            showModel(); lock(); resolve(false);
          },
        });
        unbind = ed.unbind;
      });

      if (ok) {
        sfx.right(); FX.confetti(24);
        const p = praise();
        ctx.tell(p, `${p} Listen to what you wrote: ${ok}`);
        return;
      }
      ctx.tell("Here's a sample sentence you can study.", `Here's a sample sentence: ${q.sample}`);
      await new Promise((r) => setTimeout(r, 2000));
    } finally {
      unbind();
      document.body.classList.remove("has-qwerty");
    }
  },
};

installClickSounds();
jingleOnce("writing", () => S.settings().sounds);
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
