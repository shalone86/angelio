// Maps, Grids & Geometry (Grades K to 5, 23 levels). Pure logic & generators (no DOM); tested in test/maps.test.js.

export const PER_LEVEL = 6;

export const GRADES = [
  {
    n: 1, title: "Grades K–1", emoji: "🐣",
    blurb: "Position words, following grid steps, sides and corners, matching halves, and simple town maps.",
    levels: ["Directions, paths & shapes", "Matching halves & simple maps"],
  },
  {
    n: 2, title: "2nd Grade", emoji: "🧭",
    blurb: "Grid addresses (A3, B4), compass directions (N, S, E, W), map scale & distance, polygon intro, and mirror grids.",
    levels: ["Grid addresses & compass maps", "Polygons & mirror patterns"],
  },
  {
    n: 3, title: "3rd Grade", emoji: "📐",
    blurb: "Montessori introductions and practice for lines, rays, angles, quadrilaterals, and lines of symmetry.",
    levels: ["Lines & angles", "Quadrilaterals & symmetry"],
  },
  {
    n: 4, title: "Grades 4–5", emoji: "🚀",
    blurb: "Quadrant I (x, y) coordinates, protractor & missing-angle practice, and 3D unit-cube volume.",
    levels: ["Coordinate plane & protractors", "3D unit-cube volume"],
  },
];

// ───────── helpers ─────────

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

const pick = (a, rand) => a[Math.floor(rand() * a.length)];

/** Step `[row, col]` by `up | down | left | right | N | S | E | W`, clamped inside `[0..rows-1, 0..cols-1]`. */
export function stepPos([r, c], dir, rows, cols) {
  if (dir === "up" || dir === "N") return [Math.max(0, r - 1), c];
  if (dir === "down" || dir === "S") return [Math.min(rows - 1, r + 1), c];
  if (dir === "left" || dir === "W") return [r, Math.max(0, c - 1)];
  if (dir === "right" || dir === "E") return [r, Math.min(cols - 1, c + 1)];
  return [r, c];
}

/** Compare placed mirror-grid keys (`"r,c"`) against exact reflection of `leftCells` across `cols` columns. */
export function checkMirrorGrid(placed, leftCells, cols = 6) {
  const expected = new Set(leftCells.map(([r, c]) => `${r},${cols - 1 - c}`));
  const cur = placed instanceof Set ? placed : new Set(placed);
  const keep = [], wrong = [];
  for (const k of cur) (expected.has(k) ? keep : wrong).push(k);
  const missing = [...expected].filter((k) => !cur.has(k));
  return { ok: wrong.length === 0 && missing.length === 0, keep, wrong, missing, expected };
}

const LANDMARKS = [
  { e: "⛪", name: "Church" },
  { e: "🏫", name: "School" },
  { e: "🌳", name: "Park" },
  { e: "📚", name: "Library" },
  { e: "🏡", name: "Home" },
  { e: "🍞", name: "Bakery" },
];

const TOYS = [
  { e: "🐶", name: "puppy" }, { e: "🐱", name: "kitten" }, { e: "🐰", name: "bunny" },
  { e: "🐸", name: "frog" }, { e: "🐢", name: "turtle" }, { e: "🐝", name: "bee" },
  { e: "🍎", name: "apple" }, { e: "⭐", name: "star" }, { e: "🎈", name: "balloon" },
];

const DIRS_REL = [
  { key: "above", dr: -1, dc: 0, label: "Above" },
  { key: "below", dr: 1, dc: 0, label: "Below" },
  { key: "left of", dr: 0, dc: -1, label: "Left of" },
  { key: "right of", dr: 0, dc: 1, label: "Right of" },
];

const DIRS_COMP = [
  { key: "North", short: "N", dr: -1, dc: 0, label: "North (N)" },
  { key: "South", short: "S", dr: 1, dc: 0, label: "South (S)" },
  { key: "East", short: "E", dr: 0, dc: 1, label: "East (E)" },
  { key: "West", short: "W", dr: 0, dc: -1, label: "West (W)" },
];

const COLS_AZ = ["A", "B", "C", "D", "E"];

// ───────── 18 generators (each returns PER_LEVEL = 6 items) ─────────

function genK1Position(rand) {
  const modes = ["tap-cell", "tap-cell", "tap-cell", "tap-cell", "choose", "choose"];
  const dirs = shuffle([...DIRS_REL, ...DIRS_REL], rand);
  return modes.map((type, idx) => {
    const d = dirs[idx];
    const items = shuffle(TOYS, rand);
    const rMin = d.dr === -1 ? 1 : 0, rMax = d.dr === 1 ? 1 : 2;
    const cMin = d.dc === -1 ? 1 : 0, cMax = d.dc === 1 ? 1 : 2;
    const ar = rMin + Math.floor(rand() * (rMax - rMin + 1));
    const ac = cMin + Math.floor(rand() * (cMax - cMin + 1));
    const tr = ar + d.dr, tc = ac + d.dc;
    const grid = Array.from({ length: 3 }, () => Array(3).fill(null));
    let k = 0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = items[k++];
    const anchor = grid[ar][ac], target = grid[tr][tc];
    if (type === "tap-cell") {
      const voiceOpts = [
        `Find the picture ${d.key} the ${anchor.name}.`,
        `Tap the picture ${d.key} the ${anchor.name}.`,
        `Which picture is ${d.key} the ${anchor.name}? Tap it!`,
      ];
      return {
        type, rows: 3, cols: 3, grid, anchor: [ar, ac], target: [tr, tc],
        prompt: `Find the picture ${d.key} the ${anchor.name}.`,
        say: voiceOpts[idx % voiceOpts.length],
        hint: d.label === "Above" ? `Look one square above the ${anchor.name}.`
          : d.label === "Below" ? `Look one square below the ${anchor.name}.`
          : d.label === "Left of" ? `Look one square to the left of the ${anchor.name}.`
          : `Look one square to the right of the ${anchor.name}.`,
        why: `The ${target.name} is ${d.key} the ${anchor.name}!`,
      };
    }
    const others = DIRS_REL.filter((x) => x.label !== d.label).map((x) => x.label);
    return {
      type: "choose", rows: 3, cols: 3, grid, anchor: [ar, ac], highlight: [tr, tc],
      prompt: `The ${target.name} is ___ the ${anchor.name}.`,
      say: `The ${target.name} is blank the ${anchor.name}. Is it above, below, left of, or right of?`,
      choices: shuffle([d.label, ...shuffle(others, rand).slice(0, 3)], rand),
      answer: d.label,
      hint: `Start at the ${anchor.name} and look at where the ${target.name} sits.`,
      why: `The ${target.name} is ${d.label.toLowerCase()} the ${anchor.name}!`,
    };
  });
}

function genK1StepPath(rand) {
  const pairs = [["🐰", "bunny", "🥕", "carrot"], ["🐶", "puppy", "🦴", "bone"], ["🐢", "turtle", "🍓", "berry"],
    ["🦉", "owl", "⭐", "star"], ["🐱", "kitten", "🐟", "fish"], ["🐝", "bee", "🌸", "flower"]];
  const seen = new Set(), out = [];
  for (let guard = 0; out.length < PER_LEVEL && guard < 100; guard++) {
    const sr = Math.floor(rand() * 4), sc = Math.floor(rand() * 4);
    const tr = Math.floor(rand() * 4), tc = Math.floor(rand() * 4);
    const dx = tc - sc, dy = tr - sr;
    if (dx === 0 || dy === 0) continue;
    if (Math.abs(dx) + Math.abs(dy) > 4) continue;
    const key = `${sr},${sc}->${tr},${tc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [heroE, heroName, goalE, goalName] = pairs[out.length];
    const xDir = dx > 0 ? "right" : "left", yDir = dy > 0 ? "down" : "up";
    const xSteps = Math.abs(dx), ySteps = Math.abs(dy);
    const grid = Array.from({ length: 4 }, () => Array(4).fill(null));
    grid[tr][tc] = { e: goalE, name: goalName };
    out.push({
      type: "walk-grid", rows: 4, cols: 4, grid, start: [sr, sc], target: [tr, tc], hero: heroE,
      compass: false, wantSteps: xSteps + ySteps,
      prompt: `Move ${xSteps} ${xDir} and ${ySteps} ${yDir} to the ${goalName}!`,
      say: `Help the ${heroName} walk ${xSteps} ${xSteps === 1 ? "step" : "steps"} ${xDir} and ${ySteps} ${ySteps === 1 ? "step" : "steps"} ${yDir} to reach the ${goalName}.`,
      hint: `Tap ${xDir.toUpperCase()} ${xSteps} time${xSteps > 1 ? "s" : ""}, then ${yDir.toUpperCase()} ${ySteps} time${ySteps > 1 ? "s" : ""}, then Check.`,
      why: `Moving ${xSteps} ${xDir} and ${ySteps} ${yDir} lands right on the ${goalName}!`,
    });
  }
  return out;
}

function genK1SidesCorners(rand) {
  const SHAPES = [
    { kind: "circle", name: "circle", sides: 0, fill: "#ffd45c", stroke: "#d96a00" },
    { kind: "triangle", name: "triangle", sides: 3, fill: "#dcf6e6", stroke: "#137a41" },
    { kind: "square", name: "square", sides: 4, fill: "#e3f0ff", stroke: "#135ea9" },
    { kind: "rectangle", name: "rectangle", sides: 4, fill: "#ffe3e2", stroke: "#b02d33" },
    { kind: "pentagon", name: "pentagon", sides: 5, fill: "#f0e5ff", stroke: "#6429a6" },
    { kind: "hexagon", name: "hexagon", sides: 6, fill: "#fff4cc", stroke: "#b37b00" },
    { kind: "octagon", name: "octagon", sides: 8, fill: "#bae6fd", stroke: "#135ea9" },
  ];
  const order = shuffle(SHAPES, rand);
  const out = [];
  for (let i = 0; i < PER_LEVEL; i++) {
    const s = order[i];
    if (i % 3 === 0) {
      const foils = shuffle([0, 3, 4, 5, 6, 8].filter((n) => n !== s.sides), rand).slice(0, 2);
      out.push({
        type: "choose", shape: s,
        prompt: `How many sides does this ${s.name} have?`,
        say: `Count the straight sides on this ${s.name}. How many sides does it have?`,
        choices: shuffle([String(s.sides), ...foils.map(String)], rand),
        answer: String(s.sides),
        hint: s.sides === 0 ? "A circle is completely round—it has 0 straight sides!" : `Trace carefully around the ${s.name} and count each side.`,
        why: `A ${s.name} has ${s.sides} ${s.sides === 0 ? "straight sides." : "sides."}`,
      });
    } else if (i % 3 === 1) {
      const foils = shuffle([0, 3, 4, 5, 6, 8].filter((n) => n !== s.sides), rand).slice(0, 2);
      out.push({
        type: "choose", shape: s,
        prompt: `How many corners does this ${s.name} have?`,
        say: `Count the corners where the sides meet on this ${s.name}.`,
        choices: shuffle([String(s.sides), ...foils.map(String)], rand),
        answer: String(s.sides),
        hint: s.sides === 0 ? "A smooth circle has 0 sharp corners!" : `Tap and count each pointy corner around the ${s.name}.`,
        why: `A ${s.name} has ${s.sides} corners.`,
      });
    } else {
      const distinct = shuffle(SHAPES.filter((x) => x.sides !== s.sides), rand).slice(0, 2);
      const opts = shuffle([s, ...distinct], rand);
      out.push({
        type: "choose",
        prompt: `Pick the shape with ${s.sides} sides!`,
        say: `Which shape has ${s.sides} straight sides?`,
        choices: opts.map((x) => x.name),
        choiceSvgs: Object.fromEntries(opts.map((x) => [x.name, x])),
        answer: s.name,
        hint: s.sides === 0 ? "0 sides means it is smooth and round!" : `Count the sides on each picture to find ${s.sides}.`,
        why: `A ${s.name} has ${s.sides} sides.`,
      });
    }
  }
  return out;
}

function genK1SymmetryYesNo(rand) {
  const SYM = [
    { kind: "sym-butterfly", label: "butterfly", fold: "v" },
    { kind: "sym-heart", label: "heart", fold: "v" },
    { kind: "sym-house", label: "little house", fold: "v" },
    { kind: "sym-chalice", label: "golden chalice", fold: "v" },
    { kind: "sym-bell", label: "church bell", fold: "v" },
    { kind: "sym-bow", label: "ribbon bow", fold: "h" },
    { kind: "square", label: "square", fold: "v" },
  ];
  const ASYM = [
    { kind: "asym-L", label: "L-shape", fold: "v" },
    { kind: "asym-flag", label: "flag", fold: "v" },
    { kind: "asym-mug", label: "coffee mug", fold: "v" },
    { kind: "asym-F", label: "letter F", fold: "v" },
    { kind: "asym-boat", label: "sailboat", fold: "v" },
    { kind: "scalene", label: "slanted triangle", fold: "v" },
  ];
  const picks = shuffle([
    ...shuffle(SYM, rand).slice(0, 3).map((x) => ({ ...x, yes: true })),
    ...shuffle(ASYM, rand).slice(0, 3).map((x) => ({ ...x, yes: false })),
  ], rand);
  const voiceTemplates = [
    (l) => `Look at the dashed line on this ${l}. If you fold it in half, do both sides match?`,
    (l) => `Imagine folding this ${l} on the dashed line. Match or no match?`,
    (l) => `Check both halves of the ${l}. When you fold it, do the two sides match?`,
    (l) => `Fold this ${l} in your mind along the dashed line. Do both parts line up?`,
    (l) => `Does the left half of this ${l} match the right half if you fold it?`,
    (l) => `Here is a ${l} with a fold line. Would both halves match like a mirror?`,
  ];
  return picks.map((p, idx) => ({
    type: "choose",
    shape: { kind: p.kind }, fold: p.fold, showWhy: true,
    prompt: "If you fold on the dashed line, do both halves match?",
    say: voiceTemplates[idx % voiceTemplates.length](p.label),
    choices: ["Match ✓", "No match ✗"],
    answer: p.yes ? "Match ✓" : "No match ✗",
    hint: "Imagine folding the picture along the dashed line like a piece of paper.",
    why: p.yes
      ? `Yes! Both halves of the ${p.label} match — grown-ups call matching halves symmetry!`
      : `No match! The two halves of the ${p.label} look different when folded, so it does not have symmetry.`,
  }));
}

function genK1FindLandmark(rand) {
  const cells = shuffle(Array.from({ length: 16 }, (_, i) => [Math.floor(i / 4), i % 4]), rand);
  const grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  const placed = {};
  LANDMARKS.forEach((lm, idx) => {
    const [r, c] = cells[idx];
    grid[r][c] = lm;
    placed[lm.name] = [r, c];
  });
  const list = shuffle(LANDMARKS, rand);
  return list.slice(0, PER_LEVEL).map((lm, i) => {
    const [r, c] = placed[lm.name];
    return {
      type: "tap-cell", rows: 4, cols: 4, grid, mapKey: LANDMARKS, target: [r, c], keyOrder: i,
      prompt: `Use the map key: tap the ${lm.name}!`,
      say: `Look at the map key to see the sign for the ${lm.name}, then tap the ${lm.name} on the map.`,
      hint: `Find ${lm.name} in the Map Key at the top, then look for ${lm.e} on the grid!`,
      why: `Nice map reading! You found the ${lm.name} (${lm.e}).`,
    };
  });
}

function genG2GridAddress(rand) {
  const usedNames = shuffle(LANDMARKS, rand);
  const coords = shuffle(
    Array.from({ length: 16 }, (_, i) => [Math.floor(i / 4), i % 4]).filter(([r, c]) => r !== c),
    rand,
  );
  const grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  const picks = [];
  for (let i = 0; i < 6; i++) {
    const [r, c] = coords[i];
    const lm = usedNames[i];
    grid[r][c] = lm;
    picks.push({ lm, r, c, addr: `${COLS_AZ[c]}${r + 1}` });
  }
  const modes = shuffle(["tap-cell", "tap-cell", "tap-cell", "choose", "choose", "choose"], rand);
  return picks.map((p, i) => {
    if (modes[i] === "tap-cell") {
      return {
        type: "tap-cell", rows: 4, cols: 4, labeledGrid: true, grid, target: [p.r, p.c],
        prompt: `Tap square ${p.addr} on the grid!`,
        say: `Find column ${COLS_AZ[p.c]} across the top and row ${p.r + 1} on the side, and tap square ${p.addr}.`,
        hint: `Go across to letter ${COLS_AZ[p.c]}, then down to number ${p.r + 1}.`,
        why: `Column ${COLS_AZ[p.c]} and row ${p.r + 1} meet at ${p.addr}!`,
      };
    }
    const swap = `${COLS_AZ[p.r]}${p.c + 1}`;
    const nearby = `${COLS_AZ[(p.c + 1) % 4]}${p.r + 1}`;
    const third = `${COLS_AZ[p.c]}${((p.r + 1) % 4) + 1}`;
    const foils = [...new Set([swap, nearby, third])].filter((x) => x !== p.addr).slice(0, 2);
    return {
      type: "choose", rows: 4, cols: 4, labeledGrid: true, grid, highlight: [p.r, p.c],
      prompt: `What is the grid address for the ${p.lm.name}?`,
      say: `Find the ${p.lm.name} on the grid. Which column letter and row number name its square?`,
      choices: shuffle([p.addr, ...foils], rand),
      answer: p.addr,
      hint: `Read the column letter above the ${p.lm.name} first, then the row number on the left.`,
      why: `The ${p.lm.name} sits in column ${COLS_AZ[p.c]} and row ${p.r + 1}, so its address is ${p.addr}.`,
    };
  });
}

function genG2Compass(rand) {
  const out = [];
  // 3 choose direction questions + 3 N/S/E/W walk-grid questions
  const compassDirs = shuffle([...DIRS_COMP, ...DIRS_COMP], rand);
  for (let i = 0; i < 3; i++) {
    const d = compassDirs[i];
    const [anchorLm, goalLm] = shuffle(LANDMARKS, rand);
    const dist = 1 + Math.floor(rand() * 2);
    const rMin = d.dr < 0 ? dist : 0, rMax = d.dr > 0 ? 4 - dist : 4;
    const cMin = d.dc < 0 ? dist : 0, cMax = d.dc > 0 ? 4 - dist : 4;
    const ar = rMin + Math.floor(rand() * (rMax - rMin + 1));
    const ac = cMin + Math.floor(rand() * (cMax - cMin + 1));
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    grid[ar][ac] = anchorLm;
    grid[ar + d.dr * dist][ac + d.dc * dist] = goalLm;
    const voiceLines = [
      `Finish the sentence: The ${goalLm.name} is blank of the ${anchorLm.name}.`,
      `Check the compass rose. The ${goalLm.name} is blank of the ${anchorLm.name}.`,
      `Fill in the blank: The ${goalLm.name} is blank of the ${anchorLm.name}.`,
    ];
    out.push({
      type: "choose", rows: 5, cols: 5, grid, showCompass: true, anchor: [ar, ac], highlight: [ar + d.dr * dist, ac + d.dc * dist],
      prompt: `The ${goalLm.name} is ___ of the ${anchorLm.name}.`,
      say: voiceLines[i % voiceLines.length],
      choices: DIRS_COMP.map((x) => x.label),
      answer: d.label,
      hint: "North is up, South is down, East is right, and West is left.",
      why: `The ${goalLm.name} is ${d.key} of the ${anchorLm.name}!`,
    });
  }
  const walks = [[1, 2], [-1, 2], [2, -2], [-2, -1], [2, 1], [-2, 2]];
  const wPick = shuffle(walks, rand);
  for (let i = 0; i < 3; i++) {
    const [dy, dx] = wPick[i];
    const sr = dy > 0 ? 0 : dy < 0 ? 4 : 2;
    const sc = dx > 0 ? 0 : dx < 0 ? 4 : 2;
    const tr = sr + dy, tc = sc + dx;
    const [anchorLm, goalLm] = shuffle(LANDMARKS, rand);
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    grid[tr][tc] = goalLm;
    const nsDir = dy < 0 ? "North" : "South", ewDir = dx > 0 ? "East" : "West";
    const nsSteps = Math.abs(dy), ewSteps = Math.abs(dx);
    out.push({
      type: "walk-grid", rows: 5, cols: 5, grid, start: [sr, sc], target: [tr, tc], hero: anchorLm.e,
      compass: true, showCompass: true, wantSteps: nsSteps + ewSteps,
      prompt: `Go ${nsSteps} ${nsDir} and ${ewSteps} ${ewDir} to the ${goalLm.name}!`,
      say: `Use the compass buttons to walk ${nsSteps} ${nsDir} and ${ewSteps} ${ewDir} to reach the ${goalLm.name}.`,
      hint: `N goes up, S goes down, E goes right, W goes left. Tap Check when you arrive!`,
      why: `${nsSteps} ${nsDir} and ${ewSteps} ${ewDir} brings you right to the ${goalLm.name}!`,
    });
  }
  return shuffle(out, rand);
}

function genG2MapKey(rand) {
  const out = [];
  // 3 path-distance block counts + 3 strictly-unique closest landmark questions
  const combos = [[2, 2], [3, 2], [2, 4], [3, 3], [4, 1], [1, 3]];
  const picked = shuffle(combos, rand);
  for (let i = 0; i < 3; i++) {
    const [dxAbs, dyAbs] = picked[i];
    const [lmA, lmB, lmC] = shuffle(LANDMARKS, rand);
    const sr = 0, sc = 0, tr = dyAbs, tc = dxAbs;
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    grid[sr][sc] = lmA; grid[tr][tc] = lmB; grid[4][4] = lmC;
    const route = [];
    for (let c = sc; c <= tc; c++) route.push([sr, c]);
    for (let r = sr + 1; r <= tr; r++) route.push([r, tc]);
    const total = dxAbs + dyAbs;
    const foils = shuffle([total - 1, total + 1, total + 2].filter((n) => n >= 2), rand).slice(0, 2);
    const pathSay = [
      `Start after the yellow ${lmA.name} square and count the blocks along the green dashed path to the ${lmB.name}.`,
      `One square equals one block. Count each step the green line takes after leaving the ${lmA.name} to reach the ${lmB.name}.`,
      `Follow the green dashed trail from the edge of the ${lmA.name} to the ${lmB.name}. How many blocks is it?`,
    ];
    out.push({
      type: "choose", rows: 5, cols: 5, grid, mapKey: [lmA, lmB, lmC], scaleText: "Scale: 1 square = 1 block",
      anchor: [sr, sc], pathLine: route,
      prompt: `Follow the green dashed path. How many blocks from ${lmA.name} to ${lmB.name}?`,
      say: pathSay[i % pathSay.length],
      choices: shuffle([`${total} blocks`, ...foils.map((n) => `${n} blocks`)], rand),
      answer: `${total} blocks`,
      hint: "Start counting on the first square the green dashed line enters (don't count the yellow start square)!",
      why: `The path steps ${dxAbs} right and ${dyAbs} down: ${dxAbs} + ${dyAbs} = ${total} blocks!`,
    });
  }
  for (let i = 0; i < 3; i++) {
    const [anchor, near, mid, far] = shuffle(LANDMARKS, rand);
    const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
    const templates = [
      { a: [2, 2], b: [2, 4], c: [0, 0], d: [4, 4], bd: 2, cd: 4, dd: 4 },
      { a: [0, 0], b: [0, 2], c: [2, 2], d: [4, 3], bd: 2, cd: 4, dd: 7 },
      { a: [4, 1], b: [3, 1], c: [1, 1], d: [0, 4], bd: 1, cd: 3, dd: 7 },
    ];
    const t = templates[i % templates.length];
    grid[t.a[0]][t.a[1]] = anchor;
    grid[t.b[0]][t.b[1]] = near;
    grid[t.c[0]][t.c[1]] = mid;
    grid[t.d[0]][t.d[1]] = far;
    // Note: on template 0 make cd and dd strictly distinct too: move d to [4, 4] (2+2=4) vs c [0, 1] (2+1=3)!
    if (i % templates.length === 0) {
      grid[t.c[0]][t.c[1]] = null;
      grid[0][1] = mid;
    }
    const nearDist = Math.abs(t.a[0] - t.b[0]) + Math.abs(t.a[1] - t.b[1]);
    out.push({
      type: "choose", rows: 5, cols: 5, grid, mapKey: [anchor, near, mid, far], scaleText: "Scale: 1 square = 1 block", anchor: t.a,
      prompt: `Which place is closest to the ${anchor.name}?`,
      say: `Use the map key and count blocks along the grid. Which place is closest to the ${anchor.name}?`,
      choices: shuffle([near.name, mid.name, far.name], rand),
      answer: near.name,
      hint: `Count horizontal + vertical squares from the ${anchor.name} to each place.`,
      why: `The ${near.name} is only ${nearDist} block${nearDist > 1 ? "s" : ""} away from the ${anchor.name}!`,
    });
  }
  return shuffle(out, rand);
}

function genG2Polygons(rand) {
  const POLYS = [
    { kind: "triangle-tilt", name: "Triangle", sides: 3, fill: "#dcf6e6", stroke: "#137a41" },
    { kind: "square", name: "Square", sides: 4, fill: "#e3f0ff", stroke: "#135ea9" },
    { kind: "rect-tall", name: "Rectangle", sides: 4, fill: "#ffe3e2", stroke: "#b02d33" },
    { kind: "trapezoid", name: "Trapezoid", sides: 4, fill: "#ffd45c", stroke: "#b37b00" },
    { kind: "rhombus", name: "Rhombus", sides: 4, fill: "#f0e5ff", stroke: "#6429a6" },
    { kind: "pentagon-tilt", name: "Pentagon", sides: 5, fill: "#ffecc8", stroke: "#d96a00" },
    { kind: "hexagon-flat", name: "Hexagon", sides: 6, fill: "#bae6fd", stroke: "#135ea9" },
    { kind: "octagon", name: "Octagon", sides: 8, fill: "#dcf6e6", stroke: "#137a41" },
  ];
  const nameSay = [
    "Count the straight sides and corners. Which polygon is this?",
    "Look closely at the shape on the board. What is its polygon name?",
    "Check how many sides this polygon has and tap its name!",
  ];
  const picSay = [
    (n) => `Find the picture that shows a ${n}.`,
    (n) => `Which drawing is a ${n}? Tap that picture!`,
    (n) => `Tap the ${n} from the three shapes below!`,
  ];
  return shuffle(POLYS, rand).slice(0, PER_LEVEL).map((p, i) => {
    if (i % 2 === 0) {
      const foils = shuffle(POLYS.filter((x) => x.name !== p.name), rand).slice(0, 2).map((x) => x.name);
      return {
        type: "choose", shape: p,
        prompt: "What is the name of this polygon?",
        say: nameSay[i % nameSay.length],
        choices: shuffle([p.name, ...foils], rand),
        answer: p.name,
        hint: `Count its sides (${p.sides}) and look at how the sides slant or match.`,
        why: `That shape is a ${p.name} (${p.sides} sides)!`,
      };
    }
    const opts = shuffle([p, ...shuffle(POLYS.filter((x) => x.sides !== p.sides), rand).slice(0, 2)], rand);
    return {
      type: "choose",
      prompt: `Which polygon is a ${p.name}?`,
      say: picSay[i % picSay.length](p.name),
      choices: opts.map((x) => x.name),
      choiceSvgs: Object.fromEntries(opts.map((x) => [x.name, x])),
      answer: p.name,
      hint: `A ${p.name} has ${p.sides} straight sides.`,
      why: `That ${p.sides}-sided polygon is the ${p.name}!`,
    };
  });
}

function genG2MirrorGrid(rand) {
  const PATTERNS = [
    {
      name: "Stairs", color: "#1d7fe0", cells: [[0, 2], [1, 1], [1, 2], [2, 0], [2, 2]],
      prompt: "Mirror the blue stairs onto the right half!",
      say: "Build the matching half of these blue stairs across the red mirror line.",
    },
    {
      name: "Butterfly Wing", color: "#e5484d", cells: [[0, 1], [1, 1], [1, 2], [2, 2], [3, 1], [4, 1]],
      prompt: "Paint the second butterfly wing across the mirror!",
      say: "This butterfly only has its left wing. Tap squares on the right to make its matching wing!",
    },
    {
      name: "Pine Tree", color: "#1ea55b", cells: [[0, 2], [1, 1], [1, 2], [2, 0], [2, 2], [3, 2]],
      prompt: "Complete the green pine tree on the right side!",
      say: "Finish the pine tree! Copy each green branch onto the opposite side of the mirror line.",
    },
    {
      name: "Crown", color: "#d96a00", cells: [[1, 0], [2, 0], [2, 1], [2, 2], [3, 0], [3, 2]],
      prompt: "Reflect the golden crown points across the line!",
      say: "Complete the golden crown by tapping the matching squares on the right half of the grid.",
    },
    {
      name: "Diamond Half", color: "#8b46d6", cells: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]],
      prompt: "Close the purple diamond with a mirror reflection!",
      say: "Watch the diagonal line go in and out. Paint the matching side to finish the purple diamond!",
    },
    {
      name: "Smiling Pixel", color: "#1d7fe0", cells: [[1, 1], [3, 0], [4, 1], [4, 2]],
      prompt: "Finish the pixel smiley face across the mirror!",
      say: "Give this smiley face its other eye and the rest of its grin across the dashed mirror line!",
    },
    {
      name: "Rocket Nose", color: "#e5484d", cells: [[0, 2], [1, 1], [2, 0], [2, 2], [3, 2]],
      prompt: "Reflect the red rocket wing onto the right half!",
      say: "This red rocket needs its matching right fin. Check how far each tile sits from the center line!",
    },
    {
      name: "Anchor Cross", color: "#137a41", cells: [[0, 2], [1, 1], [1, 2], [2, 2], [3, 0], [4, 1]],
      prompt: "Complete the green anchor across the mirror line!",
      say: "Finish the green anchor by matching every square evenly across the center mirror.",
    },
  ];
  return shuffle(PATTERNS, rand).slice(0, PER_LEVEL).map((pat) => ({
    type: "mirror-grid", rows: 5, cols: 6, leftCells: pat.cells, color: pat.color, title: pat.name,
    prompt: pat.prompt,
    say: pat.say,
    hint: "Squares right next to the mirror stay right next to the mirror; far squares stay far!",
    why: `Awesome reflection! Both sides of the ${pat.name} match across the mirror line.`,
  }));
}

function genG3Lines(rand) {
  const ITEMS = [
    { kind: "point", name: "Point", hint: "A single exact dot in space.", why: "A Point marks one exact spot." },
    { kind: "segment", name: "Line Segment", hint: "It has TWO solid endpoints and stops at both ends.", why: "A Line Segment has two endpoints and does not keep going." },
    { kind: "ray", name: "Ray", hint: "Starts at ONE endpoint and has an arrow on the other end.", why: "A Ray starts at one endpoint and goes forever one way." },
    { kind: "line", name: "Line", hint: "Arrows at BOTH ends mean it goes forever both ways.", why: "A Line continues forever in both directions." },
    { kind: "parallel", name: "Parallel Lines", hint: "Like train tracks—same distance apart and never cross.", why: "Parallel Lines never cross or meet." },
    { kind: "intersecting", name: "Intersecting Lines", hint: "Lines that cross each other at a point (without needing a square corner).", why: "Intersecting Lines cross at one point." },
    { kind: "perpendicular", name: "Perpendicular Lines", hint: "Two lines that cross to form a square 90° corner!", why: "Perpendicular Lines meet to form a right (90°) angle." },
  ];
  const picks = shuffle(ITEMS, rand).slice(0, PER_LEVEL);
  const voiceOpts = [
    "Look at the endpoints, arrows, and how the lines meet. What does this drawing show?",
    "Check whether there are dots, arrows, or a square crossing. Which geometry term fits best?",
    "Spot the clue in this geometry picture: does it stop, go forever, stay parallel, or cross?",
  ];
  return picks.map((it, idx) => {
    const foils = shuffle(ITEMS.filter((x) => x.name !== it.name).map((x) => x.name), rand).slice(0, 2);
    return {
      type: "choose", lineKind: it.kind,
      prompt: "What does this geometry drawing show?",
      say: voiceOpts[idx % voiceOpts.length],
      choices: shuffle([it.name, ...foils], rand),
      answer: it.name,
      hint: it.hint,
      why: it.why,
    };
  });
}

function genG3Angles(rand) {
  const specs = shuffle([
    { deg: 35, kind: "Acute (< 90°)" },
    { deg: 55, kind: "Acute (< 90°)" },
    { deg: 90, kind: "Right (90°)" },
    { deg: 90, kind: "Right (90°)" },
    { deg: 125, kind: "Obtuse (> 90°)" },
    { deg: 145, kind: "Obtuse (> 90°)" },
  ], rand);
  const bases = [0, 25, 45, 110, 15, 200];
  const voiceOpts = [
    "Look at how wide this angle opens. Is it acute, right, or obtuse? Try Corner Tester to check!",
    "Compare this opening with a square 90-degree corner. Which kind of angle is it?",
    "Smaller than a square corner is acute, exact corner is right, wider is obtuse!",
  ];
  return specs.map((sp, i) => ({
    type: "choose", angle: { deg: sp.deg, baseDeg: bases[i] }, allowCornerTester: true,
    prompt: "What kind of angle is this? (Try the Corner Tester!)",
    say: voiceOpts[i % voiceOpts.length],
    choices: ["Acute (< 90°)", "Right (90°)", "Obtuse (> 90°)"],
    answer: sp.kind,
    hint: "Compare it with the square corner of a page: smaller = Acute, exact corner = Right, wider = Obtuse.",
    why: sp.deg === 90 ? "A 90° square corner is a Right angle!"
      : sp.deg < 90 ? `${sp.deg}° is smaller than 90°, so it is an Acute angle!`
      : `${sp.deg}° is wider than 90°, so it is an Obtuse angle!`,
  }));
}

function genG3Quadrilaterals(rand) {
  const QUADS = [
    { kind: "square", name: "Square", prop: "4 equal sides and 4 right angles" },
    { kind: "rectangle", name: "Rectangle", prop: "4 right angles and opposite sides equal (not all 4 equal)" },
    { kind: "rhombus", name: "Rhombus", prop: "4 equal sides with opposite angles equal (not square corners)" },
    { kind: "trapezoid", name: "Trapezoid", prop: "exactly 1 pair of parallel sides" },
    { kind: "parallelogram", name: "Parallelogram", prop: "2 pairs of parallel sides without right angles" },
  ];
  const names = QUADS.map((q) => q.name);
  const order = shuffle(QUADS, rand);
  const items = [...order, pick(QUADS, rand)].slice(0, PER_LEVEL);
  const picSay = [
    "Check the equal-side tick marks, parallel arrows, and corner squares. Which quadrilateral is this?",
    "Read the side ticks and corner marks carefully. Name this four-sided shape!",
    "Which quadrilateral matches all the marks shown on this shape?",
  ];
  return items.map((q, i) => {
    if (i < 4) {
      const foils = shuffle(names.filter((n) => n !== q.name), rand).slice(0, 2);
      return {
        type: "choose", shape: { kind: q.kind }, showDecor: true,
        prompt: "Name this quadrilateral from its marks and sides.",
        say: picSay[i % picSay.length],
        choices: shuffle([q.name, ...foils], rand),
        answer: q.name,
        hint: `Notice: ${q.prop}.`,
        why: `That shape has ${q.prop} — it is a ${q.name}!`,
      };
    }
    const foils = shuffle(names.filter((n) => n !== q.name), rand).slice(0, 2);
    return {
      type: "choose",
      text: `Clue: ${q.prop.charAt(0).toUpperCase() + q.prop.slice(1)}.`,
      prompt: "Which quadrilateral always fits this rule?",
      say: `Listen to the clue: ${q.prop}. Which quadrilateral fits this rule?`,
      choices: shuffle([q.name, ...foils], rand),
      answer: q.name,
      hint: "Picture the tick marks and arrows for each four-sided shape.",
      why: `A ${q.name} matches the clue (${q.prop})!`,
    };
  });
}

function genG3SymmetryLines(rand) {
  const COUNTS = [
    { kind: "square", name: "square", n: 4, why: "A square has 4 lines: vertical, horizontal, and both diagonals!" },
    { kind: "rectangle", name: "rectangle", n: 2, why: "A rectangle has 2 lines of symmetry (up-down and side-to-side; diagonals do not match)." },
    { kind: "triangle", name: "equilateral triangle", n: 3, why: "An equilateral triangle has 3 equal corners, so 3 lines of symmetry!" },
    { kind: "iso-tall", name: "tall isosceles triangle", n: 1, why: "Two sides match, giving 1 vertical line of symmetry." },
    { kind: "hexagon", name: "regular hexagon", n: 6, why: "A regular 6-sided hexagon has 6 lines of symmetry!" },
    { kind: "pentagon", name: "regular pentagon", n: 5, why: "A regular 5-sided pentagon has 5 lines of symmetry!" },
    { kind: "parallelogram", name: "parallelogram", n: 0, why: "A slanted parallelogram has 0 lines of symmetry!" },
    { kind: "kite", name: "kite", n: 1, why: "A kite folds evenly down its center spine: 1 line of symmetry." },
  ];
  const picks = shuffle(COUNTS, rand).slice(0, 4).map((it) => {
    const foils = shuffle([0, 1, 2, 3, 4, 5, 6].filter((x) => x !== it.n), rand).slice(0, 2);
    return {
      type: "choose", shape: { kind: it.kind }, revealSymAfter: true,
      prompt: `How many lines of symmetry does this ${it.name} have?`,
      say: `Imagine folding this ${it.name} every way where both sides match. How many lines of symmetry does it have?`,
      choices: shuffle([String(it.n), ...foils.map(String)], rand),
      answer: String(it.n),
      hint: "Try up-and-down, side-to-side, and corner-to-corner!",
      why: it.why,
    };
  });
  const FOLDS = [
    { kind: "rectangle", good: "v", bad: ["diag", "bad-h"], name: "rectangle" },
    { kind: "sym-heart", good: "v", bad: ["h", "bad-v"], name: "heart" },
    { kind: "iso-tall", good: "v", bad: ["h", "bad-v"], name: "triangle" },
  ];
  const foldPicks = shuffle(FOLDS, rand).slice(0, 2).map((f) => {
    const opts = shuffle([
      { label: "Fold A", spec: { kind: f.kind, fold: f.good }, ok: true },
      { label: "Fold B", spec: { kind: f.kind, fold: f.bad[0] }, ok: false },
      { label: "Fold C", spec: { kind: f.kind, fold: f.bad[1] }, ok: false },
    ], rand);
    return {
      type: "choose",
      prompt: `Which dashed line is a true line of symmetry on the ${f.name}?`,
      say: `Pick the ${f.name} where the dashed fold line splits it into two matching halves.`,
      choices: opts.map((x) => x.label),
      choiceSvgs: Object.fromEntries(opts.map((x) => [x.label, x.spec])),
      answer: opts.find((x) => x.ok).label,
      hint: "Check if the top/bottom or left/right of the dashed line have the exact same shape.",
      why: `That dashed line divides the ${f.name} into two mirror halves!`,
    };
  });
  return shuffle([...picks, ...foldPicks], rand);
}

function genG4CoordRead(rand) {
  const pairs = [];
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x !== y) pairs.push([x, y]);
  const chosen = shuffle(pairs, rand).slice(0, PER_LEVEL);
  const letters = ["A", "B", "C", "D", "E", "F"];
  return chosen.map(([x, y], i) => {
    const L = letters[i];
    const ans = `(${x}, ${y})`;
    const swap = `(${y}, ${x})`;
    const near = `(${x === 6 ? 5 : x + 1}, ${y})`;
    return {
      type: "choose", coordRead: { point: [x, y], label: L },
      prompt: `What are the coordinates (x, y) of point ${L}?`,
      say: `Find point ${L} on the grid. Read across along x first, then up along y!`,
      choices: shuffle([ans, swap, near], rand),
      answer: ans,
      hint: `Walk across on x from 0 to ${x}, then climb up on y to ${y}.`,
      why: `Point ${L} is at ${x} across and ${y} up: (${x}, ${y})!`,
    };
  });
}

function genG4CoordPlot(rand) {
  const out = [];
  // 2 direct plot, 2 move dx/dy from start, 2 fourth-corner of a rectangle
  const directs = shuffle([[2, 5], [5, 1], [4, 3], [1, 6], [6, 2], [3, 4]], rand);
  for (let i = 0; i < 2; i++) {
    const [tx, ty] = directs[i];
    out.push({
      type: "plot-point", target: [tx, ty], fixed: [],
      prompt: `Tap the grid to plot point (${tx}, ${ty})!`,
      say: `Plot (${tx}, ${ty}). Count ${tx} across along x, then ${ty} up along y, and tap that intersection.`,
      hint: `First number (${tx}) goes across on the x-axis; second number (${ty}) goes up on the y-axis.`,
      why: `Bullseye! (${tx}, ${ty}) is ${tx} across and ${ty} up.`,
    });
  }
  const moves = [[1, 1, 3, 2], [2, 1, 2, 4], [1, 2, 4, 3], [0, 3, 5, 2]];
  for (const [sx, sy, dx, dy] of shuffle(moves, rand).slice(0, 2)) {
    const tx = sx + dx, ty = sy + dy;
    out.push({
      type: "plot-point", target: [tx, ty], fixed: [{ x: sx, y: sy, label: "Start", color: "#1d7fe0" }],
      prompt: `From Start (${sx}, ${sy}), move ${dx} right and ${dy} up!`,
      say: `Start at (${sx}, ${sy}). Move ${dx} right and ${dy} up, and tap the new point.`,
      hint: `Add to x (${sx} + ${dx} = ${tx}) and add to y (${sy} + ${dy} = ${ty}).`,
      why: `(${sx} + ${dx}, ${sy} + ${dy}) lands at (${tx}, ${ty})!`,
    });
  }
  const rects = [
    [[1, 1], [5, 1], [5, 4], [1, 4]],
    [[2, 2], [6, 2], [6, 5], [2, 5]],
    [[1, 2], [4, 2], [4, 6], [1, 6]],
  ];
  for (const r of shuffle(rects, rand).slice(0, 2)) {
    const [p1, p2, p3, target] = r;
    out.push({
      type: "plot-point", target,
      fixed: [
        { x: p1[0], y: p1[1], label: "A", color: "#1d7fe0" },
        { x: p2[0], y: p2[1], label: "B", color: "#1d7fe0" },
        { x: p3[0], y: p3[1], label: "C", color: "#1d7fe0" },
      ],
      prompt: "Plot the 4th corner D to finish the rectangle!",
      say: `Three corners of a rectangle are at (${p1.join(", ")}), (${p2.join(", ")}), and (${p3.join(", ")}). Tap the missing fourth corner!`,
      hint: `Match the x of (${p1[0]}, ${p1[1]}) and the y of (${p3[0]}, ${p3[1]}).`,
      why: `Corner D at (${target[0]}, ${target[1]}) completes the rectangle!`,
    });
  }
  return out;
}

function genG4MeasureAngles(rand) {
  const degs = shuffle([30, 45, 60, 75, 120, 135, 150], rand).slice(0, 4);
  const protSay = [
    "One ray sits on zero degrees at the right. Follow the red ray to read the angle in degrees.",
    "Start from 0 degrees on the blue baseline and follow the curve to the red ray!",
    "Is the red angle acute or obtuse? Count degrees up from 0 on the right.",
    "Read the protractor scale starting at zero degrees on the right. How wide is this angle?",
  ];
  const protractItems = degs.map((deg, idx) => {
    const opp = 180 - deg;
    const alt = deg + (deg < 160 ? 15 : -15);
    return {
      type: "choose", angle: { deg, protractor: true },
      prompt: "Read the protractor: how many degrees is this angle?",
      say: protSay[idx % protSay.length],
      choices: shuffle([...new Set([deg, opp, alt])].slice(0, 3).map((d) => `${d}°`), rand),
      answer: `${deg}°`,
      hint: deg < 90 ? "Notice this angle is ACUTE (less than 90°), so pick the smaller reading!" : "Notice this angle is OBTUSE (wider than 90°), so pick the reading above 90°!",
      why: `Starting from 0° on the right, the red ray measures ${deg}°!`,
    };
  });
  const splits = shuffle([
    { total: 90, known: 35 }, { total: 90, known: 50 }, { total: 90, known: 25 },
    { total: 180, known: 110 }, { total: 180, known: 65 }, { total: 180, known: 130 },
  ], rand).slice(0, 2);
  const splitItems = splits.map((sp) => {
    const miss = sp.total - sp.known;
    const altTrap = sp.total === 90 ? 180 - sp.known : Math.abs(90 - sp.known);
    const candidates = [...new Set([miss - 10, miss + 10, altTrap, miss + 20].filter((x) => x > 0 && x !== miss))];
    const foils = shuffle(candidates, rand).slice(0, 2);
    return {
      type: "choose", angle: { split: sp },
      prompt: sp.total === 90 ? `Right angle = 90°. Find the missing angle ?°!` : `Straight line = 180°. Find the missing angle ?°!`,
      say: sp.total === 90
        ? `Together the two angles make a 90-degree right angle. One part is ${sp.known} degrees. What is the missing angle?`
        : `Together the two angles make a 180-degree straight line. One part is ${sp.known} degrees. What is the missing angle?`,
      choices: shuffle([`${miss}°`, ...foils.map((d) => `${d}°`)], rand),
      answer: `${miss}°`,
      hint: `Subtract ${sp.known}° from ${sp.total}°!`,
      why: `${sp.total}° − ${sp.known}° = ${miss}°!`,
    };
  });
  return shuffle([...protractItems, ...splitItems], rand);
}

function makePrismHeights(l, w, h) {
  return Array.from({ length: w }, () => Array(l).fill(h));
}

function genG5Volume(rand) {
  const prisms = shuffle([
    { l: 3, w: 2, h: 2 },
    { l: 4, w: 2, h: 3 },
    { l: 3, w: 3, h: 2 },
    { l: 5, w: 2, h: 2 },
  ], rand).slice(0, 2).map(({ l, w, h }) => {
    const v = l * w * h;
    const addBug = l + w + h;
    const foils = [...new Set([addBug, v + l, Math.max(4, v - w)])].filter((n) => n !== v).slice(0, 2);
    return {
      type: "choose",
      volume: { heights: makePrismHeights(l, w, h), dims: { l, w, h } },
      prompt: `Find the volume (${l} × ${w} × ${h}) in cubic units!`,
      say: `A box of unit cubes is ${l} long, ${w} wide, and ${h} tall. How many unit cubes does it take?`,
      choices: shuffle([`${v} cubic units`, ...foils.map((n) => `${n} cubic units`)], rand),
      answer: `${v} cubic units`,
      hint: `One bottom layer has ${l} × ${w} = ${l * w} cubes, and there are ${h} layers tall!`,
      why: `${l} × ${w} × ${h} = ${v} cubic units!`,
    };
  });

  // Strictly monotonic stepped solids (heights decrease away from back-top-left, so 0 cubes are hidden)
  const STEPPED = [
    { heights: [[2, 2], [2, 1]], vol: 7 },
    { heights: [[3, 2], [2, 1]], vol: 8 },
    { heights: [[2, 2, 1], [2, 1, 1]], vol: 9 },
    { heights: [[3, 2, 2], [2, 1, 1]], vol: 11 },
  ];
  const steppedItems = shuffle(STEPPED, rand).slice(0, 2).map((st) => {
    const foils = [st.vol - 1, st.vol + 2];
    return {
      type: "choose",
      volume: { heights: st.heights },
      prompt: "Count EVERY cube in the 3D stack (including cubes underneath)!",
      say: "Count all unit cubes in this 3D stack, including the ones supporting the higher towers.",
      choices: shuffle([`${st.vol} cubes`, ...foils.map((n) => `${n} cubes`)], rand),
      answer: `${st.vol} cubes`,
      hint: "Count the cubes in each vertical column from tallest to shortest and add them together.",
      why: `Adding each column gives ${st.heights.flat().join(" + ")} = ${st.vol} unit cubes!`,
    };
  });

  const BUILDS = [
    { l: 3, w: 2, targetLayers: 2 },
    { l: 3, w: 2, targetLayers: 3 },
    { l: 4, w: 2, targetLayers: 3 },
    { l: 3, w: 3, targetLayers: 2 },
    { l: 4, w: 2, targetLayers: 2 },
  ];
  const buildItems = shuffle(BUILDS, rand).slice(0, 2).map((b) => {
    const perLayer = b.l * b.w, vol = perLayer * b.targetLayers;
    return {
      type: "build-volume", l: b.l, w: b.w, perLayer, targetLayers: b.targetLayers, targetVolume: vol,
      prompt: `Stack layers (${b.l} × ${b.w} base) to build ${vol} cubic units!`,
      say: `One layer holds ${b.l} times ${b.w}, which is ${perLayer} cubes. Add layers until your box has ${vol} cubic units.`,
      hint: `Each layer adds ${perLayer} cubes. How many ${perLayer}s make ${vol}?`,
      why: `${b.targetLayers} layers × ${perLayer} cubes = ${vol} cubic units!`,
    };
  });

  return shuffle([...prisms, ...steppedItems, ...buildItems], rand);
}

// ───────── Montessori-Style Concept Intro Decks & Generators ─────────

const INTRO_POLYGONS = [
  { id: "triangle", name: "Triangle", badge: "3 sides", clue: "3 straight sides and 3 corners.", say: "This is a triangle! Tri means three — it has 3 straight sides and 3 corners.", shape: { kind: "triangle-tilt", fill: "#dcf6e6", stroke: "#137a41" } },
  { id: "square", name: "Square", badge: "4 equal sides", clue: "4 equal sides and 4 square corners.", say: "This is a square! All 4 sides are the same length and every corner is square.", shape: { kind: "square", fill: "#e3f0ff", stroke: "#135ea9" } },
  { id: "rectangle", name: "Rectangle", badge: "4 sides", clue: "Opposite sides match, with 4 square corners.", say: "This is a rectangle! Opposite sides are equal and all 4 corners are square.", shape: { kind: "rect-tall", fill: "#ffe3e2", stroke: "#b02d33" } },
  { id: "trapezoid", name: "Trapezoid", badge: "4 sides", clue: "4 sides with just 1 pair of parallel sides.", say: "This is a trapezoid! Two opposite sides run parallel like tracks, while the other two slant.", shape: { kind: "trapezoid", fill: "#ffd45c", stroke: "#b37b00" } },
  { id: "rhombus", name: "Rhombus", badge: "4 equal sides", clue: "4 equal sides tipped like a diamond.", say: "This is a rhombus! All 4 sides match in length, often tipped like a diamond.", shape: { kind: "rhombus", fill: "#f0e5ff", stroke: "#6429a6" } },
  { id: "pentagon", name: "Pentagon", badge: "5 sides", clue: "5 straight sides and 5 corners.", say: "This is a pentagon! Penta means five — it has 5 straight sides like home plate.", shape: { kind: "pentagon-tilt", fill: "#ffecc8", stroke: "#d96a00" } },
  { id: "hexagon", name: "Hexagon", badge: "6 sides", clue: "6 straight sides like a honeycomb cell.", say: "This is a hexagon! Hex means six — honeycomb bees build 6-sided hexagons.", shape: { kind: "hexagon-flat", fill: "#bae6fd", stroke: "#135ea9" } },
  { id: "octagon", name: "Octagon", badge: "8 sides", clue: "8 straight sides like a stop sign.", say: "This is an octagon! Oct means eight, just like a stop sign.", shape: { kind: "octagon", fill: "#dcf6e6", stroke: "#137a41" } },
];

const INTRO_LINES = [
  { id: "point", name: "Point", badge: "1 exact spot", clue: "One exact dot in space.", say: "This is a point! A single dot marks one exact location.", lineKind: "point" },
  { id: "segment", name: "Line Segment", badge: "2 endpoints", clue: "Has two endpoints and stops at both ends.", say: "This is a line segment! It starts at one dot and stops at a second dot.", lineKind: "segment" },
  { id: "ray", name: "Ray", badge: "1 dot + 1 arrow", clue: "Starts at one dot and goes forever one way.", say: "This is a ray! Think of a sunbeam starting at a dot and shining straight out forever.", lineKind: "ray" },
  { id: "line", name: "Line", badge: "2 arrows", clue: "Arrows on both ends go forever both ways.", say: "This is a line! Arrows at both ends show it never stops in either direction.", lineKind: "line" },
  { id: "parallel", name: "Parallel Lines", badge: "never cross", clue: "Stay the same distance apart like train tracks.", say: "These are parallel lines! Like railroad tracks, they run side by side and never touch.", lineKind: "parallel" },
  { id: "intersecting", name: "Intersecting Lines", badge: "cross at 1 dot", clue: "Two lines that cross each other at one point.", say: "These are intersecting lines! They cross paths at one point like an X.", lineKind: "intersecting" },
  { id: "perpendicular", name: "Perpendicular Lines", badge: "90° square cross", clue: "Lines that cross to form a square 90° corner.", say: "These are perpendicular lines! They cross to make a neat 90-degree square corner.", lineKind: "perpendicular" },
];

const INTRO_ANGLES = [
  { id: "right", name: "Right Angle", badge: "90°", clue: "Exact square corner, like the corner of a book.", say: "This is a right angle! It opens to an exact 90-degree square corner.", angle: { deg: 90, baseDeg: 0, revealRight: true } },
  { id: "acute", name: "Acute Angle", badge: "< 90°", clue: "Smaller than a square corner — a tiny opening!", say: "This is an acute angle! It opens narrower than a square corner, less than 90 degrees.", angle: { deg: 40, baseDeg: 10 } },
  { id: "obtuse", name: "Obtuse Angle", badge: "> 90°", clue: "Wider than a square corner, like an open fan.", say: "This is an obtuse angle! It opens wider than a 90-degree square corner.", angle: { deg: 135, baseDeg: 10 } },
  { id: "straight", name: "Straight Angle", badge: "180°", clue: "Opens all the way flat into a straight line.", say: "This is a straight angle! It opens all the way to 180 degrees to make a flat line.", angle: { deg: 180, baseDeg: 0 } },
];

const INTRO_QUADS = [
  { id: "square", name: "Square", badge: "4 equal + 4 × 90°", clue: "4 matching side ticks and square 90° corners.", say: "Look at the Square! Equal single tick marks on all 4 sides plus a square 90-degree corner.", shape: { kind: "square" }, showDecor: true },
  { id: "rectangle", name: "Rectangle", badge: "opposite equal + 90°", clue: "Square corners; opposite sides have matching 1-tick or 2-tick pairs.", say: "Look at the Rectangle! Opposite sides share matching tick marks and every corner is 90 degrees.", shape: { kind: "rectangle" }, showDecor: true },
  { id: "rhombus", name: "Rhombus", badge: "4 equal sides", clue: "All 4 slanted sides share 1-tick marks, without square corners.", say: "Look at the Rhombus! All 4 sides carry single tick marks showing they are equal, but its corners tilt.", shape: { kind: "rhombus" }, showDecor: true },
  { id: "trapezoid", name: "Trapezoid", badge: "1 parallel pair", clue: "Top and bottom arrows show just 1 pair of parallel sides.", say: "Look at the Trapezoid! It has just one pair of opposite sides marked parallel with arrows.", shape: { kind: "trapezoid" }, showDecor: true },
  { id: "parallelogram", name: "Parallelogram", badge: "2 parallel pairs", clue: "Arrows on parallel pairs AND matching opposite slanted sides.", say: "Look at the Parallelogram! Both pairs of opposite sides are parallel and equal, slanted to one side.", shape: { kind: "parallelogram" }, showDecor: true },
];

const INTRO_PROTRACTOR = [
  { id: "zero", name: "Zero Baseline", badge: "start at 0°", clue: "Line one ray on 0° at the right before reading the curved scale.", say: "Step one with a protractor: line one ray up with the 0-degree mark on the right!", angle: { deg: 0, protractor: true, highlightArc: true } },
  { id: "pro-right", name: "90° Right Angle", badge: "straight up", clue: "A quarter turn from 0° points straight up to 90°.", say: "Straight up from the center lands right on 90 degrees — a square right angle!", angle: { deg: 90, protractor: true, highlightArc: true } },
  { id: "pro-acute", name: "Acute Reading (45°)", badge: "< 90°", clue: "Count up from 0°: acute angles stop before 90°.", say: "An acute angle like 45 degrees stays on the smaller right side before reaching 90.", angle: { deg: 45, protractor: true, highlightArc: true } },
  { id: "pro-obtuse", name: "Obtuse Reading (135°)", badge: "> 90°", clue: "Obtuse angles open past 90° (like 120°, 135°, or 150°).", say: "An obtuse angle sweeps past 90 degrees all the way over to 135 degrees!", angle: { deg: 135, protractor: true, highlightArc: true } },
  { id: "comp", name: "90° Corner Split", badge: "add to 90°", clue: "Two parts inside a square corner add up to 90° (35° + 55° = 90°).", say: "When a square 90-degree corner splits into two parts, subtract from 90 to find the missing part!", angle: { split: { total: 90, known: 35, showAnswer: true } } },
  { id: "supp", name: "180° Line Split", badge: "add to 180°", clue: "Two parts along a straight line add up to 180° (110° + 70° = 180°).", say: "When a flat 180-degree line splits into two parts, subtract from 180 to find the missing part!", angle: { split: { total: 180, known: 110, showAnswer: true } } },
];

function genIntroMatch(cards, rand) {
  const pool = cards.length >= PER_LEVEL
    ? shuffle(cards, rand).slice(0, PER_LEVEL)
    : [...shuffle(cards, rand), ...shuffle(cards, rand)].slice(0, PER_LEVEL);

  const visualPrompts = [
    (c) => `Tap the picture that shows a ${c.name}!`,
    (c) => `Which picture matches the ${c.name}?`,
    (c) => `Find the ${c.name} below! Clue: ${c.clue}`,
  ];
  const namePrompts = [
    "Which term matches this picture?",
    "Look at the visual clues. What do we call this?",
    "Match this picture to its geometry name!",
  ];

  return pool.map((card, i) => {
    const askType = i % 2 === 0 ? "visual" : "name";
    const others = shuffle(cards.filter((x) => x.id !== card.id), rand).slice(0, 2);
    const opts = shuffle([card, ...others], rand);
    const visualSpec = card.shape ? { shape: card.shape, showDecor: Boolean(card.showDecor) }
      : card.lineKind ? { lineKind: card.lineKind }
      : { angle: card.angle };

    if (askType === "visual") {
      return {
        type: "intro-match", askType, target: card,
        prompt: `Find the ${card.name}!`,
        say: visualPrompts[i % visualPrompts.length](card),
        choices: opts.map((x) => x.name),
        choiceSpecs: Object.fromEntries(opts.map((x) => [x.name, x])),
        answer: card.name,
        hint: `Remember: ${card.name} — ${card.clue}`,
        why: card.say,
      };
    }
    return {
      type: "intro-match", askType, target: card, ...visualSpec,
      prompt: `What does this picture show?`,
      say: namePrompts[i % namePrompts.length],
      choices: opts.map((x) => x.name),
      choiceSpecs: Object.fromEntries(opts.map((x) => [x.name, x])),
      answer: card.name,
      hint: `Hint clue: ${card.badge} — ${card.clue}`,
      why: card.say,
    };
  });
}

// ───────── LEVELS (23 levels across Grades K–5) ─────────

export const LEVELS = [
  // Grades K–1 · Level 1
  {
    id: "k1-position", grade: 1, level: 1, title: "Where Is It?", emoji: "🧭",
    teach: "Position words tell us where a picture sits: <b>above</b>, <b>below</b>, <b>left of</b>, or <b>right of</b> another picture.",
    say: "Let's practice position words: above, below, left of, and right of! Look carefully for the picture in that spot.",
    example: `<div class="ex-line">🐶 is <b>left of</b> ⭐ · 🐰 is <b>above</b> 🐶</div>`,
    gen: genK1Position,
  },
  {
    id: "k1-step-path", grade: 1, level: 1, title: "Follow the Steps", emoji: "👣",
    teach: "Follow step clues one square at a time using <b>⬆️ up, ⬇️ down, ⬅️ left, ➡️ right</b> (or arrow keys).",
    say: "Follow the step directions on the grid! Count each square carefully and tap Check when you reach the prize.",
    example: `<div class="ex-line">Tap <b>➡️ Right 2</b>, then <b>⬆️ Up 1</b>!</div>`,
    gen: genK1StepPath,
  },
  {
    id: "k1-sides-corners", grade: 1, level: 1, title: "Sides & Corners", emoji: "🔷",
    teach: "Count the <b>straight sides</b> and pointy <b>corners</b> around each shape. A smooth circle has <b>0</b>!",
    say: "Count every straight side and pointy corner around each shape. Circles have zero straight sides and zero corners!",
    example: `<div class="ex-line">Triangle: <b>3</b> sides · Square: <b>4</b> · Hexagon: <b>6</b></div>`,
    gen: genK1SidesCorners,
  },
  // Grades K–1 · Level 2
  {
    id: "k1-symmetry-yesno", grade: 1, level: 2, title: "Match Both Halves?", emoji: "🦋",
    teach: "Fold along the dashed line in your mind! Tap <b>Match</b> when both halves look the same, or <b>No match</b> when they look different. Matching halves have <b>symmetry</b>!",
    say: "Look at the dashed line! If you folded the picture in half, would both sides match or not match? When both halves match, we call it symmetry!",
    example: `<div class="ex-line">🦋 folded down the middle → <b>Match ✓</b> (Symmetry!)</div>`,
    gen: genK1SymmetryYesNo,
  },
  {
    id: "k1-find-landmark", grade: 1, level: 2, title: "Parish & Town Map", emoji: "🗺️",
    teach: "A <b>Map Key</b> shows what each picture symbol stands for so you can find places on the map.",
    say: "Look at the Map Key to match each word with its symbol, then tap that place on the map!",
    example: `<div class="ex-line">⛪ Church · 🏫 School · 📚 Library</div>`,
    gen: genK1FindLandmark,
  },
  // 2nd Grade · Level 1
  {
    id: "g2-grid-address", grade: 2, level: 1, title: "Grid Addresses", emoji: "📍",
    teach: "Read a grid address with the <b>column letter first</b> across the top, then the <b>row number</b> on the side (like <b>C2</b>).",
    say: "Every square has an address! Read the column letter across the top first, then the row number down the side, like C2.",
    example: `<div class="ex-line">Column <b>B</b> + Row <b>3</b> → <b>B3</b></div>`,
    gen: genG2GridAddress,
  },
  {
    id: "g2-compass", grade: 2, level: 1, title: "Compass Rose", emoji: "🧭",
    teach: "Use the <b>Compass Rose</b>: <b>N</b> North (up), <b>S</b> South (down), <b>E</b> East (right), <b>W</b> West (left).",
    say: "Look at the compass rose! North points up, South points down, East points right, and West points left.",
    example: `<div class="ex-line"><b>N</b> ↑ · <b>S</b> ↓ · <b>E</b> → · <b>W</b> ←</div>`,
    gen: genG2Compass,
  },
  {
    id: "g2-map-key", grade: 2, level: 1, title: "Map Key & Distance", emoji: "📏",
    teach: "The <b>map scale</b> says <b>1 square = 1 block</b>. Start counting steps right after leaving the start place!",
    say: "Use the map key and map scale to count blocks along the green dashed path—start counting at the first step after the starting square!",
    example: `<div class="ex-line">2 East + 3 South = <b>5 blocks</b></div>`,
    gen: genG2MapKey,
  },
  // 2nd Grade · Level 2
  {
    id: "g2-polygons-intro", grade: 2, level: 2, title: "Meet the Polygons", emoji: "🎨",
    introCards: INTRO_POLYGONS,
    teach: "Explore all 8 polygons first! Tap each card to hear its name and side count, then match them.",
    say: "Welcome to Meet the Polygons! Tap any shape card below to hear its name and how many sides it has, then tap Let's Practice!",
    example: `<div class="ex-line">Tap each card: 3 Triangle · 5 Pentagon · 8 Octagon</div>`,
    gen: (rand) => genIntroMatch(INTRO_POLYGONS, rand),
  },
  {
    id: "g2-polygons", grade: 2, level: 2, title: "Name That Polygon", emoji: "⬟",
    teach: "Count the sides of flat polygons: <b>3</b> triangle, <b>4</b> quadrilateral (square, rectangle, trapezoid, rhombus), <b>5</b> pentagon, <b>6</b> hexagon, <b>8</b> octagon.",
    say: "Count straight sides carefully to name each polygon: triangle, quadrilateral, pentagon, hexagon, or octagon!",
    example: `<div class="ex-line">5 = Pentagon · 6 = Hexagon · 8 = Octagon</div>`,
    gen: genG2Polygons,
  },
  {
    id: "g2-mirror-grid", grade: 2, level: 2, title: "Mirror Grid", emoji: "🪞",
    teach: "Reflect the colored tiles across the dashed <b>mirror line</b>: near squares stay near the mirror, and far squares stay far!",
    say: "Paint the matching mirror reflection on the right side of the dashed line! Tap any square to toggle it on or off.",
    example: `<div class="ex-line">Left edge ↔ Right edge · Middle ↔ Middle</div>`,
    gen: genG2MirrorGrid,
  },
  // 3rd Grade · Level 1
  {
    id: "g3-lines-intro", grade: 3, level: 1, title: "Meet Lines & Rays", emoji: "🔎",
    introCards: INTRO_LINES,
    teach: "Tap each geometry card to learn <b>Points, Segments, Rays, Lines, Parallel, Intersecting,</b> and <b>Perpendicular Lines</b>.",
    say: "Let's meet points, segments, rays, and lines before we practice! Tap each card to see the dots and arrows and hear what they mean.",
    example: `<div class="ex-line">• Point · •—• Segment · •→ Ray · ↔ Line</div>`,
    gen: (rand) => genIntroMatch(INTRO_LINES, rand),
  },
  {
    id: "g3-lines", grade: 3, level: 1, title: "Points, Lines & Rays", emoji: "↔️",
    teach: "<b>Segment</b> stops at 2 endpoints · <b>Ray</b> starts at 1 endpoint and has 1 arrow · <b>Line</b> has 2 arrows · <b>Parallel</b> never cross · <b>Perpendicular</b> meet at 90°.",
    say: "Watch the endpoints and arrows! Segments stop at two dots, rays keep going one way, and lines keep going both ways.",
    example: `<div class="ex-line">•—• Segment · •→ Ray · ↔ Line · ⊥ 90°</div>`,
    gen: genG3Lines,
  },
  {
    id: "g3-angles-intro", grade: 3, level: 1, title: "Meet Angles", emoji: "🔎",
    introCards: INTRO_ANGLES,
    teach: "Explore <b>Right (90°)</b>, <b>Acute (&lt; 90°)</b>, <b>Obtuse (&gt; 90°)</b>, and <b>Straight (180°)</b> angles before quizzing!",
    say: "Let's meet the four angle types! Tap each angle card to see how wide it opens and hear its name.",
    example: `<div class="ex-line">Acute &lt; 90° · Right = 90° · Obtuse &gt; 90° · Straight = 180°</div>`,
    gen: (rand) => genIntroMatch(INTRO_ANGLES, rand),
  },
  {
    id: "g3-angles", grade: 3, level: 1, title: "Acute, Right & Obtuse", emoji: "📐",
    teach: "<b>Right</b> = exact square corner (90°) · <b>Acute</b> = smaller than 90° · <b>Obtuse</b> = wider than 90°. Use the <b>Corner Tester</b>!",
    say: "Compare each angle with a square 90-degree corner. Acute is smaller, Right matches the square corner, and Obtuse opens wider!",
    example: `<div class="ex-line">Acute &lt; 90° · Right = 90° · Obtuse &gt; 90°</div>`,
    gen: genG3Angles,
  },
  // 3rd Grade · Level 2
  {
    id: "g3-quadrilaterals-intro", grade: 3, level: 2, title: "Meet Quadrilaterals", emoji: "🔎",
    introCards: INTRO_QUADS,
    teach: "Learn what <b>tick marks</b> (equal sides), <b>parallel arrows</b>, and <b>square corners</b> mean on all 5 quadrilaterals!",
    say: "Let's explore all five quadrilaterals and their special clues! Tap each shape card to see its tick marks, arrows, and square corners.",
    example: `<div class="ex-line">Ticks = equal sides · Arrows = parallel · ∟ = 90°</div>`,
    gen: (rand) => genIntroMatch(INTRO_QUADS, rand),
  },
  {
    id: "g3-quadrilaterals", grade: 3, level: 2, title: "Quadrilateral Match", emoji: "◇",
    teach: "Check <b>parallel arrows</b>, <b>equal-side ticks</b>, and <b>square corners</b> to tell Squares, Rectangles, Rhombuses, Trapezoids, and Parallelograms apart.",
    say: "Look at the marks on each four-sided shape! Equal tick marks show equal sides, and arrows show parallel lines.",
    example: `<div class="ex-line">Trapezoid = 1 parallel pair · Rhombus = 4 equal sides</div>`,
    gen: genG3Quadrilaterals,
  },
  {
    id: "g3-symmetry-lines", grade: 3, level: 2, title: "Lines of Symmetry", emoji: "✨",
    teach: "Shapes can have <b>0, 1, 2, 3, 4, 5, or 6</b> lines of symmetry—every fold where both halves match!",
    say: "Count every fold line that splits the shape into two exact matching halves. Remember, a rectangle's diagonals do not match!",
    example: `<div class="ex-line">Rectangle: 2 · Triangle: 3 · Square: 4</div>`,
    gen: genG3SymmetryLines,
  },
  // Grades 4–5 · Level 1
  {
    id: "g4-coord-read", grade: 4, level: 1, title: "Read Coordinates", emoji: "🎯",
    teach: "In an ordered pair <b>(x, y)</b>, the first number <b>x walks across</b> from 0, and the second number <b>y climbs up</b>!",
    say: "Always read across along x first, then climb up along y! Watch out for swapped coordinates.",
    example: `<div class="ex-line">(3, 5) = 3 across →, then 5 up ↑</div>`,
    gen: genG4CoordRead,
  },
  {
    id: "g4-coord-plot", grade: 4, level: 1, title: "Plot Coordinates", emoji: "📍",
    teach: "Walk across on the <b>x-axis first</b>, then climb up on the <b>y-axis</b>, and tap the intersection to plot <b>(x, y)</b>!",
    say: "Start at zero, zero. Walk across first for x, climb up second for y, and tap the grid crossing!",
    example: `<div class="ex-line">Over x, then Up y → tap the crossing!</div>`,
    gen: genG4CoordPlot,
  },
  {
    id: "g4-angles-intro", grade: 4, level: 1, title: "Meet the Protractor", emoji: "🔎",
    introCards: INTRO_PROTRACTOR,
    teach: "Learn how to start at <b>0°</b> on a half-circle protractor and split <b>90° corners</b> and <b>180° lines</b>!",
    say: "Welcome to Meet the Protractor! Tap each card to learn how degrees count up from zero and how angles split 90 or 180 degrees.",
    example: `<div class="ex-line">Start at 0° → Acute &lt; 90° · Obtuse &gt; 90° · Split 90°/180°</div>`,
    gen: (rand) => genIntroMatch(INTRO_PROTRACTOR, rand),
  },
  {
    id: "g4-measure-angles", grade: 4, level: 1, title: "Protractors & Angles", emoji: "◔",
    teach: "Read degrees from the <b>0° baseline</b>, and solve missing angles knowing a right angle = <b>90°</b> and a straight line = <b>180°</b>.",
    say: "Read the protractor carefully from zero degrees, and subtract from 90 or 180 when finding a missing angle.",
    example: `<div class="ex-line">90° − 35° = 55° · 180° − 110° = 70°</div>`,
    gen: genG4MeasureAngles,
  },
  // Grades 4–5 · Level 2
  {
    id: "g5-volume", grade: 4, level: 2, title: "3D Cube Volume", emoji: "🧊",
    teach: "<b>Volume</b> counts unit cubes inside a 3D solid: <b>Length × Width × Height</b> = layers × cubes per layer!",
    say: "Find the volume in cubic units by counting every unit cube or multiplying Length times Width times Height!",
    example: `<div class="ex-line">3 × 2 = 6 per layer · 2 layers = <b>12</b> cubes</div>`,
    gen: genG5Volume,
  },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id);

export function makeLevel(level, seed = Date.now()) {
  const rand = seeded(seed);
  return level.gen(rand).slice(0, PER_LEVEL);
}

// 3 stars only with no mistakes (matches the giant sticker); any mistake: mini sticker.
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);
