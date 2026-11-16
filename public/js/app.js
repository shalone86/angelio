// Watch & Sing: video lessons (alone or in courses, some with a quiz) and songs (alone or in albums).
// Plain ES modules, no build step. The library (data/library.json) is built from the Ghost kids site
// by tools/import-ghost.mjs.

import * as S from "./kit/store.js";
import { jingleOnce } from "./kit/jingle.js";
S.init("watch:v1", { watched: {} });

import { createRouter } from "./kit/router.js";
import { speak, stop } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { keepDockVisible } from "./kit/dock.js";
import { leadIn, praise, tryAgain } from "./kit/vary.js";
import { esc, starsHtml, starsFor, nextButton, say, markDot, showFinish, stickerBook, viewGrownups, installClickSounds, wireVoiceToggle } from "./kit/ui.js";

const app = document.getElementById("app");
let LIB = { courses: [], albums: [], lessons: [], songs: [] };
const lessonById = (id) => LIB.lessons.find((l) => l.id === id);
const songById = (id) => LIB.songs.find((s) => s.id === id);
const courseById = (id) => LIB.courses.find((c) => c.id === id);
const albumById = (id) => LIB.albums.find((a) => a.id === id);
const watched = (id) => !!S.settings().watched?.[id];
const markWatched = (id) => S.setSetting("watched", { ...S.settings().watched, [id]: Date.now() });

const ABOUT = `
  <p><b>Watch & Sing</b> has short video lessons about the Faith, some in courses and some with a quiz, and songs and albums
    that play one after another.</p>
  <ul>
    <li><b>Lessons:</b> the video starts by itself. In a course, the next lesson starts after a short countdown. A quiz reads
      every question aloud; a wrong answer gets a second try, then the answer is shown, and each answer says where it comes from.</li>
    <li><b>Songs:</b> an album plays straight through. Under <i>For grown-ups</i> you'll find the downloads: audio, instrumentals,
      videos and lead sheets.</li>
  </ul>
  <p>All lessons and songs are written, drawn and performed by Shalone Cason and friends.</p>`;

const route = createRouter([
  [/^$/, viewHome],
  [/^course\/([\w-]+)$/, viewCourse],
  [/^course\/([\w-]+)\/([\w-]+)$/, (c, l) => viewLesson(l, c)],
  [/^lesson\/([\w-]+)$/, (l) => viewLesson(l)],
  [/^quiz\/([\w-]+)$/, viewQuiz],
  [/^album\/([\w-]+)$/, (a) => viewSongs(albumById(a)?.items[0], a)],
  [/^album\/([\w-]+)\/([\w-]+)$/, (a, s) => viewSongs(s, a)],
  [/^song\/([\w-]+)$/, (s) => viewSongs(s)],
  [/^grownups$/, () => viewGrownups(app, { about: ABOUT })],
], {
  before() { stop(); FX.clearFx(); document.body.classList.remove("in-game"); },
});

// ───────── the player: starts by itself; if the browser says no, a big ▶ ─────────

function player(item) {
  return `
    <div class="video-wrap">
      <video controls playsinline autoplay preload="auto" poster="${esc(item.poster ?? "")}" src="${esc(item.video)}"></video>
      <button class="big-play" hidden aria-label="Play">▶</button>
    </div>`;
}
function start(video) {
  const big = video.parentElement.querySelector(".big-play");
  big.onclick = () => { big.hidden = true; video.play().catch(() => {}); };
  video.onplay = () => { big.hidden = true; };
  video.play().catch(() => { big.hidden = false; }); // some browsers only play after a tap
}

// ───────── home ─────────

const card = (href, item, extra = "") => `
  <a class="video-card" href="${href}">
    <span class="thumb"><img src="${esc(item.poster ?? "")}" alt="" loading="lazy">${watched(item.id) ? '<span class="seen">✓</span>' : ""}</span>
    <span class="video-title">${esc(item.title)}</span>${extra}
  </a>`;
const groupCard = (href, g, list, noun) => {
  const first = list.find((x) => x.id === g.items[0]);
  const done = g.items.filter(watched).length;
  return `
    <a class="video-card group-card" href="${href}">
      <span class="thumb"><img src="${esc(first?.poster ?? "")}" alt="" loading="lazy"><span class="count">${g.items.length} ${noun}</span></span>
      <span class="video-title"><span aria-hidden="true">${g.emoji}</span> ${esc(g.title)}</span>
      ${done ? `<span class="muted small">${done} of ${g.items.length} watched</span>` : ""}
    </a>`;
};
const shelf = (emoji, title, blurb, cards) => `
  <section class="shelf">
    <h2 class="shelf-title"><span aria-hidden="true">${emoji}</span> ${title}</h2>
    <p class="muted shelf-blurb">${blurb}</p>
    <div class="shelf-row">${cards}</div>
  </section>`;

function viewHome() {
  const newest = (list) => [...list].reverse();
  app.innerHTML = `
    <section class="hero small-hero">
      <h1 class="title">Watch &amp; Sing</h1>
      <p class="lede">Lessons about the Faith, and songs to sing!</p>
    </section>
    ${shelf("🎓", "Courses", "Lessons in order, one after another.", LIB.courses.map((c) => groupCard(`#/course/${c.id}`, c, LIB.lessons, "lessons")).join(""))}
    ${shelf("📚", "Lessons", "Watch, and try the quiz when there is one.", newest(LIB.lessons).map((l) => card(`#/lesson/${l.id}`, l, l.quiz ? `<span class="tag">📝 Quiz ${starsHtml(S.progress(l.id).stars)}</span>` : "")).join(""))}
    ${shelf("💿", "Albums", "Songs that play one after another.", LIB.albums.map((a) => groupCard(`#/album/${a.id}`, a, LIB.songs, "songs")).join(""))}
    ${shelf("🎵", "Songs", "Sing and dance!", newest(LIB.songs).map((s) => card(`#/song/${s.id}`, s)).join(""))}
    ${stickerBook()}`;
}

// ───────── a course ─────────

function viewCourse(id) {
  const c = courseById(id);
  if (!c) { location.hash = "#/"; return; }
  const items = c.items.map(lessonById).filter(Boolean);
  const next = items.find((l) => !watched(l.id)) ?? items[0];
  const n = items.indexOf(next) + 1;
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top"><a class="icon-btn" href="#/" aria-label="Back">✕</a>
        <h1 class="watch-title"><span aria-hidden="true">${c.emoji}</span> ${esc(c.title)}</h1></div>
      <a class="btn big primary start-btn" href="#/course/${c.id}/${next.id}">▶ ${items.some((l) => watched(l.id)) ? `Keep going: lesson ${n}` : "Start the course"}</a>
      <ol class="course-list">
        ${items.map((l, i) => `
          <li><a class="course-item${l === next ? " next" : ""}" href="#/course/${c.id}/${l.id}">
            <span class="num">${watched(l.id) ? "✓" : i + 1}</span>
            <img src="${esc(l.poster ?? "")}" alt="" loading="lazy">
            <span class="course-name">${esc(l.title)}${l.quiz ? `<span class="tag">📝 Quiz ${starsHtml(S.progress(l.id).stars)}</span>` : ""}</span>
          </a></li>`).join("")}
      </ol>
    </section>`;
  speak(`${c.title}. ${items.length} lessons.`);
}

// ───────── a lesson ─────────

function viewLesson(id, courseId) {
  const l = lessonById(id);
  if (!l) { location.hash = "#/"; return; }
  const course = courseId && courseById(courseId);
  const list = course ? course.items : null;
  const nextId = list ? list[list.indexOf(l.id) + 1] : null;
  const next = nextId && lessonById(nextId);
  const back = course ? `#/course/${course.id}` : "#/";
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top"><a class="icon-btn" href="${back}" aria-label="Back">✕</a>
        <h1 class="watch-title">${esc(l.title)}${course ? `<span class="muted small course-of">${esc(course.title)} · ${list.indexOf(l.id) + 1} of ${list.length}</span>` : ""}</h1></div>
      ${player(l)}
      <div class="watch-actions">
        ${l.quiz ? `<a class="btn big primary" href="#/quiz/${l.id}" data-quiz>📝 Quiz time!</a>` : ""}
        ${next ? `<a class="btn${l.quiz ? "" : " big primary"}" href="#/course/${course.id}/${next.id}" data-next-lesson>Next lesson ▶</a>` : ""}
        ${l.transcript ? `<button class="btn" data-words aria-expanded="false">📖 Read the words</button>` : ""}
      </div>
      <div class="up-next" hidden></div>
      ${l.transcript ? `<div class="card words" hidden>${l.transcript.map((p) => p.startsWith("## ") ? `<h3>${esc(p.slice(3))}</h3>` : `<p>${esc(p)}</p>`).join("")}</div>` : ""}
    </section>`;
  const video = app.querySelector("video");
  start(video);
  const words = app.querySelector(".words"), wbtn = app.querySelector("[data-words]");
  if (wbtn) wbtn.onclick = () => { words.hidden = !words.hidden; wbtn.setAttribute("aria-expanded", String(!words.hidden)); };
  let timer;
  video.onended = () => {
    markWatched(l.id);
    if (l.quiz) { FX.pop(app.querySelector("[data-quiz]"), 1.15); speak("Great watching! Ready for the quiz?"); return; }
    if (!next) return;
    // In a course, the next lesson starts by itself after a short countdown (or tap to stay).
    const box = app.querySelector(".up-next");
    let n = 5;
    const paint = () => { box.innerHTML = `<span>Next: <b>${esc(next.title)}</b> in ${n}…</span><button class="btn small" data-stay>Stay here</button>`; box.querySelector("[data-stay]").onclick = () => { clearInterval(timer); box.hidden = true; }; };
    box.hidden = false; paint();
    timer = setInterval(() => { n--; if (n <= 0) { clearInterval(timer); location.hash = `#/course/${course.id}/${next.id}`; } else paint(); }, 1000);
  };
  return () => { clearInterval(timer); video.pause(); };
}

// ───────── the quiz ─────────

function viewQuiz(id) {
  const l = lessonById(id);
  if (!l?.quiz) { location.hash = "#/"; return; }
  const qs = l.quiz;
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play quiz">
      <div class="play-top">
        <a class="icon-btn" href="#/lesson/${l.id}" aria-label="Back to the video">✕</a>
        <div class="dots">${qs.map((_, k) => `<i data-dot="${k}"></i>`).join("")}</div>
        <button class="icon-btn" data-read title="Read it again" aria-label="Read it again">💬</button>
        <button class="icon-btn toggle" data-voice title="Read aloud">🔊</button>
      </div>
      <div class="bubble" aria-live="polite"><span class="mascot" aria-hidden="true">📝</span><p class="say"></p></div>
      <div class="answers"></div>
      <div class="card why" hidden></div>
    </section>
    <div class="dock"></div>`;
  wireVoiceToggle(app.querySelector("[data-voice]"));
  const bubble = app.querySelector(".bubble"), dock = app.querySelector(".dock"), answers = app.querySelector(".answers"), why = app.querySelector(".why");
  let alive = true, mistakes = 0, current = "";
  app.querySelector("[data-read]").onclick = () => current && speak(current, { force: true });
  const listed = (cs) => (cs.length === 2 ? cs.join(", or ") : `${cs.slice(0, -1).join(", ")}, or ${cs.at(-1)}`);
  const blankToSay = (q) => q.replace(/_{2,}/g, "blank");

  (async () => {
    for (let k = 0; k < qs.length && alive; k++) {
      const q = qs[k], before = mistakes;
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      why.hidden = true; dock.innerHTML = "";
      bubble.querySelector(".say").textContent = q.q;
      current = q.choices ? `${blankToSay(q.q)} ${listed(q.choices)}?` : `${blankToSay(q.q)} Say your answer out loud, then tap to check!`;
      speak(`${k ? `${leadIn()} ` : ""}${current}`);
      if (q.choices) {
        answers.innerHTML = `<div class="choices answer-choices">${q.choices.map((c, i) => `<button class="choice-card answer" data-v="${i}">${esc(c)}</button>`).join("")}</div>`;
        await new Promise((resolve) => {
          let tries = 0;
          answers.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
            if (!alive || b.disabled) return;
            sfx.select();
            if (+b.dataset.v === q.answer) {
              answers.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; });
              b.classList.add("right"); sfx.right(); FX.confetti(15); say(bubble, praise());
              return resolve();
            }
            mistakes++; tries++;
            b.classList.add("wrong"); b.disabled = true; FX.shake(b); sfx.oops();
            if (tries < 2) { const t = tryAgain(); bubble.querySelector(".say").textContent = `${t} Think about the video.`; speak(`${t} Think about the video.`); return; }
            answers.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; if (+x.dataset.v === q.answer) x.classList.add("right"); });
            say(bubble, `Here's the answer: ${esc(q.choices[q.answer])}.`);
            resolve();
          });
        });
      } else {
        // A fill-in question: say it, then tap to see. (Nothing to get wrong.)
        answers.innerHTML = `<button class="choice-card answer reveal-btn">🗣️ I said it! Show me</button>`;
        await new Promise((resolve) => { answers.querySelector(".reveal-btn").onclick = () => { sfx.select(); resolve(); }; });
        answers.innerHTML = `<div class="card reveal">${esc(q.reveal)}</div>`;
        FX.confetti(10); say(bubble, `The answer is: ${esc(q.reveal)}. Did you get it?`);
      }
      if (!alive) return;
      if (q.why) { why.innerHTML = `<p>📜 ${esc(q.why)}</p>`; why.hidden = false; setTimeout(() => alive && speak(q.why), 1100); }
      markDot(app, k, mistakes > before);
      S.solvedOne();
      await nextButton(dock, k < qs.length - 1 ? "Next ▶" : "Finish 🏁");
      answers.innerHTML = "";
    }
    if (!alive) return;
    showFinish(app, {
      id: l.id, stars: starsFor(mistakes), mistakes, title: "Quiz done!", done: `${qs.length} questions.`,
      again: `#/quiz/${l.id}`, onAgain: route, next: { href: "#/", label: "More videos ▶" },
    });
  })();
  return () => { alive = false; };
}

// ───────── songs: one player that goes straight through the album ─────────

function viewSongs(songId, albumId) {
  const album = albumId && albumById(albumId);
  const ids = album ? album.items : [...LIB.songs].reverse().map((s) => s.id);
  let s = songById(songId);
  if (!s) { location.hash = "#/"; return; }
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top"><a class="icon-btn" href="#/" aria-label="Back">✕</a>
        <h1 class="watch-title"><span class="now-title"></span>${album ? `<span class="muted small course-of">${album.emoji} ${esc(album.title)}</span>` : ""}</h1></div>
      ${player(s)}
      <h2 class="shelf-title">🎶 Up next</h2>
      <div class="playlist"></div>
      <details class="card downloads"><summary>⬇️ For grown-ups: downloads</summary><div class="dl-list"></div></details>
    </section>`;
  const video = app.querySelector("video"), list = app.querySelector(".playlist");
  // Change the song inside the same player (no new page), so the next song can start by itself on iPads too.
  const show = (song, play) => {
    s = song;
    app.querySelector(".now-title").textContent = song.title;
    history.replaceState(null, "", album ? `#/album/${album.id}/${song.id}` : `#/song/${song.id}`);
    if (play) { video.poster = song.poster ?? ""; video.src = song.video; start(video); }
    const i = ids.indexOf(song.id), rest = [...ids.slice(i + 1), ...ids.slice(0, i)].map(songById).filter(Boolean);
    list.innerHTML = rest.slice(0, album ? 50 : 12).map((x) => `
      <button class="playlist-item" data-song="${x.id}"><img src="${esc(x.poster ?? "")}" alt="" loading="lazy"><span>${esc(x.title)}</span>${watched(x.id) ? "<span class=\"seen-mini\">✓</span>" : ""}</button>`).join("");
    list.querySelectorAll("[data-song]").forEach((b) => b.onclick = () => show(songById(b.dataset.song), true));
    const counts = {};
    song.downloads.forEach((d) => { counts[d.kind] = (counts[d.kind] ?? 0) + 1; });
    app.querySelector(".dl-list").innerHTML = song.downloads.length
      ? song.downloads.map((d) => `<a class="btn small" href="${esc(d.url)}" download target="_blank" rel="noopener">${d.kind}${counts[d.kind] > 1 ? `: ${esc(d.label)}` : ""}</a>`).join("")
      : `<p class="muted small">No downloads for this song yet.</p>`;
  };
  show(s, false);
  start(video);
  video.onended = () => {
    markWatched(s.id);
    const i = ids.indexOf(s.id);
    const nx = songById(ids[(i + 1) % ids.length]);
    if (nx && (album ? i + 1 < ids.length : true)) show(nx, true);
  };
  return () => video.pause();
}

// ───────── start ─────────

installClickSounds();
jingleOnce("watch", () => S.settings().sounds);
app.innerHTML = `<p class="center muted">Loading…</p>`;
fetch("data/library.json").then((r) => r.json()).then((j) => { LIB = j; route(); })
  .catch(() => { app.innerHTML = `<p class="center">Couldn't load the videos. Check the internet connection and try again.</p>`; });
keepDockVisible();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
