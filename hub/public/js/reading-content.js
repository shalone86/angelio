// The rules for the reading lessons (Letter Lane and Read Aloud's phonics.js PATTERNS), shared by the Studio page
// and the hub's save route, so nothing broken can be saved. The phonics helpers come in as `P` (chunks, wordOf,
// focusIndexes, patternWord) because the page loads them from /letters/js/phonics.js and the Worker from the repo.

export const GRADE_NAMES = { 2: "Kindergarten", 3: "1st grade", 4: "2nd grade", 5: "3rd grade" };
/** Words in a sentence, by grade: K, 1st, 2nd, 3rd (3rd grade reads two sentences). */
export const SENTENCE_WORDS = { 2: [2, 4], 3: [4, 7], 4: [7, 11], 5: [12, 30] };
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

/** Problems with one lesson: { errors: [...], warnings: [...] }. */
export function checkPattern(p, P) {
  const errors = [], warnings = [], name = `“${p?.title || p?.id || "a lesson"}”`;
  const err = (m) => errors.push(`${name}: ${m}`);
  if (!p || typeof p !== "object") return { errors: ["An empty lesson."], warnings };
  if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(p.id ?? "")) err("its id should be lowercase letters, numbers and dashes.");
  if (!String(p.title ?? "").trim()) err("needs a title.");
  if (!GRADE_NAMES[p.grade]) err("pick a grade (K to 3rd).");
  if (![1, 2].includes(p.level)) err("pick Level 1 or Level 2.");
  if (!String(p.teach ?? "").trim() || !String(p.say ?? "").trim()) err("the How it works card needs its words (shown and said).");
  if (/<(?!\/?(b|i|br)\b)[^>]*>/i.test(p.teach ?? "")) err("How it works can use <b>bold</b> and <i>slanted</i> words, nothing else.");
  if (!Array.isArray(p.focus)) err("the chunks it teaches should be a list.");
  const pics = Array.isArray(p.pictures) ? p.pictures : [], more = Array.isArray(p.words) ? p.words : [], sents = Array.isArray(p.sentences) ? p.sentences : [];
  if (pics.length < 6) err(`needs at least 6 picture words (has ${pics.length}).`);
  if (more.length < 8) err(`needs at least 8 more words (has ${more.length}).`);
  if (sents.length < 5) err(`needs at least 5 sentences (has ${sents.length}).`);
  const focus = Array.isArray(p.focus) ? p.focus : [];
  for (const [spec, emoji] of [...pics, ...more.map((w) => [w, "x"])]) {
    if (typeof spec !== "string" || !spec.trim()) { err("one of its words is empty."); continue; }
    if (!emoji) err(`the picture word “${P.wordOf(spec)}” needs its picture (an emoji).`);
    let ch;
    try { ch = P.chunks(spec, p.syllables); } catch { err(`can't read the chunks of “${spec}”.`); continue; }
    if (ch.map((c) => c.t).join("") !== P.wordOf(spec)) err(`the chunks of “${spec}” don't spell the word.`);
    const own = new Set(spec.split("|").filter((x) => x.includes(":")).map((x) => x.split(":")[0]));
    for (const c of ch) {
      // A sound chunk (not a word part) with no sound of its own falls back to its letters: that's a typo.
      const unknown = !p.syllables && c.t.length > 1 && !own.has(c.t) && !P.CHUNK_SOUNDS?.[c.t];
      if (!c.silent && (!c.s || /undefined/.test(c.s) || unknown)) err(`in “${P.wordOf(spec)}”, the chunk “${c.t}” has no sound (write it like ${c.t}:sound).`);
    }
    if ((focus.length || p.magic) && !P.focusIndexes({ focus, ...p }, ch).length) err(`“${P.wordOf(spec)}” doesn't use what the lesson teaches (${focus.join(", ") || "magic e"}).`);
  }
  const all = [...pics.map(([s]) => P.wordOf(String(s ?? ""))), ...more.map((s) => P.wordOf(String(s ?? "")))];
  const dup = all.find((w, i) => all.indexOf(w) !== i);
  if (dup) err(`“${dup}” is in the lesson twice.`);
  const [lo, hi] = SENTENCE_WORDS[p.grade] ?? [1, 40];
  for (const [t, e] of sents) {
    const text = String(t ?? "");
    if (!e) err(`the sentence “${text}” needs its picture (an emoji).`);
    const n = words(text);
    if (n < lo || n > hi) err(`“${text}” has ${n} words; ${GRADE_NAMES[p.grade] ?? "this grade"} sentences have ${lo} to ${hi}.`);
    if (!/^[A-Z“"].*[.!?”"]$/.test(text.trim())) err(`“${text}” should start with a capital letter and end with . ! or ?`);
    if (p.grade === 5 && text.split(/[.!?]\s/).length < 2) err(`3rd grade reads two sentences at a time: “${text}”.`);
    if ((focus.length || p.magic) && !text.split(/\s+/).some((w) => P.patternWord({ focus, ...p }, w))) err(`“${text}” doesn't use what the lesson teaches.`);
  }
  if (new Set(sents.map(([, e]) => e)).size !== sents.length) err("each sentence needs a different picture.");
  if (pics.length && new Set(pics.map(([, e]) => e)).size !== pics.length) warnings.push(`${name}: two picture words have the same picture.`);
  return { errors, warnings };
}

/** The whole list: every lesson's problems, plus ids used twice. */
export function validateReading(doc, P) {
  const patterns = doc?.patterns;
  if (!Array.isArray(patterns) || !patterns.length) return { errors: ["There are no reading lessons."], warnings: [] };
  const errors = [], warnings = [], seen = new Set();
  for (const p of patterns) {
    const r = checkPattern(p, P);
    // A hidden lesson is a draft: what's missing is a reminder, not a reason it can't be saved.
    if (p?.hidden && /^[a-z0-9][a-z0-9-]{0,59}$/.test(p.id ?? "")) warnings.push(...r.errors.map((e) => `(hidden, not finished) ${e}`), ...r.warnings);
    else { errors.push(...r.errors); warnings.push(...r.warnings); }
    if (seen.has(p?.id)) errors.push(`Two lessons have the id “${p.id}”.`);
    seen.add(p?.id);
  }
  return { errors, warnings };
}
