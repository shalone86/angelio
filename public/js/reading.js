// Read Aloud: grades 1 to 3 phonics. Sound out words in chunks (sh, igh, ar, magic e, -tion), then read them
// in sentences that grow with each grade. Pure data and question making (no DOM); tested in test/.
// Shares phonics.js with Letter Lane (PreK and K), which uses the Kindergarten patterns.
//
import { PATTERNS, makePhonics, patternById } from "./phonics.js";

// Letter order follows the common early-phonics groups: s a t p i n, then m d g o c k, then e u r h b f l.

export const GRADES = [
  { n: 3, title: "1st Grade", emoji: "🦉", blurb: "ck and -ing, blends, and magic e, in words and sentences." },
  { n: 4, title: "2nd Grade", emoji: "🦅", blurb: "Vowel teams (ai, ee, oa, igh), bossy r (ar, or, er), oi and ou, tch and dge." },
  { n: 5, title: "3rd Grade", emoji: "🦁", blurb: "Big words in chunks, silent letters, and endings like -tion, -ture and -le." },
];

export const GROUPS = [
  ["s", "a", "t", "p", "i", "n"],
  ["m", "d", "g", "o", "c", "k"],
  ["e", "u", "r", "h", "b", "f", "l"],
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

export const STAGES = [
  // Phonics patterns (phonics.js): taught alone, in words, then in sentences.
  // phonics.js is shared with Letter Lane; Read Aloud uses the grade 1 to 3 patterns.
  ...PATTERNS.filter((p) => p.grade >= 3).map((p) => ({ id: p.id, grade: p.grade, type: "phonics", pattern: p.id, title: p.title, emoji: p.emoji })),
];
export const stageById = (id) => STAGES.find((s) => s.id === id);
export const PER_STAGE = 6;

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
      // Questions 1–4: hear a letter's sound and find it. 5–6: which picture starts with a letter?
      const group = GROUPS[stage.group];
      const l = stage._order ? stage._order[k % stage._order.length] : group[k % group.length];
      if (k < 4) {
        return { type: "letters", letter: l, prompt: `Find the letter that says ${LETTERS[l].sound}`, say: `Find the letter that says ${soundSay(l)}.`,
          answer: l, choices: letterChoices(l, group, 3, rand), picture: keyword(l) };
      }
      const right = pick(rand, LETTERS[l].words);
      const wrong = others(group.filter((x) => !sameSound(x, l)), [l], 2, rand).map((x) => pick(rand, LETTERS[x].words));
      return { type: "letters-picture", letter: l, prompt: `Which one starts with ${l}?`, say: `Which one starts with ${l}? ${soundSay(l)}.`,
        answer: right[0], choices: shuffle([right, ...wrong], rand).map(([w, e]) => ({ word: w, emoji: e })) };
    }
    case "first": {
      const l = pick(rand, ALL_LETTERS);
      const [w, e] = pick(rand, LETTERS[l].words);
      return { type: "first", word: w, emoji: e, prompt: `${w} starts with…`, say: `${w}. What sound does ${w} start with?`, answer: l, choices: letterChoices(l, ALL_LETTERS, 3, rand) };
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
      const l = pick(rand, ALL_LETTERS);
      return { type: "case", letter: l, prompt: `Find little ${l}`, say: `This is big ${l.toUpperCase()}. Find little ${l}.`, answer: l, choices: letterChoices(l, ALL_LETTERS, 3, rand), big: l.toUpperCase() };
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
