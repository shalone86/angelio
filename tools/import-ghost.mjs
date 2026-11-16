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
      songs.push({ ...base, downloads });
    } else {
      lessons.push({ ...base, quiz: parseQuiz(html), transcript: parseTranscript(html) });
    }
  } catch (e) { skipped.push(`${p.slug} (${e.message})`); }
}

// Unique ids (two posts could shorten to the same one).
for (const list of [lessons, songs]) {
  const seen = new Map();
  for (const x of list) { const n = (seen.get(x.id) ?? 0) + 1; seen.set(x.id, n); if (n > 1) x.id = `${x.id}-${n}`; }
}

const group = (defs, list) => defs.map((d) => ({ id: d.tag, title: tagNames[d.tag] ?? d.tag, emoji: d.emoji, items: list.filter((x) => x.tags.includes(d.tag)).map((x) => x.id) }))
  .filter((g) => g.items.length);
const library = { source: SITE, built: new Date().toISOString().slice(0, 10), courses: group(COURSES, lessons), albums: group(ALBUMS, songs), lessons, songs };

fs.mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(library, null, 1));
console.log(`lessons ${lessons.length} (with quiz ${lessons.filter((l) => l.quiz).length}, with words ${lessons.filter((l) => l.transcript).length})`);
console.log(`songs ${songs.length} (with downloads ${songs.filter((s) => s.downloads.length).length})`);
console.log(`courses: ${library.courses.map((c) => `${c.title} (${c.items.length})`).join(", ")}`);
console.log(`albums: ${library.albums.map((a) => `${a.title} (${a.items.length})`).join(", ")}`);
if (skipped.length) console.log(`skipped ${skipped.length}: ${skipped.join(", ")}`);
