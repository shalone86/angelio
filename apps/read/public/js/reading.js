// The reading levels, PreK to 3rd grade: letters and their sounds, first sounds, rhymes, beats, big and
// little letters, blending and building words, then the phonics lessons in phonics.js.
// Pure data and question making (no DOM); tested in test/reading.test.js.
//
import { PATTERNS, makePhonics, patternById } from "./phonics.js";

// Letter order follows the common early-phonics groups: s a t p i n, then m d g o c k, then e u r h b f l,
// then the rest (j v w x y z q).
//
// Shared by Letter Lane (PreK, K) and Read Aloud (1st to 3rd grade): grades.js says which grades an app shows.
import { APP_GRADES } from "./grades.js";

const ALL_GRADES = [
  { n: 1, title: "PreK", emoji: "🐣", blurb: "Big and little letters and all 26 letter sounds, then first sounds, rhymes and beats.",
    levels: ["Letters and their sounds", "Listening for sounds"] },
  { n: 2, title: "Kindergarten", emoji: "🦊", blurb: "Short vowels one at a time, blending and building words, -ck, sh ch th, two words in one, adding -s, and little sentences.",
    levels: ["Short a, i, o: blend and build", "Short u and e, and more"] },
  { n: 3, title: "1st Grade", emoji: "🦉", blurb: "Blends at the start and end, two-part words, and the endings -ing, -er, -ed, -es and -ly.",
    levels: ["Blends", "Two-part words and endings"] },
  { n: 4, title: "2nd Grade", emoji: "🦅", blurb: "Long vowels (magic e, ai, ee, oa, igh, y), bossy r, oi and ou, soft c and g, silent letters, tch and dge.",
    levels: ["Long vowels", "Bossy r, oi and ou, soft c and g, silent letters"] },
  { n: 5, title: "3rd Grade", emoji: "🦁", blurb: "Big words in chunks, oo and aw, prefixes (un-, re-), and endings like -tion, -ful and -ness.",
    levels: ["Big words, oo and aw, beginnings", "Endings"] },
];
export const GRADES = ALL_GRADES.filter((g) => APP_GRADES.includes(g.n));

export const GROUPS = [
  ["s", "a", "t", "p", "i", "n"],
  ["m", "d", "g", "o", "c", "k"],
  ["e", "u", "r", "h", "b", "f", "l"],
  ["j", "v", "w", "x", "y", "z", "q"],
];
export const ALL_LETTERS = GROUPS.flat();

export { LETTERS, keyword, soundSay } from "./letter-sounds.js";
import { LETTERS, keyword, soundSay, snd } from "./letter-sounds.js";

export const RHYMES = [
  [["cat", "🐱"], ["hat", "🎩"]], [["dog", "🐶"], ["frog", "🐸"]], [["bee", "🐝"], ["tree", "🌳"]],
  [["star", "⭐"], ["car", "🚗"]], [["moon", "🌙"], ["spoon", "🥄"]], [["cake", "🎂"], ["snake", "🐍"]],
  [["bear", "🐻"], ["chair", "🪑"]], [["fox", "🦊"], ["box", "📦"]], [["goat", "🐐"], ["boat", "⛵"]],
  [["king", "🤴"], ["ring", "💍"]], [["bell", "🔔"], ["shell", "🐚"]], [["house", "🏠"], ["mouse", "🐭"]],
  [["sock", "🧦"], ["clock", "🕰️"]], [["ten", "🔟"], ["hen", "🐔"]], [["bread", "🍞"], ["bed", "🛏️"]],
  [["nose", "👃"], ["rose", "🌹"]], [["light", "💡"], ["kite", "🪁"]], [["train", "🚂"], ["rain", "🌧️"]],
];

/** Words and their beats (syllables), said with a pause between beats. */
export const BEATS = [
  ["cat", "🐱", ["cat"]], ["sun", "☀️", ["sun"]], ["dog", "🐶", ["dog"]], ["fish", "🐟", ["fish"]], ["bus", "🚌", ["bus"]],
  ["apple", "🍎", ["ap", "ple"]], ["tiger", "🐯", ["ti", "ger"]], ["rabbit", "🐰", ["rab", "bit"]], ["pizza", "🍕", ["piz", "za"]],
  ["monkey", "🐵", ["mon", "key"]], ["rainbow", "🌈", ["rain", "bow"]], ["candle", "🕯️", ["can", "dle"]],
  ["banana", "🍌", ["ba", "na", "na"]], ["elephant", "🐘", ["el", "e", "phant"]], ["butterfly", "🦋", ["but", "ter", "fly"]],
  ["dinosaur", "🦕", ["di", "no", "saur"]], ["octopus", "🐙", ["oc", "to", "pus"]], ["umbrella", "☂️", ["um", "brel", "la"]],
  ["caterpillar", "🐛", ["cat", "er", "pil", "lar"]], ["watermelon", "🍉", ["wa", "ter", "mel", "on"]], ["alligator", "🐊", ["al", "li", "ga", "tor"]],
];

/** Three-letter words (consonant, short vowel, consonant) with a clear picture. Only letters from GROUPS. */
export const CVC = [
  ["cat", "🐱"], ["hat", "🎩"], ["bat", "🦇"], ["rat", "🐀"], ["map", "🗺️"], ["pan", "🍳"],
  ["pig", "🐷"], ["pin", "📌"], ["dog", "🐶"], ["log", "🪵"], ["sun", "☀️"], ["bus", "🚌"],
  ["bug", "🐛"], ["bed", "🛏️"], ["hen", "🐔"], ["ten", "🔟"], ["pen", "🖊️"], ["cup", "🥤"],
  ["nut", "🥜"], ["leg", "🦵"], ["lip", "👄"], ["pot", "🍲"], ["fin", "🦈"],
];

const phonics = (grade, level) => PATTERNS.filter((p) => p.grade === grade && p.level === level)
  .map((p) => ({ id: p.id, grade, level, type: "phonics", pattern: p.id, title: p.title, emoji: p.emoji }));

const ALL_STAGES = [
  // PreK, Level 1: the letters
  { id: "p-letters-1", grade: 1, level: 1, type: "letters", group: 0, title: "Letters s a t p i n", emoji: "🌱" },
  { id: "p-letters-2", grade: 1, level: 1, type: "letters", group: 1, title: "Letters m d g o c k", emoji: "🌿" },
  { id: "p-letters-3", grade: 1, level: 1, type: "letters", group: 2, title: "Letters e u r h b f l", emoji: "🌳" },
  { id: "p-letters-4", grade: 1, level: 1, type: "letters", group: 3, title: "Letters j v w x y z q", emoji: "🌻" },
  { id: "k-big-little", grade: 1, level: 1, type: "case", title: "Big and Little Letters", emoji: "🔠" },
  // PreK, Level 2: listening for sounds
  { id: "p-first-sounds", grade: 1, level: 2, type: "first", title: "First Sounds", emoji: "👂" },
  { id: "p-rhymes", grade: 1, level: 2, type: "rhyme", title: "Rhyme Time", emoji: "🎵" },
  { id: "p-beats", grade: 1, level: 2, type: "beats", title: "Clap the Beats", emoji: "🥁" },
  // Kindergarten: short vowels one at a time (phonics.js), then blend and build any short-vowel word
  ...phonics(2, 1),
  { id: "k-blend", grade: 2, level: 1, type: "blend", title: "Blend It!", emoji: "🧩" },
  { id: "k-build", grade: 2, level: 1, type: "build", title: "Build It!", emoji: "🏗️" },
  ...phonics(2, 2),
  // 1st to 3rd grade (Read Aloud): phonics.js, two levels each
  ...[3, 4, 5].flatMap((g) => [...phonics(g, 1), ...phonics(g, 2)]),
];
export const STAGES = ALL_STAGES.filter((s) => APP_GRADES.includes(s.grade));
export const stageById = (id) => STAGES.find((s) => s.id === id);
export const PER_STAGE = 8;

// ───────── random ─────────
export function seeded(seed) {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rand, a) => a[Math.floor(rand() * a.length)];
const shuffle = (a, rand) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const others = (pool, not, n, rand) => shuffle(pool.filter((x) => !not.includes(x)), rand).slice(0, n);
/** Letters that sound the same (c and k) never appear together as choices. */
const sameSound = (a, b) => LETTERS[a].sound === LETTERS[b].sound;
function letterChoices(answer, pool, n, rand) {
  const picked = [answer];
  for (const l of shuffle(pool, rand)) {
    if (picked.length >= n) break;
    if (!picked.some((p) => p === l || sameSound(p, l))) picked.push(l); // never two letters with the same sound (c, k)
  }
  return shuffle(picked, rand);
}

// ───────── questions ─────────
// Every question: { type, prompt (on screen), say (spoken), answer, choices, ... }

export function makeQuestion(stage, k, rand) {
  switch (stage.type) {
    case "letters": {
      // Questions 1–5: hear a letter's sound and find it. 6–8: which picture starts (x: ends) with a letter?
      const group = GROUPS[stage.group];
      const l = stage._order ? stage._order[k % stage._order.length] : group[k % group.length];
      if (k < 5) {
        return { type: "letters", letter: l, prompt: `Find the letter that says ${LETTERS[l].sound}`, say: `Find the letter that says ${soundSay(l)}.`,
          answer: l, choices: letterChoices(l, group, 4, rand), picture: keyword(l) };
      }
      const right = pick(rand, LETTERS[l].words), ends = !!LETTERS[l].ends;
      const wrong = others(group.filter((x) => !sameSound(x, l) && !LETTERS[x].ends), [l], 2, rand).map((x) => pick(rand, LETTERS[x].words));
      return { type: "letters-picture", letter: l, ends, prompt: `Which one ${ends ? "ends" : "starts"} with ${l}?`, say: `Which one ${ends ? "ends" : "starts"} with ${l}? ${soundSay(l)}.`,
        answer: right[0], choices: shuffle([right, ...wrong], rand).map(([w, e]) => ({ word: w, emoji: e })) };
    }
    case "first": {
      const l = pick(rand, ALL_LETTERS.filter((x) => !LETTERS[x].ends));
      const [w, e] = pick(rand, LETTERS[l].words);
      return { type: "first", word: w, emoji: e, prompt: `${w} starts with…`, say: `${w}. What sound does ${w} start with?`, answer: l, choices: letterChoices(l, ALL_LETTERS, 4, rand) };
    }
    case "rhyme": {
      const [a, b] = pick(rand, RHYMES);
      const pool = RHYMES.flat().filter(([w]) => w !== a[0] && w !== b[0] && !rhymes(w, a[0]));
      const wrong = shuffle(pool, rand).slice(0, 2);
      return { type: "rhyme", word: a[0], emoji: a[1], prompt: `What rhymes with ${a[0]}?`, say: `What rhymes with ${a[0]}? ${[b, ...wrong].map(([w]) => w).sort().join(", ")}?`,
        answer: b[0], choices: shuffle([b, ...wrong], rand).map(([w, e]) => ({ word: w, emoji: e })) };
    }
    case "beats": {
      const [w, e, parts] = pick(rand, BEATS);
      return { type: "beats", word: w, emoji: e, parts, prompt: `How many beats in ${w}?`, say: `${w}. ${parts.join("... ")}. Tap the drum for each beat!`, answer: parts.length };
    }
    case "case": {
      // Every other question goes the other way: little letter shown, find the big one.
      const l = pick(rand, ALL_LETTERS), choices = letterChoices(l, ALL_LETTERS, 4, rand);
      if (k % 2) return { type: "case", up: true, letter: l, prompt: `Find big ${l.toUpperCase()}`, say: `This is little ${l}. Find big ${l.toUpperCase()}.`,
        answer: l.toUpperCase(), choices: choices.map((x) => x.toUpperCase()), big: l.toUpperCase(), shown: l };
      return { type: "case", letter: l, prompt: `Find little ${l}`, say: `This is big ${l.toUpperCase()}. Find little ${l}.`, answer: l, choices, big: l.toUpperCase(), shown: l.toUpperCase() };
    }
    case "blend": {
      const [w, e] = pick(rand, CVC);
      const wrong = shuffle(CVC.filter(([x]) => x !== w), rand).slice(0, 2);
      return { type: "blend", word: w, emoji: e, letters: [...w], prompt: "Tap each letter, then blend!", say: "Tap each letter to hear its sound. Then slide to blend them into a word!",
        answer: w, choices: shuffle([[w, e], ...wrong], rand).map(([x, y]) => ({ word: x, emoji: y })) };
    }
    case "build": {
      const [w, e] = pick(rand, CVC);
      const extra = others(ALL_LETTERS, [...w], 3, rand);
      return { type: "build", word: w, emoji: e, letters: [...w], prompt: `Build the word`, say: `Let's build ${w}. ${[...w].map((l) => snd(LETTERS[l].sound)).join("... ")}. ${w}!`,
        answer: w, tiles: shuffle([...w, ...extra], rand) };
    }
  }
  throw new Error(`unknown stage type ${stage.type}`);
}

/** Rough rhyme test: same ending sound (last vowel onwards). Used to keep wrong choices from rhyming. */
export function rhymes(a, b) {
  const end = (w) => w.replace(/^[^aeiouy]*([aeiouy].*)$/, "$1").slice(-3);
  return a !== b && end(a) === end(b);
}

export function makeStage(stage, seed = Date.now()) {
  const rand = seeded(seed);
  if (stage.type === "phonics") return makePhonics(patternById(stage.pattern), rand).map((q) => ({ ...q, pattern: stage.pattern }));
  if (stage.type === "letters") stage = { ...stage, _order: shuffle(GROUPS[stage.group], rand) }; // six different letters each round
  const out = [];
  for (let k = 0; k < PER_STAGE; k++) {
    let q, tries = 0;
    do q = makeQuestion(stage, k, rand);
    while (tries++ < 30 && out.some((p) => p.prompt === q.prompt && p.answer === q.answer && p.word === q.word));
    out.push(q);
  }
  return out;
}

// 3 stars only with no mistakes (matches the giant sticker); any mistake: mini sticker, yellow dot.
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);
