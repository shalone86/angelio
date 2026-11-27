// Pure typing, keyboard guidance, and Writer's Checklist helpers (no DOM).
// Used by js/writing.js, js/app.js, and tested in test/writing.test.js.

export const QWERTY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const ALL_LETTERS = new Set(QWERTY_ROWS.flat());
const TYPEABLE_RE = /^[A-Za-z ,'.?!]+$/;
export const isTypeable = (s) => typeof s === "string" && s.length > 0 && TYPEABLE_RE.test(s);

/** Normalize smart quotes and extra spaces while preserving case and punctuation. */
export const normalizeSpaces = (s) => String(s ?? "")
  .replace(/[’‘]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, " ")
  .trim();

/**
 * Given the live `typed` string, exact `target`, and current `shiftOn` state, return which
 * keyboard key should gently glow for beginners: `"shift"`, `"back"`, `"check"`, `" "`,
 * a punctuation mark, or a lowercase letter `"a".."z"`.
 */
export function nextGuidedKey(typed, target, shiftOn = false) {
  if (!target) return null;
  if (typed === target) return "check";
  if (!target.startsWith(typed)) return "back";
  const ch = target[typed.length];
  if (/^[A-Z]$/.test(ch)) return shiftOn ? ch.toLowerCase() : "shift";
  if (ALL_LETTERS.has(ch.toLowerCase())) return ch.toLowerCase();
  return ch;
}

const stripEnd = (s) => s.replace(/[.?!]+$/, "");
const stripInnerPunct = (s) => normalizeSpaces(s.replace(/[,']/g, ""));

/** Check an exact/multi-variant typed sentence and return friendly diagnostic feedback. */
export function checkTypedSentence(rawInput, item) {
  const typed = normalizeSpaces(rawInput);
  if (!typed) return { ok: false, empty: true, msg: "Type your sentence first, then tap Check!" };

  const accepts = (item.accept?.length ? item.accept : [item.answer]).filter(Boolean).map(normalizeSpaces);
  if (accepts.includes(typed)) return { ok: true, matched: typed };

  if (accepts.includes(normalizeSpaces(typed.replace(/\s+([.?!,])/g, "$1")))) {
    return { ok: false, kind: "space", msg: "Almost! Take out the extra space before the punctuation mark." };
  }
  if (accepts.some((a) => a.toLowerCase() === typed.toLowerCase())) {
    return { ok: false, kind: "caps", msg: "Almost! Check your capital letters (use ⇧ Shift)." };
  }
  if (accepts.some((a) => stripEnd(a) === stripEnd(typed))) {
    return { ok: false, kind: "end", msg: "Great words! Check the ending mark (. ? !)." };
  }
  if (accepts.some((a) => stripInnerPunct(a) === stripInnerPunct(typed))) {
    return { ok: false, kind: "punct", msg: "So close! Check your comma or apostrophe (, ')." };
  }
  if (accepts.some((a) => stripEnd(a).toLowerCase() === stripEnd(typed).toLowerCase())) {
    return { ok: false, kind: "caps-end", msg: "Good words! Check your capital letter at the start and ending mark (. ? !)." };
  }

  const tw = typed.split(" ").filter(Boolean);
  for (const a of accepts) {
    const aw = a.split(" ").filter(Boolean);
    if (tw.length !== aw.length) continue;
    const diffs = [];
    for (let i = 0; i < tw.length; i++) {
      if (stripEnd(tw[i]).replace(/,$/, "").toLowerCase() !== stripEnd(aw[i]).replace(/,$/, "").toLowerCase()) diffs.push(i);
    }
    if (diffs.length === 1) {
      const bad = stripEnd(tw[diffs[0]]).replace(/,$/, "");
      return { ok: false, kind: "spelling", msg: `So close! Check the word "${bad}".` };
    }
  }

  return { ok: false, kind: "other", msg: item.hint };
}

// ───────── Grade 3–4 Writer's Checklist (free writing) ─────────

const TINY_VOWELLESS = new Set(["brr", "hmm", "shh", "nth", "tst"]);

function looksReadable(words, minWords) {
  const tokens = words.map((w) => w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "")).filter(Boolean);
  if (tokens.length < minWords) return false;
  for (const tok of tokens) {
    const letters = tok.replace(/[^A-Za-z]/g, "");
    if (!letters) continue;
    if (/(.)\1{3}/i.test(letters)) return false;
    if (letters.length >= 3 && !/[aeiouy]/i.test(letters) && !TINY_VOWELLESS.has(letters.toLowerCase())) return false;
  }
  const unique = new Set(tokens.map((t) => t.toLowerCase()));
  return unique.size >= Math.min(4, minWords);
}

function normPlain(s) {
  return normalizeSpaces(s).toLowerCase().replace(/[.?!,'"]/g, "");
}

function isCopiedFrom(typed, sources = []) {
  if (!sources?.length) return false;
  const nt = normPlain(typed);
  const tw = nt.split(" ").filter(Boolean);
  for (const src of sources) {
    const ns = normPlain(src);
    if (!ns) continue;
    if (nt === ns) return true;
    const sw = ns.split(" ").filter(Boolean);
    if (sw.length >= 4 && nt.includes(ns) && tw.length <= sw.length + 2) return true;
    if (sw.length >= 4 && Math.abs(tw.length - sw.length) <= 1) {
      let same = 0;
      const limit = Math.min(tw.length, sw.length);
      for (let i = 0; i < limit; i++) if (tw[i] === sw[i]) same++;
      if (same / Math.max(tw.length, sw.length) >= 0.85) return true;
    }
  }
  return false;
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchStem(text, stem) {
  if (stem instanceof RegExp) return stem.test(text);
  const s = String(stem);
  if (/\s/.test(s)) return text.toLowerCase().includes(s.toLowerCase());
  if (s.length <= 2) return new RegExp(`\\b${escRe(s)}\\b`, "i").test(text);
  return new RegExp(`\\b${escRe(s)}`, "i").test(text);
}

function checkSkillRule(typed, words, rules, item) {
  if (isCopiedFrom(typed, rules.notCopyOf)) {
    return { ok: false, failMsg: rules.copyMsg ?? "Write your own new sentence instead of copying the example!" };
  }
  if (rules.avoidWord) {
    const hasAvoid = new RegExp(`\\b${escRe(rules.avoidWord)}\\b`, "i").test(typed);
    const hasVivid = (rules.vividStems ?? []).some((st) => matchStem(typed, st));
    if (hasVivid) return { ok: true, failMsg: "" };
    if (!hasAvoid && words.length >= (rules.creativeWords ?? 8)) return { ok: true, failMsg: "" };
    if (hasAvoid) {
      return { ok: false, failMsg: `Show it with sights, sounds, or actions instead of using the word "${rules.avoidWord}"!` };
    }
    return { ok: false, failMsg: rules.skillMsg ?? item.hint };
  }
  if (rules.groups?.length) {
    const minGroups = rules.minGroups ?? rules.groups.length;
    let hits = 0;
    let firstFail = null;
    for (const g of rules.groups) {
      const patterns = Array.isArray(g) ? g : g.words;
      const hit = patterns.some((st) => matchStem(typed, st));
      if (hit) hits++;
      else if (!firstFail && !Array.isArray(g) && g.failMsg) firstFail = g.failMsg;
    }
    if (hits >= minGroups) return { ok: true, failMsg: "" };
    return { ok: false, failMsg: (minGroups === rules.groups.length && firstFail) ? firstFail : (rules.skillMsg ?? item.hint) };
  }
  if (rules.mustAny?.length) {
    const hit = rules.mustAny.some((st) => matchStem(typed, st));
    if (hit) return { ok: true, failMsg: "" };
    return { ok: false, failMsg: rules.skillMsg ?? item.hint };
  }
  return { ok: true, failMsg: "" };
}

/** Live evaluation for the 4 Writer's Checklist badges (`Aa Capital`, `.?! End mark`, words, skill). */
export function evaluateChecklist(rawInput, item) {
  const typed = normalizeSpaces(rawInput);
  const rules = item.rules ?? {};
  const minWords = rules.minWords ?? 5;
  const maxWords = rules.maxWords ?? 32;
  const words = typed ? typed.split(/\s+/).filter(Boolean) : [];

  const capsOk = /^[A-Z]/.test(typed);
  const endOk = /[.!?]$/.test(typed);
  const tooShort = words.length < minWords;
  const tooLong = words.length > maxWords;
  const readable = !tooShort && !tooLong && looksReadable(words, minWords);
  const lenFail = tooShort
    ? `Write a full sentence (at least ${minWords} words).`
    : tooLong
      ? `Keep it to one clear sentence (${maxWords} words or fewer).`
      : "Use real words with spaces between them.";

  const skill = typed ? checkSkillRule(typed, words, rules, item) : { ok: false, failMsg: rules.skillMsg ?? item.hint };

  return [
    { id: "caps", label: "Aa Capital", ok: capsOk, failMsg: "Start with a capital letter (use ⇧ Shift)." },
    { id: "end", label: ".?! End mark", ok: endOk, failMsg: "Finish with a period (.), question mark (?), or exclamation mark (!)." },
    { id: "length", label: `${minWords}+ words`, ok: readable, failMsg: lenFail },
    { id: "skill", label: item.skillLabel ?? "On topic", ok: readable && skill.ok, failMsg: skill.failMsg },
  ];
}

/** Final check when the child taps ✓ Check on an open-ended `write-free` question. */
export function checkFreeWrite(rawInput, item) {
  const typed = normalizeSpaces(rawInput);
  if (!typed) return { ok: false, empty: true, checks: evaluateChecklist("", item), msg: "Write your sentence first, then tap Check!" };
  const checks = evaluateChecklist(typed, item);
  const failed = checks.find((c) => !c.ok);
  return { ok: !failed, empty: false, typed, checks, msg: failed?.failMsg ?? "" };
}
