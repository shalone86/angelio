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
import { ASK, spoken, answerText } from "./quiz.js";

const app = document.getElementById("app");
let LIB = { courses: [], albums: [], lessons: [], songs: [] };
const lessonById = (id) => LIB.lessons.find((l) => l.id === id);
const songById = (id) => LIB.songs.find((s) => s.id === id);
const courseById = (id) => LIB.courses.find((c) => c.id === id);
const albumById = (id) => LIB.albums.find((a) => a.id === id);
const personById = (id) => LIB.people?.find((p) => p.id === id);
const personId = (name) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  <p>All lessons and songs are written, drawn and performed by Shalone Cason and friends.</p>
  <p><a class="btn small" href="#/review">📝 Review every quiz (answers shown)</a></p>`;

const route = createRouter([
  [/^$/, viewHome],
  [/^course\/([\w-]+)$/, viewCourse],
  [/^course\/([\w-]+)\/([\w-]+)$/, (c, l) => viewLesson(l, c)],
  [/^lesson\/([\w-]+)$/, (l) => viewLesson(l)],
  [/^quiz\/([\w-]+)$/, (l) => viewQuiz(l)],
  [/^course\/([\w-]+)\/([\w-]+)\/quiz$/, (c, l) => viewQuiz(l, c)],
  [/^person\/([\w-]+)$/, viewPerson],
  [/^all\/(courses|lessons|albums|songs)$/, viewAll],
  [/^album\/([\w-]+)$/, (a) => viewSongs(albumById(a)?.items[0], a)],
  [/^album\/([\w-]+)\/([\w-]+)$/, (a, s) => viewSongs(s, a)],
  [/^song\/([\w-]+)$/, (s) => viewSongs(s)],
  [/^grownups$/, () => viewGrownups(app, { about: ABOUT })],
  [/^review$/, viewReview],
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

// Songs that have a lead sheet (made at angelio.org/admin/leadsheet.html), asked once.
let sheetIds;
const leadSheets = () => (sheetIds ??= fetch("/api/leadsheets").then((r) => (r.ok ? r.json() : { ids: [] })).then((j) => j.ids ?? []).catch(() => []));

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
const shelf = (emoji, title, blurb, cards, all) => `
  <section class="shelf">
    <div class="shelf-head">
      <h2 class="shelf-title"><span aria-hidden="true">${emoji}</span> ${title}</h2>
      ${all ? `<a class="btn small see-all" href="#/all/${all}">See all ▸</a>` : ""}
    </div>
    <p class="muted shelf-blurb">${blurb}</p>
    <div class="shelf-row">${cards}</div>
  </section>`;

// Every list, as cards: home shelves and the "See all" pages use the same ones.
const newest = (list) => [...list].reverse();
const LISTS = {
  courses: { emoji: "🎓", title: "Courses", blurb: "Lessons in order, one after another.", cards: () => LIB.courses.map((c) => groupCard(`#/course/${c.id}`, c, LIB.lessons, "lessons")) },
  lessons: { emoji: "📚", title: "Lessons", blurb: "Watch, and try the quiz.", cards: () => newest(LIB.lessons).map((l) => card(`#/lesson/${l.id}`, l, l.quiz ? `<span class="tag">📝 Quiz ${starsHtml(S.progress(l.id).stars)}</span>` : "")) },
  albums: { emoji: "💿", title: "Albums", blurb: "Songs that play one after another.", cards: () => LIB.albums.map((a) => groupCard(`#/album/${a.id}`, a, LIB.songs, "songs")) },
  songs: { emoji: "🎵", title: "Songs", blurb: "Sing and dance!", cards: () => newest(LIB.songs).map((s) => card(`#/song/${s.id}`, s)) },
};

// A course and a song of the day: the same for everyone on a given day, new the next day.
function ofTheDay(list, salt) {
  const d = new Date(), day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return list.length ? list[(day * 7 + salt) % list.length] : null;
}

// Home remembers where you scrolled, so coming back from a video lands where you were.
const HOME_SCROLL = "watch:homeScroll";
function viewHome() {
  const lesson = ofTheDay(LIB.lessons, 0), song = ofTheDay(LIB.songs, 3);
  const today = (href, label, item, extra = "") => `<a class="today-card" href="${href}">
        <span class="today-label">${label}</span>
        <span class="thumb"><img src="${esc(item.poster ?? "")}" alt=""></span>
        <span class="video-title">${esc(item.title)}</span>${extra}</a>`;
  app.innerHTML = `
    <section class="hero small-hero">
      <h1 class="title">Watch &amp; Sing</h1>
      <p class="lede">Lessons about the Faith, and songs to sing!</p>
    </section>
    <section class="today">
      ${lesson ? today(`#/lesson/${lesson.id}`, "📚 Lesson of the day", lesson, lesson.quiz ? `<span class="tag">📝 Quiz ${starsHtml(S.progress(lesson.id).stars)}</span>` : "") : ""}
      ${song ? today(`#/song/${song.id}`, "🎵 Song of the day", song) : ""}
    </section>
    ${Object.entries(LISTS).map(([k, L]) => shelf(L.emoji, L.title, L.blurb, L.cards().slice(0, 12).join(""), k)).join("")}
    ${stickerBook()}`;
  // Back to where you were: the page and each shelf's sideways scroll.
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(HOME_SCROLL) ?? "null"); } catch { /* none */ }
  if (saved) requestAnimationFrame(() => {
    app.querySelectorAll(".shelf-row").forEach((r, i) => { r.scrollLeft = saved.rows?.[i] ?? 0; });
    window.scrollTo(0, saved.y ?? 0);
  });
  return () => {
    try { sessionStorage.setItem(HOME_SCROLL, JSON.stringify({ y: window.scrollY, rows: [...app.querySelectorAll(".shelf-row")].map((r) => r.scrollLeft) })); } catch { /* ignore */ }
  };
}

// ───────── "See all": every course, lesson, album or song on one page ─────────

function viewAll(kind) {
  const L = LISTS[kind];
  if (!L) { location.hash = "#/"; return; }
  const cards = L.cards();
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top"><a class="icon-btn" href="#/" aria-label="Back">✕</a>
        <h1 class="watch-title"><span aria-hidden="true">${L.emoji}</span> All ${L.title.toLowerCase()}<span class="muted small course-of">${cards.length}</span></h1></div>
      <div class="video-grid">${cards.join("")}</div>
    </section>`;
  speak(`All the ${L.title.toLowerCase()}.`);
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
        ${l.quiz ? `<a class="btn big primary" href="${course ? `#/course/${course.id}/${l.id}/quiz` : `#/quiz/${l.id}`}" data-quiz>📝 Quiz time!</a>` : ""}
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

function viewQuiz(id, courseId) {
  const l = lessonById(id);
  if (!l?.quiz) { location.hash = "#/"; return; }
  const course = courseId && courseById(courseId);
  const qs = l.quiz;
  const back = course ? `#/course/${course.id}/${l.id}` : `#/lesson/${l.id}`;
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play quiz">
      <div class="play-top">
        <a class="icon-btn" href="${back}" aria-label="Back to the video">✕</a>
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

  (async () => {
    for (let k = 0; k < qs.length && alive; k++) {
      const q = qs[k];
      app.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("now", +d.dataset.dot === k));
      why.hidden = true; dock.innerHTML = "";
      bubble.querySelector(".say").textContent = q.type === "blank" ? q.q.replace(/_{2,}/g, "___") : q.q;
      current = spoken(q);
      speak(`${k ? `${leadIn()} ` : ""}${current}`);
      const miss = await (ASK[q.type] ?? ASK.choice)(q, answers, {
        onMiss: (n) => { if (n === 1) { const t = tryAgain(); bubble.querySelector(".say").textContent = `${t} Think about the video.`; speak(`${t} Think about the video.`); } },
      });
      if (!alive) return;
      mistakes += miss;
      say(bubble, miss >= 2 && (q.type === "choice" || q.type === "blank") ? `Here's the answer: ${esc(answerText(q))}.` : praise());
      if (q.why) { why.innerHTML = `<p>📜 ${esc(q.why)}</p>`; why.hidden = false; setTimeout(() => alive && speak(q.why), 1100); }
      markDot(app, k, miss > 0);
      S.solvedOne();
      await nextButton(dock, k < qs.length - 1 ? "Next ▶" : "Finish 🏁");
      answers.innerHTML = "";
    }
    if (!alive) return;
    markWatched(l.id);
    // In a course, go on to the next lesson; otherwise back to all the videos.
    const list = course?.items ?? [], nextId = list[list.indexOf(l.id) + 1], nx = nextId && lessonById(nextId);
    showFinish(app, {
      id: l.id, stars: starsFor(mistakes), mistakes, title: "Quiz done!", done: `${qs.length} questions.`,
      again: course ? `#/course/${course.id}/${l.id}/quiz` : `#/quiz/${l.id}`, onAgain: route,
      next: nx ? { href: `#/course/${course.id}/${nx.id}`, label: `Next lesson: ${nx.title} ▶` }
        : course ? { href: `#/course/${course.id}`, label: `${course.emoji} Course done! Back to ${course.title} ▶` }
        : { href: "#/", label: "More videos ▶" },
    });
  })();
  return () => { alive = false; };
}

// ───────── grown-ups: every quiz on one page, answers shown, for checking ─────────

function viewReview() {
  const show = (q) => {
    const t = q.type ?? "choice";
    if (t === "choice") return `<ul>${q.choices.map((c, i) => `<li${i === q.answer ? ' class="ok"' : ""}>${i === q.answer ? "✅ " : ""}${esc(c)}</li>`).join("")}</ul>`;
    if (t === "blank") return `<ul>${q.words.map((w) => `<li${w === q.answer ? ' class="ok"' : ""}>${w === q.answer ? "✅ " : ""}${esc(w)}</li>`).join("")}</ul>`;
    if (t === "order") return `<ol>${q.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
    return `<ul>${q.pairs.map(([a, b]) => `<li>${esc(a)} ↔ ${esc(b)}</li>`).join("")}</ul>`;
  };
  const kind = { choice: "Choice", blank: "Word tiles", order: "Put in order", match: "Match" };
  const withQuiz = LIB.lessons.filter((l) => l.quiz);
  app.innerHTML = `
    <section class="review">
      <div class="watch-top"><a class="icon-btn" href="#/grownups" aria-label="Back">✕</a><h1 class="watch-title">📝 Every quiz</h1></div>
      <p class="muted">${withQuiz.length} lessons, ${withQuiz.reduce((n, l) => n + l.quiz.length, 0)} questions. ✅ marks the right answer; “order” shows the right order.
        <b>Draft</b> means written from the video's words and not checked yet. To change one, tell your helper or edit <code>content/quizzes.json</code>.</p>
      ${withQuiz.map((l) => `
        <article class="card review-quiz">
          <h2>${esc(l.title)} ${l.quizDraft ? '<span class="draft">Draft</span>' : ""} <a class="small" href="#/lesson/${l.id}">▶ video</a></h2>
          <ol class="review-qs">${l.quiz.map((q) => `<li><b>${esc(q.q)}</b> <span class="muted small">(${kind[q.type ?? "choice"]})</span>${show(q)}<p class="muted small">📜 ${esc(q.why ?? "")}</p></li>`).join("")}</ol>
        </article>`).join("")}
    </section>`;
}

// ───────── people: everyone who wrote or sang a song ─────────

const ROLES = [["written", "✍️ Written by"], ["sung", "🎤 Sung by"], ["backing", "🎶 Backing vocals"], ["animation", "🎨 Animation"]];
const creditsHtml = (song) => song.credits ? `<div class="credits">${ROLES.filter(([k]) => song.credits[k]?.length).map(([k, label]) => `
  <div class="credit-row"><span class="credit-label">${label}</span>${song.credits[k].map((n) => `<a class="person-chip" href="#/person/${personId(n)}">${esc(n)}</a>`).join("")}</div>`).join("")}</div>` : "";

function viewPerson(id) {
  const p = personById(id);
  if (!p) { location.hash = "#/"; return; }
  const songs = p.songs.map(songById).filter(Boolean);
  const roleOf = (s) => ROLES.filter(([k]) => s.credits?.[k]?.some((n) => personId(n) === id)).map(([, label]) => label.split(" ")[0]).join(" ");
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top"><a class="icon-btn" href="javascript:history.back()" aria-label="Back">✕</a>
        <h1 class="watch-title">🎤 ${esc(p.name)}<span class="muted small course-of">${songs.length} song${songs.length === 1 ? "" : "s"}</span></h1></div>
      <a class="btn big primary start-btn" href="#/song/${songs[0]?.id}" data-play-all>▶ Play their songs</a>
      <div class="video-grid">${songs.map((s) => `
        <a class="video-card" href="#/song/${s.id}"><span class="thumb"><img src="${esc(s.poster ?? "")}" alt="" loading="lazy"></span>
          <span class="video-title">${esc(s.title)}</span><span class="tag">${roleOf(s)}</span></a>`).join("")}</div>
    </section>`;
  app.querySelector("[data-play-all]").onclick = (e) => { e.preventDefault(); sessionStorage.setItem("watch:queue", JSON.stringify(p.songs)); location.hash = `#/song/${songs[0].id}`; };
  speak(`Songs with ${p.name}.`);
}

// ───────── songs: one player that goes straight through the album ─────────

function viewSongs(songId, albumId) {
  const album = albumId && albumById(albumId);
  // A person's "Play their songs" queue, else the album, else all songs (newest first).
  let queue = null;
  try { queue = JSON.parse(sessionStorage.getItem("watch:queue") ?? "null"); sessionStorage.removeItem("watch:queue"); } catch { /* none */ }
  const ids = album ? album.items : queue?.includes(songId) ? queue : [...LIB.songs].reverse().map((s) => s.id);
  let s = songById(songId);
  if (!s) { location.hash = "#/"; return; }
  app.innerHTML = `
    <section class="watch">
      <div class="watch-top"><a class="icon-btn" href="#/" aria-label="Back">✕</a>
        <h1 class="watch-title"><span class="now-title"></span>${album ? `<span class="muted small course-of">${album.emoji} ${esc(album.title)}</span>` : ""}</h1></div>
      ${player(s)}
      <div class="credits-box"></div>
      <h2 class="shelf-title">🎶 Up next</h2>
      <div class="playlist"></div>
      <details class="card downloads"><summary>⬇️ For grown-ups: downloads</summary><div class="dl-list"></div></details>
    </section>`;
  const video = app.querySelector("video"), list = app.querySelector(".playlist");
  // Change the song inside the same player (no new page), so the next song can start by itself on iPads too.
  const show = (song, play) => {
    s = song;
    app.querySelector(".now-title").textContent = song.title;
    app.querySelector(".credits-box").innerHTML = creditsHtml(song);
    history.replaceState(null, "", album ? `#/album/${album.id}/${song.id}` : `#/song/${song.id}`);
    if (play) { video.poster = song.poster ?? ""; video.src = song.video; start(video); }
    const i = ids.indexOf(song.id), rest = [...ids.slice(i + 1), ...ids.slice(0, i)].map(songById).filter(Boolean);
    list.innerHTML = rest.slice(0, album || queue ? 60 : 12).map((x) => `
      <button class="playlist-item" data-song="${x.id}"><img src="${esc(x.poster ?? "")}" alt="" loading="lazy"><span>${esc(x.title)}</span>${watched(x.id) ? "<span class=\"seen-mini\">✓</span>" : ""}</button>`).join("");
    list.querySelectorAll("[data-song]").forEach((b) => b.onclick = () => show(songById(b.dataset.song), true));
    const fill = (sheets) => {
      // A lead sheet made in the lead sheet maker replaces the old PDF one.
      const made = sheets.includes(song.id);
      const dls = song.downloads.filter((d) => !(made && /lead sheet/i.test(d.kind)));
      const counts = {};
      dls.forEach((d) => { counts[d.kind] = (counts[d.kind] ?? 0) + 1; });
      app.querySelector(".dl-list").innerHTML = (made ? `<a class="btn small" href="/leadsheet/?id=${encodeURIComponent(song.id)}">📄 Lead sheet</a>` : "")
        + (dls.length ? dls.map((d) => `<a class="btn small" href="${esc(d.url)}" download target="_blank" rel="noopener">${d.kind}${counts[d.kind] > 1 ? `: ${esc(d.label)}` : ""}</a>`).join("")
          : made ? "" : `<p class="muted small">No downloads for this song yet.</p>`);
    };
    fill([]);
    leadSheets().then(fill);
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

// Pinned titles sit just under the site's top bar, whose height changes on phones.
const topbarHeight = () => document.documentElement.style.setProperty("--topbar-h", `${document.querySelector(".topbar")?.offsetHeight ?? 0}px`);
topbarHeight(); addEventListener("resize", topbarHeight);

installClickSounds();
jingleOnce("watch", () => S.settings().sounds);
app.innerHTML = `<p class="center muted">Loading…</p>`;
// Hidden lessons and songs (the Studio's "Hide") don't show, and drop out of their courses and albums.
// In the Studio's preview (?studio) everything shows, and the Studio sends its unsaved library to draw.
const STUDIO = new URLSearchParams(location.search).has("studio");
function visible(j) {
  if (STUDIO) return j;
  const lessons = (j.lessons ?? []).filter((x) => !x.hidden), songs = (j.songs ?? []).filter((x) => !x.hidden);
  const L = new Set(lessons.map((x) => x.id)), Sg = new Set(songs.map((x) => x.id));
  return { ...j, lessons, songs,
    courses: (j.courses ?? []).map((c) => ({ ...c, items: c.items.filter((id) => L.has(id)) })).filter((c) => c.items.length),
    albums: (j.albums ?? []).map((a) => ({ ...a, items: a.items.filter((id) => Sg.has(id)) })).filter((a) => a.items.length) };
}
if (STUDIO) addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.data?.type !== "studio") return;
  if (e.data.library) LIB = e.data.library;
  if (e.data.go && location.hash !== e.data.go) location.hash = e.data.go; else route();
});
fetch("data/library.json", { cache: "no-cache" }).then((r) => r.json()).then((j) => { LIB = visible(j); route(); if (STUDIO) parent.postMessage({ type: "studio-ready" }, location.origin); })
  .catch(() => { app.innerHTML = `<p class="center">Couldn't load the videos. Check the internet connection and try again.</p>`; });
keepDockVisible();
if (!STUDIO && "serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});

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
