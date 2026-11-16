// Watch & Sing: video lessons with a short quiz, and songs to sing along with. Plain ES modules,
// no build step. The videos and their words live in videos.js.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("watch:v1", {});

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { leadIn, praise, tryAgain } from "./kit/vary.js";
import { esc, starsHtml, starsFor, nextButton, say, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";
import { LESSONS, SONGS, lessonById, songById } from "./videos.js";

const app = document.getElementById("app");

const ABOUT = `
  <p><b>Watch & Sing</b> has short video lessons about the Faith, each with a quiz, and songs to sing along with.</p>
  <ul>
    <li><b>Lessons:</b> watch the video, then answer a few questions. Every question is read aloud. A wrong answer gets a hint
      and a second try, then the answer is shown, and each answer says where it comes from (the Catechism, or
      <i>Christ – Our Pascha</i>, the Ukrainian Catholic catechism).</li>
    <li><b>Songs:</b> watch the music video with the words in big letters underneath, to sing along.</li>
  </ul>
  <p>All lessons and songs are written, drawn and performed by Shalone Cason.</p>`;

const route = createRouter([
  [/^$/, viewHome],
  [/^lesson\/([\w-]+)$/, viewLesson],
  [/^quiz\/([\w-]+)$/, viewQuiz],
  [/^song\/([\w-]+)$/, viewSong],
  [/^grownups$/, () => viewGrownups(app, { about: ABOUT })],
], {
  before() { stop(); FX.clearFx(); document.body.classList.remove("in-game"); },
});

const videoHtml = (v) => `
  <div class="video-wrap">
    <video controls playsinline preload="metadata" poster="${esc(v.poster)}" src="${esc(v.video)}"></video>
  </div>`;

// ───────── home: Lessons and Songs ─────────

function viewHome() {
  app.innerHTML = `
    <section class="hero">
      <h1 class="title">Watch &amp; Sing</h1>
      <p class="lede">Watch a lesson and try the quiz, or sing along!</p>
    </section>
    <section class="shelf">
      <h2 class="shelf-title"><span aria-hidden="true">📚</span> Lessons</h2>
      <p class="muted shelf-blurb">Watch, then take the quiz.</p>
      <div class="video-grid">
        ${LESSONS.map((l) => `
          <a class="video-card" href="#/lesson/${l.id}">
            <img src="${esc(l.poster)}" alt="" loading="lazy">
            <span class="video-title"><span aria-hidden="true">${l.emoji}</span> ${esc(l.title)}</span>
            ${starsHtml(S.progress(l.id).stars)}
          </a>`).join("")}
      </div>
    </section>
    <section class="shelf">
      <h2 class="shelf-title"><span aria-hidden="true">🎵</span> Songs</h2>
      <p class="muted shelf-blurb">Sing along!</p>
      <div class="video-grid">
        ${SONGS.map((s) => `
          <a class="video-card" href="#/song/${s.id}">
            <img src="${esc(s.poster)}" alt="" loading="lazy">
            <span class="video-title"><span aria-hidden="true">${s.emoji}</span> ${esc(s.title)}</span>
          </a>`).join("")}
      </div>
    </section>
    ${stickerBook()}`;
}

// ───────── a lesson: the video, then the quiz ─────────

function viewLesson(id) {
  const l = lessonById(id);
  if (!l) { location.hash = "#/"; return; }
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top">
        <a class="icon-btn" href="#/" aria-label="Back">✕</a>
        <h1 class="watch-title"><span aria-hidden="true">${l.emoji}</span> ${esc(l.title)}</h1>
      </div>
      ${videoHtml(l)}
      <div class="watch-actions">
        <a class="btn big primary" href="#/quiz/${l.id}" data-quiz>📝 Quiz time!</a>
        <button class="btn" data-words aria-expanded="false">📖 Read the words</button>
      </div>
      <div class="card words" hidden>
        ${l.transcript.map((p) => p.startsWith("## ") ? `<h3>${esc(p.slice(3))}</h3>` : `<p>${esc(p)}</p>`).join("")}
        <p class="muted small">${esc(l.credit)}</p>
      </div>
    </section>`;
  const words = app.querySelector(".words"), btn = app.querySelector("[data-words]");
  btn.onclick = () => { words.hidden = !words.hidden; btn.setAttribute("aria-expanded", String(!words.hidden)); };
  const video = app.querySelector("video");
  // When the video ends, invite them to the quiz.
  video.onended = () => { FX.pop(app.querySelector("[data-quiz]"), 1.15); speak("Great watching! Ready for the quiz?"); };
  return () => video.pause();
}

function viewQuiz(id) {
  const l = lessonById(id);
  if (!l) { location.hash = "#/"; return; }
  const qs = l.quiz;
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play">
      <div class="play-top">
        <a class="icon-btn" href="#/lesson/${l.id}" aria-label="Back to the video">✕</a>
        <div class="dots">${qs.map((_, k) => `<i data-dot="${k}"></i>`).join("")}</div>
        <button class="icon-btn" data-read title="Read it again" aria-label="Read it again">💬</button>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble" aria-live="polite"><span class="mascot" aria-hidden="true">${l.emoji}</span><p class="say"></p></div>
      <div class="card why" hidden></div>
    </section>
    <div class="dock"></div>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const bubble = app.querySelector(".bubble"), dock = app.querySelector(".dock"), why = app.querySelector(".why");
  let alive = true, mistakes = 0, current = "";
  app.querySelector("[data-read]").onclick = () => current && speak(current, { force: true });
  // The question and its choices, read aloud: "Which shoulder …? The right, the left, or neither?"
  const asked = (q) => `${q.q} ${q.choices.length === 2 ? q.choices.join(", or ") : `${q.choices.slice(0, -1).join(", ")}, or ${q.choices.at(-1)}`}?`;

  (async () => {
    for (let k = 0; k < qs.length && alive; k++) {
      const q = qs[k], before = mistakes;
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      why.hidden = true;
      bubble.querySelector(".say").textContent = q.q;
      current = asked(q);
      speak(`${k ? `${leadIn()} ` : ""}${current}`);
      dock.innerHTML = `<div class="choices answer-choices">${q.choices.map((c, i) => `<button class="choice-card answer" data-v="${i}">${esc(c)}</button>`).join("")}</div>`;
      await new Promise((resolve) => {
        let tries = 0;
        dock.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
          if (!alive || b.disabled) return;
          sfx.select();
          if (+b.dataset.v === q.answer) {
            dock.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; });
            b.classList.add("right"); sfx.right(); FX.confetti(15);
            const p = praise();
            say(bubble, p);
            return resolve();
          }
          mistakes++; tries++;
          b.classList.add("wrong"); b.disabled = true; FX.shake(b); sfx.oops();
          if (tries < 2) { const t = tryAgain(); bubble.querySelector(".say").textContent = `${t} ${q.hint}`; speak(`${t} ${q.hint}`); return; }
          // Second miss: show the answer, gently.
          dock.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; if (+x.dataset.v === q.answer) x.classList.add("right"); });
          say(bubble, `Here's the answer: ${esc(q.choices[q.answer])}.`);
          resolve();
        });
      });
      if (!alive) return;
      // Why it's right, and where it comes from.
      why.innerHTML = `<p>${esc(q.why)}</p><p class="muted small">📜 ${esc(q.source)}</p>`;
      why.hidden = false;
      setTimeout(() => alive && speak(q.why), 900);
      markDot(app, k, mistakes > before);
      S.solvedOne();
      await nextButton(dock, k < qs.length - 1 ? "Next ▶" : "Finish 🏁");
    }
    if (!alive) return;
    const i = LESSONS.indexOf(l), nx = LESSONS[i + 1];
    showFinish(app, {
      id: l.id, stars: starsFor(mistakes), mistakes, title: "Quiz done!", done: `${qs.length} questions.`,
      again: `#/quiz/${l.id}`, onAgain: route,
      next: nx ? { href: `#/lesson/${nx.id}`, label: `Next lesson: ${nx.emoji} ${nx.title} ▶` } : { href: "#/", label: "More videos ▶" },
    });
  })();
  return () => { alive = false; };
}

// ───────── a song: the video and the words, big ─────────

function viewSong(id) {
  const s = songById(id);
  if (!s) { location.hash = "#/"; return; }
  const lines = (ls, cls = "") => `<div class="stanza ${cls}">${ls.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`;
  const others = SONGS.filter((x) => x.id !== s.id);
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top">
        <a class="icon-btn" href="#/" aria-label="Back">✕</a>
        <h1 class="watch-title"><span aria-hidden="true">${s.emoji}</span> ${esc(s.title)}</h1>
      </div>
      ${videoHtml(s)}
      <div class="card lyrics">
        <h2 class="lyrics-title">🎤 Sing along</h2>
        ${lines(s.chorus, "chorus")}
        ${s.verses.map((v) => `${lines(v)}${lines(s.chorus, "chorus")}`).join("")}
        <p class="muted small">${esc(s.credit)}</p>
      </div>
      ${others.length ? `<h2 class="shelf-title">🎵 More songs</h2><div class="video-grid">${others.map((o) => `
        <a class="video-card" href="#/song/${o.id}"><img src="${esc(o.poster)}" alt="" loading="lazy"><span class="video-title">${o.emoji} ${esc(o.title)}</span></a>`).join("")}</div>` : ""}
    </section>`;
  const video = app.querySelector("video");
  return () => video.pause();
}

installClickSounds();
jingleOnce("watch", () => S.settings().sounds);
route();
keepDockVisible();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
