#!/usr/bin/env node
// Build the video library (public/data/library.json) from the Ghost kids site, so lessons, songs,
// quizzes and downloads are never typed in twice. Run:  node tools/import-ghost.mjs
// It only reads Ghost's public Content API (the same data the kids site shows to everyone).
//
// What becomes what:
//   - posts tagged "Catholic Kids Video Lessons" (or other videos) → lessons; "Catholic Kids Songs" / LoFi → songs
//   - COURSES below: a tag whose lessons form a course, oldest first
//   - ALBUMS below: a tag whose songs form an album, oldest first
//   - a "Quiz: …" heading in a post → the quiz (question, bullet choices with the right one in bold,
//     "Why: …"; a question with "Answer: …" instead of choices becomes "say it, then tap to check")
//   - the "Read the words of the video" toggle → the transcript
//   - the File Downloads page → each song's downloads, matched by the song's name
// A post that can't be read is skipped and reported; it never breaks the rest.

import fs from "node:fs";

const SITE = "https://kids.methodiusmedia.com";
const KEY = "62118cbdf5cb5d1129586f9d3f"; // Ghost's public Content API key (it's in every page of the kids site)
const OUT = new URL("../public/data/library.json", import.meta.url);

const COURSES = [
  { tag: "intro-to-byzantine-rite", emoji: "☦️" },
  { tag: "all-about-popes", emoji: "🗝️" },
  { tag: "catholic-saints-for-boys", emoji: "🛡️" },
  { tag: "catholic-saints-for-girls", emoji: "🌹" },
];
const ALBUMS = [
  { tag: "byzantine-catholic-songs", emoji: "☦️" },
  { tag: "bible-songs-for-kids", emoji: "📖" },
  { tag: "songs-by-s-d-cason", emoji: "🎸" },
  { tag: "songs-by-anthony-moran", emoji: "🎹" },
  { tag: "songs-with-richard-schletty", emoji: "🎻" },
  { tag: "catholic-lofi", emoji: "🌙" },
  { tag: "monastery-music-volume-1", emoji: "⛪" },
  { tag: "catholic-kids-ambience-music", emoji: "🕯️" },
];
const SONG_TAGS = new Set(["catholic-kids-songs", "catholic-lofi", "catholic-kids-ambience-music", "monastery-music-volume-1"]);

const slugify = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50).replace(/-$/, "");

const api = async (path) => {
  const sep = path.includes("?") ? "&" : "?";
  for (let tries = 0; ; tries++) {
    try {
      const r = await fetch(`${SITE}/ghost/api/content/${path}${sep}key=${KEY}`, { signal: AbortSignal.timeout(90_000) });
      if (!r.ok) throw new Error(`${r.status} ${path}`);
      return await r.json();
    } catch (e) { if (tries >= 2) throw e; }
  }
};

const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = (h) => decode(h.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const thumb = (url) => url?.replace("/content/images/", "/content/images/size/w600/") ?? null; // Ghost makes small copies

// "Who is Pope Leo XIV? — Catholic Kids Videos" → "Who is Pope Leo XIV?"
function cleanTitle(t) {
  let s = t.replace(/\s+[-—–|]\s+(?:a |an |the )?[^-—–|]*(catholic|kids|lofi|song|video|lesson|ambience|music)[^-—–|]*$/i, "");
  s = s.replace(/\s+A Video Lesson.*$/i, "").replace(/\s+-\s*by .*$/i, "").replace(/\s+Free\b[^?!.]*?(video|song|lesson)s?\b.*$/i, "").trim();
  return s || t;
}

function parseQuiz(html) {
  const m = html.match(/<h2[^>]*>\s*Quiz[^<]*<\/h2>([\s\S]*?)(?:<hr\s*\/?>|<div class="kg-card|$)/);
  if (!m) return null;
  const parts = [...m[1].matchAll(/<(p|ul)>([\s\S]*?)<\/\1>/g)].map(([, tag, inner]) => ({ tag, inner }));
  const quiz = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].tag !== "p" || /^\s*(Why|Answer):/.test(text(parts[i].inner))) continue;
    const q = { q: text(parts[i].inner) };
    const next = parts[i + 1];
    if (next?.tag === "ul") {
      const lis = [...next.inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, li]) => li);
      q.choices = lis.map(text);
      q.answer = lis.findIndex((li) => /<strong>/.test(li));
      i++;
    } else if (next && /^Answer:/.test(text(next.inner))) {
      q.reveal = text(next.inner).replace(/^Answer:\s*/, "");
      i++;
    }
    const why = parts[i + 1] && text(parts[i + 1].inner);
    if (why?.startsWith("Why:")) { q.why = why.replace(/^Why:\s*/, ""); i++; }
    if ((q.choices && q.answer >= 0 && q.choices.length >= 2) || q.reveal) quiz.push(q);
  }
  return quiz.length ? quiz : null;
}

function parseTranscript(html) {
  const m = html.match(/kg-toggle-heading-text[^>]*>[\s\S]*?Read the words[\s\S]*?<div class="kg-toggle-content">([\s\S]*?)<\/div>\s*<\/div>/);
  if (!m) return null;
  return [...m[1].matchAll(/<(p|h[2-4]|blockquote)[^>]*>([\s\S]*?)<\/\1>/g)]
    .map(([, tag, inner]) => (tag[0] === "h" ? `## ${text(inner)}` : text(inner))).filter((x) => x && x !== "##");
}

// Downloads: the File Downloads page is a list of file cards.
function parseFiles(html) {
  return [...html.matchAll(/<div class="kg-card kg-file-card[\s\S]*?<a class="kg-file-card-container" href="([^"]+)"[\s\S]*?kg-file-card-title">([\s\S]*?)<\/div>/g)]
    .map(([, url, title]) => ({ url: url.replace(/\?ref=.*$/, ""), title: text(title) }));
}
const STOP = new Set("a an the and of to in for with song songs is are who what we our my your catholic kids kid version lofi by".split(" "));
const words = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1 && !STOP.has(w));
function downloadsFor(title, files) {
  const want = words(title);
  if (!want.length) return [];
  return files.filter((f) => {
    const have = new Set(words(`${f.title} ${decodeURIComponent(f.url.split("/").pop())}`));
    return want.every((w) => have.has(w)) || (want.length >= 3 && want.filter((w) => have.has(w)).length >= want.length - 1);
  }).filter((f) => {
    // Pictures aren't downloads, unless it's a lead sheet saved as a picture.
    const name = `${f.title} ${f.url}`.toLowerCase();
    return !/\.(png|jpe?g|webp|gif)$/.test(f.url.toLowerCase()) || /lead|sheet|chord|score/.test(name);
  }).filter((f, i, all) => all.findIndex((g) => g.url === f.url) === i).map((f) => {
    const name = `${f.title} ${f.url}`.toLowerCase(), ext = f.url.split(".").pop().toLowerCase();
    const kind = /lead|chord|score|sheet/.test(name) || ext === "pdf" ? "📄 Lead sheet" : /instrumental|karaoke/.test(name) ? "🎼 Instrumental" : ["mp3", "m4a", "wav"].includes(ext) ? "🎧 Song (audio)" : ["mp4", "mov"].includes(ext) ? "🎬 Video" : "📎 File";
    return { kind, label: f.title, url: f.url };
  });
}

// "Music and lyrics: Shalone Cason Vocals: Adrianna Ortiz and Kylie Keegan" → { written: [...], sung: [...], … }
const ROLE = /((?:lead |backup |additional )?(?:music|lyrics|vocals|arrangement|animation)(?:(?:\s*,\s*|\s+and\s+|,\s*and\s+)(?:music|lyrics|vocals|arrangement|animation))*)\s*:/gi;
function parseCredits(html) {
  const m = html.match(/kg-callout-text[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const t = text(m[1]).replace(/^[^A-Za-z]+/, "");
  const marks = [...t.matchAll(ROLE)];
  if (!marks.length) return null;
  const out = {};
  marks.forEach((mk, i) => {
    const roles = mk[1].toLowerCase(), end = i + 1 < marks.length ? marks[i + 1].index : t.length;
    const names = t.slice(mk.index + mk[0].length, end).replace(/[.;]\s*$/, "").split(/\s*,\s*(?:and\s+|&\s*)?|\s+and\s+|\s*&\s*/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean);
    const add = (k) => { out[k] = [...new Set([...(out[k] ?? []), ...names])]; };
    if (/music|lyrics|arrangement/.test(roles)) add("written");
    if (/vocals/.test(roles)) add(/backup|additional/.test(roles) ? "backing" : "sung");
    if (/animation/.test(roles)) add("animation");
  });
  return Object.keys(out).length ? out : null;
}
// Songs with no credit line: the tag says who ("Songs by Anthony Moran").
function creditsFromTags(tags) {
  const by = tags.find((t) => /^songs-(by|with)-/.test(t.slug));
  if (by) { const who = by.name.replace(/^Songs (by|with)\s+/i, ""); return { written: [who], sung: [who] }; }
  if (tags.some((t) => t.slug === "catholic-lofi")) return { written: ["Catholic LoFi"] };
  return null;
}

const posts = [];
for (let page = 1; ; page++) {
  const j = await api(`posts/?limit=100&page=${page}&include=tags&formats=html`);
  posts.push(...j.posts);
  if (page >= j.meta.pagination.pages) break;
}
const files = parseFiles((await api("pages/slug/files/?formats=html")).pages[0].html ?? "");
const tagNames = {};
const lessons = [], songs = [], skipped = [];

for (const p of posts.sort((a, b) => a.published_at.localeCompare(b.published_at))) {
  try {
    const html = p.html ?? "";
    const vm = html.match(/<video[^>]+src="([^"]+)"[^>]*?(?:background:[^"]*?url\('([^']+)'\))?/);
    if (!vm) { skipped.push(`${p.slug} (no video)`); continue; }
    const tags = p.tags.filter((t) => t.visibility === "public");
    tags.forEach((t) => { tagNames[t.slug] = t.name; });
    const slugs = tags.map((t) => t.slug);
    const base = {
      id: slugify(cleanTitle(p.title)),
      title: cleanTitle(p.title),
      about: p.custom_excerpt ?? null,
      video: vm[1],
      poster: thumb(vm[2] ?? p.feature_image),
      tags: slugs,
      date: p.published_at.slice(0, 10),
    };
    if (slugs.some((s) => SONG_TAGS.has(s))) {
      const downloads = downloadsFor(base.title, files);
      // The song's own video can always be saved.
      if (!downloads.some((d) => d.url === base.video)) downloads.push({ kind: "🎬 Video", label: base.title, url: base.video });
      songs.push({ ...base, credits: parseCredits(html) ?? creditsFromTags(tags), downloads });
    } else {
      lessons.push({ ...base, quiz: parseQuiz(html), transcript: parseTranscript(html) });
    }
  } catch (e) { skipped.push(`${p.slug} (${e.message})`); }
}

// A remake replaces the older video with the same title: keep the newest.
for (const list of [lessons, songs]) {
  for (let i = list.length - 1; i >= 0; i--) {
    const newer = list.findIndex((x, j) => j > i && x.id === list[i].id);
    if (newer > -1) { skipped.push(`${list[i].id} from ${list[i].date} (replaced by the newer one from ${list[newer].date})`); list.splice(i, 1); }
  }
}
// Unique ids (two posts could shorten to the same one).
for (const list of [lessons, songs]) {
  const seen = new Map();
  for (const x of list) { const n = (seen.get(x.id) ?? 0) + 1; seen.set(x.id, n); if (n > 1) x.id = `${x.id}-${n}`; }
}

// Hand-written quizzes (content/quizzes.json) replace a lesson's Ghost quiz. A bad entry is reported and skipped.
const QUIZ_TYPES = { choice: (q) => q.choices?.length >= 2 && q.answer >= 0 && q.answer < q.choices.length,
  blank: (q) => /_{2,}/.test(q.q) && q.words?.includes(q.answer), order: (q) => q.items?.length >= 3, match: (q) => q.pairs?.length >= 2 };
const extra = JSON.parse(fs.readFileSync(new URL("../content/quizzes.json", import.meta.url), "utf8"));
for (const [id, quiz] of Object.entries(extra)) {
  if (id.startsWith("_")) continue;
  const l = lessons.find((x) => x.id === id);
  if (!l) { skipped.push(`quiz for ${id} (no such lesson)`); continue; }
  const good = quiz.questions.filter((q) => (QUIZ_TYPES[q.type ?? "choice"]?.(q) ? true : (skipped.push(`a quiz question in ${id}: "${String(q.q).slice(0, 40)}"`), false)));
  if (good.length) l.quiz = good.map((q) => ({ type: "choice", ...q }));
  if (quiz.draft) l.quizDraft = true;
}
// Ghost fill-in questions ("Answer: …") need a word bank, so they come from content/quizzes.json instead.
for (const l of lessons) if (l.quiz) { l.quiz = l.quiz.filter((q) => !q.reveal).map((q) => ({ type: "choice", ...q })); if (!l.quiz.length) l.quiz = null; }

// The same person written two ways.
const ALIASES = { "S.D. Cason": "Shalone Cason", Ashley: "Ashley Cason", Dominic: "Dominic Cason" };
for (const s of songs) for (const k of Object.keys(s.credits ?? {})) s.credits[k] = [...new Set(s.credits[k].map((n) => ALIASES[n] ?? n))];
const people = {};
for (const s of songs) for (const [role, names] of Object.entries(s.credits ?? {})) for (const n of names) {
  const id = slugify(n);
  (people[id] ??= { id, name: n, songs: [] }).songs.includes(s.id) || people[id].songs.push(s.id);
}

const group = (defs, list) => defs.map((d) => ({ id: d.tag, title: tagNames[d.tag] ?? d.tag, emoji: d.emoji, items: list.filter((x) => x.tags.includes(d.tag)).map((x) => x.id) }))
  .filter((g) => g.items.length);
const library = { source: SITE, built: new Date().toISOString().slice(0, 10), courses: group(COURSES, lessons), albums: group(ALBUMS, songs), people: Object.values(people), lessons, songs };

// Videos, pictures and downloads are served from our own storage (tools/copy-media.sh copies them):
// https://kids.methodiusmedia.com/content/media/x.mp4 → media/media/x.mp4
const GHOST_CONTENT = `${SITE}/content/`;
const ours = (u) => (typeof u === "string" && u.startsWith(GHOST_CONTENT) ? `media/${decodeURIComponent(u.slice(GHOST_CONTENT.length))}` : u);
for (const x of [...lessons, ...songs]) {
  x.video = ours(x.video); x.poster = ours(x.poster);
  for (const d of x.downloads ?? []) d.url = ours(d.url);
}

fs.mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(library, null, 1));
console.log(`lessons ${lessons.length} (with quiz ${lessons.filter((l) => l.quiz).length}, with words ${lessons.filter((l) => l.transcript).length})`);
console.log(`songs ${songs.length} (with downloads ${songs.filter((s) => s.downloads.length).length})`);
console.log(`courses: ${library.courses.map((c) => `${c.title} (${c.items.length})`).join(", ")}`);
console.log(`albums: ${library.albums.map((a) => `${a.title} (${a.items.length})`).join(", ")}`);
console.log(`people: ${library.people.map((p) => `${p.name} (${p.songs.length})`).join(", ")}`);
console.log(`songs without credits: ${songs.filter((s) => !s.credits).map((s) => s.title).join(", ") || "none"}`);
if (skipped.length) console.log(`skipped ${skipped.length}: ${skipped.join(", ")}`);
