// Writing Skills logic for Grades 1 to 4: level lookup, seeded shuffling, and question building.
// Pure data & question generation (no DOM); tested in test/writing.test.js.

import { GRADES, LEVELS } from "./writing-data.js";
export { QWERTY_ROWS, normalizeSpaces, nextGuidedKey, checkTypedSentence, evaluateChecklist, checkFreeWrite, isTypeable } from "./writing-check.js";

export { GRADES, LEVELS };
export const PER_LEVEL = 6;
export const levelById = (id) => LEVELS.find((l) => l.id === id);

// ───────── random ─────────

export function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(a, rand = Math.random) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle `arr` and ensure it is never already in the original order (joined by `sep`). */
function shuffleNotSorted(arr, rand, sep = "\n") {
  const orig = arr.join(sep);
  let out = shuffle(arr, rand);
  for (let t = 0; t < 12 && out.join(sep) === orig; t++) out = shuffle(arr, rand);
  if (out.join(sep) === orig && out.length >= 2) [out[0], out[1]] = [out[1], out[0]];
  return out;
}

// ───────── level builder ─────────

export function makeLevel(level, seed = Date.now()) {
  const rand = seeded(seed);
  const picked = shuffle(level.items, rand).slice(0, PER_LEVEL);
  return picked.map((item) => {
    const type = item.type ?? level.kind;
    if (type === "choose") {
      return { ...item, type, choices: shuffle(item.choices, rand) };
    }
    if (type === "build") {
      return {
        ...item,
        type,
        answer: item.words.join(" "),
        tiles: shuffleNotSorted(item.words, rand, " "),
      };
    }
    if (type === "order") {
      return {
        ...item,
        type,
        answer: item.steps.join(" "),
        items: shuffleNotSorted(item.steps, rand, "|"),
      };
    }
    if (type === "tap-sentence") {
      return {
        ...item,
        type,
        answer: item.sentences[item.oddIndex],
      };
    }
    if (type === "type-word" || type === "type-sentence" || type === "write-free") {
      return { ...item, type };
    }
    throw new Error(`Unknown question type: ${type}`);
  });
}

// 3 stars only with no mistakes (matches the giant sticker); any mistake: mini sticker.
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);
