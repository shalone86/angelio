// Measurement, Time & Money (Grades K to 5, 23 levels). Pure logic & generators (no DOM); tested in test/measure.test.js.
import { fracLabel, plural, unitWord } from "./measure-svg.js";

export { plural, unitWord };

export const PER_LEVEL = 6;

export const GRADES = [
  {
    n: 1, title: "Grades K–1", emoji: "🐣",
    blurb: "Longer/shorter/heavier, Meet the Coins & 1¢/5¢/10¢ counting, Meet the Clock (:00/:30), and calendars & tallies.",
    levels: ["Comparing, coins & trays", "Telling time, calendars & tallies"],
  },
  {
    n: 2, title: "2nd Grade", emoji: "📏",
    blurb: "Meet the Ruler (start at 0!), measuring in inches & cm, coins up to $1.00, 5-minute clocks, and picture/bar graphs.",
    levels: ["Rulers (in/cm) & coins to $1.00", "5-minute clocks, graphs & units"],
  },
  {
    n: 3, title: "3rd Grade", emoji: "⏱️",
    blurb: "Exact & elapsed time, dollars & making change, quarter-inch line plots, Meet Liquids & Mass, and perimeter vs. area.",
    levels: ["Time, change & quarter-inch plots", "Liquids, mass & perimeter/area"],
  },
  {
    n: 4, title: "Grades 4–5", emoji: "🚀",
    blurb: "Meet Unit Conversions, converting customary & metric units, multi-step schedules, decimal budgets, and fractional line plots.",
    levels: ["Unit conversions & schedules", "Decimal budgets & fractional plots"],
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

/** Format 12-hour `{ hour, minute }` as `"3:05"`. */
export function formatTime(hour, minute) {
  let total = (((Number(hour) % 12) + 12) % 12) * 60 + Number(minute);
  total = ((total % 720) + 720) % 720;
  const h = Math.floor(total / 60) || 12;
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Add `delta` minutes on a 12-hour analog clock. */
export function addMinutes(hour, minute, delta) {
  const start = (((hour % 12) + 12) % 12) * 60 + minute;
  const next = (((start + delta) % 720) + 720) % 720;
  return { hour: Math.floor(next / 60) || 12, minute: next % 60 };
}

/** Format cents cleanly (`45¢`, `$1.00`, `$4.35`). */
export function formatMoney(cents) {
  const c = Math.round(Number(cents));
  if (c < 100 && c >= 0) return `${c}¢`;
  const dollars = Math.floor(Math.abs(c) / 100);
  const rem = Math.abs(c) % 100;
  return `${c < 0 ? "-" : ""}$${dollars}.${String(rem).padStart(2, "0")}`;
}

const COIN_VALS = { penny: 1, nickel: 5, dime: 10, quarter: 25, d1: 100, d5: 500, d10: 1000, d20: 2000 };

/** Total value in cents for `{ penny, nickel, dime, quarter, d1, d5, d10, d20 }`. */
export function moneyValue(counts) {
  let sum = 0;
  for (const [k, n] of Object.entries(counts || {})) sum += (COIN_VALS[k] || 0) * (Number(n) || 0);
  return sum;
}

/** Compare built money tray against `targetCents`. */
export function checkMoney(counts, targetCents) {
  const total = moneyValue(counts);
  return { ok: total === targetCents, total, diff: targetCents - total };
}

function uniqueChoices(answer, candidates, rand, count = 3) {
  const seen = new Set([answer]);
  const foils = [];
  for (const c of shuffle(candidates, rand)) {
    if (c != null && !seen.has(c)) {
      seen.add(c);
      foils.push(c);
      if (foils.length === count - 1) break;
    }
  }
  return shuffle([answer, ...foils], rand);
}

// ───────── 5 Montessori-Style Intro Decks + Generator ─────────

const INTRO_COINS = [
  { id: "penny", name: "Penny (1¢)", badge: "1¢", clue: "Copper brown coin worth 1 cent.", say: "This is a Penny! It is copper brown and worth 1 cent.", coin: "penny" },
  { id: "nickel", name: "Nickel (5¢)", badge: "5¢", clue: "Thick silver coin worth 5 cents.", say: "This is a Nickel! It is smooth silver and worth 5 cents.", coin: "nickel" },
  { id: "dime", name: "Dime (10¢)", badge: "10¢", clue: "Smallest silver coin, worth 10 cents.", say: "This is a Dime! Even though it is the smallest coin, it is worth 10 cents.", coin: "dime" },
  { id: "quarter", name: "Quarter (25¢)", badge: "25¢", clue: "Biggest common silver coin, worth 25 cents.", say: "This is a Quarter! It is large silver and worth 25 cents — 4 quarters make one dollar!", coin: "quarter" },
  { id: "d1", name: "$1 Dollar Bill", badge: "$1", clue: "Green dollar bill worth 100 cents.", say: "This is a One Dollar Bill! It equals 100 cents.", coin: "d1" },
  { id: "d5", name: "$5 Dollar Bill", badge: "$5", clue: "Green five-dollar bill worth 5 dollars.", say: "This is a Five Dollar Bill! It equals five 1-dollar bills.", coin: "d5" },
];

const INTRO_CLOCK = [
  { id: "c300", name: "3 o'clock (3:00)", badge: "on the hour", clue: "Red short hand points at 3; blue long hand points straight up at 12.", say: "This clock shows 3 o'clock! When the long blue hand points straight up to 12, say o'clock.", clock: { hour: 3, minute: 0, showMinuteRing: true } },
  { id: "c630", name: "Half past 6 (6:30)", badge: "half hour :30", clue: "Red hand sits halfway past 6; blue long hand points down at 6.", say: "Half past 6, or 6:30! When the long blue minute hand points straight down to 6, it means 30 minutes.", clock: { hour: 6, minute: 30, showMinuteRing: true } },
  { id: "c900", name: "9 o'clock (9:00)", badge: "on the hour", clue: "Red short hand points left to 9; blue long hand points up to 12.", say: "This clock shows 9 o'clock! Short red hand on 9, long blue hand on 12.", clock: { hour: 9, minute: 0, showMinuteRing: true } },
  { id: "c1230", name: "Half past 12 (12:30)", badge: "half hour :30", clue: "Red hand sits halfway past 12; blue long hand points down to 6.", say: "This shows 12:30, half past 12! The red hand is halfway between 12 and 1.", clock: { hour: 12, minute: 30, showMinuteRing: true } },
  { id: "c1015", name: "Quarter past 10 (10:15)", badge: ":15 minutes", clue: "Blue hand points right to 3 — count 5, 10, 15 minutes!", say: "At 10:15, count by fives around the edge: 5, 10, 15 when the blue hand points to 3!", clock: { hour: 10, minute: 15, showMinuteRing: true } },
  { id: "c445", name: "4:45 (Count by 5s)", badge: ":45 minutes", clue: "Blue hand points to 9 (9 × 5 = 45); red hour hand nears 5.", say: "Notice at 4:45 the red hour hand gets close to 5, and the blue minute hand points to 9 for 45 minutes.", clock: { hour: 4, minute: 45, showMinuteRing: true } },
];

const INTRO_RULER = [
  { id: "start0", name: "Start at 0 (Not Edge!)", badge: "0 mark", clue: "Line the object up cleanly on the red 0 mark, not the blank wood edge.", say: "Rule number one: always line the start of your object up on the 0 mark, never the blank end edge!", ruler: { unit: "in", max: 5, obj: { kind: "crayon", units: 3 }, rulerOffset: 0, showZeroGuide: true } },
  { id: "trap", name: "Watch Out: Edge Error", badge: "misaligned!", clue: "Putting the wood edge at the start makes the 0 mark sit too far right.", say: "Look closely here! If you start at the plastic edge instead of zero, your measurement will be wrong!", ruler: { unit: "in", max: 5, obj: { kind: "key", units: 3 }, rulerOffset: 1, showZeroGuide: true } },
  { id: "inches", name: "Inches (in)", badge: "4 inches", clue: "About the width of a thumb knuckle to tip — key spans from 0 to 4 in.", say: "An inch is about as wide as two thumb tips. Here the pencil stretches from 0 to 4 inches!", ruler: { unit: "in", max: 6, obj: { kind: "pencil", units: 4 }, rulerOffset: 0, showAnswer: true } },
  { id: "cm", name: "Centimeters (cm)", badge: "smaller metric unit", clue: "About the width of one pinkie fingernail — 100 cm make 1 meter.", say: "A centimeter is much smaller than an inch, about the width of your pinkie fingernail!", ruler: { unit: "cm", max: 10, obj: { kind: "ribbon", units: 7 }, rulerOffset: 0, showAnswer: true } },
  { id: "half", name: "Half-Inch (3½ in)", badge: "½ mark", clue: "Halfway between 3 and 4 is 3½ inches.", say: "When the tip stops halfway between 3 and 4, it measures three and one half inches!", ruler: { unit: "in", max: 5, quarterTicks: true, obj: { kind: "bookmark", units: 3.5 }, rulerOffset: 0, showAnswer: true } },
  { id: "quarter", name: "Quarter-Inch (2¼ in)", badge: "¼ mark", clue: "Each inch splits into 4 tiny equal spaces: ¼, ½, ¾.", say: "With quarter-inch marks, each whole inch splits into four equal jumps: one fourth, two fourths, three fourths!", ruler: { unit: "in", max: 5, quarterTicks: true, obj: { kind: "leaf", units: 2.25 }, rulerOffset: 0, showAnswer: true } },
];

const INTRO_LIQUID_MASS = [
  { id: "ml", name: "Milliliter (mL)", badge: "tiny metric drops", clue: "About 20 drops fill 1 mL — a small mug holds ~250 mL.", say: "A milliliter is tiny — about twenty drops from an eyedropper! A mug holds about 250 milliliters.", pitcher: { capacity: 500, fill: 250, unit: "mL", label: "250 mL mug" } },
  { id: "liter", name: "Liter (L)", badge: "1 L = 1,000 mL", clue: "A large reusable water bottle holds about 1 Liter.", say: "A liter equals one thousand milliliters — about the size of a big sports bottle.", pitcher: { capacity: 2, fill: 1, unit: "L", label: "1 Liter bottle" } },
  { id: "cup", name: "Cup & Quart", badge: "4 cups = 1 qt", clue: "4 measuring cups pour together to fill 1 quart pitcher.", say: "In US measuring cups, 2 cups make a pint, 4 cups make a quart, and 4 quarts make a gallon!", pitcher: { capacity: 4, fill: 4, unit: "cups", label: "4 cups = 1 quart" } },
  { id: "gram", name: "Gram (g)", badge: "light metric mass", clue: "One small paperclip weighs about 1 gram — light things use grams!", say: "A gram is tiny mass: one small paperclip weighs about 1 gram. Use grams for pencils or crackers!", scale: { left: { e: "📎", label: "5 g clips" }, right: { e: "🍬", label: "5 g candy" }, tilt: 0 } },
  { id: "kg", name: "Kilogram (kg)", badge: "1 kg = 1,000 g", clue: "Heavy dictionary or pineapple is about 1 kilogram.", say: "One kilogram equals one thousand grams — about the weight of a hardcover book or pineapple!", scale: { left: { e: "🍍", label: "1 kg" }, right: { e: "🪶", label: "5 g" }, tilt: -1 } },
  { id: "ozlb", name: "Ounce & Pound", badge: "16 oz = 1 lb", clue: "A slice of bread is ~1 ounce; a loaf of bread is ~1 pound.", say: "An ounce is light like one slice of bread, while 16 ounces make 1 full pound!", scale: { left: { e: "🍞", label: "1 lb loaf" }, right: { e: "🥪", label: "1 oz slice" }, tilt: -1 } },
];

const INTRO_CONVERT = [
  { id: "inft", name: "Inches ↔ Feet", badge: "12 in = 1 ft", clue: "Multiply feet × 12 to find inches.", convert: { leftText: "1 foot", rightText: "12 inches", sub: "3 ft = 36 in", color: "#e3f0ff", stroke: "#135ea9" }, say: "One foot equals 12 inches! To change feet into inches, multiply by 12." },
  { id: "ftyd", name: "Feet ↔ Yards", badge: "3 ft = 1 yd", clue: "Multiply yards × 3 to find feet.", convert: { leftText: "1 yard", rightText: "3 feet", sub: "2 yd = 6 ft (72 in)", color: "#dcf6e6", stroke: "#137a41" }, say: "One yard equals 3 feet, which is 36 inches!" },
  { id: "cmm", name: "Centimeters ↔ Meters", badge: "100 cm = 1 m", clue: "Centi means 100! Multiply meters × 100.", convert: { leftText: "1 meter", rightText: "100 cm", sub: "4 m = 400 cm", color: "#ffecc8", stroke: "#d96a00" }, say: "Centi means one hundred! One meter equals 100 centimeters." },
  { id: "minhr", name: "Minutes ↔ Hours", badge: "60 min = 1 hr", clue: "Multiply hours × 60 for minutes.", convert: { leftText: "1 hour", rightText: "60 min", sub: "2 hr = 120 min", color: "#f0e5ff", stroke: "#6429a6" }, say: "Every clock hour holds 60 minutes! Two hours equal 120 minutes." },
  { id: "qtgal", name: "Quarts ↔ Gallons", badge: "4 qt = 1 gal", clue: "Think of 4 quarters in $1: 4 quarts = 1 gallon!", convert: { leftText: "1 gallon", rightText: "4 quarts", sub: "1 gal = 16 cups", color: "#e3f0ff", stroke: "#135ea9" }, say: "Quarter sounds like four! Four quarts fill 1 big gallon jug." },
  { id: "gkg", name: "Grams ↔ Kilograms", badge: "1,000 g = 1 kg", clue: "Kilo means 1,000! Same for 1,000 mL = 1 L.", convert: { leftText: "1 kg", rightText: "1,000 g", sub: "1 L = 1,000 mL", color: "#dcf6e6", stroke: "#137a41" }, say: "Kilo means one thousand! One kilogram equals 1,000 grams, just like 1 liter equals 1,000 milliliters." },
];

function genIntroMatch(cards, rand) {
  const pool = cards.length >= PER_LEVEL
    ? shuffle(cards, rand).slice(0, PER_LEVEL)
    : [...shuffle(cards, rand), ...shuffle(cards, rand)].slice(0, PER_LEVEL);

  const visSay = [
    (c) => `Tap the card that shows ${c.name}!`,
    (c) => `Which picture matches ${c.name}?`,
    (c) => `Find ${c.name} below! ${c.clue}`,
  ];
  const nameSay = [
    "Which label matches this card?",
    "Look closely at the visual clue. What does this show?",
    "Match this picture to the right label!",
  ];

  return pool.map((card, i) => {
    const askType = i % 2 === 0 ? "visual" : "name";
    const others = shuffle(cards.filter((x) => x.id !== card.id), rand).slice(0, 2);
    const opts = shuffle([card, ...others], rand);
    const vis = card.coin ? { coin: card.coin }
      : card.clock ? { clock: card.clock }
      : card.ruler ? { ruler: card.ruler }
      : card.pitcher ? { pitcher: card.pitcher }
      : card.scale ? { scale: card.scale }
      : { convert: card.convert };

    if (askType === "visual") {
      return {
        type: "intro-match", askType, target: card,
        prompt: `Find ${card.name}!`,
        say: visSay[i % visSay.length](card),
        choices: opts.map((x) => x.name),
        choiceSpecs: Object.fromEntries(opts.map((x) => [x.name, x])),
        answer: card.name,
        hint: `Remember: ${card.name} — ${card.clue}`,
        why: card.say,
      };
    }
    return {
      type: "intro-match", askType, target: card, ...vis,
      prompt: "What does this card show?",
      say: nameSay[i % nameSay.length],
      choices: opts.map((x) => x.name),
      choiceSpecs: Object.fromEntries(opts.map((x) => [x.name, x])),
      answer: card.name,
      hint: `Clue: ${card.badge} — ${card.clue}`,
      why: card.say,
    };
  });
}

// ───────── 18 Core Practice Level Generators (each returns 6 items) ─────────

function genK1Compare(rand) {
  const LEN = [
    { a: { kind: "pencil", label: "Pencil", units: 6 }, b: { kind: "crayon", label: "Crayon", units: 3.5 }, want: "longer" },
    { a: { kind: "ribbon", label: "Ribbon", units: 3 }, b: { kind: "bookmark", label: "Bookmark", units: 5.5 }, want: "shorter" },
    { a: { kind: "leaf", label: "Leaf", units: 5 }, b: { kind: "key", label: "Key", units: 2.5 }, want: "longer" },
    { a: { kind: "crayon", label: "Red Crayon", units: 2.5 }, b: { kind: "pencil", label: "Yellow Pencil", units: 5.5 }, want: "shorter" },
  ];
  const TALL = [
    { a: { label: "Blue Tower", units: 5, color: "#1d7fe0", stroke: "#135ea9" }, b: { label: "Green Tower", units: 2.5, color: "#37c977", stroke: "#137a41" }, want: "taller" },
    { a: { label: "Orange Block", units: 2, color: "#ff9d2e", stroke: "#b35900" }, b: { label: "Purple Tower", units: 5, color: "#b07bff", stroke: "#6429a6" }, want: "shorter" },
  ];
  const MASS = [
    { left: { e: "🍉", label: "Watermelon" }, right: { e: "🍓", label: "Strawberry" }, tilt: -1, want: "heavier" },
    { left: { e: "🪶", label: "Feather" }, right: { e: "📚", label: "Books" }, tilt: 1, want: "lighter" },
    { left: { e: "🐘", label: "Toy Elephant" }, right: { e: "🐭", label: "Toy Mouse" }, tilt: -1, want: "lighter" },
  ];

  const lenItems = shuffle(LEN, rand).slice(0, 2).map((p) => {
    const win = p.want === "longer"
      ? (p.a.units > p.b.units ? p.a.label : p.b.label)
      : (p.a.units < p.b.units ? p.a.label : p.b.label);
    return {
      type: "choose", hearChoices: true,
      comparePair: { a: p.a, b: p.b, vertical: false },
      prompt: `Which one is ${p.want}?`,
      say: `Compare from the dashed start line. Which object is ${p.want}?`,
      choices: [p.a.label, p.b.label],
      answer: win,
      hint: p.want === "longer" ? "Look for the one that stretches farther to the right." : "Look for the one that stops sooner.",
      why: `The ${win} is ${p.want}!`,
    };
  });

  const tallItem = pick(TALL, rand);
  const tallWin = tallItem.want === "taller"
    ? (tallItem.a.units > tallItem.b.units ? tallItem.a.label : tallItem.b.label)
    : (tallItem.a.units < tallItem.b.units ? tallItem.a.label : tallItem.b.label);
  const tallQ = {
    type: "choose", hearChoices: true,
    comparePair: { a: tallItem.a, b: tallItem.b, vertical: true },
    prompt: `Which tower is ${tallItem.want}?`,
    say: `Look at both towers standing on the floor. Which one is ${tallItem.want}?`,
    choices: [tallItem.a.label, tallItem.b.label],
    answer: tallWin,
    hint: tallItem.want === "taller" ? "Look for the tower that reaches higher up." : "Look for the lower tower.",
    why: `The ${tallWin} is ${tallItem.want}!`,
  };

  const massItems = shuffle(MASS, rand).slice(0, 3).map((m, idx) => {
    const heavy = m.tilt < 0 ? m.left.label : m.right.label;
    const light = m.tilt < 0 ? m.right.label : m.left.label;
    const ans = m.want === "heavier" ? heavy : light;
    const scaleSay = [
      `Watch how the balance scale tips down on one side. Which item is ${m.want}?`,
      `The heavier pan sinks lower while the lighter pan floats up! Pick the ${m.want} one.`,
      `Check the two pans on this balance scale. Tap the ${m.want} item!`,
    ];
    return {
      type: "choose", hearChoices: true,
      scale: { left: m.left, right: m.right, tilt: m.tilt },
      prompt: `Look at the balance scale. Which is ${m.want}?`,
      say: scaleSay[idx % scaleSay.length],
      choices: [m.left.label, m.right.label],
      answer: ans,
      hint: m.want === "heavier" ? "Heavier items push their pan DOWN lower." : "Lighter items go UP higher on the scale.",
      why: `The ${ans} is ${m.want}!`,
    };
  });

  return shuffle([...lenItems, tallQ, ...massItems], rand);
}

function genK1CoinsCount(rand) {
  const COUNT_SPECS = [
    { counts: { dime: 2 }, label: "2 dimes" },
    { counts: { nickel: 3 }, label: "3 nickels" },
    { counts: { dime: 1, penny: 4 }, label: "1 dime and 4 pennies" },
    { counts: { nickel: 2, penny: 3 }, label: "2 nickels and 3 pennies" },
    { counts: { dime: 2, nickel: 1 }, label: "2 dimes and 1 nickel" },
    { counts: { dime: 1, nickel: 1, penny: 2 }, label: "1 dime, 1 nickel, and 2 pennies" },
  ];
  const BUILD_TARGETS = shuffle([12, 16, 21, 25, 30, 14, 27], rand);
  const countItems = shuffle(COUNT_SPECS, rand).slice(0, 3).map((sp, i) => {
    const val = moneyValue(sp.counts);
    const ans = `${val}¢`;
    const sayLines = [
      "Count each coin by 10s, 5s, and 1s. How many cents altogether?",
      "Add the values on every coin in the tray. What is the total?",
      "Count the biggest coins first, then add the smaller ones!",
    ];
    return {
      type: "choose", hearChoices: true,
      moneyTray: sp.counts,
      prompt: "How much money is in the tray?",
      say: sayLines[i % sayLines.length],
      choices: uniqueChoices(ans, [`${val + 5}¢`, `${Math.max(2, val - 5)}¢`, `${val + 10}¢`, `${Math.max(1, val - 1)}¢`], rand, 3),
      answer: ans,
      hint: `Count dimes as 10¢, nickels as 5¢, and pennies as 1¢ (${sp.label}).`,
      why: `${sp.label} make ${ans}!`,
    };
  });

  const buildSay = [
    (c) => `Tap coins below to build ${c} cents in your tray!`,
    (c) => `Put coins together in the tray until you have ${c} cents.`,
    (c) => `Show ${c} cents using dimes, nickels, or pennies!`,
  ];
  const buildItems = BUILD_TARGETS.slice(0, 3).map((t, i) => ({
    type: "build-money", targetCents: t, denominations: ["penny", "nickel", "dime"],
    prompt: `Build ${t}¢ in the tray!`,
    say: buildSay[i % buildSay.length](t),
    hint: `Start with 10¢ dimes, then add 5¢ nickels or 1¢ pennies until the tray shows ${t}¢.`,
    why: `Awesome coin counting — your tray makes ${t}¢!`,
  }));

  return shuffle([...countItems, ...buildItems], rand);
}

function genK1ClockHalf(rand) {
  const HOURS = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rand);
  const readItems = [0, 1, 2].map((i) => {
    const h = HOURS[i], m = i % 2 === 0 ? 0 : 30;
    const ans = formatTime(h, m);
    const otherH = (h % 12) + 1;
    const foils = m === 0
      ? [`${h}:30`, `${otherH}:00`, `${otherH}:30`]
      : [`${h}:00`, `${otherH}:30`, `${otherH}:00`];
    const readSay = [
      "Look at where the red hour hand and blue minute hand point. What time is it?",
      "Check the short red hour hand first! Pointing up at 12 means o'clock; down at 6 means 30.",
      "Read this clock face carefully. Which digital time matches?",
    ];
    return {
      type: "choose", hearChoices: true,
      clock: { hour: h, minute: m },
      prompt: "What time does this clock show?",
      say: readSay[i % readSay.length],
      choices: uniqueChoices(ans, foils, rand, 3),
      answer: ans,
      hint: m === 0 ? "Long blue hand on 12 means :00 (o'clock)!" : "Long blue hand on 6 means :30 (half past)!",
      why: `The short hand points past ${h} and the long hand is on ${m === 0 ? "12" : "6"}: ${ans}!`,
    };
  });

  const setSay = [
    (ans) => `Spin the clock hands until it shows ${ans.replace(":00", " o'clock")}.`,
    (ans) => `Use the buttons to set this clock to ${ans}!`,
    (ans) => `Move the hands forward or back to show ${ans}.`,
  ];
  const setItems = [3, 4, 5].map((i) => {
    const targetH = HOURS[i], targetM = i % 2 === 1 ? 30 : 0;
    const startH = ((targetH + 2) % 12) || 12;
    const ans = formatTime(targetH, targetM);
    return {
      type: "set-clock", startHour: startH, startMinute: 0, targetHour: targetH, targetMinute: targetM,
      stepMinutes: 30, showMinuteRing: false,
      prompt: `Set the clock to ${ans}!`,
      say: setSay[i % setSay.length](ans),
      hint: targetM === 0 ? `Put the red hour hand right on ${targetH} and the blue hand on 12.` : `Move half an hour past ${targetH} so the blue hand points to 6 (:30).`,
      why: `Great job! That clock shows ${ans}.`,
    };
  });

  return shuffle([...readItems, ...setItems], rand);
}

function genK1CalendarTally(rand) {
  const DOWS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const calSpecs = [
    { month: "May", startDow: 4, days: 31, askDay: 11, markDays: [{ day: 11, emoji: "🎈" }] },
    { month: "June", startDow: 1, days: 30, askDay: 18, markDays: [{ day: 18, emoji: "⭐" }] },
    { month: "April", startDow: 3, days: 30, askDay: 12, markDays: [{ day: 12, emoji: "🐣" }] },
  ];
  const calItems = calSpecs.slice(0, 2).map((cs, i) => {
    const dow = DOWS[(cs.startDow + cs.askDay - 1) % 7];
    const nextDow = DOWS[(cs.startDow + cs.askDay) % 7];
    const prevDow = DOWS[(cs.startDow + cs.askDay + 5) % 7];
    return {
      type: "choose", hearChoices: true,
      calendar: { month: cs.month, startDow: cs.startDow, days: cs.days, highlightDay: cs.askDay, markDays: cs.markDays },
      prompt: `What day of the week is ${cs.month} ${cs.askDay}?`,
      say: i === 0
        ? `Find ${cs.month} ${cs.askDay} highlighted in yellow, then look straight up to the day column!`
        : `Check the calendar for ${cs.month} ${cs.askDay}. Which day of the week sits above it?`,
      choices: uniqueChoices(dow, [nextDow, prevDow, "Saturday", "Monday"], rand, 3),
      answer: dow,
      hint: `Find number ${cs.askDay}, then follow its column up to Su, Mo, Tu, We, Th, Fr, or Sa.`,
      why: `${cs.month} ${cs.askDay} falls under ${dow.slice(0, 2)}, which is ${dow}!`,
    };
  });

  const calCount = {
    type: "choose", hearChoices: true,
    calendar: { month: "October", startDow: 2, days: 31, highlightDay: 10, markDays: [{ day: 10, emoji: "🎂" }, { day: 17, emoji: "🎪" }] },
    prompt: "How many days after October 10 is October 17?",
    say: "Look at the birthday cake on October 10 and the tent on October 17. How many days apart are they?",
    choices: ["7 days", "5 days", "10 days"],
    answer: "7 days",
    hint: "Moving down one full row on a calendar is always 1 week = 7 days!",
    why: "From the 10th to the 17th is 17 − 10 = 7 days (one whole week)!",
  };

  const TALLIES = [
    {
      title: "Favorite Pets", rows: [{ label: "Dogs", count: 7 }, { label: "Cats", count: 5 }, { label: "Fish", count: 3 }],
      q: "How many tally marks are there for Dogs?",
      say: "Count the tally marks in the Dogs row. Remember a bundle with a slash counts as 5!",
      ans: "7", foils: ["5", "6", "8"], why: "One 5-bundle plus 2 single tallies makes 5 + 2 = 7!",
    },
    {
      title: "Favorite Fruits", rows: [{ label: "Apples", count: 4 }, { label: "Bananas", count: 8 }, { label: "Grapes", count: 6 }],
      q: "How many votes did Bananas get?",
      say: "Count the tallies next to Bananas: 5 for the slashed bundle, plus the single marks!",
      ans: "8", foils: ["5", "7", "9"], why: "5 + 3 = 8 tally marks for Bananas!",
    },
    {
      title: "Rainy Days", rows: [{ label: "March", count: 6 }, { label: "April", count: 9 }, { label: "May", count: 4 }],
      q: "Which month had the MOST tally marks?",
      say: "Compare all three rows of tally marks. Which month has the most?",
      ans: "April", foils: ["March", "May"], why: "April has 9 tally marks — more than March (6) or May (4)!",
    },
  ];
  const tallyItems = shuffle(TALLIES, rand).slice(0, 3).map((t) => ({
    type: "choose", hearChoices: true,
    chart: { kind: "tally", title: t.title, rows: t.rows },
    prompt: t.q, say: t.say,
    choices: uniqueChoices(t.ans, t.foils, rand, 3),
    answer: t.ans,
    hint: "A bundle of 4 lines with 1 diagonal slash across equals 5!",
    why: t.why,
  }));

  return shuffle([...calItems, calCount, ...tallyItems], rand);
}

function genG2RulerMeasure(rand) {
  const OBJS = shuffle([
    { kind: "pencil", name: "pencil", unit: "in", units: 4, max: 6 },
    { kind: "crayon", name: "crayon", unit: "in", units: 3, max: 6 },
    { kind: "key", name: "key", unit: "in", units: 2, max: 6 },
    { kind: "bookmark", name: "bookmark", unit: "in", units: 5, max: 6 },
    { kind: "ribbon", name: "ribbon", unit: "cm", units: 7, max: 10 },
    { kind: "leaf", name: "leaf", unit: "cm", units: 6, max: 10 },
    { kind: "feather", name: "feather", unit: "cm", units: 8, max: 10 },
  ], rand);

  const alignSay = [
    (o) => `First slide the ruler until 0 lines up with the start of the ${o.name}, then tap how many ${o.unit === "in" ? "inches" : "centimeters"} long it is!`,
    (o) => `Watch out for the blank edge! Move the red 0 mark under the left end of the ${o.name}, then pick its length.`,
    (o) => `Line up zero with the left side of the ${o.name}, then read where the ${o.name} ends!`,
  ];

  const alignItems = OBJS.slice(0, 4).map((o, i) => {
    const startOffset = i % 2 === 0 ? 1 : -1;
    const ans = `${o.units} ${o.unit}`;
    return {
      type: "align-ruler",
      ruler: { unit: o.unit, max: o.max, obj: { kind: o.kind, units: o.units }, startOffset },
      prompt: `Line up 0, then measure the ${o.name} in ${o.unit}!`,
      say: alignSay[i % alignSay.length](o),
      choices: uniqueChoices(ans, [`${o.units + 1} ${o.unit}`, `${Math.max(1, o.units - 1)} ${o.unit}`, `${o.units + 2} ${o.unit}`], rand, 3),
      answer: ans,
      hint: `Tap ⬅️ / ➡️ Slide until "0 mark ✓" is green, then read the number above the right tip!`,
      why: `Starting cleanly at 0, the ${o.name} ends right at ${ans}!`,
    };
  });

  const COMP_PAIRS = [
    { a: { kind: "pencil", label: "Pencil (5 in)", units: 5 }, b: { kind: "crayon", label: "Crayon (3 in)", units: 3 }, q: "How much longer is the pencil than the crayon?", ans: "2 in", foils: ["3 in", "8 in", "1 in"], say: "A pencil is 5 inches and a crayon is 3 inches. How many inches longer is the pencil?" },
    { a: { kind: "ribbon", label: "Ribbon (8 cm)", units: 8 }, b: { kind: "key", label: "Key (5 cm)", units: 5 }, q: "How much longer is the ribbon than the key?", ans: "3 cm", foils: ["2 cm", "13 cm", "4 cm"], say: "A ribbon is 8 centimeters and a key is 5 centimeters. Find the difference!" },
    { a: { kind: "bookmark", label: "Bookmark (6 in)", units: 6 }, b: { kind: "leaf", label: "Leaf (2 in)", units: 2 }, q: "How much shorter is the leaf than the bookmark?", ans: "4 in", foils: ["3 in", "8 in", "2 in"], say: "Subtract the 2-inch leaf from the 6-inch bookmark to find how much shorter it is." },
  ];
  const compItems = shuffle(COMP_PAIRS, rand).slice(0, 2).map((cp) => ({
    type: "choose",
    comparePair: { a: cp.a, b: cp.b, vertical: false },
    prompt: cp.q, say: cp.say,
    choices: uniqueChoices(cp.ans, cp.foils, rand, 3),
    answer: cp.ans,
    hint: "Subtract the shorter length from the longer length!",
    why: `Subtracting gives ${cp.ans}!`,
  }));

  return shuffle([...alignItems, ...compItems], rand);
}

function genG2CoinsDollar(rand) {
  const TRAYS = [
    { counts: { quarter: 2, dime: 1 }, desc: "2 quarters and 1 dime" },
    { counts: { quarter: 1, dime: 2, nickel: 1 }, desc: "1 quarter, 2 dimes, and 1 nickel" },
    { counts: { quarter: 3, penny: 4 }, desc: "3 quarters and 4 pennies" },
    { counts: { quarter: 2, nickel: 2, penny: 3 }, desc: "2 quarters, 2 nickels, and 3 pennies" },
    { counts: { quarter: 1, dime: 3, nickel: 1, penny: 2 }, desc: "1 quarter, 3 dimes, 1 nickel, and 2 pennies" },
  ];
  const readItems = shuffle(TRAYS, rand).slice(0, 3).map((t, i) => {
    const c = moneyValue(t.counts);
    const ans = `${c}¢`;
    const sayLines = [
      "Count the 25-cent quarters first, then add dimes, nickels, and pennies!",
      "Start with quarters: 25, 50, 75! Then count on the smaller coins.",
      "Find the total value of all coins in the tray.",
    ];
    return {
      type: "choose", moneyTray: t.counts,
      prompt: "Count the mixed coins. What is the total?",
      say: sayLines[i % sayLines.length],
      choices: uniqueChoices(ans, [`${c + 10}¢`, `${Math.max(5, c - 10)}¢`, `${c + 5}¢`], rand, 3),
      answer: ans,
      hint: `Count from largest coin to smallest (${t.desc}).`,
      why: `${t.desc} equal ${ans}!`,
    };
  });

  const TARGETS = shuffle([35, 45, 55, 63, 72, 85, 91], rand).slice(0, 3);
  const buildItems = TARGETS.map((cents, i) => ({
    type: "build-money", targetCents: cents, denominations: ["penny", "nickel", "dime", "quarter"],
    prompt: `Build ${cents}¢ using quarters, dimes, nickels, and pennies!`,
    say: i === 0
      ? `Tap coins below to build ${cents} cents in your tray!`
      : `Fill the tray to make exactly ${cents} cents.`,
    hint: `Try starting with 25¢ quarters, then count on by 10s, 5s, and 1s to reach ${cents}¢.`,
    why: `Nice work! Those coins add up to ${cents}¢.`,
  }));

  return shuffle([...readItems, ...buildItems], rand);
}

function genG2Clock5Min(rand) {
  const MINS = [5, 10, 15, 20, 25, 35, 40, 45, 50, 55];
  const hrs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rand);
  const readItems = [0, 1].map((i) => {
    const h = hrs[i], m = pick(MINS, rand);
    const ans = formatTime(h, m);
    const numClock = m / 5;
    return {
      type: "choose", clock: { hour: h, minute: m },
      prompt: "What time does this clock show?",
      say: i === 0 ? "Count by 5s for the blue minute hand to tell the time!" : "Check the red hour hand first, then count by fives to the blue minute hand!",
      choices: uniqueChoices(ans, [formatTime(h, (m + 10) % 60), formatTime(h, numClock), formatTime((h % 12) + 1, m)], rand, 3),
      answer: ans,
      hint: `Minute hand on ${numClock} means ${numClock} × 5 = ${m} minutes!`,
      why: `The hour is ${h} and ${numClock} × 5 = ${m} minutes: ${ans}!`,
    };
  });

  const setItems = [2, 3].map((i) => {
    const h = hrs[i], m = pick(MINS, rand);
    const ans = formatTime(h, m);
    return {
      type: "set-clock", startHour: h, startMinute: 0, targetHour: h, targetMinute: m, stepMinutes: 5,
      prompt: `Set the clock to ${ans}!`,
      say: i === 2 ? `Spin the hands forward by 5-minute steps to show ${ans}.` : `Set the analog clock to read ${ans}!`,
      hint: `Count by 5s from 12 until the blue minute hand reaches :${String(m).padStart(2, "0")}.`,
      why: `Spot on! That clock reads ${ans}.`,
    };
  });

  const AMPM = [
    { h: 7, m: 30, text: "Eating breakfast before school", ans: "7:30 a.m.", other: "7:30 p.m.", say: "We eat morning breakfast before school. Is 7:30 in the morning a.m. or p.m.?" },
    { h: 8, m: 15, text: "Putting on pajamas at bedtime", ans: "8:15 p.m.", other: "8:15 a.m.", say: "Bedtime at night is at 8:15. Should you pick a.m. or p.m.?" },
    { h: 12, m: 15, text: "Eating lunch at noon", ans: "12:15 p.m.", other: "12:15 a.m.", say: "Right after 12 noon, is lunchtime a.m. or p.m.?" },
    { h: 3, m: 30, text: "Playing outside after school", ans: "3:30 p.m.", other: "3:30 a.m.", say: "Afternoon playtime after school is 3:30. Is that a.m. or p.m.?" },
  ];
  const ampmItems = shuffle(AMPM, rand).slice(0, 2).map((sp) => ({
    type: "choose", clock: { hour: sp.h, minute: sp.m },
    prompt: `${sp.text}: is this a.m. or p.m.?`,
    say: sp.say,
    choices: shuffle([sp.ans, sp.other], rand),
    answer: sp.ans,
    hint: "a.m. is midnight to noon (morning); p.m. is noon to midnight (afternoon & night)!",
    why: `${sp.text} happens at ${sp.ans}!`,
  }));

  return shuffle([...readItems, ...setItems, ...ampmItems], rand);
}

function genG2Graphs(rand) {
  const PIC = [
    {
      title: "Stickers Earned", icon: "⭐", scale: 2, unit: "stickers",
      rows: [{ label: "Leo", value: 8 }, { label: "Maya", value: 6 }, { label: "Sam", value: 10 }],
      q: "How many stickers did Sam earn?", ans: "10", foils: ["5", "8", "12"],
      say: "Look at the Key at the bottom: each star equals 2 stickers! How many did Sam earn?",
      hint: "Count Sam's 5 stars by 2s: 2, 4, 6, 8, 10!", why: "5 stars × 2 = 10 stickers for Sam!",
    },
    {
      title: "Apples Picked", icon: "🍎", scale: 5, unit: "apples",
      rows: [{ label: "Farm A", value: 15 }, { label: "Farm B", value: 25 }, { label: "Farm C", value: 10 }],
      q: "How many MORE apples did Farm B pick than Farm A?", ans: "10", foils: ["2", "15", "40"],
      say: "Each apple icon stands for 5 apples! How many more apples did Farm B pick than Farm A?",
      hint: "Farm B = 25 and Farm A = 15. Subtract 25 − 15!", why: "25 − 15 = 10 more apples!",
    },
    {
      title: "Books Read", icon: "📘", scale: 2, unit: "books",
      rows: [{ label: "Week 1", value: 6 }, { label: "Week 2", value: 8 }, { label: "Week 3", value: 4 }],
      q: "How many books were read in all 3 weeks together?", ans: "18", foils: ["9", "14", "20"],
      say: "Notice 1 book icon equals 2 books. Count total books across all three weeks!",
      hint: "Add Week 1 (6) + Week 2 (8) + Week 3 (4)!", why: "6 + 8 + 4 = 18 books in all!",
    },
  ];

  const BAR = [
    {
      title: "Favorite Ice Cream", scale: 2,
      rows: [{ label: "Vanilla", value: 6 }, { label: "Choc", value: 10 }, { label: "Berry", value: 4 }],
      q: "How many more kids chose Chocolate than Berry?", ans: "6", foils: ["4", "10", "14"],
      say: "Read the bar heights on Chocolate and Berry. How many more kids picked Chocolate?",
      hint: "Chocolate reaches 10 and Berry reaches 4.", why: "10 − 4 = 6 more kids chose Chocolate!",
    },
    {
      title: "Seeds Planted", scale: 5,
      rows: [{ label: "Mon", value: 15 }, { label: "Tue", value: 20 }, { label: "Wed", value: 10 }],
      q: "How many seeds were planted on Monday and Tuesday together?", ans: "35", foils: ["25", "30", "45"],
      say: "Add the Monday bar and Tuesday bar together from this bar graph!",
      hint: "Monday = 15 and Tuesday = 20.", why: "15 + 20 = 35 seeds!",
    },
    {
      title: "Park Birds Spotted", scale: 2,
      rows: [{ label: "Robins", value: 8 }, { label: "Jays", value: 6 }, { label: "Doves", value: 12 }],
      q: "How many Doves were spotted?", ans: "12", foils: ["8", "10", "14"],
      say: "Follow the top of the Doves bar over to the number scale on the left.",
      hint: "Look at the tallest bar labeled Doves.", why: "The Doves bar lines up with 12!",
    },
  ];

  const picItems = PIC.map((g) => ({
    type: "choose", chart: { kind: "picture", title: g.title, icon: g.icon, scale: g.scale, unit: g.unit, rows: g.rows },
    prompt: g.q, say: g.say, choices: uniqueChoices(g.ans, g.foils, rand, 3), answer: g.ans, hint: g.hint, why: g.why,
  }));
  const barItems = BAR.map((g) => ({
    type: "choose", chart: { kind: "bar", title: g.title, scale: g.scale, rows: g.rows },
    prompt: g.q, say: g.say, choices: uniqueChoices(g.ans, g.foils, rand, 3), answer: g.ans, hint: g.hint, why: g.why,
  }));
  return shuffle([...picItems, ...barItems], rand);
}

function genG2EstimateUnit(rand) {
  const ITEMS = [
    { text: "✏️ A new school pencil", q: "What is the best estimate for the length of a pencil?", ans: "7 inches", foils: ["7 feet", "7 yards"], hint: "Feet and yards are much longer than a school desk!", why: "A standard pencil is about 7 inches long." },
    { text: "🚪 A classroom door height", q: "Which unit fits a door's height best?", ans: "7 feet", foils: ["7 inches", "7 centimeters"], hint: "7 inches is smaller than a book; you walk through a tall door!", why: "A tall doorway measures about 7 feet high." },
    { text: "🚗 A family car length", q: "About how long is a family car?", ans: "4 meters", foils: ["4 centimeters", "4 inches"], hint: "4 centimeters is shorter than one crayon!", why: "Cars are measured in meters (or feet), about 4 meters long." },
    { text: "🐞 A tiny ladybug", q: "About how wide is a real ladybug?", ans: "1 centimeter", foils: ["1 meter", "1 foot"], hint: "Think of a pinkie fingernail — 1 meter is as wide as a doorway!", why: "Tiny bugs are measured in centimeters (about 1 cm)." },
    { text: "⚽ A soccer field length", q: "Which tool is best to measure a whole soccer field?", ans: "Measuring tape (meters/yards)", foils: ["Short 6-inch ruler", "Eyedropper"], hint: "A 6-inch ruler would take hundreds of hops across a field!", why: "Long outdoor fields use measuring tapes in yards or meters." },
    { text: "📘 Your math workbook", q: "Which tool is best to measure the width of your notebook?", ans: "12-inch ruler", foils: ["Bathroom weight scale", "Measuring cup"], hint: "Scales measure weight and cups measure liquid — length uses a ruler!", why: "A 12-inch ruler measures book edges accurately." },
  ];
  return shuffle(ITEMS, rand).map((it, i) => ({
    type: "choose", text: it.text,
    prompt: it.q,
    say: i % 2 === 0 ? `${it.text.replace(/[^\w\s.,!?'-]/g, "")}. ${it.q}` : `${it.q} Picture the real object's size!`,
    choices: shuffle([it.ans, ...it.foils], rand),
    answer: it.ans, hint: it.hint, why: it.why,
  }));
}

function genG3ElapsedTime(rand) {
  const hrs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rand);
  const exactMins = shuffle([7, 13, 18, 24, 32, 38, 44, 51], rand);

  const exactItems = [0, 1].map((i) => {
    const h = hrs[i], m = exactMins[i], ans = formatTime(h, m);
    return {
      type: "choose", clock: { hour: h, minute: m },
      prompt: "Read the exact minute on this clock!",
      say: i === 0 ? "Count by 5s first, then count the single minute ticks past the number!" : "Check every single minute tick for the blue hand. What exact time is it?",
      choices: uniqueChoices(ans, [formatTime(h, m + 5), formatTime(h, Math.max(1, m - 2)), formatTime(h, (m + 1) % 60)], rand, 3),
      answer: ans,
      hint: `Count by 5s up to ${Math.floor(m / 5) * 5}, then add ${m % 5} tiny tick marks!`,
      why: `The clock shows ${ans} (${Math.floor(m / 5) * 5} + ${m % 5} = ${m} minutes)!`,
    };
  });

  const WORD = [
    { sh: 3, sm: 15, add: 35, act: "Reading time" },
    { sh: 4, sm: 20, add: 25, act: "Piano practice" },
    { sh: 1, sm: 40, add: 30, act: "Art project" },
    { sh: 5, sm: 10, add: 45, act: "Soccer game" },
  ];
  const wordItems = shuffle(WORD, rand).slice(0, 2).map((w) => {
    const end = addMinutes(w.sh, w.sm, w.add);
    const ans = formatTime(end.hour, end.minute);
    const sStr = formatTime(w.sh, w.sm);
    return {
      type: "choose", clock: { hour: w.sh, minute: w.sm },
      elapsed: { sh: w.sh, sm: w.sm, add: w.add },
      prompt: `${w.act} starts at ${sStr} and lasts ${w.add} minutes. When does it end?`,
      say: `${w.act} starts at ${sStr} and lasts ${w.add} minutes. What time does it finish?`,
      choices: uniqueChoices(ans, [formatTime(end.hour, (end.minute + 10) % 60), formatTime(end.hour, (end.minute + 50) % 60), formatTime(w.sh, w.sm + 20)], rand, 3),
      answer: ans,
      hint: w.sm + w.add >= 60 ? `Count ${60 - w.sm} minutes to the next hour, then ${w.sm + w.add - 60} more!` : `Add ${w.add} minutes onto :${String(w.sm).padStart(2, "0")}!`,
      why: `${sStr} plus ${w.add} minutes lands at ${ans}!`,
    };
  });

  const setItems = [2, 3].map((i) => {
    const sh = hrs[i + 2], sm = 15 + i * 5;
    const add = i === 2 ? 25 : 35;
    const end = addMinutes(sh, sm, add);
    const endStr = formatTime(end.hour, end.minute);
    return {
      type: "set-clock", startHour: sh, startMinute: sm, targetHour: end.hour, targetMinute: end.minute, stepMinutes: 5,
      prompt: `Clock starts at ${formatTime(sh, sm)}. Advance it ${add} minutes!`,
      say: `The clock shows ${formatTime(sh, sm)}. Spin the hands ahead ${add} minutes to the finishing time.`,
      hint: `Count ${add / 5} clicks of +5 min forward from ${formatTime(sh, sm)}!`,
      why: `${formatTime(sh, sm)} + ${add} minutes = ${endStr}!`,
    };
  });

  return shuffle([...exactItems, ...wordItems, ...setItems], rand);
}

function genG3MoneyChange(rand) {
  const CHANGE = [
    { cost: 365, paid: 500, item: "storybook", icon: "📘" },
    { cost: 240, paid: 500, item: "sandwich", icon: "🥪" },
    { cost: 425, paid: 1000, item: "paint set", icon: "🎨" },
    { cost: 175, paid: 500, item: "kite", icon: "🪁" },
    { cost: 650, paid: 1000, item: "soccer ball", icon: "⚽" },
  ];
  const changeChoose = shuffle(CHANGE, rand).slice(0, 3).map((ch) => {
    const diff = ch.paid - ch.cost;
    const ans = formatMoney(diff);
    return {
      type: "choose",
      text: `${ch.icon} A ${ch.item} costs ${formatMoney(ch.cost)}. You pay with ${formatMoney(ch.paid)}.`,
      prompt: "How much change should you get back?",
      say: `A ${ch.item} costs ${formatMoney(ch.cost)}. You hand over ${formatMoney(ch.paid)}. How much change comes back?`,
      choices: uniqueChoices(ans, [formatMoney(diff + 100), formatMoney(Math.max(25, diff - 100)), formatMoney(diff + 25)], rand, 3),
      answer: ans,
      hint: `Count up from ${formatMoney(ch.cost)} to the next dollar, then to ${formatMoney(ch.paid)}!`,
      why: `${formatMoney(ch.paid)} − ${formatMoney(ch.cost)} = ${ans} change!`,
    };
  });

  const BUILD = shuffle([135, 240, 315, 625, 460], rand).slice(0, 3);
  const buildItems = BUILD.map((cents, i) => ({
    type: "build-money", targetCents: cents, denominations: ["penny", "nickel", "dime", "quarter", "d1", "d5"],
    prompt: `Build ${formatMoney(cents)} using dollars and coins!`,
    say: i === 0 ? `Use bills and coins below to make ${formatMoney(cents)}!` : `Put together ${formatMoney(cents)} in the tray.`,
    hint: `Start with $5 or $1 bills for whole dollars, then add quarters, dimes, nickels, and pennies.`,
    why: `Right on! Your tray totals ${formatMoney(cents)}.`,
  }));

  return shuffle([...changeChoose, ...buildItems], rand);
}

function genG3QuarterLinePlot(rand) {
  const OBJS = shuffle([
    { kind: "crayon", name: "crayon", units: 2.25 },
    { kind: "key", name: "key", units: 2.75 },
    { kind: "pencil", name: "pencil", units: 4.25 },
    { kind: "leaf", name: "leaf", units: 3.5 },
    { kind: "bookmark", name: "ribbon", units: 3.75 },
  ], rand);

  const rulerItems = OBJS.slice(0, 2).map((o, i) => {
    const ans = `${fracLabel(o.units)} in`;
    const wrongA = `${fracLabel(o.units + 0.25)} in`;
    const wrongB = `${fracLabel(Math.max(0.5, o.units - 0.25))} in`;
    const wrongC = `${fracLabel(o.units + 0.5)} in`;
    return {
      type: "align-ruler",
      ruler: { unit: "in", max: 5, quarterTicks: true, obj: { kind: o.kind, units: o.units }, startOffset: i === 0 ? 1 : -1 },
      prompt: `Line up 0 and measure this ${o.name} to the nearest ¼ inch!`,
      say: `Slide the ruler onto 0 first, then read to the nearest quarter-inch mark for the ${o.name}.`,
      choices: uniqueChoices(ans, [wrongA, wrongB, wrongC], rand, 3),
      answer: ans,
      hint: "Each whole inch has 4 equal quarter steps: ¼, ½ (two quarters), ¾!",
      why: `Lined up on 0, the ${o.name} measures ${ans}!`,
    };
  });

  const PLOTS = [
    { points: [1.5, 1.5, 2, 2.25, 2.25, 2.25, 3], add: 2, qCountTarget: 2.25, qCount: 3 },
    { points: [1, 1.25, 1.25, 2.5, 2.5, 2.5, 2.75], add: 2.5, qCountTarget: 1.25, qCount: 2 },
  ];
  const basePlot = PLOTS[Math.floor(rand() * PLOTS.length)];
  const plotAddVal = pick([1.5, 2.25, 2.75, 3], rand);
  const plotItems = [
    {
      type: "plot-x",
      chart: { kind: "lineplot", title: "Ribbon Lengths", unit: "in", range: [1, 4], step: 0.25, points: basePlot.points },
      targetVal: plotAddVal,
      prompt: `Tap above ${fracLabel(plotAddVal)} to add an X for a ${fracLabel(plotAddVal)} in ribbon!`,
      say: `Tap on the line plot above ${fracLabel(plotAddVal)} to record a new measurement!`,
      hint: `Find ${Math.floor(plotAddVal)} on the line, then step to ${fracLabel(plotAddVal)} and tap.`,
      why: `Nice plotting! You added an X at ${fracLabel(plotAddVal)} inches.`,
    },
    {
      type: "plot-x",
      chart: { kind: "lineplot", title: "Pencil Lengths", unit: "in", range: [1, 4], step: 0.25, points: [1.25, 2, 2, 2.5, 3.25] },
      targetVal: 2.75,
      prompt: "Plot one more X at 2¾ inches on the line plot!",
      say: "Find 2 and three quarters just before 3, and tap to plot an X there.",
      hint: "2¾ is one quarter-inch mark to the left of 3!",
      why: "Great! Your X sits right on 2¾ inches.",
    },
  ];

  const readPlotItems = [
    {
      type: "choose",
      chart: { kind: "lineplot", title: "Leaf Lengths", unit: "in", range: [1, 4], step: 0.25, points: basePlot.points },
      focus: [basePlot.qCountTarget],
      prompt: `How many leaves measured exactly ${fracLabel(basePlot.qCountTarget)} inches?`,
      say: `Count all the X marks stacked above ${fracLabel(basePlot.qCountTarget)} inches!`,
      choices: uniqueChoices(String(basePlot.qCount), ["1", "2", "3", "4"], rand, 3),
      answer: String(basePlot.qCount),
      hint: `Find ${fracLabel(basePlot.qCountTarget)} on the bottom line and count up how many red X marks sit above it.`,
      why: `There are ${basePlot.qCount} X marks stacked above ${fracLabel(basePlot.qCountTarget)}!`,
    },
    {
      type: "choose",
      chart: { kind: "lineplot", title: "Twig Lengths", unit: "in", range: [1, 4], step: 0.25, points: [1.5, 1.75, 2.25, 2.25, 3.5, 3.5, 3.5] },
      focus: [3.5],
      prompt: "Which length happened MOST often?",
      say: "Look for the tallest stack of X marks on this line plot!",
      choices: shuffle(["3½ in", "2¼ in", "1¾ in"], rand),
      answer: "3½ in",
      hint: "The tallest column of X marks is the measurement that happened most often.",
      why: "3½ in has 3 X marks — the tallest stack on the plot!",
    },
  ];

  return shuffle([...rulerItems, ...plotItems, ...readPlotItems], rand);
}

const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
/** An amount said out loud: "three cups", "1 cup", "600 milliliters". */
export function sayAmount(n, unit) {
  if (unit === "mL") return `${n} ${n === 1 ? "milliliter" : "milliliters"}`;
  if (unit === "L") return `${n} ${n === 1 ? "liter" : "liters"}`;
  return `${NUM_WORDS[n] ?? n} ${unitWord(n, unit)}`;
}

function genG3PourWeigh(rand) {
  const POURS = shuffle([
    { cap: 4, start: 1, step: 1, target: 3, unit: "cups" },
    { cap: 4, start: 4, step: 1, target: 2, unit: "cups" },
    { cap: 1000, start: 200, step: 100, target: 600, unit: "mL" },
    { cap: 1000, start: 900, step: 100, target: 500, unit: "mL" },
  ], rand);

  // The goal is said in words and numbers; the red Goal line only appears as a hint.
  const pourItems = POURS.slice(0, 3).map((p) => {
    const up = p.target > p.start;
    const say = up
      ? `The pitcher holds ${sayAmount(p.start, p.unit)}. Tap Pour In until it holds ${sayAmount(p.target, p.unit)}.`
      : `The pitcher holds ${sayAmount(p.start, p.unit)}. Tap Pour Out until it holds only ${sayAmount(p.target, p.unit)}.`;
    return {
      type: "pour-jug", capacity: p.cap, start: p.start, step: p.step, target: p.target, unit: p.unit,
      prompt: up
        ? `It holds ${plural(p.start, p.unit)}. Pour until the pitcher holds ${plural(p.target, p.unit)}!`
        : `Too much water! Pour out until the pitcher holds ${plural(p.target, p.unit)}.`,
      say,
      hint: `The red Goal line shows ${plural(p.target, p.unit)}. ${up ? "Pour in" : "Pour out"} until the blue water touches it!`,
      why: `Perfect pour: the pitcher holds ${plural(p.target, p.unit)}!`,
    };
  });

  const WEIGH = [
    {
      scale: { left: { e: "🍍", label: "Pineapple" }, right: { e: "⚖️", label: "500g + 500g" }, tilt: 0 },
      q: "The scale is balanced! What is the pineapple's mass?",
      say: "Two 500-gram weights balance the pineapple. How many grams is the pineapple?",
      ans: "1,000 g (1 kg)", foils: ["500 g", "2,000 g"],
      hint: "Add 500 g + 500 g!", why: "500 g + 500 g = 1,000 g, which equals 1 kilogram!",
    },
    {
      pitcher: { capacity: 500, fill: 350, unit: "mL", label: "Juice Jug" },
      q: "You need 500 mL total, and have 350 mL. How much more to pour?",
      say: "The jug holds 350 milliliters and your recipe needs 500. How many milliliters more do you need?",
      ans: "150 mL", foils: ["250 mL", "100 mL"],
      hint: "Subtract 350 from 500!", why: "350 mL + 150 mL = 500 mL!",
    },
    {
      scale: { left: { e: "🍎🍎", label: "2 Apples" }, right: { e: "⚖️", label: "300 g" }, tilt: 0 },
      q: "Two equal apples balance 300 g. What is ONE apple's mass?",
      say: "Two equal apples together weigh 300 grams. How many grams is just one apple?",
      ans: "150 g", foils: ["300 g", "600 g"],
      hint: "Split 300 g into 2 equal halves!", why: "Half of 300 g is 150 g per apple!",
    },
  ];
  const weighItems = WEIGH.map((w) => ({
    type: "choose",
    ...(w.scale ? { scale: w.scale } : { pitcher: w.pitcher }),
    prompt: w.q, say: w.say,
    choices: shuffle([w.ans, ...w.foils], rand),
    answer: w.ans, hint: w.hint, why: w.why,
  }));

  return shuffle([...pourItems, ...weighItems], rand);
}

function genG3PerimeterArea(rand) {
  const RECTS = shuffle([
    [3, 4], [2, 5], [3, 6], [4, 5], [2, 7], [4, 4], [3, 5], [2, 6],
  ], rand).slice(0, PER_LEVEL);

  return RECTS.map(([rows, cols], i) => {
    const perim = 2 * (rows + cols), area = rows * cols;
    const isPerim = i % 2 === 0;
    if (isPerim) {
      const ans = `${perim} ft`;
      return {
        type: "choose",
        rectGrid: { rows, cols, unit: "ft", mode: "perimeter" },
        prompt: `Find the PERIMETER (orange fence around this ${rows} × ${cols} ft garden)!`,
        say: `Walk all the way around the orange border: ${cols} + ${rows} + ${cols} + ${rows}. What is the perimeter?`,
        choices: uniqueChoices(ans, [`${area} ft`, `${rows + cols} ft`, `${perim + 2} ft`], rand, 3),
        answer: ans,
        hint: `Add all 4 sides around the outside: ${cols} + ${rows} + ${cols} + ${rows}!`,
        why: `${cols} + ${rows} + ${cols} + ${rows} = ${perim} ft around the outside!`,
      };
    }
    const ans = `${area} sq ft`;
    return {
      type: "choose",
      rectGrid: { rows, cols, unit: "ft", mode: "area" },
      prompt: `Find the AREA (unit squares covering this ${rows} × ${cols} ft rug)!`,
      say: `Multiply rows times columns (${rows} times ${cols}) to count the blue unit squares inside!`,
      choices: uniqueChoices(ans, [`${perim} sq ft`, `${area + cols} sq ft`, `${Math.max(4, area - rows)} sq ft`], rand, 3),
      answer: ans,
      hint: `Area = Length × Width = ${rows} rows of ${cols} squares!`,
      why: `${rows} × ${cols} = ${area} square feet covering the inside!`,
    };
  });
}

function genG4ConvertUnits(rand) {
  const CONV = [
    { leftText: "4 feet", rightText: "? inches", sub: "1 ft = 12 in", ans: "48 in", foils: ["16 in", "36 in", "24 in"], say: "One foot equals 12 inches. How many inches are in 4 feet?", hint: "Multiply 4 × 12!", why: "4 × 12 = 48 inches!" },
    { leftText: "3 yards", rightText: "? feet", sub: "1 yd = 3 ft", ans: "9 ft", foils: ["6 ft", "12 ft", "36 ft"], say: "One yard equals 3 feet. How many feet equal 3 yards?", hint: "Multiply 3 × 3!", why: "3 × 3 = 9 feet!" },
    { leftText: "5 meters", rightText: "? cm", sub: "1 m = 100 cm", ans: "500 cm", foils: ["50 cm", "5,000 cm", "105 cm"], say: "Each meter has 100 centimeters. Convert 5 meters into centimeters.", hint: "Multiply 5 × 100!", why: "5 × 100 = 500 centimeters!" },
    { leftText: "3 hours", rightText: "? minutes", sub: "1 hr = 60 min", ans: "180 min", foils: ["90 min", "120 min", "300 min"], say: "One hour has 60 minutes. How many minutes are in 3 hours?", hint: "3 × 60 = 180!", why: "3 hours × 60 = 180 minutes!" },
    { leftText: "2 pounds", rightText: "? ounces", sub: "1 lb = 16 oz", ans: "32 oz", foils: ["18 oz", "24 oz", "48 oz"], say: "One pound equals 16 ounces. How many ounces are in 2 pounds?", hint: "Double 16!", why: "2 × 16 = 32 ounces!" },
    { leftText: "3 gallons", rightText: "? quarts", sub: "1 gal = 4 qt", ans: "12 qt", foils: ["7 qt", "8 qt", "16 qt"], say: "Four quarts make 1 gallon. How many quarts fill 3 gallons?", hint: "Multiply 3 × 4!", why: "3 gallons × 4 = 12 quarts!" },
    { leftText: "4 kilograms", rightText: "? grams", sub: "1 kg = 1,000 g", ans: "4,000 g", foils: ["400 g", "40 g", "1,400 g"], say: "Kilo means 1,000! Convert 4 kilograms into grams.", hint: "Multiply 4 × 1,000!", why: "4 × 1,000 = 4,000 grams!" },
    { leftText: "2,000 mL", rightText: "? Liters", sub: "1,000 mL = 1 L", ans: "2 Liters", foils: ["20 Liters", "200 Liters", "12 Liters"], say: "How many liters equal 2,000 milliliters?", hint: "Divide 2,000 by 1,000!", why: "2,000 mL ÷ 1,000 = 2 Liters!" },
  ];
  return shuffle(CONV, rand).slice(0, PER_LEVEL).map((c) => ({
    type: "choose",
    convert: { leftText: c.leftText, rightText: c.rightText, sub: c.sub, color: "#e3f0ff", stroke: "#135ea9" },
    prompt: `Convert: ${c.leftText} = ${c.rightText}`,
    say: c.say,
    choices: uniqueChoices(c.ans, c.foils, rand, 3),
    answer: c.ans, hint: c.hint, why: c.why,
  }));
}

function genG4Schedules(rand) {
  const CHALLENGES = [
    { sh: 11, sm: 45, add: 50, text: "🏫 Recess starts at 11:45 a.m. and runs 50 minutes (crossing noon!).", q: "What time does recess end?", ans: "12:35 p.m.", foils: ["12:45 p.m.", "12:25 p.m.", "1:35 p.m."], why: "15 min gets to 12:00 p.m., then 35 more reaches 12:35 p.m.!" },
    { sh: 9, sm: 20, eh: 10, em: 55, text: "🎨 Art camp runs from 9:20 a.m. until 10:55 a.m.", q: "How long does art camp last?", ans: "1 hr 35 min", foils: ["1 hr 25 min", "1 hr 45 min", "55 min"], why: "9:20 to 10:20 is 1 hour; 10:20 to 10:55 is 35 minutes!" },
    { sh: 1, sm: 40, add: 55, text: "🚌 A field trip bus leaves at 1:40 p.m. and drives 55 minutes.", q: "When does the bus arrive?", ans: "2:35 p.m.", foils: ["2:15 p.m.", "2:45 p.m.", "2:55 p.m."], why: "20 min reaches 2:00 p.m., plus 35 more minutes = 2:35 p.m.!" },
    { sh: 4, sm: 15, eh: 6, em: 5, text: "⚽ Practice begins at 4:15 p.m. and ends at 6:05 p.m.", q: "What is the total elapsed time?", ans: "1 hr 50 min", foils: ["2 hr 10 min", "1 hr 40 min", "1 hr 10 min"], why: "4:15 → 5:15 is 1 hr, +45 min to 6:00, +5 min = 1 hr 50 min!" },
  ];
  const chooseItems = shuffle(CHALLENGES, rand).map((ch, i) => ({
    type: "choose", clock: { hour: ch.sh, minute: ch.sm }, text: ch.text,
    elapsed: { sh: ch.sh, sm: ch.sm, add: ch.add ?? (ch.eh * 60 + ch.em) - (ch.sh * 60 + ch.sm) },
    prompt: ch.q, say: `${ch.text.replace(/[^\w\s.,:?!'()-]/g, "")} ${ch.q}`,
    choices: uniqueChoices(ch.ans, ch.foils, rand, 3),
    answer: ch.ans,
    hint: "Jump to the next whole hour first, then add the leftover minutes!",
    why: ch.why,
  }));

  const SETS = [
    { sh: 11, sm: 30, add: 45, label: "11:30", targetLabel: "12:15" },
    { sh: 2, sm: 45, add: 40, label: "2:45", targetLabel: "3:25" },
  ];
  const setItems = SETS.map((s) => {
    const end = addMinutes(s.sh, s.sm, s.add);
    return {
      type: "set-clock", startHour: s.sh, startMinute: s.sm, targetHour: end.hour, targetMinute: end.minute, stepMinutes: 5,
      prompt: `Start at ${s.label}. Advance ${s.add} minutes across the hour!`,
      say: `The clock starts at ${s.label}. Move forward ${s.add} minutes to the new time.`,
      hint: `Count ${60 - s.sm} minutes to hit the hour, then ${s.add - (60 - s.sm)} minutes past it.`,
      why: `${s.label} + ${s.add} minutes lands at ${s.targetLabel}!`,
    };
  });

  return shuffle([...chooseItems.slice(0, 4), ...setItems], rand);
}

function genG5BudgetChange(rand) {
  const DEALS = [
    { a: 375, b: 250, paid: 1000, text: "🛒 Juice ($3.75) + Apples ($2.50), paid with a $10 bill." },
    { a: 460, b: 385, paid: 1000, text: "🥪 Lunch ($4.60) + Drink ($3.85), paid with $10.00." },
    { a: 625, b: 750, paid: 2000, text: "🎨 Notebook ($6.25) + Markers ($7.50), paid with $20.00." },
    { a: 540, b: 290, paid: 1000, text: "📚 Book ($5.40) + Pen ($2.90), paid with $10.00." },
  ];
  const chooseItems = shuffle(DEALS, rand).slice(0, 3).map((d) => {
    const total = d.a + d.b, change = d.paid - total;
    const ans = formatMoney(change);
    return {
      type: "choose", text: d.text,
      prompt: "What is your exact change?",
      say: `First add ${formatMoney(d.a)} plus ${formatMoney(d.b)}, then subtract from ${formatMoney(d.paid)} for change!`,
      choices: uniqueChoices(ans, [formatMoney(total), formatMoney(change + 100), formatMoney(Math.max(50, change - 50))], rand, 3),
      answer: ans,
      hint: `${formatMoney(d.a)} + ${formatMoney(d.b)} = ${formatMoney(total)}. Now subtract from ${formatMoney(d.paid)}!`,
      why: `Total is ${formatMoney(total)}, so ${formatMoney(d.paid)} − ${formatMoney(total)} = ${ans} change!`,
    };
  });

  const TRAYS = shuffle([
    { target: 385, label: "$3.85 change" },
    { target: 640, label: "$6.40 change" },
    { target: 1125, label: "$11.25 change" },
    { target: 765, label: "$7.65 change" },
  ], rand).slice(0, 3);
  const buildItems = TRAYS.map((t, i) => ({
    type: "build-money", targetCents: t.target, denominations: ["penny", "nickel", "dime", "quarter", "d1", "d5", "d10"],
    prompt: `Count out ${formatMoney(t.target)} change using bills and coins!`,
    say: i === 0 ? `Build ${formatMoney(t.target)} in the change tray.` : `Make exact change of ${formatMoney(t.target)} below.`,
    hint: `Start with the biggest bills ($10, $5, $1), then add quarters, dimes, nickels, and pennies.`,
    why: `Exact change made: ${formatMoney(t.target)}!`,
  }));

  return shuffle([...chooseItems, ...buildItems], rand);
}

function genG5FracLinePlot(rand) {
  const PLOTS = [
    {
      title: "Rainwater Samples", unit: "in", range: [1, 3], step: 0.25,
      points: [1.25, 1.25, 1.5, 1.75, 2.25, 2.25, 2.75],
      diffAns: "1½ in", diffFoils: ["1¼ in", "1¾ in", "2 in"], diffHint: "Subtract shortest (1¼) from longest (2¾)!", diffWhy: "2¾ − 1¼ = 1½ inches!",
      sumTarget: 2.25, sumCount: 2, sumAns: "4½ in", sumFoils: ["4 in", "2¼ in", "5 in"], sumHint: "Two samples at 2¼: add 2¼ + 2¼!", sumWhy: "2¼ + 2¼ = 4½ inches!",
      plotTarget: 1.75, gtVal: 1.5, gtAns: "4", gtFoils: ["3", "5", "2"],
    },
    {
      title: "Shell Widths", unit: "in", range: [1, 3], step: 0.25,
      points: [1.5, 1.5, 1.75, 2, 2.5, 2.5, 2.5],
      diffAns: "1 in", diffFoils: ["½ in", "1¼ in", "1½ in"], diffHint: "Subtract shortest (1½) from longest (2½)!", diffWhy: "2½ − 1½ = 1 inch!",
      sumTarget: 1.5, sumCount: 2, sumAns: "3 in", sumFoils: ["2½ in", "3½ in", "1½ in"], sumHint: "Two shells measure 1½ in: add 1½ + 1½!", sumWhy: "1½ + 1½ = 3 inches total!",
      plotTarget: 2.25, gtVal: 1.75, gtAns: "4", gtFoils: ["3", "5", "2"],
    },
  ];
  const p = PLOTS[Math.floor(rand() * PLOTS.length)];
  return shuffle([
    {
      type: "choose",
      chart: { kind: "lineplot", title: p.title, unit: p.unit, range: p.range, step: p.step, points: p.points },
      focus: [Math.min(...p.points), Math.max(...p.points)],
      prompt: "Find the difference between the longest and shortest measurements!",
      say: "Look at the rightmost X minus the leftmost X on the line plot. What is the difference?",
      choices: uniqueChoices(p.diffAns, p.diffFoils, rand, 3),
      answer: p.diffAns, hint: p.diffHint, why: p.diffWhy,
    },
    {
      type: "choose",
      chart: { kind: "lineplot", title: p.title, unit: p.unit, range: p.range, step: p.step, points: p.points },
      focus: [p.sumTarget],
      prompt: `What is the TOTAL of all ${p.sumCount} measurements at ${fracLabel(p.sumTarget)} in?`,
      say: `Add together every X stacked above ${fracLabel(p.sumTarget)} inches!`,
      choices: uniqueChoices(p.sumAns, p.sumFoils, rand, 3),
      answer: p.sumAns, hint: p.sumHint, why: p.sumWhy,
    },
    {
      type: "choose",
      chart: { kind: "lineplot", title: p.title, unit: p.unit, range: p.range, step: p.step, points: p.points },
      focus: [...new Set(p.points.filter((v) => v > p.gtVal))],
      prompt: `How many measurements are GREATER than ${fracLabel(p.gtVal)} in?`,
      say: `Count all X marks strictly to the right of ${fracLabel(p.gtVal)} inches.`,
      choices: uniqueChoices(p.gtAns, p.gtFoils, rand, 3),
      answer: p.gtAns, hint: `Do not count ${fracLabel(p.gtVal)} itself — count only X marks farther right!`,
      why: `There are ${p.gtAns} measurements greater than ${fracLabel(p.gtVal)} inches!`,
    },
    {
      type: "plot-x",
      chart: { kind: "lineplot", title: p.title, unit: p.unit, range: p.range, step: p.step, points: p.points },
      targetVal: p.plotTarget,
      prompt: `Plot a new X at ${fracLabel(p.plotTarget)} inches!`,
      say: `Tap on the line plot above ${fracLabel(p.plotTarget)} to add one more measurement.`,
      hint: `Locate ${Math.floor(p.plotTarget)}, step right to ${fracLabel(p.plotTarget)}, and tap.`,
      why: `Added X right on ${fracLabel(p.plotTarget)} in!`,
    },
    {
      type: "choose",
      chart: { kind: "lineplot", title: "Bead Sizes", unit: "in", range: [0, 1], step: 0.125, points: [0.125, 0.25, 0.375, 0.375, 0.625, 0.75] },
      focus: [0.375],
      prompt: "Look at the eighths plot (⅛..1). Which size occurred twice?",
      say: "Look for two stacked X marks on this eighth-inch line plot!",
      choices: shuffle(["⅜ in", "⅝ in", "¼ in"], rand),
      answer: "⅜ in",
      hint: "Find the only column with 2 red X marks between ¼ and ½.",
      why: "⅜ inch has 2 stacked X marks!",
    },
    {
      type: "choose",
      chart: { kind: "lineplot", title: "Seed Sprouts", unit: "in", range: [1, 3], step: 0.25, points: [1.25, 1.5, 1.5, 2.25, 2.25, 2.25] },
      focus: [2.25],
      prompt: "Add ALL three 2¼-inch sprouts together!",
      say: "Three X marks sit at 2 and one quarter inches. Add them all together!",
      choices: shuffle(["6¾ in", "6¼ in", "7 in"], rand),
      answer: "6¾ in",
      hint: "Add whole parts (2+2+2 = 6) and quarter parts (¼+¼+¼ = ¾)!",
      why: "2¼ × 3 = 6¾ inches total!",
    },
  ], rand);
}

// ───────── LEVELS (23 levels across Grades K–5) ─────────

export const LEVELS = [
  // Grades K–1 · Level 1
  {
    id: "k1-compare", grade: 1, level: 1, title: "Longer, Taller & Heavier", emoji: "📏",
    teach: "Line objects up at the same <b>start line</b> to compare length, or watch which side sinks lower on a <b>balance scale</b>!",
    say: "Let's compare lengths and weights! Longer things stretch farther from the start line, and heavier things push a scale pan down!",
    example: `<div class="ex-line">Longer → stretches farther · Heavier → sinks lower!</div>`,
    gen: genK1Compare,
  },
  {
    id: "k1-coins-intro", grade: 1, level: 1, title: "Meet the Coins", emoji: "🪙",
    introCards: INTRO_COINS,
    teach: "Tap every coin and bill card to learn its look, name, and value before matching!",
    say: "Welcome to Meet the Coins! Tap each coin or bill card below to learn what it looks like and how much it is worth.",
    example: `<div class="ex-line">1¢ Penny · 5¢ Nickel · 10¢ Dime · 25¢ Quarter</div>`,
    gen: (rand) => genIntroMatch(INTRO_COINS, rand),
  },
  {
    id: "k1-coins-count", grade: 1, level: 1, title: "Count Coins (1¢, 5¢, 10¢)", emoji: "💰",
    teach: "Count <b>dimes by 10s</b>, <b>nickels by 5s</b>, and <b>pennies by 1s</b> — biggest coins first!",
    say: "Let's count dimes, nickels, and pennies! Start with 10-cent dimes, then add 5-cent nickels and 1-cent pennies.",
    example: `<div class="ex-line">10¢ + 10¢ + 5¢ + 1¢ = <b>26¢</b></div>`,
    gen: genK1CoinsCount,
  },
  // Grades K–1 · Level 2
  {
    id: "k1-clock-intro", grade: 1, level: 2, title: "Meet the Clock", emoji: "🕐",
    introCards: INTRO_CLOCK,
    teach: "The <b>short red hand</b> points to the hour; the <b>long blue hand</b> counts minutes (up at 12 = <b>:00</b>, down at 6 = <b>:30</b>)!",
    say: "Let's meet the analog clock! Tap each clock card to see how the short red hour hand and long blue minute hand work.",
    example: `<div class="ex-line">Up to 12 = :00 · Down to 6 = :30</div>`,
    gen: (rand) => genIntroMatch(INTRO_CLOCK, rand),
  },
  {
    id: "k1-clock-half", grade: 1, level: 2, title: "Hours & Half-Hours", emoji: "🕰️",
    teach: "Blue hand straight up at 12 means <b>o'clock (:00)</b>; straight down at 6 means <b>half past (:30)</b>.",
    say: "Read and set o'clock and half-past times! Watch the short red hour hand and long blue minute hand.",
    example: `<div class="ex-line">3:00 (on 12) · 3:30 (on 6)</div>`,
    gen: genK1ClockHalf,
  },
  {
    id: "k1-calendar-tally", grade: 1, level: 2, title: "Calendars & Tallies", emoji: "📅",
    teach: "Follow a calendar date straight up to its day of the week, and count slashed tally bundles as <b>5</b>!",
    say: "Let's read calendars and tally charts! Remember each tally bundle with a diagonal line counts as 5.",
    example: `<div class="ex-line">Slashed bundle = 5 · Next row down = +7 days</div>`,
    gen: genK1CalendarTally,
  },
  // 2nd Grade · Level 1
  {
    id: "g2-ruler-intro", grade: 2, level: 1, title: "Meet the Ruler", emoji: "🔎",
    introCards: INTRO_RULER,
    teach: "Always line up your object at the <b>red 0 mark</b> — <b>NOT the blank end edge</b> of the ruler!",
    say: "Before you measure, learn the golden ruler rule: line up at zero, never the plastic edge! Tap each card to explore.",
    example: `<div class="ex-line">Line up at <b>0 ✓</b> · Watch out for the edge trap!</div>`,
    gen: (rand) => genIntroMatch(INTRO_RULER, rand),
  },
  {
    id: "g2-ruler-measure", grade: 2, level: 1, title: "Measure with a Ruler", emoji: "📏",
    teach: "Slide the ruler first so <b>0</b> lines up cleanly with the left end, then read inches (<b>in</b>) or centimeters (<b>cm</b>).",
    say: "First slide the ruler until zero lines up with the start of the picture, then tap how long it measures!",
    example: `<div class="ex-line">Slide ⬅️➡️ to <b>0 mark ✓</b> → read tip!</div>`,
    gen: genG2RulerMeasure,
  },
  {
    id: "g2-coins-dollar", grade: 2, level: 1, title: "Coins up to $1.00", emoji: "💵",
    teach: "Add <b>25¢ quarters</b> first (25, 50, 75), then count on dimes (+10), nickels (+5), and pennies (+1).",
    say: "Count mixed quarters, dimes, nickels, and pennies up to one dollar, and build amounts on the coin tray!",
    example: `<div class="ex-line">25¢ + 25¢ + 10¢ + 5¢ = <b>65¢</b></div>`,
    gen: genG2CoinsDollar,
  },
  // 2nd Grade · Level 2
  {
    id: "g2-clock-5min", grade: 2, level: 2, title: "Time to 5 Minutes", emoji: "⏰",
    teach: "Count by <b>5s</b> around the clock for the minute hand (1 → :05, 3 → :15, 6 → :30), and tell <b>a.m.</b> morning from <b>p.m.</b> afternoon/night.",
    say: "Count by fives around the clock numbers for the long minute hand, and choose morning a.m. or afternoon p.m.!",
    example: `<div class="ex-line">4 on 5s = :20 · Breakfast = a.m. · Bed = p.m.</div>`,
    gen: genG2Clock5Min,
  },
  {
    id: "g2-graphs", grade: 2, level: 2, title: "Picture & Bar Graphs", emoji: "📊",
    teach: "Always check the <b>picture scale key</b> or the <b>numbers on the side</b> of a bar graph before counting!",
    say: "Read the key and number scale carefully to answer questions about picture graphs and bar graphs.",
    example: `<div class="ex-line">Key: ⭐ = 2 → 4 stars = <b>8</b>!</div>`,
    gen: genG2Graphs,
  },
  {
    id: "g2-estimate-unit", grade: 2, level: 2, title: "Pick the Unit & Tool", emoji: "📐",
    teach: "Small items use <b>inches</b> or <b>centimeters</b>; big rooms, cars, and fields use <b>feet, yards,</b> or <b>meters</b>.",
    say: "Picture the real size of each object and choose the best unit or measuring tool!",
    example: `<div class="ex-line">Ladybug → cm · Pencil → in · Door → ft</div>`,
    gen: genG2EstimateUnit,
  },
  // 3rd Grade · Level 1
  {
    id: "g3-elapsed-time", grade: 3, level: 1, title: "Exact & Elapsed Time", emoji: "⏱️",
    teach: "Count by 5s, then 1s for <b>exact minutes</b>, and jump ahead cleanly on the clock to find finishing times.",
    say: "Tell time to the exact minute and jump forward on the clock to solve elapsed-time problems!",
    example: `<div class="ex-line">3:15 + 35 min = <b>3:50</b></div>`,
    gen: genG3ElapsedTime,
  },
  {
    id: "g3-money-change", grade: 3, level: 1, title: "Dollars & Making Change", emoji: "🧾",
    teach: "Make change by <b>counting up</b> from the price to the next whole dollar, then up to what you paid!",
    say: "Count up from the price to find your change, and build dollar-and-coin totals in the tray.",
    example: `<div class="ex-line">$5.00 − $3.65 = <b>$1.35</b> change</div>`,
    gen: genG3MoneyChange,
  },
  {
    id: "g3-quarter-lineplot", grade: 3, level: 1, title: "Quarter-Inches & Plots", emoji: "✖️",
    teach: "Split each inch into <b>fourths</b> (<b>¼, ½, ¾</b>), align your ruler on 0, and stack <b>X</b> marks on a line plot!",
    say: "Measure to the nearest quarter-inch and plot or read stacked X marks on fractional line plots!",
    example: `<div class="ex-line">¼ · ½ (two fourths) · ¾</div>`,
    gen: genG3QuarterLinePlot,
  },
  // 3rd Grade · Level 2
  {
    id: "g3-liquid-mass-intro", grade: 3, level: 2, title: "Meet Liquids & Mass", emoji: "🧪",
    introCards: INTRO_LIQUID_MASS,
    teach: "Explore <b>milliliters, liters, cups, quarts, grams,</b> and <b>kilograms</b> with measuring pitchers and scales!",
    say: "Let's meet liquid volume and mass units before pouring and weighing! Tap each card to see how big each unit is.",
    example: `<div class="ex-line">1,000 mL = 1 L · 1,000 g = 1 kg · 4 cups = 1 qt</div>`,
    gen: (rand) => genIntroMatch(INTRO_LIQUID_MASS, rand),
  },
  {
    id: "g3-pour-weigh", grade: 3, level: 2, title: "Pour, Weigh & Solve", emoji: "⚖️",
    teach: "Add or pour out liquid until the pitcher holds the exact amount, and solve balanced mass problems in <b>g</b> and <b>kg</b>!",
    say: "Pour water to match the target amount in the pitcher, and solve balance-scale mass puzzles!",
    example: `<div class="ex-line">500 g + 500 g = 1,000 g (1 kg)</div>`,
    gen: genG3PourWeigh,
  },
  {
    id: "g3-perimeter-area", grade: 3, level: 2, title: "Perimeter & Area", emoji: "🟩",
    teach: "<b>Perimeter</b> adds all 4 sides around the <b>outside edge</b>; <b>Area</b> multiplies <b>rows × columns</b> inside!",
    say: "Remember: perimeter walks the outside border, while area counts unit squares filling the inside!",
    example: `<div class="ex-line">3 × 4: Perimeter = 14 ft · Area = 12 sq ft</div>`,
    gen: genG3PerimeterArea,
  },
  // Grades 4–5 · Level 1
  {
    id: "g4-convert-intro", grade: 4, level: 1, title: "Meet Unit Conversions", emoji: "🔄",
    introCards: INTRO_CONVERT,
    teach: "Learn the key conversion rules connecting inches/feet/yards, cm/m, min/hr, qt/gal, oz/lb, and g/kg!",
    say: "Let's explore how bigger and smaller units trade cleanly before converting numbers! Tap every card below.",
    example: `<div class="ex-line">12 in = 1 ft · 60 min = 1 hr · 1,000 g = 1 kg</div>`,
    gen: (rand) => genIntroMatch(INTRO_CONVERT, rand),
  },
  {
    id: "g4-convert-units", grade: 4, level: 1, title: "Convert Units", emoji: "🔁",
    teach: "Changing from a <b>larger unit</b> to a <b>smaller unit</b> makes MORE pieces — multiply by 12, 3, 4, 16, 60, 100, or 1,000!",
    say: "Use the conversion clue on each card to convert between feet, inches, meters, centimeters, hours, pounds, and liters!",
    example: `<div class="ex-line">4 ft × 12 = <b>48 in</b></div>`,
    gen: genG4ConvertUnits,
  },
  {
    id: "g4-schedules", grade: 4, level: 1, title: "Schedules & Elapsed Time", emoji: "🗓️",
    teach: "When crossing an hour or noon, jump to the <b>next whole hour</b> first, then add the leftover minutes!",
    say: "Bridge cleanly across whole hours and noon to solve schedules and elapsed-time challenges!",
    example: `<div class="ex-line">11:45 → 12:00 (15m) → 12:35 (50m total)</div>`,
    gen: genG4Schedules,
  },
  // Grades 4–5 · Level 2
  {
    id: "g5-budget-change", grade: 4, level: 2, title: "Prices, Totals & Change", emoji: "🛒",
    teach: "Add decimal prices line-by-line (100¢ = $1.00), then subtract from $10 or $20 to make exact change!",
    say: "Add the decimal prices together first, then find or build the exact change back!",
    example: `<div class="ex-line">$3.75 + $2.50 = $6.25 · Change from $10 = $3.75</div>`,
    gen: genG5BudgetChange,
  },
  {
    id: "g5-frac-lineplot", grade: 4, level: 2, title: "Fractional Line Plots", emoji: "📈",
    teach: "Read, plot, add, and find differences across <b>⅛, ¼, and ½ inch</b> measurements stacked on line plots!",
    say: "Answer multi-step fraction questions from stacked X marks on eighth- and quarter-inch line plots!",
    example: `<div class="ex-line">2¼ + 2¼ = 4½ · 2¾ − 1¼ = 1½</div>`,
    gen: genG5FracLinePlot,
  },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id);

export function makeLevel(level, seed = Date.now()) {
  const rand = seeded(seed);
  return level.gen(rand).slice(0, PER_LEVEL);
}

// 3 stars only with no mistakes (matches giant sticker); any mistake: mini sticker.
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);

/** Levels where every question has numbers to work out (money, time, conversion, multi-step): the ✏️ scratchpad is always offered. */
const SCRATCH_LEVELS = new Set(["g2-coins-dollar", "g3-elapsed-time", "g3-money-change", "g3-pour-weigh", "g3-perimeter-area", "g4-convert-units", "g4-schedules", "g5-budget-change", "g5-frac-lineplot"]);

/** Does this question get the ✏️ scratchpad? Grades 2-5 only (never the Montessori intros) and only with numbers to work with. */
export function wantsScratch(level, q) {
  if (!level || !q || level.grade < 2 || level.introCards || q.type === "intro-match") return false;
  if (SCRATCH_LEVELS.has(level.id)) return true;
  return /\d/.test(`${q.prompt} ${q.text ?? ""} ${q.say ?? ""}`);
}
