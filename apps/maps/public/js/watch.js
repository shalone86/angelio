// Animated "Watch How" worked-example engine for all 23 Maps, Grids & Geometry levels.
// Drives both the #/watch/:id full screen and the compact pre-game lesson card demo.

import * as S from "./kit/store.js";
import { speak, stop, isVoiceActive } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { esc, wireVoiceToggle } from "./kit/ui.js";
import { LEVELS, levelById } from "./maps.js";
import { shapeSvg, linesSvg, angleSvg, compassSvg, coordPlaneSvg, volumeSvg, pathOverlaySvg } from "./maps-svg.js";

const COLS_AZ = ["A", "B", "C", "D", "E"];
const eqPos = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

export const DEMO_IDS = LEVELS.map((l) => l.id);

function miniGrid({
  rows, cols, grid = [], anchor = null, highlight = null, trail = null,
  hero = null, labeled = false, pathLine = null, stepLimit = Infinity, showNumbers = false, compass = false,
} = {}) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid?.[r]?.[c];
      const isHero = trail ? eqPos(trail.at(-1), [r, c]) : false;
      const isVisited = trail ? trail.slice(0, -1).some((p) => eqPos(p, [r, c])) : false;
      const isAnchor = eqPos(anchor, [r, c]);
      const isHi = eqPos(highlight, [r, c]);
      const cls = [
        "map-cell demo-cell",
        isAnchor ? "anchor" : "",
        isHi ? "right-hit" : "",
        isVisited ? "visited" : "",
        isHero ? "hero-here" : "",
      ].filter(Boolean).join(" ");
      const inner = isHero
        ? `<span>${hero}</span>`
        : cell ? `<span>${cell.e ?? cell}</span>`
        : isVisited ? `<span class="trail-dot">•</span>` : "";
      cells.push(`<div class="${cls}">${inner}</div>`);
    }
  }
  const wrap = `<div class="grid-wrap demo-grid" style="--cols:${cols};--rows:${rows}">
    ${cells.join("")}${pathLine ? pathOverlaySvg({ rows, cols, pathLine }, { showNumbers, stepLimit }) : ""}
  </div>`;
  const frame = labeled ? `
    <div class="addr-frame demo-addr" style="--cols:${cols}">
      <div class="addr-corner"></div>
      <div class="addr-cols">${COLS_AZ.slice(0, cols).map((L, ci) => `<span class="${highlight && highlight[1] === ci ? "demo-axis-on" : ""}">${L}</span>`).join("")}</div>
      <div class="addr-rows">${Array.from({ length: rows }, (_, ri) => `<span class="${highlight && highlight[0] === ri ? "demo-axis-on" : ""}">${ri + 1}</span>`).join("")}</div>
      ${wrap}
    </div>` : wrap;
  return `<div class="demo-grid-row">${compass ? compassSvg({ size: 64 }) : ""}${frame}</div>`;
}

function miniMirror(leftCells, placedKeys, { color = "#1d7fe0", ok = false } = {}) {
  const leftSet = new Set(leftCells.map(([r, c]) => `${r},${c}`));
  const placed = new Set(placedKeys);
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      const k = `${r},${c}`, isL = c < 3;
      const on = isL ? leftSet.has(k) : placed.has(k);
      cells.push(`<div class="mcell demo-mcell${on ? " filled" : ""}${c === 2 ? " mirror-edge" : ""}${ok && !isL && on ? " right-ok" : ""}" style="${on ? `--fill:${color}` : ""}"></div>`);
    }
  }
  return `<div class="mirror-wrap demo-mirror" style="--cols:6;--rows:5">${cells.join("")}</div>`;
}

function demoChoices(opts, { pick = null } = {}) {
  return `<div class="demo-chips">${opts.map((o) => `<span class="demo-chip${pick === o ? " hit" : ""}">${esc(o)}</span>`).join("")}</div>`;
}

// Each demo returns a small list of animated frames: { caption, say, visual, sound? }
function buildFrames(id) {
  switch (id) {
    case "k1-position": {
      const g = [
        [{ e: "⭐" }, { e: "🐶" }, { e: "🐱" }],
        [{ e: "🐸" }, { e: "🐰" }, { e: "🍎" }],
        [{ e: "🐢" }, { e: "🐝" }, { e: "🎈" }],
      ];
      return [
        {
          caption: `Prompt: "Find the picture left of the kitten."`,
          say: "Read carefully: we want the picture left of the kitten.",
          visual: miniGrid({ rows: 3, cols: 3, grid: g, anchor: [0, 2] }),
        },
        {
          caption: `Spot 🐱 kitten, then move ⬅️ one square left.`,
          say: "Spot the kitten first, then look one square to its left.",
          visual: miniGrid({ rows: 3, cols: 3, grid: g, anchor: [0, 2], pathLine: [[0, 2], [0, 1]] }),
          sound: "pop",
        },
        {
          caption: `Tap 🐶 puppy! That picture is left of the kitten ✓`,
          say: "The puppy is one square left of the kitten! Tap the puppy.",
          visual: miniGrid({ rows: 3, cols: 3, grid: g, anchor: [0, 2], highlight: [0, 1] }),
          sound: "right",
        },
      ];
    }

    case "k1-step-path": {
      const g = Array.from({ length: 4 }, () => Array(4).fill(null));
      g[1][2] = { e: "🥕" };
      const frame = (trail, text, say, sound = "pop") => ({
        caption: text, say, sound,
        visual: `${miniGrid({ rows: 4, cols: 4, grid: g, trail, hero: "🐰", highlight: trail.at(-1)[0] === 1 && trail.at(-1)[1] === 2 ? [1, 2] : null })}
          <div class="step-pill">Steps taken: <b>${trail.length - 1}</b></div>`,
      });
      return [
        frame([[2, 0]], `Goal: Move 2 right and 1 up to the 🥕 carrot!`, "Let's walk the bunny two steps right and one step up.", null),
        frame([[2, 0], [2, 1]], `Tap ➡️ Right once (1 step)`, "One step right.", "pop"),
        frame([[2, 0], [2, 1], [2, 2]], `Tap ➡️ Right again (2 steps right ✓)`, "Two steps right.", "pop"),
        frame([[2, 0], [2, 1], [2, 2], [1, 2]], `Tap ⬆️ Up once → landed on 🥕! Tap Check ✓`, "One step up! Right on the carrot!", "right"),
      ];
    }

    case "k1-sides-corners": {
      const spec = { kind: "pentagon", fill: "#ffecc8", stroke: "#d96a00" };
      return [
        {
          caption: "Question: How many sides does this pentagon have?",
          say: "Let's count every straight side around this shape.",
          visual: shapeSvg(spec, { size: 132 }),
        },
        {
          caption: "Trace and number the straight sides: 1, 2, 3, 4, 5!",
          say: "One, two, three, four, five straight sides.",
          visual: shapeSvg(spec, { size: 132, highlightSides: 5 }),
          sound: "pop",
        },
        {
          caption: "It also has 5 pointy corners! Pick 5 ✓",
          say: "Five sides and five corners! The answer is five.",
          visual: `${shapeSvg(spec, { size: 122, highlightCorners: 5 })}${demoChoices(["3", "5", "6"], { pick: "5" })}`,
          sound: "right",
        },
      ];
    }

    case "k1-symmetry-yesno":
      return [
        {
          caption: "Imagine folding the butterfly on the dashed line.",
          say: "Look at the dashed fold line down the butterfly.",
          visual: `${shapeSvg({ kind: "sym-butterfly" }, { size: 128, fold: "v" })}${demoChoices(["Match ✓", "No match ✗"])}`,
        },
        {
          caption: "Both wings line up! Choose Match ✓ (that's symmetry!).",
          say: "When folded, both wings line up evenly! That is Match — also called symmetry.",
          visual: `${shapeSvg({ kind: "sym-butterfly" }, { size: 128, fold: "v" })}${demoChoices(["Match ✓", "No match ✗"], { pick: "Match ✓" })}`,
          sound: "right",
        },
        {
          caption: "This flag's two sides look different → No match ✗",
          say: "On this flag, the left side and right side do not match, so pick No match!",
          visual: `${shapeSvg({ kind: "asym-flag" }, { size: 122, fold: "v" })}${demoChoices(["Match ✓", "No match ✗"], { pick: "No match ✗" })}`,
          sound: "pop",
        },
      ];

    case "k1-find-landmark": {
      const g = Array.from({ length: 4 }, () => Array(4).fill(null));
      g[0][3] = { e: "🏫" }; g[2][1] = { e: "⛪" }; g[3][2] = { e: "📚" };
      const keyBar = (hi) => `<div class="map-key">${[["⛪", "Church"], ["🏫", "School"], ["📚", "Library"]]
        .map(([e, n]) => `<span class="key-item${n === hi ? " demo-key-hi" : ""}">${e} ${n}</span>`).join("")}</div>`;
      return [
        {
          caption: `Prompt: "Use the map key: tap the Church!"`,
          say: "First, find Church in the Map Key above the map.",
          visual: `${keyBar("")}${miniGrid({ rows: 4, cols: 4, grid: g })}`,
        },
        {
          caption: "In the Map Key, ⛪ stands for Church!",
          say: "Church has the cross symbol! Now scan the map for that symbol.",
          visual: `${keyBar("Church")}${miniGrid({ rows: 4, cols: 4, grid: g })}`,
          sound: "pop",
        },
        {
          caption: "Found ⛪ Church on the map! Tap it ✓",
          say: "There is the church! Tap that square.",
          visual: `${keyBar("Church")}${miniGrid({ rows: 4, cols: 4, grid: g, highlight: [2, 1] })}`,
          sound: "right",
        },
      ];
    }

    case "g2-grid-address": {
      const g = Array.from({ length: 4 }, () => Array(4).fill(null));
      g[1][2] = { e: "🏫" };
      return [
        {
          caption: `Find the address of 🏫 School: Column letter first, then Row!`,
          say: "Always read across the top column letter first, then the side row number.",
          visual: miniGrid({ rows: 4, cols: 4, grid: g, labeled: true }),
        },
        {
          caption: `Follow up from 🏫 → Column C! Follow left → Row 2!`,
          say: "School sits under Column C and across from Row 2.",
          visual: miniGrid({ rows: 4, cols: 4, grid: g, labeled: true, highlight: [1, 2] }),
          sound: "pop",
        },
        {
          caption: `Put them together: C + 2 = C2 ✓`,
          say: "Column C and row 2 give grid address C2!",
          visual: `${miniGrid({ rows: 4, cols: 4, grid: g, labeled: true, highlight: [1, 2] })}${demoChoices(["B3", "C2", "D1"], { pick: "C2" })}`,
          sound: "right",
        },
      ];
    }

    case "g2-compass": {
      const g = Array.from({ length: 4 }, () => Array(4).fill(null));
      g[2][1] = { e: "🍞" };
      g[0][1] = { e: "🏫" };
      return [
        {
          caption: `Finish: "The School is ___ of the Bakery."`,
          say: "Start at the Bakery in yellow and look toward the School.",
          visual: miniGrid({ rows: 4, cols: 4, grid: g, anchor: [2, 1], compass: true }),
        },
        {
          caption: `From 🍞 Bakery, we go UP toward 🏫 School. Up = North (N)!`,
          say: "On the compass rose, pointing straight up is North.",
          visual: miniGrid({ rows: 4, cols: 4, grid: g, anchor: [2, 1], compass: true, pathLine: [[2, 1], [1, 1], [0, 1]] }),
          sound: "pop",
        },
        {
          caption: `"The School is North (N) of the Bakery." ✓`,
          say: "So the School is North of the Bakery!",
          visual: `${miniGrid({ rows: 4, cols: 4, grid: g, anchor: [2, 1], highlight: [0, 1], compass: true })}${demoChoices(["North (N)", "South (S)", "East (E)"], { pick: "North (N)" })}`,
          sound: "right",
        },
      ];
    }

    case "g2-map-key": {
      const g = Array.from({ length: 4 }, () => Array(4).fill(null));
      g[0][0] = { e: "⛪" };
      g[1][3] = { e: "🏫" };
      const route = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]];
      return [
        {
          caption: `1 square = 1 block. Do NOT count the yellow Start square!`,
          say: "Watch closely: never count the starting square where you already stand.",
          visual: miniGrid({ rows: 4, cols: 4, grid: g, anchor: [0, 0], pathLine: route, stepLimit: 1 }),
        },
        {
          caption: `Count steps AFTER leaving ⛪: 1, 2, 3 blocks East...`,
          say: "Start counting on the first square the green path enters: one, two, three blocks right.",
          visual: miniGrid({ rows: 4, cols: 4, grid: g, anchor: [0, 0], pathLine: route, stepLimit: 3, showNumbers: true }),
          sound: "pop",
        },
        {
          caption: `...plus 1 block South = 4 blocks total! ✓`,
          say: "Plus one block down makes 4 blocks total!",
          visual: `${miniGrid({ rows: 4, cols: 4, grid: g, anchor: [0, 0], highlight: [1, 3], pathLine: route, stepLimit: 4, showNumbers: true })}${demoChoices(["3 blocks", "4 blocks", "5 blocks"], { pick: "4 blocks" })}`,
          sound: "right",
        },
      ];
    }

    case "g2-polygons-intro":
      return [
        {
          caption: "Meet 3 sides: Triangle (tri = three)!",
          say: "A triangle has three straight sides.",
          visual: `${shapeSvg({ kind: "triangle-tilt", fill: "#dcf6e6", stroke: "#137a41" }, { size: 124, highlightSides: 3 })}<div class="step-pill">Triangle · 3 sides</div>`,
          sound: "pop",
        },
        {
          caption: "Meet 5 sides: Pentagon (penta = five)!",
          say: "A pentagon has five straight sides.",
          visual: `${shapeSvg({ kind: "pentagon-tilt", fill: "#ffecc8", stroke: "#d96a00" }, { size: 124, highlightSides: 5 })}<div class="step-pill">Pentagon · 5 sides</div>`,
          sound: "pop",
        },
        {
          caption: "Meet 6 sides: Hexagon — Tap cards first, then match them!",
          say: "A hexagon has six sides like a honeycomb! Tap every card in the guide first, then practice matching.",
          visual: `${shapeSvg({ kind: "hexagon-flat", fill: "#bae6fd", stroke: "#135ea9" }, { size: 124, highlightSides: 6 })}<div class="step-pill">Hexagon · 6 sides ✓</div>`,
          sound: "right",
        },
      ];

    case "g2-polygons": {
      const hex = { kind: "hexagon-flat", fill: "#bae6fd", stroke: "#135ea9" };
      return [
        {
          caption: "Look at this polygon. Let's count its straight sides!",
          say: "Count all straight sides around this polygon.",
          visual: shapeSvg(hex, { size: 130 }),
        },
        {
          caption: "1, 2, 3, 4, 5, 6 sides! Six sides = Hexagon!",
          say: "One, two, three, four, five, six sides. Six sides means hexagon!",
          visual: `${shapeSvg(hex, { size: 122, highlightSides: 6 })}${demoChoices(["Pentagon", "Hexagon", "Octagon"], { pick: "Hexagon" })}`,
          sound: "right",
        },
      ];
    }

    case "g2-mirror-grid": {
      const left = [[0, 2], [1, 1], [1, 2], [2, 0]];
      return [
        {
          caption: "Copy the left pattern across the dashed mirror line.",
          say: "Match the blue tiles onto the right side across the red mirror line.",
          visual: miniMirror(left, []),
        },
        {
          caption: "Tiles right next to the mirror go right next to the mirror!",
          say: "Start with squares touching the middle mirror line: they match right next to it.",
          visual: miniMirror(left, ["0,3", "1,3"]),
          sound: "pop",
        },
        {
          caption: "Far left squares go far right! Exact mirror ✓",
          say: "Far squares go far on the right! Both sides match across the mirror.",
          visual: miniMirror(left, ["0,3", "1,3", "1,4", "2,5"], { ok: true }),
          sound: "right",
        },
      ];
    }

    case "g3-lines-intro":
      return [
        {
          caption: "Line Segment: TWO solid dots — stops at both ends!",
          say: "A line segment stops at two solid endpoints.",
          visual: `${linesSvg("segment", { size: 136 })}<div class="step-pill">Line Segment · stops at 2 dots</div>`,
          sound: "pop",
        },
        {
          caption: "Ray: ONE dot + ONE arrow — goes forever one way!",
          say: "A ray starts at one dot and has an arrow going forever one way.",
          visual: `${linesSvg("ray", { size: 136 })}<div class="step-pill">Ray · 1 dot + 1 arrow</div>`,
          sound: "pop",
        },
        {
          caption: "Line: TWO arrows — goes forever both ways!",
          say: "A line has arrows on both ends and keeps going forever.",
          visual: `${linesSvg("line", { size: 136 })}<div class="step-pill">Line · 2 arrows ✓</div>`,
          sound: "right",
        },
      ];

    case "g3-lines":
      return [
        {
          caption: "Look at how these two lines cross each other.",
          say: "Watch closely where these two lines cross.",
          visual: linesSvg("perpendicular", { size: 138 }),
        },
        {
          caption: "Notice the little orange square corner (90°) where they meet!",
          say: "That orange square means they form a perfect 90-degree corner — perpendicular lines!",
          visual: `${linesSvg("perpendicular", { size: 132 })}${demoChoices(["Parallel Lines", "Intersecting Lines", "Perpendicular Lines"], { pick: "Perpendicular Lines" })}`,
          sound: "right",
        },
      ];

    case "g3-angles-intro":
      return [
        {
          caption: "Acute Angle: tiny opening smaller than a square corner (< 90°).",
          say: "Acute angles open smaller than a square 90-degree corner.",
          visual: `${angleSvg({ deg: 40, baseDeg: 10, size: 138 })}<div class="step-pill">Acute (&lt; 90°)</div>`,
          sound: "pop",
        },
        {
          caption: "Right Angle: exact square 90° corner!",
          say: "A right angle makes an exact square 90-degree corner.",
          visual: `${angleSvg({ deg: 90, baseDeg: 0, revealRight: true, size: 138 })}<div class="step-pill">Right (90°)</div>`,
          sound: "pop",
        },
        {
          caption: "Obtuse (> 90°) & Straight (180°) open wider than a square corner!",
          say: "Obtuse opens wider than 90 degrees, and a straight angle opens flat to 180 degrees!",
          visual: `${angleSvg({ deg: 135, baseDeg: 10, size: 138 })}<div class="step-pill">Obtuse (&gt; 90°) ✓</div>`,
          sound: "right",
        },
      ];

    case "g3-angles":
      return [
        {
          caption: "Not sure how wide this angle is? Tap 📐 Corner Tester!",
          say: "Look at this angle, then tap Corner Tester to place a square corner on it.",
          visual: angleSvg({ deg: 35, baseDeg: 10, size: 138 }),
        },
        {
          caption: "Yellow square fits OVER the angle — the angle is smaller than 90°!",
          say: "The opening fits inside the yellow 90-degree square corner, so it is smaller than 90.",
          visual: angleSvg({ deg: 35, baseDeg: 10, showCornerTest: true, size: 138 }),
          sound: "pop",
        },
        {
          caption: "Smaller than 90° = Acute (< 90°) ✓",
          say: "Smaller than 90 degrees is an acute angle!",
          visual: `${angleSvg({ deg: 35, baseDeg: 10, showCornerTest: true, size: 126 })}${demoChoices(["Acute (< 90°)", "Right (90°)", "Obtuse (> 90°)"], { pick: "Acute (< 90°)" })}`,
          sound: "right",
        },
      ];

    case "g3-quadrilaterals-intro":
      return [
        {
          caption: "Tick marks show equal sides! Squares have 4 ticks + 90° corners.",
          say: "Matching tick marks show equal side lengths. A square has four equal sides and square corners.",
          visual: `${shapeSvg({ kind: "square" }, { size: 124, showDecor: true })}<div class="step-pill">Square · 4 equal sides + 90°</div>`,
          sound: "pop",
        },
        {
          caption: "Arrows show parallel lines! Trapezoid has just 1 parallel pair.",
          say: "Arrows mark parallel sides that never touch. A trapezoid has only one parallel pair.",
          visual: `${shapeSvg({ kind: "trapezoid" }, { size: 124, showDecor: true })}<div class="step-pill">Trapezoid · 1 parallel pair</div>`,
          sound: "pop",
        },
        {
          caption: "Rhombus has 4 equal sides (1 tick each) tilted without 90° corners!",
          say: "A rhombus has four equal sides like a square, but its corners tilt.",
          visual: `${shapeSvg({ kind: "rhombus" }, { size: 124, showDecor: true })}<div class="step-pill">Rhombus · 4 equal sides ✓</div>`,
          sound: "right",
        },
      ];

    case "g3-quadrilaterals":
      return [
        {
          caption: "Check the marks: arrows on top/bottom + 2-tick matching slanted sides.",
          say: "Notice the parallel arrows AND matching opposite slanted sides with no square corners.",
          visual: shapeSvg({ kind: "parallelogram" }, { size: 132, showDecor: true }),
        },
        {
          caption: "Opposite sides match and slant together → Parallelogram ✓",
          say: "Two pairs of parallel sides without right angles make a parallelogram!",
          visual: `${shapeSvg({ kind: "parallelogram" }, { size: 124, showDecor: true })}${demoChoices(["Trapezoid", "Parallelogram", "Rectangle"], { pick: "Parallelogram" })}`,
          sound: "right",
        },
      ];

    case "g3-symmetry-lines":
      return [
        {
          caption: "Count every fold line where both halves of a rectangle match!",
          say: "Try folding a rectangle vertically and horizontally.",
          visual: shapeSvg({ kind: "rectangle" }, { size: 130, fold: "v" }),
        },
        {
          caption: "Up-down fold ✓ AND side-to-side fold ✓ — Watch out: diagonals do NOT match!",
          say: "Up and down matches, side to side matches, but diagonal folds do not match!",
          visual: shapeSvg({ kind: "rectangle" }, { size: 130, showSym: true }),
          sound: "pop",
        },
        {
          caption: "So a rectangle has 2 lines of symmetry ✓",
          say: "Two matching folds means a rectangle has 2 lines of symmetry!",
          visual: `${shapeSvg({ kind: "rectangle" }, { size: 122, showSym: true })}${demoChoices(["1", "2", "4"], { pick: "2" })}`,
          sound: "right",
        },
      ];

    case "g4-coord-read":
      return [
        {
          caption: "Find coordinates (x, y) of point P: walk ACROSS x first!",
          say: "Remember the rule: walk across along x first, then climb up y.",
          visual: coordPlaneSvg({ points: [{ x: 4, y: 2, label: "P", color: "#e5484d" }], size: 205 }),
        },
        {
          caption: "Drop straight down to x = 4, and straight left to y = 2!",
          say: "Point P sits at 4 across and 2 up.",
          visual: coordPlaneSvg({ points: [{ x: 4, y: 2, label: "P", color: "#e5484d" }], showDrops: [4, 2], size: 205 }),
          sound: "pop",
        },
        {
          caption: "Write (4, 2) — not (2, 4)! ✓",
          say: "Four across, two up: four comma two!",
          visual: `${coordPlaneSvg({ points: [{ x: 4, y: 2, label: "P", color: "#e5484d" }], showDrops: [4, 2], size: 190 })}${demoChoices(["(2, 4)", "(4, 2)", "(5, 2)"], { pick: "(4, 2)" })}`,
          sound: "right",
        },
      ];

    case "g4-coord-plot":
      return [
        {
          caption: "Plot (3, 5): Start at (0, 0). First walk 3 across along x →",
          say: "To plot three comma five, start at zero and count three across.",
          visual: coordPlaneSvg({ selected: [3, 0], size: 205 }),
        },
        {
          caption: "Then climb straight UP 5 along y ↑ and tap the intersection!",
          say: "Now climb up five units and tap the intersection at three, five.",
          visual: coordPlaneSvg({ selected: [3, 5], showDrops: [3, 5], size: 205 }),
          sound: "right",
        },
      ];

    case "g4-angles-intro":
      return [
        {
          caption: "Step 1: Place one ray on 0° at the right baseline!",
          say: "Start by lining one ray up with the 0-degree mark on the right.",
          visual: `${angleSvg({ deg: 0, protractor: true, highlightArc: true, size: 165 })}<div class="step-pill">0° Baseline</div>`,
          sound: "pop",
        },
        {
          caption: "Step 2: Count degrees from 0° up to the red ray (45° < 90° acute)!",
          say: "Read along the curved scale from zero: forty-five degrees stops before ninety.",
          visual: `${angleSvg({ deg: 45, protractor: true, highlightArc: true, size: 165 })}<div class="step-pill">45° Acute</div>`,
          sound: "pop",
        },
        {
          caption: "Right-angle split = 90° total · Straight-line split = 180° total ✓",
          say: "When two angles fill a 90-degree corner or 180-degree line, subtract from 90 or 180!",
          visual: `${angleSvg({ split: { total: 90, known: 35, showAnswer: true }, size: 155 })}<div class="step-pill">90° − 35° = 55° ✓</div>`,
          sound: "right",
        },
      ];

    case "g4-measure-angles":
      return [
        {
          caption: "Blue ray is on 0° at the right. Is the red angle acute or obtuse?",
          say: "Notice the opening is smaller than 90 degrees, so it is acute.",
          visual: angleSvg({ deg: 60, protractor: true, size: 168 }),
        },
        {
          caption: "Follow 0° → 30° → 60°! Pick 60° (not 120°) ✓",
          say: "Counting up from zero lands right on 60 degrees!",
          visual: `${angleSvg({ deg: 60, protractor: true, highlightArc: true, size: 162 })}${demoChoices(["60°", "120°", "75°"], { pick: "60°" })}`,
          sound: "pop",
        },
        {
          caption: "Missing angle in a 180° line: subtract 180° − 110° = 70° ✓",
          say: "For a straight-line split, subtract 110 from 180 to get 70 degrees!",
          visual: `${angleSvg({ split: { total: 180, known: 110, showAnswer: true }, size: 160 })}${demoChoices(["60°", "70°", "80°"], { pick: "70°" })}`,
          sound: "right",
        },
      ];

    case "g5-volume":
    default: {
      const layer1 = [[1, 1, 1], [1, 1, 1]];
      const layer2 = [[2, 2, 2], [2, 2, 2]];
      return [
        {
          caption: "Start with 1 bottom layer: 3 long × 2 wide = 6 unit cubes!",
          say: "First count one flat layer: three times two equals six cubes.",
          visual: `${volumeSvg(layer1, { dims: { l: 3, w: 2, h: 1 }, size: 145 })}<div class="vol-readout">1 layer × 6 = <b>6</b> cubic units</div>`,
        },
        {
          caption: "Stack a 2nd layer of 6 cubes on top (+ Layer) → 12 cubic units!",
          say: "Add a second layer of six cubes! Two layers times six gives twelve cubic units.",
          visual: `${volumeSvg(layer2, { dims: { l: 3, w: 2, h: 2 }, size: 155 })}<div class="vol-readout right">2 layers × (3 × 2) = <b>12</b> cubic units ✓</div>`,
          sound: "right",
        },
      ];
    }
  }
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mounts an auto-playing animated problem walkthrough inside `container`.
 * Speaks step captions when `speakSteps` & `isVoiceActive()` are true; otherwise paces smoothly by timer.
 */
export function mountAnimatedDemo(container, level, { compact = false, speakSteps = true, onCaption = null } = {}) {
  const frames = buildFrames(level.id);
  let runId = 0;

  container.innerHTML = `
    <div class="demo-box${compact ? " compact" : ""}">
      <div class="demo-step-bar">
        <span class="demo-badge" data-demo-step>Step 1 / ${frames.length}</span>
        <span class="demo-caption" data-demo-cap></span>
      </div>
      <div class="demo-stage" data-demo-stage></div>
    </div>`;

  const stepEl = container.querySelector("[data-demo-step]");
  const capEl = container.querySelector("[data-demo-cap]");
  const stageEl = container.querySelector("[data-demo-stage]");

  async function run({ forceVoice = false } = {}) {
    const myRun = ++runId;
    if (forceVoice) stop({ count: false });
    await pause(220);
    for (let i = 0; i < frames.length; i++) {
      if (myRun !== runId || !container.isConnected) return;
      const f = frames[i];
      if (stepEl) stepEl.textContent = `Step ${i + 1} / ${frames.length}`;
      if (capEl) capEl.textContent = f.caption;
      onCaption?.(f.caption);
      if (stageEl) {
        stageEl.innerHTML = f.visual;
        FX.pop?.(stageEl, 1.03);
      }
      if (f.sound === "pop") sfx.pop?.();
      else if (f.sound === "right") sfx.right?.();

      if (speakSteps && (forceVoice || isVoiceActive())) {
        await Promise.race([speak(f.say, { force: forceVoice && i === 0 }), pause(8000)]);
        if (myRun !== runId || !container.isConnected) return;
        await pause(450);
      } else {
        await pause(i === frames.length - 1 ? 1700 : 1450);
      }
    }
  }

  run();

  return {
    replay: () => run({ forceVoice: true }),
    stop: () => {
      runId++;
      stop({ count: false });
    },
  };
}

/** Full-screen #/watch/:id route with bubble, animated board, replay, and "Try It Myself!" CTA. */
export function viewWatch(app, id) {
  const level = levelById(id) || LEVELS[0];
  document.body.classList.add("in-game");
  app.innerHTML = `
    <section class="play watch-stage">
      <div class="play-top">
        <a class="icon-btn" href="#/" aria-label="Exit">✕</a>
        <div class="watch-title">${level.emoji} 🎬 Watch how: <b>${esc(level.title)}</b></div>
        <button class="icon-btn toggle" data-voice title="Read aloud" aria-pressed="${S.settings().readAloud}">🔊</button>
      </div>
      <div class="bubble" aria-live="polite">
        <span class="mascot" aria-hidden="true">${level.emoji}</span>
        <p class="say">Watch step by step how this game works!</p>
      </div>
      <div class="card board" data-watch-host></div>
    </section>
    <div class="dock">
      <div class="dpad-actions">
        <button type="button" class="btn big" data-own-sound data-watch-replay>🔄 Watch again</button>
        <a class="btn big primary pulse" href="#/play/${level.id}/go">▶ Try It Myself!</a>
      </div>
    </div>`;

  wireVoiceToggle(app.querySelector("[data-voice]"));
  const sayEl = app.querySelector(".bubble .say");
  const demo = mountAnimatedDemo(app.querySelector("[data-watch-host]"), level, {
    compact: false,
    speakSteps: true,
    onCaption: (txt) => { if (sayEl) sayEl.textContent = txt; },
  });
  app.querySelector("[data-watch-replay]").onclick = () => demo.replay();

  return () => {
    demo.stop();
    document.body.classList.remove("in-game");
  };
}
