// Spelling: grades 1 to 3, plus the family's own weekly words. Plain ES modules, no build step.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("spelling:v1", { myWords: "", qwerty: false });

import { createRouter } from "./kit/router.js";
import { speak, stop, unmark, preloadSounds } from "./kit/tts.js";
import { addSoundVoiceSetting, voicePickerHtml, wireVoicePicker } from "./clips.js"; // Mom's and Dad's recorded sounds ({{ay}}, {{shh}}) in the lessons
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { showLesson } from "./kit/lesson.js";
import { leadIn, praise, tryAgain, vary } from "./kit/vary.js";
import { esc, starsHtml, nextButton, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { GRADES, LEVELS, MINE, levelById, makeLevel, PER_LEVEL, starsFor, wordOf, focusIndexes, letterNames, parseMyWords, LETTER_SOUNDS, soundIdsFor, soundSpeak, QWERTY_ROWS, usesQwerty } from "./spelling.js";

const app = document.getElementById("app");
const myWords = () => parseMyWords(S.settings().myWords);

const route = createRouter([
  [/^$/, viewHome],
  [/^play\/([\w-]+)$/, viewPlay],
  [/^words$/, viewWords],
  [/^grownups$/, () => {
    viewGrownups(app, {
      extraToggles: [["qwerty", "Full QWERTY keyboard for all grades", "3rd grade always uses the full A–Z keyboard. Turn this on for 1st grade, 2nd grade, and My Words too."]],
      about: ABOUT,
    });
    addMyWordsLink();
    addSoundVoiceSetting(app);
  }],
], {
  before() { stop(); FX.clearFx(); document.body.classList.remove("in-game", "has-qwerty"); },
});

const ABOUT = `
  <p><b>Spelling</b> teaches the spelling patterns in the same order as <a href="https://angelio.org/read/">Read Aloud</a>, so
    what a child learns to read, they then learn to spell:</p>
  <ul>
    <li><b>1st grade:</b> short vowels, ck/ll/ss/ff, sh/ch/th; then blends at the start and end, and adding -s or -es, -ing and -ed.</li>
    <li><b>2nd grade:</b> magic e, ai/ay, ee/ea, oa/ow; then igh and y, y at the end (baby), bossy r, oi/oy and ou/ow, tch and dge.</li>
    <li><b>3rd grade:</b> the rules for adding endings (drop the e, double the last letter, y to i, f to ves); then silent letters,
      -tion/-ture/-le, and ABC order (by the first, then the second letter).</li>
  </ul>
  <p>Each level starts with a card that explains the pattern. Then your child picks the right spelling of three, fills in the
    missing part of a word (with 1st-grade 🔊 buttons to preview Mom or Dad saying each phonetic sound), and spells words with
    letter tiles or by typing on a physical or full 3rd-grade QWERTY keyboard. The wrong choices are the mistakes kids really make
    (rane for rain, duk for duck, hoping for hopping), never a real word that sounds the same.</p>
  <p><b>My Words:</b> type this week's spelling list from school, and it becomes a level of its own at the top of the home page.</p>
  <p>A mistake gets a hint and a second try; after that the answer is shown and spelled out, and the game moves on.</p>`;

// ───────── home ─────────

function viewHome() {
  const mine = myWords();
  const next = LEVELS.find((s) => !S.progress(s.id).done) ?? LEVELS[0];
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Spelling</h1>
      <p class="lede">Hear a word, then spell it, letter by letter!</p>
      <a class="btn big primary play-btn" href="#/play/${next.id}">▶ Play</a>
      ${voicePickerHtml()}
      <div class="my-words-card">
        ${mine.length
          ? `<a class="level-card mine" href="#/play/${MINE.id}"><span class="emoji">${MINE.emoji}</span>My Words <span class="muted small">(${mine.length})</span>${starsHtml(S.progress(MINE.id).stars)}</a>
             <a class="btn small" href="#/words">Change my words</a>`
          : `<a class="btn" href="#/words">✏️ Add this week's spelling words</a>`}
      </div>
      <nav class="grade-jump" aria-label="Jump to a grade">
        ${GRADES.map((g) => `<button type="button" class="grade-chip" data-grade="${g.n}">${g.emoji} ${esc(g.title)}</button>`).join("")}
      </nav>
    </section>
    ${GRADES.map((g) => `
      <section class="grade" id="grade-${g.n}">
        <h2 class="grade-title"><span aria-hidden="true">${g.emoji}</span> ${esc(g.title)}</h2>
        <p class="muted grade-blurb">${esc(g.blurb)}</p>
        ${[1, 2].map((lv) => `
        <h3 class="level-title">Level ${lv}<span>${esc(g.levels[lv - 1])}</span></h3>
        <div class="level-grid">
          ${LEVELS.filter((s) => s.grade === g.n && s.level === lv).map((s) => `
            <a class="level-card${s.id === next.id ? " next" : ""}" href="#/play/${s.id}">
              <span class="emoji">${s.emoji}</span>${esc(s.title)}${starsHtml(S.progress(s.id).stars)}
            </a>`).join("")}
        </div>`).join("")}
      </section>`).join("")}
    ${stickerBook()}`;
  wireVoicePicker(app, speak);
  app.querySelectorAll("[data-grade]").forEach((btn) => {
    btn.onclick = () => {
      S.setSetting("lastGrade", Number(btn.dataset.grade));
      document.getElementById(`grade-${btn.dataset.grade}`)?.scrollIntoView({ behavior: "smooth" });
    };
  });
  const lastG = Number(S.settings().lastGrade || 0);
  if (lastG > 3) setTimeout(() => document.getElementById(`grade-${lastG}`)?.scrollIntoView({ behavior: "auto", block: "start" }), 0);
}

// ───────── My Words (for grown-ups: this week's list from school) ─────────

function viewWords() {
  app.innerHTML = `
    <section class="words-page">
      <h1>✏️ My Words</h1>
      <p class="muted">Type this week's spelling words (from school, or your own). Put a space, comma or new line between them.
        They become a level at the top of the home page.</p>
      <div class="card">
        <textarea class="words-box" rows="6" spellcheck="false" autocapitalize="none" autocomplete="off"
          placeholder="said, friend, because, church…">${esc(S.settings().myWords ?? "")}</textarea>
        <div class="word-chips" aria-live="polite"></div>
        <div class="row">
          <button class="btn primary" data-save>💾 Save</button>
          <button class="btn" data-hear>🔊 Hear them</button>
          <button class="btn danger small" data-clear>Clear</button>
        </div>
      </div>
      <p class="muted small">Letters only (2 to 12 letters a word). The words stay on this device.</p>
    </section>`;
  const box = app.querySelector(".words-box"), chips = app.querySelector(".word-chips");
  const paint = () => {
    const ws = parseMyWords(box.value);
    chips.innerHTML = ws.length ? ws.map((w) => `<span class="chip">${esc(w)}</span>`).join("") : `<span class="muted small">No words yet.</span>`;
  };
  box.oninput = paint; paint();
  app.querySelector("[data-save]").onclick = () => {
    const ws = parseMyWords(box.value);
    S.setSetting("myWords", ws.join(", "));
    sfx.right();
    location.hash = ws.length ? `#/play/${MINE.id}` : "#/";
  };
  app.querySelector("[data-hear]").onclick = () => { const ws = parseMyWords(box.value); if (ws.length) speak(ws.join(". "), { force: true }); };
  app.querySelector("[data-clear]").onclick = () => { if (confirm("Clear all your words?")) { box.value = ""; S.setSetting("myWords", ""); paint(); } };
}
function addMyWordsLink() {
  const card = app.querySelector(".card:not([data-voice-picker])");
  if (!card) return;
  const row = document.createElement("div");
  row.className = "set";
  row.innerHTML = `<span><b>My Words</b><br><span class="muted small">This week's spelling list, as a level of its own.</span></span><a class="btn small" href="#/words">✏️ Edit</a>`;
  card.prepend(row);
}

// ───────── play ─────────

function viewPlay(id) {
  const level = levelById(id);
  if (!level) { location.hash = "#/"; return; }
  if (level.kind === "mine" && !myWords().length) { location.hash = "#/words"; return; }
  if (level.grade) S.setSetting("lastGrade", level.grade);
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
  let alive = true, mistakes = 0, current = null;
  const cleanups = [];
  const tell = (text, voice = text) => {
    bubble.querySelector(".say").innerHTML = esc(unmark(text));
    bubble.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }], { duration: 280 });
    speak(voice);
  };
  const ctx = { level, bubble, dock, board, tell, alive: () => alive, miss: () => mistakes++, onCleanup: (fn) => cleanups.push(fn) };
  app.querySelector("[data-read]").onclick = () => current && speak(current.say, { force: true });
  app.querySelector("[data-hint]").onclick = () => current && tell(`💡 ${hintFor(current, level)}`);

  (async () => {
    await showLesson(board, lessonFor(level));
    if (!alive) return;
    const qs = makeLevel(level, Date.now(), myWords());
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
      id: level.id, stars: starsFor(mistakes), mistakes, title: vary("finish", ["You did it!", "Super spelling!", "Wonderful work!", "Way to go!"]),
      done: `${PER_LEVEL} done.`, again: `#/play/${level.id}`, onAgain: route,
      next: nx && level.kind !== "mine" ? { href: `#/play/${nx.id}`, label: `Next: ${nx.emoji} ${nx.title} ▶` } : null,
    });
  })();
  return () => { alive = false; document.body.classList.remove("has-qwerty"); cleanups.splice(0).forEach((fn) => fn()); };
}

/** The "How it works" card: the rule, and three of the level's words with the tricky part in color. */
function lessonFor(level) {
  let ex = "";
  if (level.kind === "pattern") {
    ex = `<div class="lesson-words">${level.words.slice(0, 3).map(([spec, emoji]) => `<span class="lesson-word lesson-focus"><span class="pic">${emoji}</span>${wordHtml(wordOf(spec), focusIndexes(spec))}</span>`).join("")}</div>`;
  } else if (level.kind === "rule") {
    ex = `<div class="lesson-words">${level.words.slice(0, 2).map(([w, base, end, emoji]) => `<span class="lesson-word lesson-focus"><span class="pic">${emoji}</span><span class="rule-sum">${esc(base)} + ${esc(end)}</span><span class="spelled">${esc(w)}</span></span>`).join("")}</div>`;
  } else if (level.kind === "abc") {
    ex = `<div class="lesson-words">${["cat", "clock", "crab"].map((w) => `<span class="lesson-word lesson-focus"><span class="spelled"><b class="hl">${w.slice(0, 2)}</b>${w.slice(2)}</span></span>`).join("")}</div>`;
  }
  return { emoji: level.emoji, title: level.title, rule: level.teach, exampleHtml: ex, voice: level.say };
}

/** A word in big letters, with some letters (the tricky part) in color. */
const wordHtml = (w, hl = []) => `<span class="spelled">${[...w].map((c, i) => (hl.includes(i) ? `<b class="hl">${esc(c)}</b>` : esc(c))).join("")}</span>`;
const plain = (html) => String(html).replace(/<[^>]+>/g, "");

function hintFor(q, level) {
  if (q.type === "abc") return q.second ? `They all start with ${q.words[0][0]}, so look at the second letter. Which one comes first in the ABC?` : "Look at the first letter of each word. Which letter comes first in the ABC?";
  if (level.kind === "mine") return `Say it slowly: ${q.word}. Listen for every sound, and write a letter for each one.`;
  return `Say it slowly: ${q.word}. ${plain(level.teach)}`;
}
const rightLine = (q) => (q.type === "abc" ? `${q.answer.split(" ").join(", ")}.` : `${q.word}: ${letterNames(q.word)}.`);

// ───────── shared pieces ─────────

/** The picture (or a big "hear it" button for My Words) with a 🔊 to hear the word again. */
function pictureHtml(q) {
  if (!q.emoji) return `<button class="hear-big" data-own-sound data-hear aria-label="Hear the word">🔊<span>Hear the word</span></button>`;
  return `<div class="sound-card small"><span class="pic big" aria-hidden="true">${q.emoji}</span>
    <button class="hear-sound" data-own-sound data-hear aria-label="Hear the word">🔊</button></div>`;
}
const wireHear = (ctx, q) => { const b = ctx.board.querySelector("[data-hear]"); if (b) b.onclick = () => speak(q.word, { force: true }); };
const ruleSum = (q) => (q.base ? `<div class="rule-sum big">${esc(q.base)} <span class="plus">+</span> ${esc(q.end)}</div>` : "");

/** Choices in the dock; resolves on the right one (or after two misses, with the answer shown). */
function choose(ctx, q, kind, html, { onRight } = {}) {
  ctx.dock.innerHTML = `<div class="choices ${kind}">${html}</div>`;
  ctx.dock.querySelectorAll("[data-say-sound]").forEach((b) => b.onclick = () => {
    FX.pop(b, 1.12);
    speak(b.dataset.saySound, { force: true });
  });
  let tries = 0;
  return new Promise((resolve) => {
    ctx.dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
      if (!ctx.alive() || b.disabled) return;
      sfx.select();
      const all = ctx.dock.querySelectorAll("[data-v]");
      if (b.dataset.v === q.answer) {
        all.forEach((x) => { x.disabled = true; });
        b.classList.add("right"); sfx.right(); FX.confetti(18); onRight?.();
        const p = praise(); ctx.tell(p, `${p} ${rightLine(q)}`);
        resolve();
        return;
      }
      ctx.miss(); tries++;
      b.classList.add("wrong"); b.disabled = true; sfx.oops(); FX.shake(b);
      if (tries < 2) { const t = tryAgain(); ctx.tell(t, `${t} ${hintFor(q, ctx.level)}`); return; }
      all.forEach((x) => { x.disabled = true; if (x.dataset.v === q.answer) x.classList.add("right"); });
      onRight?.();
      ctx.tell("Here's the answer.", `Here's the answer. ${rightLine(q)}`);
      setTimeout(resolve, 1500);
    });
  });
}

/**
 * Tap things into numbered boxes, in order (letters into a word, words into ABC order). Tapping a filled box sends it
 * back. When every box is full it checks: the right ones stay after a first miss; a second miss shows the answer.
 */
function fillBoxes(ctx, { slots, tiles, want, value, onPlace, render, onFail }) {
  const filled = Array(slots.length).fill(null);
  let tries = 0, done = false;
  const paint = () => slots.forEach((s, i) => { const t = filled[i]; s.classList.toggle("empty", t == null); s.innerHTML = t == null ? "" : render(t); });
  return new Promise((resolve) => {
    const check = () => {
      if (filled.some((t) => t == null)) return;
      if (filled.every((t, i) => value(t) === want[i])) { done = true; slots.forEach((s) => s.classList.add("right")); resolve(true); return; }
      ctx.miss(); tries++; sfx.oops(); FX.shake(slots[0].parentElement);
      if (tries < 2) {
        filled.forEach((t, i) => { if (value(t) !== want[i]) { tiles[t].disabled = false; filled[i] = null; } }); // keep the right ones
        paint(); const t = tryAgain(); ctx.tell(t, `${t} The right ones stay. ${onFail()}`); return;
      }
      done = true;
      tiles.forEach((t) => { t.disabled = true; });
      const used = new Set();
      want.forEach((w, i) => { const j = tiles.findIndex((_, k) => value(k) === w && !used.has(k)); used.add(j); filled[i] = j; });
      paint(); resolve(false);
    };
    tiles.forEach((t, ti) => t.onclick = () => {
      if (done || t.disabled || !ctx.alive()) return;
      const i = filled.indexOf(null);
      if (i < 0) return;
      filled[i] = ti; t.disabled = true; sfx.key(i + 1); onPlace?.(ti);
      paint(); check();
    });
    slots.forEach((s, i) => s.onclick = () => { if (done || filled[i] == null) return; tiles[filled[i]].disabled = false; filled[i] = null; sfx.back?.(); paint(); });
  });
}

/** Physical keyboard typing (a–z and Backspace) for Spell It questions, auto-cleaned on question exit. */
function bindKeys(ctx, { onLetter, onBackspace }) {
  const onKey = (e) => {
    if (!ctx.alive() || e.metaKey || e.ctrlKey || e.altKey || e.target?.matches?.("input, textarea, select")) return;
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); onLetter(e.key.toLowerCase()); }
    else if (e.key === "Backspace") { e.preventDefault(); onBackspace(); }
  };
  document.addEventListener("keydown", onKey);
  const unbind = () => document.removeEventListener("keydown", onKey);
  ctx.onCleanup?.(unbind);
  return unbind;
}

// ───────── each kind of question ─────────

const ASK = {
  // Hear the word (and see its picture), pick the right spelling of three.
  async pick(q, ctx) {
    ctx.board.innerHTML = `${pictureHtml(q)}${ruleSum(q)}`;
    wireHear(ctx, q);
    await choose(ctx, q, "word-choices", q.choices.map((c) => `<button class="choice-card word-pick" data-v="${esc(c)}"><span class="spelled">${esc(c)}</span></button>`).join(""));
  },
  // Rule levels: base + ending = ? (the same as pick, with the sum shown).
  async rule(q, ctx) { return ASK.pick(q, ctx); },
  // The word with its tricky part missing: pick the part (with phonetic sound preview buttons in 1st grade).
  async missing(q, ctx) {
    const g1 = ctx.level.grade === 3;
    const end = q.post === "" && q.pre !== "";
    if (g1) preloadSounds(q.choices.flatMap((c) => soundIdsFor(c, { end })));
    ctx.board.innerHTML = `${pictureHtml(q)}
      <div class="word-row spelled">${esc(q.pre)}<span class="blank" aria-label="missing letters"></span>${esc(q.post)}</div>`;
    wireHear(ctx, q);
    const blank = ctx.board.querySelector(".blank");
    const choiceBtn = (c) => {
      const btn = `<button class="choice-card letter-card part-card" data-v="${esc(c)}" aria-label="${esc(letterNames(c))}"><span class="abc">${esc(c)}</span></button>`;
      if (!g1) return btn;
      return `<div class="sound-choice">${btn}<button type="button" class="hear-mini" data-own-sound data-say-sound="${esc(soundSpeak(c, { end }))}" aria-label="Hear sound for ${esc(c)}">🔊</button></div>`;
    };
    await choose(ctx, q, "letter-choices", q.choices.map(choiceBtn).join(""),
      { onRight: () => { blank.textContent = q.answer; blank.classList.add("filled"); FX.pop(blank, 1.1); } });
  },
  // Spell it from letter tiles (1st/2nd grade) or a full 26-letter QWERTY keyboard (3rd grade or toggle), plus physical keyboard typing.
  async spell(q, ctx) {
    ctx.board.innerHTML = `${pictureHtml(q)}${ruleSum(q)}
      <div class="sound-boxes letter-boxes" style="--n:${q.letters.length}">${q.letters.map((_, i) => `<button class="sound-box empty" data-own-sound aria-label="box ${i + 1}"></button>`).join("")}</div>`;
    wireHear(ctx, q);
    const slots = [...ctx.board.querySelectorAll(".sound-box")];
    const qwerty = usesQwerty(ctx.level, S.settings());
    const g1 = ctx.level.grade === 3;

    if (qwerty) {
      document.body.classList.add("has-qwerty");
      try {
        if (g1) preloadSounds(Object.keys(LETTER_SOUNDS).flatMap((l) => soundIdsFor(l)));
        ctx.dock.innerHTML = `<div class="qwerty">${QWERTY_ROWS.map((row, r) => `<div class="qwerty-row">${row.map((l) =>
          `<button type="button" class="qkey" data-own-sound data-key="${l}" aria-label="letter ${l}"><span class="abc">${l}</span></button>`).join("")}${r === 2
          ? `<button type="button" class="qkey qkey-back" data-own-sound data-back aria-label="Backspace">⌫</button>` : ""}</div>`).join("")}</div>`;
        const keys = [...ctx.dock.querySelectorAll(".qkey")];
        const disableKeys = () => keys.forEach((k) => { k.disabled = true; });
        const filled = Array(q.letters.length).fill(null);
        let tries = 0, done = false;
        const paint = () => slots.forEach((s, i) => {
          const c = filled[i];
          s.classList.toggle("empty", c == null);
          s.innerHTML = c == null ? "" : `<span class="abc">${c}</span>`;
        });
        let unbind = () => {};
        const ok = await new Promise((resolve) => {
          const check = () => {
            if (filled.some((c) => c == null)) return;
            if (filled.every((c, i) => c === q.letters[i])) {
              done = true; unbind(); disableKeys();
              slots.forEach((s) => s.classList.add("right"));
              resolve(true); return;
            }
            ctx.miss(); tries++; sfx.oops(); FX.shake(slots[0].parentElement);
            if (tries < 2) {
              filled.forEach((c, i) => { if (c !== q.letters[i]) filled[i] = null; });
              paint();
              const t = tryAgain(); ctx.tell(t, `${t} The right ones stay. Listen again: ${q.word}.`);
              return;
            }
            done = true; unbind(); disableKeys();
            q.letters.forEach((c, i) => { filled[i] = c; });
            paint(); resolve(false);
          };
          const place = (ch) => {
            if (done || !ctx.alive()) return;
            const i = filled.indexOf(null);
            if (i < 0) return;
            filled[i] = ch; sfx.key(i + 1);
            speak(g1 ? soundSpeak(ch) : ch.toUpperCase(), { force: true });
            paint(); check();
          };
          const backspace = () => {
            if (done || !ctx.alive()) return;
            for (let i = filled.length - 1; i >= 0; i--) {
              if (filled[i] != null) { filled[i] = null; sfx.back?.(); paint(); break; }
            }
          };
          ctx.dock.querySelectorAll("[data-key]").forEach((k) => k.onclick = () => place(k.dataset.key));
          ctx.dock.querySelector("[data-back]").onclick = backspace;
          slots.forEach((s, i) => s.onclick = () => { if (done || filled[i] == null) return; filled[i] = null; sfx.back?.(); paint(); });
          unbind = bindKeys(ctx, {
            onLetter: (ch) => { const k = ctx.dock.querySelector(`[data-key="${ch}"]`); if (k) FX.pop(k, 1.08); place(ch); },
            onBackspace: () => { const b = ctx.dock.querySelector("[data-back]"); if (b) FX.pop(b, 1.08); backspace(); },
          });
        });
        if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${rightLine(q)}`); return; }
        ctx.tell("Here's the answer.", `Here's how to spell it: ${rightLine(q)}`);
        await new Promise((r) => setTimeout(r, 1600));
        return;
      } finally {
        document.body.classList.remove("has-qwerty");
      }
    }

    if (g1) preloadSounds(q.tiles.flatMap((l) => soundIdsFor(l)));
    const tileBtn = (l, i) => {
      const btn = `<button class="choice-card letter-card tile" data-own-sound data-t="${i}" aria-label="letter ${l}"><span class="abc">${l}</span></button>`;
      if (!g1) return btn;
      return `<div class="tile-wrap">${btn}<button type="button" class="hear-mini" data-own-sound data-say-sound="${esc(soundSpeak(l))}" aria-label="Hear sound for ${l}">🔊</button></div>`;
    };
    ctx.dock.innerHTML = `<div class="tiles">${q.tiles.map(tileBtn).join("")}</div>`;
    ctx.dock.querySelectorAll("[data-say-sound]").forEach((b) => b.onclick = () => {
      FX.pop(b, 1.12);
      speak(b.dataset.saySound, { force: true });
    });
    const tileEls = [...ctx.dock.querySelectorAll(".tile")];
    const unbind = bindKeys(ctx, {
      onLetter: (ch) => {
        const t = tileEls.find((el, i) => !el.disabled && q.tiles[i] === ch);
        if (t) { FX.pop(t, 1.08); t.click(); }
      },
      onBackspace: () => {
        for (let i = slots.length - 1; i >= 0; i--) {
          if (!slots[i].classList.contains("empty")) { slots[i].click(); break; }
        }
      },
    });
    const ok = await fillBoxes(ctx, {
      slots, tiles: tileEls, want: q.letters,
      value: (t) => q.tiles[t], render: (t) => `<span class="abc">${q.tiles[t]}</span>`,
      onPlace: (t) => speak(g1 ? soundSpeak(q.tiles[t]) : q.tiles[t].toUpperCase(), { force: true }),
      onFail: () => `Listen again: ${q.word}.`,
    });
    unbind();
    if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${rightLine(q)}`); return; }
    ctx.tell("Here's the answer.", `Here's how to spell it: ${rightLine(q)}`);
    await new Promise((r) => setTimeout(r, 1600));
  },
  // ABC order: tap the words in order into numbered boxes.
  async abc(q, ctx) {
    const want = q.answer.split(" ");
    ctx.board.innerHTML = `<div class="abc-slots">${q.words.map((_, i) => `<div class="abc-row"><span class="abc-n">${i + 1}</span><button class="abc-slot empty" data-own-sound aria-label="place ${i + 1}"></button></div>`).join("")}</div>`;
    ctx.dock.innerHTML = `<div class="tiles abc-tiles">${q.words.map((w, i) => `<button class="choice-card word-pick tile" data-own-sound data-t="${i}"><span class="spelled">${q.second ? `${w[0]}<b class="hl">${w[1]}</b>${esc(w.slice(2))}` : `<b class="hl">${w[0]}</b>${esc(w.slice(1))}`}</span></button>`).join("")}</div>`;
    const ok = await fillBoxes(ctx, {
      slots: [...ctx.board.querySelectorAll(".abc-slot")], tiles: [...ctx.dock.querySelectorAll(".tile")], want,
      value: (t) => q.words[t], render: (t) => `<span class="spelled">${esc(q.words[t])}</span>`,
      onPlace: (t) => speak(q.words[t], { force: true }),
      onFail: () => hintFor(q, ctx.level),
    });
    if (ok) { sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${rightLine(q)}`); return; }
    ctx.tell("Here's the answer.", `Here's the A B C order: ${rightLine(q)}`);
    await new Promise((r) => setTimeout(r, 1600));
  },
};

installClickSounds();
jingleOnce("spelling", () => S.settings().sounds); // the app's little logo sound, on the first tap
route();
keepDockVisible();
// Offline support. Updates never reload the page by themselves (a tap during a reload would open a
// game and then drop the child back on Home). The offline files fetch fresh copies first, so the next
// visit is up to date anyway.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").then((reg) => reg.update()).catch(() => {});
}

// Apps saved to a home screen stay paused in memory for days. When this one comes back after 10 minutes
// or more, it checks for a newer version and reloads into it, but only on its home page (never mid-game).
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
