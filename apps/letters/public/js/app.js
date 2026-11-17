// Letter Lane: PreK and Kindergarten reading. Plain ES modules, no build step.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("letters:v1", {});

import { createRouter } from "./kit/router.js";
import { speak, stop, unmark, preloadSounds } from "./kit/tts.js";
import { addSoundVoiceSetting } from "./clips.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { showLesson } from "./kit/lesson.js";
import { leadIn, praise, tryAgain, vary } from "./kit/vary.js";
import { esc, starsHtml, nextButton, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { GRADES, STAGES, stageById, PER_STAGE, makeStage, LETTERS, soundSay, starsFor } from "./reading.js";
import { LESSONS } from "./lessons.js";
import { patternById, chunks, focusIndexes, patternWord } from "./phonics.js";
import { snd } from "./letter-sounds.js";

const app = document.getElementById("app");

const route = createRouter([
  [/^$/, viewHome],
  [/^play\/([\w-]+)$/, viewPlay],
  [/^grownups$/, () => { viewGrownups(app, { about: ABOUT }); addSoundVoiceSetting(app); }],
], {
  before() { stop(); FX.clearFx(); document.body.classList.remove("in-game"); },
});

const ABOUT = `
  <p><b>Letter Lane</b> follows the usual early-reading steps:</p>
  <ul>
    <li><b>PreK:</b> letters and their sounds in three small groups (s a t p i n, then m d g o c k, then e u r h b f l),
      the first sound in a word, rhymes, and clapping the beats (syllables) in a word.</li>
    <li><b>Kindergarten:</b> big and little letters, blending three sounds into a word (c-a-t, cat), and building words from their sounds.</li>
  </ul>
  <p>Letters are shown in <b>Andika</b>, a font made for beginning readers. The read-aloud voice can't make perfectly pure
    letter sounds, so each sound comes with a picture word ("sss, like sun"). Saying the sounds together with your child helps.</p>
  <p>A mistake gets a hint and a second try; after that the answer is shown, and the game moves on.</p>`;

// ───────── home ─────────

function viewHome() {
  const next = STAGES.find((s) => !S.progress(s.id).done) ?? STAGES[0];
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Letter Lane</h1>
      <p class="lede">Letters, sounds, rhymes, and your very first words!</p>
      <a class="btn big primary play-btn" href="#/play/${next.id}">▶ Play</a>
      <nav class="grade-jump" aria-label="Jump to a grade">
        ${GRADES.map((g) => `<button type="button" class="grade-chip" data-grade="${g.n}">${g.emoji} ${esc(g.title)}</button>`).join("")}
      </nav>
    </section>
    ${GRADES.map((g) => `
      <section class="grade" id="grade-${g.n}">
        <h2 class="grade-title"><span aria-hidden="true">${g.emoji}</span> ${esc(g.title)}</h2>
        <p class="muted grade-blurb">${esc(g.blurb)}</p>
        <div class="level-grid">
          ${STAGES.filter((s) => s.grade === g.n).map((s) => `
            <a class="level-card${s.id === next.id ? " next" : ""}" href="#/play/${s.id}">
              <span class="emoji">${s.emoji}</span>${esc(s.title)}${starsHtml(S.progress(s.id).stars)}
            </a>`).join("")}
        </div>
      </section>`).join("")}
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
  const stage = stageById(id);
  if (!stage) { location.hash = "#/"; return; }
  S.setSetting("lastGrade", stage.grade);
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play">
      <div class="play-top">
        <a class="icon-btn" href="#/" aria-label="Exit">✕</a>
        <div class="dots">${Array.from({ length: PER_STAGE }, (_, k) => `<i data-dot="${k}"></i>`).join("")}</div>
        <button class="icon-btn" data-read title="Say it again" aria-label="Say it again">💬</button>
        <button class="icon-btn" data-hint title="Hint" aria-label="Hint">💡</button>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble" aria-live="polite"><span class="mascot" aria-hidden="true">${stage.emoji}</span><p class="say"></p></div>
      <div class="card board"></div>
    </section>
    <div class="dock"></div>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const bubble = app.querySelector(".bubble"), dock = app.querySelector(".dock"), board = app.querySelector(".board");
  let alive = true, mistakes = 0, current = null;
  const tell = (text, voice = text) => {
    bubble.querySelector(".say").innerHTML = esc(unmark(text));
    sayRun++; // stops a sounding-out in progress
    bubble.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }], { duration: 280 });
    speak(voice);
  };
  const ctx = { bubble, dock, board, tell, alive: () => alive, miss: () => mistakes++ };
  app.querySelector("[data-read]").onclick = () => current && speak(current.say, { force: true });
  app.querySelector("[data-hint]").onclick = () => current && tell(`💡 ${hintFor(current)}`);

  (async () => {
    await showLesson(board, LESSONS[stage.id]);
    if (!alive) return;
    const qs = makeStage(stage);
    for (let k = 0; k < qs.length && alive; k++) {
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      const q = (current = qs[k]), before = mistakes;
      tell(q.prompt, `${k ? `${leadIn()} ` : ""}${q.say}`);
      await ASK[q.type](q, ctx);
      if (!alive) return;
      markDot(app, k, mistakes > before); // yellow if it took a mistake
      S.solvedOne();
      await nextButton(dock, k < qs.length - 1 ? "Next ▶" : "Finish 🏁");
    }
    if (!alive) return;
    const i = STAGES.indexOf(stage), nx = STAGES[i + 1];
    showFinish(app, {
      id: stage.id, stars: starsFor(mistakes), mistakes, title: vary("finish", ["You did it!", "Super reading!", "Wonderful work!", "Way to go!"]),
      done: `${PER_STAGE} done.`, again: `#/play/${stage.id}`, onAgain: route,
      next: nx ? { href: `#/play/${nx.id}`, label: `Next: ${nx.emoji} ${nx.title} ▶` } : null,
    });
  })();
  return () => { alive = false; };
}

function hintFor(q) {
  switch (q.type) {
    case "letters": return `Listen: ${soundSay(q.letter)}. Look for the letter at the start of ${q.picture[0]}.`;
    case "letters-picture": return `Say each picture slowly. Which one starts with ${snd(LETTERS[q.letter].sound)}?`;
    case "first": return `Say it slowly: ${q.word}. What's the very first sound?`;
    case "rhyme": return `Rhyming words sound the same at the end. ${q.word}… listen to the end of each one.`;
    case "beats": return `Say it slowly and clap: ${q.parts.join("… ")}.`;
    case "case": return `Little ${q.letter} is the small shape of big ${q.big}. Trace them in the air!`;
    case "blend": return "Tap each letter to hear its sound, then press Blend and listen.";
    case "build": return `Say it slowly: ${q.letters.map((l) => snd(LETTERS[l].sound)).join("… ")}. One letter for each sound.`;
    case "sound-out": return `Tap each chunk and say its sound: ${q.chunks.filter((c) => !c.silent).map((c) => snd(c.s)).join("… ")}. Now say them faster!`;
    case "find-word": return `Listen again: ${q.word}. Look at each word and sound it out, chunk by chunk.`;
    case "read-sentence": return "Tap any word you're not sure about to hear it. Then read the whole sentence again.";
  }
  return "Take your time!";
}

// ───────── shared pieces ─────────

const letterBtn = (l, extra = "") => `<button class="choice-card letter-card${extra}" data-v="${l}" aria-label="letter ${l}"><span class="abc">${l}</span></button>`;
// Just the picture, no word under it: the child reads the word, the picture checks it.
const pictureOnly = (c) => `<button class="choice-card picture-card emoji-only" data-v="${esc(c.word)}" aria-label="${esc(c.word)}"><span class="pic" aria-hidden="true">${c.emoji}</span></button>`;
const pictureBtn = (c) => `<button class="choice-card picture-card" data-v="${esc(c.word)}"><span class="pic" aria-hidden="true">${c.emoji}</span><span class="pic-word">${esc(c.word)}</span></button>`;

/** Choices in the dock; resolves on the right one (or after two misses, with the answer shown). */
function choose(ctx, q, html, { onWrong } = {}) {
  ctx.dock.innerHTML = `<div class="choices ${q.choices && typeof q.choices[0] === "string" ? "letter-choices" : "picture-choices"}">${html}</div>`;
  let tries = 0;
  return new Promise((resolve) => {
    ctx.dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
      if (!ctx.alive() || b.disabled) return;
      sayRun++;
      sfx.select();
      if (b.dataset.v === String(q.answer)) {
        ctx.dock.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; });
        b.classList.add("right"); sfx.right(); FX.confetti(18);
        const p = praise(); ctx.tell(p, `${p} ${rightLine(q)}`);
        resolve();
        return;
      }
      ctx.miss(); tries++;
      b.classList.add("wrong"); b.disabled = true; sfx.oops(); FX.shake(b);
      if (tries < 2) { const msg = onWrong?.(b.dataset.v) ?? hintFor(q), t = tryAgain(); ctx.tell(t, `${t} ${msg}`); return; }
      ctx.dock.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; if (x.dataset.v === String(q.answer)) x.classList.add("right"); });
      ctx.tell("Here's the answer.", `Here's the answer. ${rightLine(q)}`);
      setTimeout(resolve, 1300);
    });
  });
}

function rightLine(q) {
  switch (q.type) {
    case "letters": return `${q.letter} says ${soundSay(q.letter)}.`;
    case "letters-picture": return `${q.answer} starts with ${q.letter}!`;
    case "first": return `${q.word} starts with ${snd(LETTERS[q.answer].sound)}, ${q.answer}!`;
    case "rhyme": return `${q.word} and ${q.answer} rhyme!`;
    case "case": return `Big ${q.big}, little ${q.letter}.`;
    case "blend": return `${q.letters.map((l) => snd(LETTERS[l].sound)).join(", ")}: ${q.word}!`;
    case "sound-out": return `${q.chunks.filter((c) => !c.silent).map((c) => snd(c.s)).join(", ")}: ${q.word}!`;
    case "find-word": return `That's ${q.word}!`;
    case "read-sentence": return q.text;
  }
  return "";
}

// Sounding out, Hooked-on-Phonics style: each chunk lights up as its sound is said, one at a time
// with a little gap, so a quick word like "cat" isn't one blur. Anything else that talks stops it.
let sayRun = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function sayInOrder(tiles, sounds, gap = 450) {
  const run = ++sayRun;
  for (let i = 0; i < tiles.length && run === sayRun; i++) {
    tiles[i].classList.add("blending");
    if (sounds[i]) await speak(snd(sounds[i]), { force: true }); else await sleep(500); // a quiet letter: just a pause
    tiles[i].classList.remove("blending");
    if (run === sayRun) await sleep(gap);
  }
}
/** Big words: say it at normal speed, then slowly while the chunks light up. */
async function wholeThenSlow(tiles, word) {
  const run = ++sayRun;
  await speak(word, { force: true });
  if (run !== sayRun) return;
  await sleep(400);
  tiles.forEach((t) => t.classList.add("blending"));
  await speak(word, { force: true, rate: 0.6 });
  tiles.forEach((t) => t.classList.remove("blending"));
}

/** A word as colored sound chunks: the pattern chunk highlighted, silent letters faded. */
function chunkWord(spec, q, { tag = "button", cls = "" } = {}) {
  const pat = patternById(q.pattern);
  const ch = typeof spec === "string" ? chunks(spec, pat.syllables) : spec;
  const focus = new Set(focusIndexes(pat, ch));
  return `<span class="chunked ${cls}${pat.syllables ? " syllables" : ""}">${ch.map((c, i) => `<${tag} class="chunk${focus.has(i) ? " focus" : ""}${c.silent ? " silent" : ""}"${tag === "button" ? ` data-own-sound data-c="${i}" aria-label="${esc(c.t)}"` : ""}>${esc(c.t)}</${tag}>`).join(tag === "button" && pat.syllables ? '<span class="dot" aria-hidden="true">·</span>' : "")}</span>`;
}

// ───────── each kind of question ─────────

const ASK = {
  // Phonics: tap each chunk to hear it, sound out the word, find the picture.
  async "sound-out"(q, ctx) {
    if (!patternById(q.pattern).syllables) preloadSounds(q.chunks.map((c) => c.s)); // ready before "Sound it out"
    ctx.board.innerHTML = `
      <div class="word-big">${chunkWord(q.chunks, q)}</div>
      <button class="btn big blend-btn" data-own-sound>${patternById(q.pattern).syllables ? "🐢 Hear it slowly" : "👉 Sound it out"}</button>`;
    const tiles = [...ctx.board.querySelectorAll(".chunk")];
    tiles.forEach((t, i) => t.onclick = () => {
      const c = q.chunks[i];
      t.classList.add("heard"); FX.pop(t, 1.1); sfx.key(i + 1);
      sayRun++;
      speak(c.silent ? "This one is quiet!" : patternById(q.pattern).syllables ? c.s : snd(c.s), { force: true });
    });
    const pat = patternById(q.pattern);
    ctx.board.querySelector(".blend-btn").onclick = () => pat.syllables
      ? wholeThenSlow(tiles, q.word) // big words: the whole word, then slowly, chunks lighting up
      : sayInOrder(tiles, q.chunks.map((c) => c.s)); // the sounds, not the word: blending is the child's job
    await choose(ctx, q, q.choices.map(pictureOnly).join(""), { onWrong: (v) => `That's ${v}. Tap the chunks and sound it out again.` });
  },
  // Phonics: hear a word, find it among similar words.
  async "find-word"(q, ctx) {
    ctx.board.innerHTML = `<button class="hear-big" data-own-sound aria-label="Hear the word">🔊<span>Hear the word</span></button>`;
    ctx.board.querySelector(".hear-big").onclick = () => speak(q.word, { force: true });
    await choose(ctx, q, q.choices.map((c) => `<button class="choice-card word-card" data-v="${esc(c.word)}">${chunkWord(c.chunks, q, { tag: "span" })}</button>`).join(""),
      { onWrong: (v) => `That says ${v}. Listen: ${q.word}.` });
  },
  // Phonics: read a sentence (tap any word for help), then find the matching picture.
  async "read-sentence"(q, ctx) {
    const pat = patternById(q.pattern);
    const words = q.text.split(/\s+/);
    ctx.board.innerHTML = `
      <p class="sentence" lang="en">${words.map((w, i) => `<button class="sw${patternWord(pat, w) ? " focus" : ""}" data-own-sound data-w="${i}">${esc(w)}</button>`).join(" ")}</p>
      <button class="btn small read-me" data-own-sound>🔊 Read it to me</button>`;
    ctx.board.querySelectorAll(".sw").forEach((b) => b.onclick = () => { b.classList.add("heard"); speak(words[+b.dataset.w].replace(/[^A-Za-z']/g, ""), { force: true }); });
    ctx.board.querySelector(".read-me").onclick = () => speak(q.text, { force: true });
    await choose(ctx, q, q.choices.map(pictureOnly).join(""),
      { onWrong: () => "Read it again, slowly. Which picture shows what the sentence says?" });
  },
  // PreK: hear a sound, find its letter.
  async letters(q, ctx) {
    ctx.board.innerHTML = `<div class="sound-card"><button class="hear-sound" data-own-sound aria-label="Hear the sound">🔊</button><span class="pic big" aria-hidden="true">${q.picture[1]}</span><span class="pic-word">${esc(q.picture[0])}</span></div>`;
    ctx.board.querySelector(".hear-sound").onclick = () => speak(soundSay(q.letter), { force: true });
    await choose(ctx, q, q.choices.map((l) => letterBtn(l)).join(""), { onWrong: (v) => `That's ${v}. It says ${soundSay(v)}. We need ${soundSay(q.letter)}.` });
  },
  // PreK: which picture starts with this letter?
  async "letters-picture"(q, ctx) {
    ctx.board.innerHTML = `<div class="big-letter"><span class="abc">${q.letter}</span></div>`;
    await choose(ctx, q, q.choices.map(pictureBtn).join(""), { onWrong: (v) => `${v} starts with ${snd(LETTERS[v[0]]?.sound) ?? v[0]}. We need ${soundSay(q.letter)}.` });
  },
  // PreK: the first sound of a picture word.
  async first(q, ctx) {
    ctx.board.innerHTML = `<div class="sound-card"><span class="pic big" aria-hidden="true">${q.emoji}</span><span class="pic-word">${esc(q.word)}</span></div>`;
    await choose(ctx, q, q.choices.map((l) => letterBtn(l)).join(""), { onWrong: (v) => `${v} says ${snd(LETTERS[v].sound)}. Listen: ${q.word}.` });
  },
  // PreK: rhymes.
  async rhyme(q, ctx) {
    ctx.board.innerHTML = `<div class="sound-card"><span class="pic big" aria-hidden="true">${q.emoji}</span><span class="pic-word">${esc(q.word)}</span></div>`;
    await choose(ctx, q, q.choices.map(pictureBtn).join(""), { onWrong: (v) => `${q.word}… ${v}. Those don't sound the same at the end.` });
  },
  // PreK: tap the drum once for each beat.
  async beats(q, ctx) {
    ctx.board.innerHTML = `
      <div class="sound-card"><span class="pic big" aria-hidden="true">${q.emoji}</span><span class="pic-word">${esc(q.word)}</span></div>
      <div class="beat-row" aria-live="polite"></div>
      <button class="drum" data-own-sound aria-label="Tap the drum">🥁</button>`;
    const row = ctx.board.querySelector(".beat-row");
    let taps = 0, tries = 0;
    const paint = () => { row.innerHTML = Array.from({ length: taps }, () => `<i class="beat"></i>`).join("") || `<span class="muted">Tap the drum for each beat</span>`; };
    paint();
    ctx.board.querySelector(".drum").onclick = (e) => { if (taps >= 6) return; taps++; sfx.key(taps); FX.pop(e.currentTarget, 1.12); paint(); };
    ctx.dock.innerHTML = `<div class="row center"><button class="btn big" data-again>↺ Again</button><button class="btn big primary" data-check>✓ Done</button></div>`;
    ctx.dock.querySelector("[data-again]").onclick = () => { taps = 0; paint(); };
    await new Promise((resolve) => {
      ctx.dock.querySelector("[data-check]").onclick = () => {
        if (!ctx.alive()) return;
        if (taps === q.answer) { sfx.right(); FX.confetti(18); const p = praise(); ctx.tell(p, `${p} ${q.word} has ${q.answer} beat${q.answer > 1 ? "s" : ""}: ${q.parts.join("… ")}.`); resolve(); return; }
        ctx.miss(); tries++; sfx.oops(); FX.shake(row);
        if (tries < 2) { const t = tryAgain(); ctx.tell(t, `${t} Say it slowly and clap: ${q.parts.join("… ")}.`); taps = 0; paint(); return; }
        taps = q.answer; paint();
        ctx.tell("Here's the answer.", `${q.word} has ${q.answer} beat${q.answer > 1 ? "s" : ""}: ${q.parts.join("… ")}.`);
        setTimeout(resolve, 1300);
      };
    });
  },
  // K: big letter → little letter.
  async case(q, ctx) {
    ctx.board.innerHTML = `<div class="big-letter"><span class="abc">${q.big}</span></div>`;
    await choose(ctx, q, q.choices.map((l) => letterBtn(l)).join(""), { onWrong: (v) => `That's little ${v}, for big ${v.toUpperCase()}.` });
  },
  // K: tap each letter for its sound, blend, pick the picture.
  async blend(q, ctx) {
    preloadSounds(q.letters.map((l) => LETTERS[l].sound)); // ready before "Blend", so the sounds come one right after another
    ctx.board.innerHTML = `
      <div class="sound-boxes">${q.letters.map((l, i) => `<button class="sound-box" data-own-sound data-i="${i}" aria-label="letter ${l}"><span class="abc">${l}</span></button>`).join("")}</div>
      <button class="btn big blend-btn" data-own-sound>👉 Blend</button>`;
    const boxes = [...ctx.board.querySelectorAll(".sound-box")];
    boxes.forEach((b, i) => b.onclick = () => { b.classList.add("heard"); FX.pop(b, 1.1); sfx.key(i + 1); sayRun++; speak(snd(LETTERS[q.letters[i]].sound), { force: true }); });
    // Light the boxes left to right, one sound right after another, so it sounds like blending (not the word: that's the child's job).
    ctx.board.querySelector(".blend-btn").onclick = () => sayInOrder(boxes, q.letters.map((l) => LETTERS[l].sound), 100); // quick, one after another: that's blending
    await choose(ctx, q, q.choices.map(pictureOnly).join(""), { onWrong: (v) => `That's ${v}. Tap the letters and blend again.` });
  },
  // K: hear a word, put its letters in the sound boxes.
  async build(q, ctx) {
    preloadSounds(q.tiles.map((l) => LETTERS[l]?.sound));
    ctx.board.innerHTML = `
      <div class="sound-card small"><span class="pic big" aria-hidden="true">${q.emoji}</span></div>
      <div class="sound-boxes">${q.letters.map((_, i) => `<button class="sound-box empty" data-own-sound data-slot="${i}" aria-label="box ${i + 1}"></button>`).join("")}</div>`;
    ctx.dock.innerHTML = `<div class="tiles">${q.tiles.map((l, i) => `<button class="choice-card letter-card tile" data-own-sound data-t="${i}" aria-label="letter ${l}"><span class="abc">${l}</span></button>`).join("")}</div>`;
    const slots = [...ctx.board.querySelectorAll(".sound-box")], tiles = [...ctx.dock.querySelectorAll(".tile")];
    const filled = Array(q.letters.length).fill(null); // tile index in each box
    let tries = 0, done = false;
    const paint = () => slots.forEach((s, i) => {
      const t = filled[i];
      s.classList.toggle("empty", t == null);
      s.innerHTML = t == null ? "" : `<span class="abc">${q.tiles[t]}</span>`;
    });
    return new Promise((resolve) => {
      const check = () => {
        if (filled.some((t) => t == null)) return;
        const word = filled.map((t) => q.tiles[t]).join("");
        if (word === q.word) { done = true; sfx.right(); FX.confetti(20); const p = praise(); ctx.tell(p, `${p} ${q.letters.map((l) => snd(LETTERS[l].sound)).join(", ")}: ${q.word}!`); resolve(); return; }
        ctx.miss(); tries++; sfx.oops(); FX.shake(ctx.board.querySelector(".sound-boxes"));
        if (tries < 2) {
          // Keep the letters that are right; send the others back.
          filled.forEach((t, i) => { if (q.tiles[t] !== q.letters[i]) { tiles[t].disabled = false; filled[i] = null; } });
          paint();
          const t = tryAgain(); ctx.tell(t, `${t} ${hintFor(q)}`);
          return;
        }
        done = true;
        q.letters.forEach((l, i) => { filled[i] = q.tiles.findIndex((x, j) => x === l && !filled.slice(0, i).includes(j)); });
        paint();
        ctx.tell("Here's the answer.", `${q.letters.map((l) => snd(LETTERS[l].sound)).join(", ")}: ${q.word}.`);
        setTimeout(resolve, 1400);
      };
      tiles.forEach((t, ti) => t.onclick = () => {
        if (done || t.disabled) return;
        const i = filled.indexOf(null);
        if (i < 0) return;
        filled[i] = ti; t.disabled = true; sfx.key(i + 1); speak(snd(LETTERS[q.tiles[ti]].sound), { force: true });
        paint(); check();
      });
      slots.forEach((s, i) => s.onclick = () => {
        if (done || filled[i] == null) return;
        tiles[filled[i]].disabled = false; filled[i] = null; sfx.back?.(); paint();
      });
    });
  },
};

installClickSounds();
jingleOnce("letters", () => S.settings().sounds); // the app's little logo sound, on the first tap
route();
keepDockVisible();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  // Update quietly: never reload on the first visit or in the middle of a game.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !document.body.classList.contains("in-game") && !/^#\/play/.test(location.hash)) location.reload();
  });
}
