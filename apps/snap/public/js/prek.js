// PreK math beyond counting: shapes, colors and sorting, patterns, and more / fewer / same / sizes.
// Pure question making (no DOM), seeded so a level can be replayed; tested in test/prek.test.js.
// app.js draws everything (shapes are drawn, not emoji, so a red circle is really red everywhere).

export const SHAPES = {
  circle: { name: "circle", sides: 0 }, square: { name: "square", sides: 4 }, triangle: { name: "triangle", sides: 3 },
  rectangle: { name: "rectangle", sides: 4 }, star: { name: "star" }, heart: { name: "heart" }, oval: { name: "oval" }, diamond: { name: "diamond", sides: 4 },
};
export const BASIC = ["circle", "square", "triangle", "rectangle"];
export const MORE_SHAPES = ["star", "heart", "oval", "diamond"];
export const COLORS = { red: "#e8443a", blue: "#2f80ed", yellow: "#f2c94c", green: "#27ae60", orange: "#f2994a", purple: "#9b51e0" };
const COLOR_NAMES = Object.keys(COLORS);

/** Real things and the shape they are (the emoji is the picture). */
export const WORLD = [
  ["pizza slice", "🍕", "triangle"], ["tent", "⛺", "triangle"], ["ball", "⚽", "circle"], ["cookie", "🍪", "circle"], ["clock", "🕰️", "circle"],
  ["door", "🚪", "rectangle"], ["TV", "📺", "rectangle"], ["gift box", "🎁", "square"], ["window", "🪟", "square"],
  ["star", "⭐", "star"], ["heart", "❤️", "heart"], ["egg", "🥚", "oval"], ["kite", "🪁", "diamond"],
];
/** Things to count in more / fewer. */
export const THINGS = [["apples", "🍎"], ["ducks", "🦆"], ["stars", "⭐"], ["fish", "🐟"], ["flowers", "🌸"], ["cars", "🚗"], ["bees", "🐝"], ["balls", "⚽"]];

export const TOPICS = [
  { id: "numbers", title: "Numbers", emoji: "🔢", blurb: "Count, snap blocks together and split them apart, up to 10." },
  { id: "shapes", title: "Shapes", emoji: "🔷", blurb: "Circles, squares, triangles and more, and the shapes all around us." },
  { id: "colors", title: "Colors & sorting", emoji: "🎨", blurb: "Find colors, sort into baskets, and spot the one that doesn't belong." },
  { id: "patterns", title: "Patterns", emoji: "🔁", blurb: "Red, blue, red, blue… what comes next?" },
  { id: "compare", title: "More or fewer", emoji: "⚖️", blurb: "More, fewer or the same; big and small; long and short." },
];
export const PREK_LEVELS = [
  { id: "shapes-1", topic: "shapes", type: "find-shape", pool: BASIC, n: 3, title: "Find the shape", emoji: "🔷" },
  { id: "shapes-2", topic: "shapes", type: "find-shape", pool: [...BASIC, ...MORE_SHAPES], n: 4, title: "More shapes", emoji: "⭐" },
  { id: "shapes-3", topic: "shapes", type: "world-shape", title: "Shapes all around", emoji: "🍕" },
  { id: "colors-1", topic: "colors", type: "find-color", title: "Find the color", emoji: "🎨" },
  { id: "sort-color", topic: "colors", type: "sort", by: "color", title: "Sort by color", emoji: "🧺" },
  { id: "sort-shape", topic: "colors", type: "sort", by: "shape", title: "Sort by shape", emoji: "🗂️" },
  { id: "odd-one", topic: "colors", type: "odd", title: "Which one doesn't belong?", emoji: "🤔" },
  { id: "pattern-ab", topic: "patterns", type: "pattern", kinds: ["AB"], title: "What comes next?", emoji: "🔁" },
  { id: "pattern-abb", topic: "patterns", type: "pattern", kinds: ["ABB", "AAB"], title: "Longer patterns", emoji: "🎶" },
  { id: "pattern-abc", topic: "patterns", type: "pattern", kinds: ["ABC", "AABB"], title: "Tricky patterns", emoji: "🌈" },
  { id: "more-fewer", topic: "compare", type: "compare", same: false, title: "Which has more?", emoji: "⚖️" },
  { id: "more-same", topic: "compare", type: "compare", same: true, title: "More, fewer or the same?", emoji: "🟰" },
  { id: "sizes", topic: "compare", type: "size", title: "Big and small", emoji: "🐘" },
];

const pick = (rand, a) => a[Math.floor(rand() * a.length)];
const shuffle = (a, rand) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const item = (shape, color, extra = {}) => ({ shape, color, ...extra });
const same = (x, y) => x.shape === y.shape && x.color === y.color;

/** Question `k` of a level. Every question: { type, say (spoken), prompt (shown), … } */
export function makePrekQuestion(level, k, rand) {
  switch (level.type) {
    case "find-shape": {
      const target = level.pool[(k + Math.floor(rand() * level.pool.length)) % level.pool.length];
      const others = shuffle(level.pool.filter((s) => s !== target), rand).slice(0, level.n - 1);
      // colors and turns change, so kids learn the shape, not "the red one"
      const choices = shuffle([target, ...others], rand).map((s) => item(s, pick(rand, COLOR_NAMES), { rot: s === "circle" || s === "heart" || s === "star" ? 0 : pick(rand, [0, 0, 15, -15, 30]), scale: pick(rand, [0.8, 0.9, 1]) }));
      return { type: "find-shape", target, choices, answer: choices.findIndex((c) => c.shape === target), say: `Find the ${target}!`, prompt: `Find the ${target}` };
    }
    case "world-shape": {
      const [thing, emoji, shape] = WORLD[(k * 5 + Math.floor(rand() * WORLD.length)) % WORLD.length];
      const pool = [...BASIC, ...MORE_SHAPES].filter((s) => s !== shape);
      const choices = shuffle([shape, ...shuffle(pool, rand).slice(0, 2)], rand).map((s) => item(s, "blue"));
      return { type: "world-shape", thing, emoji, target: shape, choices, answer: choices.findIndex((c) => c.shape === shape),
        say: `What shape is the ${thing}?`, prompt: `What shape is the ${thing}?` };
    }
    case "find-color": {
      const target = pick(rand, COLOR_NAMES);
      const others = shuffle(COLOR_NAMES.filter((c) => c !== target), rand).slice(0, k < 2 ? 2 : 3);
      const shape = pick(rand, ["circle", "heart", "star", "square"]);
      const choices = shuffle([target, ...others], rand).map((c) => item(shape, c));
      return { type: "find-color", target, choices, answer: choices.findIndex((c) => c.color === target), say: `Find the ${target} one!`, prompt: `Find ${target}` };
    }
    case "sort": {
      const n = k < 2 ? 4 : 6;
      if (level.by === "color") {
        const [a, b] = shuffle(COLOR_NAMES, rand).slice(0, 2);
        const items = shuffle(Array.from({ length: n }, (_, i) => item(pick(rand, BASIC), i % 2 ? a : b)), rand);
        return { type: "sort", by: "color", baskets: [{ color: a, label: a }, { color: b, label: b }], items,
          say: `Sort them by color! Put each one in the ${a} basket or the ${b} basket.`, prompt: `Sort by color: ${a} and ${b}` };
      }
      const [a, b] = shuffle(BASIC, rand).slice(0, 2);
      const items = shuffle(Array.from({ length: n }, (_, i) => item(i % 2 ? a : b, pick(rand, COLOR_NAMES))), rand);
      return { type: "sort", by: "shape", baskets: [{ shape: a, label: `${a}s` }, { shape: b, label: `${b}s` }], items,
        say: `Sort them by shape! Put each one with the ${a}s or the ${b}s.`, prompt: `Sort by shape: ${a}s and ${b}s` };
    }
    case "odd": {
      // three alike in one way, the fourth different in that way only
      const by = pick(rand, k < 2 ? ["color", "shape"] : ["color", "shape", "size"]);
      const shape = pick(rand, BASIC), color = pick(rand, COLOR_NAMES);
      const odd = by === "color" ? item(shape, pick(rand, COLOR_NAMES.filter((c) => c !== color)))
        : by === "shape" ? item(pick(rand, BASIC.filter((s) => s !== shape)), color)
        : item(shape, color, { scale: 0.45 });
      const items = shuffle([item(shape, color), item(shape, color), item(shape, color), odd], rand);
      const why = by === "color" ? `It's ${odd.color}. The others are ${color}.` : by === "shape" ? `It's a ${odd.shape}. The others are ${shape}s.` : "It's small. The others are big.";
      return { type: "odd", by, items, answer: items.indexOf(odd), why, say: "Which one doesn't belong?", prompt: "Which one doesn't belong?" };
    }
    case "pattern": {
      const kind = level.kinds[k % level.kinds.length];
      const units = [...new Set(kind)].length;
      // the pieces: by color first, then by shape, then both
      const how = k < 2 ? "color" : k < 4 ? "shape" : "both";
      const shapes = shuffle(BASIC.concat("star", "heart"), rand), colors = shuffle(COLOR_NAMES, rand);
      const piece = (i) => how === "color" ? item("circle", colors[i]) : how === "shape" ? item(shapes[i], "blue") : item(shapes[i], colors[i]);
      const pieces = Array.from({ length: units }, (_, i) => piece(i));
      const code = kind.split("").map((c) => c.charCodeAt(0) - 65);
      const len = Math.max(code.length * 2, 5);
      const seq = Array.from({ length: len + 1 }, (_, i) => pieces[code[i % code.length]]);
      const answer = seq.pop();
      const wrong = shuffle([...pieces.filter((p) => !same(p, answer)), how === "color" ? item("circle", colors[units]) : item(shapes[units], how === "shape" ? "blue" : colors[units])], rand).slice(0, 2);
      const choices = shuffle([answer, ...wrong], rand);
      return { type: "pattern", kind, seq, choices, answer: choices.findIndex((c) => same(c, answer)), say: "Look at the pattern. What comes next?", prompt: "What comes next?" };
    }
    case "compare": {
      const [things, emoji] = THINGS[(k * 3 + Math.floor(rand() * THINGS.length)) % THINGS.length];
      if (level.same && k % 3 === 2) {
        const n = randInt(rand, 2, 6);
        return { type: "compare", ask: "same", things, emoji, groups: [n, n], answer: "same", say: `Look at the two groups of ${things}. Which has more? Or are they the same?`, prompt: "More, or the same?" };
      }
      const ask = k % 2 ? "fewer" : "more";
      const gap = level.same ? randInt(rand, 1, 2) : randInt(rand, 2, 4);
      const small = randInt(rand, 1, 7 - gap), big = small + gap;
      const groups = rand() < 0.5 ? [small, big] : [big, small];
      const answer = ask === "more" ? groups.indexOf(big) : groups.indexOf(small);
      return { type: "compare", ask, things, emoji, groups, answer, withSame: !!level.same,
        say: `Which group has ${ask} ${things}?${level.same ? " Or are they the same?" : ""}`, prompt: `Which has ${ask}?` };
    }
    case "size": {
      const kinds = [
        { word: "bigger", other: "smaller", thing: "ball", emoji: "⚽", dim: "size" }, { word: "smaller", other: "bigger", thing: "elephant", emoji: "🐘", dim: "size" },
        { word: "longer", other: "shorter", thing: "pencil", dim: "long" }, { word: "shorter", other: "longer", thing: "snake", dim: "long" },
        { word: "taller", other: "shorter", thing: "tree", emoji: "🌲", dim: "tall" },
      ];
      const kd = kinds[(k + Math.floor(rand() * kinds.length)) % kinds.length];
      const n = k < 2 ? 2 : 3;
      const sizes = shuffle([1, 0.6, 0.35].slice(0, n), rand);
      const want = kd.word === "bigger" || kd.word === "longer" || kd.word === "taller" ? Math.max(...sizes) : Math.min(...sizes);
      return { type: "size", ...kd, sizes, answer: sizes.indexOf(want), say: `Which ${kd.thing} is ${kd.word}?`, prompt: `Which ${kd.thing} is ${kd.word}?` };
    }
  }
  throw new Error(`unknown level type ${level.type}`);
}

export function makePrekLevel(level, seed = Date.now(), per = 5) {
  let t = seed >>> 0;
  const rand = () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  for (let k = 0; k < per; k++) {
    let q, tries = 0;
    do q = makePrekQuestion(level, k, rand);
    while (tries++ < 30 && out.some((p) => p.say === q.say && JSON.stringify(p.answer) === JSON.stringify(q.answer) && p.type !== "sort" && p.type !== "pattern" && p.type !== "size"));
    out.push(q);
  }
  return out;
}
