// Watch & Sing's content rules, shared by the Studio page (studio/) and the hub's save route, so one bad entry
// can never blank the app: validateLibrary() says what's wrong before anything is saved.
//
// The library: { courses: [{ id, title, emoji, items: [lessonId] }], albums: [{ id, title, emoji, items: [songId] }],
//   people: [{ id, name, songs: [songId] }]  ← rebuilt from the songs' credits on every save,
//   lessons: [{ id, title, about, video, poster, date, tags, quiz: [question], quizDraft, transcript, hidden }],
//   songs: [{ id, title, about, video, poster, date, tags, credits: { role: [name] }, downloads: [{ kind, label, url }], hidden }] }
// Quiz questions: choice { q, choices, answer: index } · blank { q with ____, words, answer: word } ·
//   order { q, items in the right order } · match { q, pairs: [[left, right]] }; each may have "why".

export const slugify = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "").slice(0, 50).replace(/-$/, "");
/** A new id from a title that no item in `lists` uses yet ("my-song", "my-song-2"…). */
export function newId(title, ...lists) {
  const taken = new Set(lists.flat().map((x) => x.id));
  const base = slugify(title) || "untitled";
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

// The same person written two ways (from the Ghost import).
const ALIASES = { "S.D. Cason": "Shalone Cason", Ashley: "Ashley Cason", Dominic: "Dominic Cason" };
/** People and their songs, from every song's credits (hidden songs too, so a person never disappears by accident). */
export function derivePeople(lib) {
  const people = new Map();
  for (const s of lib.songs ?? []) for (const names of Object.values(s.credits ?? {})) for (const raw of names ?? []) {
    const n = ALIASES[raw?.trim()] ?? raw?.trim();
    if (!n) continue;
    const id = slugify(n);
    if (!people.has(id)) people.set(id, { id, name: n, songs: [] });
    if (!people.get(id).songs.includes(s.id)) people.get(id).songs.push(s.id);
  }
  return [...people.values()];
}

const QUIZ_TYPES = ["choice", "blank", "order", "match"];
const isMedia = (u) => typeof u === "string" && (/^media\/[\w./%() ,'&+-]+$/i.test(u) || /^https:\/\//.test(u));

/** { errors: [...], warnings: [...] }; errors block saving, warnings are shown. */
export function validateLibrary(lib) {
  const errors = [], warnings = [];
  if (!lib || typeof lib !== "object") return { errors: ["The library is empty."], warnings };
  for (const k of ["courses", "albums", "lessons", "songs"]) if (!Array.isArray(lib[k])) errors.push(`The library has no ${k} list.`);
  if (errors.length) return { errors, warnings };
  const ids = (list, what) => {
    const seen = new Set();
    for (const x of list) {
      const name = x?.title ? `“${x.title}”` : `a ${what}`;
      if (!x || typeof x !== "object") { errors.push(`An empty ${what}.`); continue; }
      if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(x.id ?? "")) errors.push(`${name}: its id “${x.id ?? ""}” should be lowercase letters, numbers and dashes.`);
      else if (seen.has(x.id)) errors.push(`Two ${what}s have the id “${x.id}”.`);
      seen.add(x.id);
      if (!String(x.title ?? "").trim()) errors.push(`The ${what} “${x.id}” has no title.`);
    }
    return seen;
  };
  const lessonIds = ids(lib.lessons, "lesson"), songIds = ids(lib.songs, "song");
  ids(lib.courses, "course"); ids(lib.albums, "album");
  for (const [list, what, of, name] of [[lib.courses, "course", lessonIds, "lesson"], [lib.albums, "album", songIds, "song"]]) for (const g of list) {
    if (!Array.isArray(g.items)) { errors.push(`The ${what} “${g.title}” has no list of ${name}s.`); continue; }
    for (const id of g.items) if (!of.has(id)) errors.push(`The ${what} “${g.title}” lists a ${name} that doesn't exist: “${id}”.`);
    if (!g.items.length) warnings.push(`The ${what} “${g.title}” is empty, so it won't show.`);
  }
  for (const x of [...lib.lessons, ...lib.songs]) {
    if (x.video != null && x.video !== "" && !isMedia(x.video)) errors.push(`“${x.title}”: the video address doesn't look right.`);
    if (x.poster != null && x.poster !== "" && !isMedia(x.poster)) errors.push(`“${x.title}”: the picture address doesn't look right.`);
    if (!x.video && !x.hidden) warnings.push(`“${x.title}” has no video yet.`);
    if (x.date && !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) errors.push(`“${x.title}”: the date should look like 2026-11-17.`);
  }
  for (const s of lib.songs) for (const d of s.downloads ?? []) if (!isMedia(d?.url) && !/^\/leadsheet\//.test(d?.url ?? "")) errors.push(`“${s.title}”: the download “${d?.label ?? d?.kind}” has no file.`);
  for (const l of lib.lessons) (l.quiz ?? []).forEach((q, i) => {
    const where = `“${l.title}”, question ${i + 1}`;
    if (!QUIZ_TYPES.includes(q?.type)) { errors.push(`${where}: unknown kind of question.`); return; }
    if (!String(q.q ?? "").trim()) errors.push(`${where}: the question is empty.`);
    if (q.type === "choice") {
      const ch = (q.choices ?? []).filter((c) => String(c).trim());
      if (ch.length < 2) errors.push(`${where}: needs at least two answers to choose from.`);
      if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < (q.choices ?? []).length)) errors.push(`${where}: pick which answer is right.`);
      if (new Set(ch).size !== ch.length) errors.push(`${where}: two answers are the same.`);
    }
    if (q.type === "blank") {
      if (!/_{2,}/.test(q.q ?? "")) errors.push(`${where}: put ____ where the missing word goes.`);
      if (!(q.words ?? []).includes(q.answer)) errors.push(`${where}: the right word has to be one of the word tiles.`);
      if ((q.words ?? []).length < 2) errors.push(`${where}: needs at least two word tiles.`);
    }
    if (q.type === "order" && (q.items ?? []).filter((x) => String(x).trim()).length < 2) errors.push(`${where}: needs at least two things to put in order.`);
    if (q.type === "match" && (q.pairs ?? []).filter((p) => p?.[0] && p?.[1]).length < 2) errors.push(`${where}: needs at least two pairs to match.`);
  });
  return { errors, warnings };
}

/** Everything a save does to the library: people rebuilt, a date stamp. Returns a new object. */
export function prepareForSave(lib) {
  return { ...lib, people: derivePeople(lib), built: new Date().toISOString().slice(0, 10), source: "Angelio Studio" };
}
