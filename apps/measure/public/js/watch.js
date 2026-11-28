// Worked-example animations for every Measurement, Time & Money level (#/watch/:id and inside lesson cards).
import { levelById, LEVELS } from "./measure.js";
import {
  compareLengthSvg, rulerSvg, clockSvg, coinSvg, moneyTraySvg,
  scaleSvg, pitcherSvg, chartSvg, calendarSvg, rectGridSvg, conversionCardSvg,
} from "./measure-svg.js";
import { speak, stop, isVoiceActive } from "./kit/tts.js";
import { esc } from "./kit/ui.js";

const card = (badge, html, note = "") =>
  `<div class="demo-frame"><span class="demo-badge">${esc(badge)}</span><div class="demo-art">${html}</div>${note ? `<div class="demo-note">${esc(note)}</div>` : ""}</div>`;

export const DEMOS = {
  "k1-compare": {
    ms: 2100,
    steps: [
      {
        caption: "1. Line both objects up on the same dashed start line.",
        render: () => card("Length", compareLengthSvg({ kind: "pencil", label: "Pencil", units: 6 }, { kind: "crayon", label: "Crayon", units: 3.5 })),
      },
      {
        caption: "2. The Pencil stretches farther right — the Pencil is LONGER!",
        render: () => card("Pencil is Longer ✓", compareLengthSvg({ kind: "pencil", label: "Pencil ✓", units: 6 }, { kind: "crayon", label: "Crayon", units: 3.5 }), "Crayon stops sooner → shorter"),
      },
      {
        caption: "3. On a balance scale, heavier things push their pan DOWN lower!",
        render: () => card("Heavier Sinks Down", scaleSvg({ left: { e: "🍉", label: "Watermelon" }, right: { e: "🍓", label: "Strawberry" }, tilt: -1 }), "🍉 Watermelon sinks = heavier"),
      },
    ],
  },

  "k1-coins-intro": {
    ms: 2000,
    steps: [
      { caption: "1. Penny = copper brown, worth 1¢.", render: () => card("Penny · 1¢", coinSvg("penny", { size: 96 }), "Count pennies by 1s") },
      { caption: "2. Nickel = thick silver, worth 5¢.", render: () => card("Nickel · 5¢", coinSvg("nickel", { size: 96 }), "Count nickels by 5s") },
      { caption: "3. Dime = smallest silver coin, worth 10¢!", render: () => card("Dime · 10¢", coinSvg("dime", { size: 96 }), "Tiny size, big value!") },
      { caption: "4. Quarter = biggest silver coin, worth 25¢ (4 make $1)!", render: () => card("Quarter · 25¢", coinSvg("quarter", { size: 96 }), "Count 25, 50, 75, $1") },
    ],
  },

  "k1-coins-count": {
    ms: 1850,
    steps: [
      { caption: "1. Start with the biggest coin value: 2 dimes = 10¢, 20¢!", render: () => card("Count 10s", moneyTraySvg({ dime: 2 }), "10¢ + 10¢ = 20¢") },
      { caption: "2. Next add the 5¢ nickel: 20¢ + 5¢ = 25¢.", render: () => card("Add +5¢", moneyTraySvg({ dime: 2, nickel: 1 }), "20¢ + 5¢ = 25¢") },
      { caption: "3. Count on the 1¢ pennies: 26¢, 27¢ total!", render: () => card("Total = 27¢ ✓", moneyTraySvg({ dime: 2, nickel: 1, penny: 2 }), "Biggest coins first → 27¢") },
    ],
  },

  "k1-clock-intro": {
    ms: 2100,
    steps: [
      { caption: "1. The SHORT RED hand points to the hour (3).", render: () => card("Hour Hand = Red", clockSvg({ hour: 3, minute: 0, showMinuteRing: true }), "3 o'clock (3:00)") },
      { caption: "2. Long BLUE hand up at 12 means :00 (o'clock).", render: () => card("Up at 12 = :00", clockSvg({ hour: 9, minute: 0, showMinuteRing: true }), "9 o'clock (9:00)") },
      { caption: "3. Long BLUE hand down at 6 means :30 (half past).", render: () => card("Down at 6 = :30", clockSvg({ hour: 6, minute: 30, showMinuteRing: true }), "Red hand sits halfway past 6") },
    ],
  },

  "k1-clock-half": {
    ms: 1950,
    steps: [
      { caption: "1. At 2:00, short red is on 2 and long blue points up to 12.", render: () => card("2:00 (o'clock)", clockSvg({ hour: 2, minute: 0 })) },
      { caption: "2. Spin 30 minutes forward: blue points down to 6 → 2:30!", render: () => card("2:30 (Half Past)", clockSvg({ hour: 2, minute: 30 }), "Red hand moves halfway to 3") },
      { caption: "3. Keep going to 4:00: short red on 4, long blue on 12!", render: () => card("4:00 ✓", clockSvg({ hour: 4, minute: 0 }), "Short red = hour, long blue = minutes") },
    ],
  },

  "k1-calendar-tally": {
    ms: 2100,
    steps: [
      { caption: "1. Find Oct 10 (🎂) and look straight up to its column: Tu (Tuesday).", render: () => card("Follow Column Up", calendarSvg({ month: "October", startDow: 2, days: 31, highlightDay: 10, markDays: [{ day: 10, emoji: "🎂" }] })) },
      { caption: "2. Jump straight down 1 row to Oct 17 (🎪) → +7 days (1 full week)!", render: () => card("Next Row = +7 Days", calendarSvg({ month: "October", startDow: 2, days: 31, highlightDay: 17, markDays: [{ day: 10, emoji: "🎂" }, { day: 17, emoji: "🎪" }] })) },
      { caption: "3. A slashed tally bundle counts as 5: 5 + 2 singles = 7!", render: () => card("Tally Bundle = 5", chartSvg({ kind: "tally", title: "Favorite Pets", rows: [{ label: "Dogs", count: 7 }, { label: "Cats", count: 5 }, { label: "Fish", count: 3 }] })) },
    ],
  },

  "g2-ruler-intro": {
    ms: 2100,
    steps: [
      { caption: "1. WATCH OUT! Lining up at the plastic edge puts 0 in the wrong spot!", render: () => card("Edge Trap ❌", rulerSvg({ unit: "in", max: 5, obj: { kind: "key", units: 3 }, rulerOffset: 1, showZeroGuide: true }), "Key tip reads wrong when 0 is misaligned") },
      { caption: "2. Slide the ruler so the red 0 MARK lines up with the start!", render: () => card("Start at 0 ✓", rulerSvg({ unit: "in", max: 5, obj: { kind: "key", units: 3 }, rulerOffset: 0, showZeroGuide: true }), "0 mark lines up with left edge") },
      { caption: "3. Now read the right tip cleanly: 3 inches! (Or compare smaller cm.)", render: () => card("Read Tip = 3 in", rulerSvg({ unit: "in", max: 5, obj: { kind: "key", units: 3 }, rulerOffset: 0, showAnswer: true })) },
    ],
  },

  "g2-ruler-measure": {
    ms: 1950,
    steps: [
      { caption: "1. Wait — the ruler is misaligned! Zero is NOT at the crayon's start.", render: () => card("Slide Ruler First", rulerSvg({ unit: "in", max: 6, obj: { kind: "crayon", units: 4 }, rulerOffset: 1, showZeroGuide: true })) },
      { caption: "2. Slide ⬅️ left until the green \"0 mark ✓\" badge appears!", render: () => card("Aligned at 0 ✓", rulerSvg({ unit: "in", max: 6, obj: { kind: "crayon", units: 4 }, rulerOffset: 0, showZeroGuide: true })) },
      { caption: "3. Look above the crayon's right tip: it ends at 4 inches!", render: () => card("Measures 4 in ✓", rulerSvg({ unit: "in", max: 6, obj: { kind: "crayon", units: 4 }, rulerOffset: 0, showAnswer: true })) },
    ],
  },

  "g2-coins-dollar": {
    ms: 1850,
    steps: [
      { caption: "1. Count quarters by 25s first: 25¢, 50¢!", render: () => card("Quarters = 50¢", moneyTraySvg({ quarter: 2 }), "25¢ + 25¢ = 50¢") },
      { caption: "2. Count on dimes by 10s: 50¢ → 60¢.", render: () => card("Add Dime → 60¢", moneyTraySvg({ quarter: 2, dime: 1 }), "50¢ + 10¢ = 60¢") },
      { caption: "3. Add nickel (+5) and 2 pennies (+2) → 67¢!", render: () => card("Total = 67¢ ✓", moneyTraySvg({ quarter: 2, dime: 1, nickel: 1, penny: 2 })) },
    ],
  },

  "g2-clock-5min": {
    ms: 1950,
    steps: [
      { caption: "1. Every big number around the clock counts 5 more minutes for the blue hand.", render: () => card("Count by 5s", clockSvg({ hour: 3, minute: 0, showMinuteRing: true }), "1 → :05 · 2 → :10 · 3 → :15") },
      { caption: "2. Short red past 3, long blue on 4 (4 × 5 = 20) → 3:20!", render: () => card("3:20", clockSvg({ hour: 3, minute: 20, showMinuteRing: true }), "Blue on 4 = :20") },
      { caption: "3. Morning times (breakfast, school bell) use a.m.; afternoon/bedtime use p.m.!", render: () => card("a.m. vs p.m.", clockSvg({ hour: 8, minute: 45, showMinuteRing: true }), "9 × 5 = 45 → 8:45") },
    ],
  },

  "g2-graphs": {
    ms: 2100,
    steps: [
      { caption: "1. On a picture graph, ALWAYS read the Key at the bottom first!", render: () => card("Key: ⭐ = 2", chartSvg({ kind: "picture", title: "Books Read", icon: "⭐", scale: 2, unit: "books", rows: [{ label: "Mia", value: 6 }, { label: "Leo", value: 8 }, { label: "Sam", value: 4 }] }), "Leo has 4 stars × 2 = 8 books") },
      { caption: "2. On a bar graph, follow the bar's top edge over to the numbered scale.", render: () => card("Follow Bar to Scale", chartSvg({ kind: "bar", title: "Sunny Days", scale: 2, rows: [{ label: "June", value: 6 }, { label: "July", value: 10 }, { label: "Aug", value: 4 }] }), "July reaches 10 days") },
      { caption: "3. To compare two bars (how many MORE), subtract: 10 − 6 = 4 more!", render: () => card("Compare: 10 − 6 = 4", chartSvg({ kind: "bar", title: "Sunny Days", scale: 2, rows: [{ label: "June", value: 6 }, { label: "July", value: 10 }, { label: "Aug", value: 4 }] })) },
    ],
  },

  "g2-estimate-unit": {
    ms: 2100,
    steps: [
      { caption: "1. Tiny things (paperclips, bugs, crayons) are measured in cm or inches.", render: () => card("Small → in or cm", rulerSvg({ unit: "cm", max: 10, obj: { kind: "leaf", units: 6 }, rulerOffset: 0, showAnswer: true }), "1 cm ≈ pinkie fingernail") },
      { caption: "2. Big rooms, doors, cars, and fields use feet, yards, or meters!", render: () => card("Big → ft, yd, or m", conversionCardSvg({ leftText: "Door Height", rightText: "≈ 7 feet", sub: "1 yard = 3 feet", color: "#dcf6e6", stroke: "#137a41" })) },
      { caption: "3. Centimeters take MORE units than inches because each cm is smaller.", render: () => card("cm < inch", conversionCardSvg({ leftText: "1 inch", rightText: "≈ 2.5 cm", sub: "Smaller unit = bigger count!", color: "#e3f0ff", stroke: "#135ea9" })) },
    ],
  },

  "g3-elapsed-time": {
    ms: 1950,
    steps: [
      { caption: "1. Start clock shows 3:15 (blue hand on 3).", render: () => card("Start · 3:15", clockSvg({ hour: 3, minute: 15, showMinuteRing: true })) },
      { caption: "2. Count +20 minutes by 5s (4 → :20, 5 → :25, 6 → :30, 7 → :35).", render: () => card("+20 min → 3:35", clockSvg({ hour: 3, minute: 35, showMinuteRing: true })) },
      { caption: "3. Jump +15 more minutes to 3:50 (blue on 10): 35 minutes elapsed!", render: () => card("Finish · 3:50 ✓", clockSvg({ hour: 3, minute: 50, showMinuteRing: true }), "3:15 + 35 min = 3:50") },
    ],
  },

  "g3-money-change": {
    ms: 1950,
    steps: [
      { caption: "1. Storybook costs $3.65 and you pay with a $5.00 bill.", render: () => card("Pay $5.00", moneyTraySvg({ d5: 1 }), "Cost = $3.65") },
      { caption: "2. Count UP from $3.65 to $4.00: +1 quarter (25¢) +1 dime (10¢) = +35¢!", render: () => card("$3.65 → $4.00 (+35¢)", moneyTraySvg({ quarter: 1, dime: 1 }), "Reached $4.00!") },
      { caption: "3. Add $1 more to reach $5.00! Total change = $1.35.", render: () => card("Change = $1.35 ✓", moneyTraySvg({ d1: 1, quarter: 1, dime: 1 }), "$3.65 + $1.35 = $5.00") },
    ],
  },

  "g3-quarter-lineplot": {
    ms: 1950,
    steps: [
      { caption: "1. Split each inch into 4 equal fourths: ¼, ½, ¾!", render: () => card("Quarter-Inches", rulerSvg({ unit: "in", max: 4, quarterTicks: true, obj: { kind: "leaf", units: 2.25 }, rulerOffset: 0, showAnswer: true })) },
      { caption: "2. Plot each measurement by stacking a red X directly above its mark.", render: () => card("Before Plotting", chartSvg({ kind: "lineplot", title: "Leaf Lengths", unit: "in", range: [1, 4], step: 0.25, points: [1.5, 2.25, 2.25, 3] })) },
      { caption: "3. Added one more leaf at 2¼ in — now 2¼ has the tallest stack (3 Xs)!", render: () => card("Added X at 2¼ ✓", chartSvg({ kind: "lineplot", title: "Leaf Lengths", unit: "in", range: [1, 4], step: 0.25, points: [1.5, 2.25, 2.25, 2.25, 3] })) },
    ],
  },

  "g3-liquid-mass-intro": {
    ms: 2100,
    steps: [
      { caption: "1. Tiny medicine drops use mL; 4 measuring cups fill 1 quart!", render: () => card("250 mL & Cups", pitcherSvg({ capacity: 4, fill: 2, unit: "cups", label: "2 cups (1 pt)" })) },
      { caption: "2. A big sports water bottle holds about 1 Liter = 1,000 milliliters!", render: () => card("1 Liter = 1,000 mL", pitcherSvg({ capacity: 2, fill: 1, unit: "L", label: "1 Liter" })) },
      { caption: "3. Paperclips weigh ~1 gram (g); heavy pineapples weigh ~1 kilogram (1,000 g)!", render: () => card("Mass: g vs kg", scaleSvg({ left: { e: "🍍", label: "1 kg" }, right: { e: "📎", label: "1 g clip" }, tilt: -1 })) },
    ],
  },

  "g3-pour-weigh": {
    ms: 1900,
    steps: [
      { caption: "1. Pitcher starts at 1 cup; the red dashed Goal line is at 3 cups.", render: () => card("Goal = 3 cups", pitcherSvg({ capacity: 4, fill: 1, target: 3, unit: "cups" })) },
      { caption: "2. Pour +1 cup twice until the water level reaches the red Goal line!", render: () => card("Reached 3 cups ✓", pitcherSvg({ capacity: 4, fill: 3, target: 3, unit: "cups" })) },
      { caption: "3. When a balance scale is level, BOTH sides have equal mass (500 g + 500 g = 1,000 g)!", render: () => card("Level Scale = Equal", scaleSvg({ left: { e: "🍍", label: "1,000 g" }, right: { e: "⚖️", label: "500g + 500g" }, tilt: 0 })) },
    ],
  },

  "g3-perimeter-area": {
    ms: 2050,
    steps: [
      { caption: "1. PERIMETER walks around the outside fence: 3 + 4 + 3 + 4 = 14 ft!", render: () => card("Perimeter = 14 ft", rectGridSvg({ rows: 3, cols: 4, unit: "ft", mode: "perimeter" }), "Add all 4 outer sides") },
      { caption: "2. AREA counts squares covering the inside: 3 rows × 4 = 12 sq ft!", render: () => card("Area = 12 sq ft", rectGridSvg({ rows: 3, cols: 4, unit: "ft", mode: "area" }), "Multiply rows × columns") },
      { caption: "3. Remember: Perimeter = outside border, Area = inside squares!", render: () => card("Compare Both ✓", rectGridSvg({ rows: 3, cols: 4, unit: "ft", mode: "both" })) },
    ],
  },

  "g4-convert-intro": {
    ms: 2100,
    steps: [
      { caption: "1. Length rules: 12 inches = 1 foot, and 100 centimeters = 1 meter.", render: () => card("Length Rules", conversionCardSvg({ leftText: "1 foot", rightText: "12 inches", sub: "1 m = 100 cm", color: "#e3f0ff", stroke: "#135ea9" })) },
      { caption: "2. Liquid & Time: 4 quarts = 1 gallon, and 60 minutes = 1 hour.", render: () => card("Time & Liquid", conversionCardSvg({ leftText: "1 hour", rightText: "60 min", sub: "1 gal = 4 qt", color: "#f0e5ff", stroke: "#6429a6" })) },
      { caption: "3. Kilo means 1,000! 1 kg = 1,000 g and 1 L = 1,000 mL.", render: () => card("Kilo = 1,000", conversionCardSvg({ leftText: "1 kg", rightText: "1,000 g", sub: "1 L = 1,000 mL", color: "#dcf6e6", stroke: "#137a41" })) },
    ],
  },

  "g4-convert-units": {
    ms: 1950,
    steps: [
      { caption: "1. Problem: How many inches are in 4 feet? Recall 1 ft = 12 in.", render: () => card("Rule: 1 ft = 12 in", conversionCardSvg({ leftText: "4 feet", rightText: "? inches", sub: "Smaller unit = MORE pieces", color: "#ffecc8", stroke: "#d96a00" })) },
      { caption: "2. Changing larger feet into smaller inches means MULTIPLY: 4 × 12.", render: () => card("4 × 12 = ?", conversionCardSvg({ leftText: "4 × 12", rightText: "48 inches", sub: "Bigger unit → smaller unit = ×", color: "#dcf6e6", stroke: "#137a41" })) },
      { caption: "3. Going the reverse way (smaller → larger) divides instead (600 cm ÷ 100 = 6 m)!", render: () => card("Reverse = Divide", conversionCardSvg({ leftText: "600 cm", rightText: "6 meters", sub: "Divide by 100", color: "#e3f0ff", stroke: "#135ea9" })) },
    ],
  },

  "g4-schedules": {
    ms: 1950,
    steps: [
      { caption: "1. Bus leaves at 11:45 a.m. and rides for 50 minutes. First jump to noon!", render: () => card("Start · 11:45 a.m.", clockSvg({ hour: 11, minute: 45, showMinuteRing: true })) },
      { caption: "2. +15 minutes bridges to 12:00 p.m. (50 − 15 = 35 minutes left to add).", render: () => card("Bridge · 12:00 p.m.", clockSvg({ hour: 12, minute: 0, showMinuteRing: true }), "Used 15 min so far") },
      { caption: "3. Add the remaining 35 minutes → arrives at 12:35 p.m.!", render: () => card("Arrive · 12:35 p.m. ✓", clockSvg({ hour: 12, minute: 35, showMinuteRing: true })) },
    ],
  },

  "g5-budget-change": {
    ms: 1950,
    steps: [
      { caption: "1. Add decimal prices: $3.75 + $2.50 → $6.25 spent.", render: () => card("Total Spent = $6.25", moneyTraySvg({ d5: 1, d1: 1, quarter: 1 }), "$3.75 + $2.50 = $6.25") },
      { caption: "2. Pay with a $10 bill. Count up $6.25 → $7.00 (+3 quarters = 75¢).", render: () => card("Pay $10 ($6.25 → $7)", moneyTraySvg({ d10: 1 }), "Needs +$0.75 to hit $7") },
      { caption: "3. Plus $3 more to hit $10! Change back = $3.75.", render: () => card("Change = $3.75 ✓", moneyTraySvg({ d1: 3, quarter: 3 }), "$6.25 + $3.75 = $10.00") },
    ],
  },

  "g5-frac-lineplot": {
    ms: 1950,
    steps: [
      { caption: "1. Read mixed fractions on the plot: shortest is 1¼ in, tallest is 2¾ in.", render: () => card("Line Plot Data", chartSvg({ kind: "lineplot", title: "Rain Samples", unit: "in", range: [1, 3], step: 0.25, points: [1.25, 1.75, 2.25, 2.25, 2.75] })) },
      { caption: "2. Subtract largest minus smallest: 2¾ − 1¼ = 1½ inches!", render: () => card("Range = 1½ in", chartSvg({ kind: "lineplot", title: "Rain Samples", unit: "in", range: [1, 3], step: 0.25, points: [1.25, 1.75, 2.25, 2.25, 2.75] }), "2¾ − 1¼ = 1²⁄₄ = 1½") },
      { caption: "3. Add the two samples at 2¼ in: 2¼ + 2¼ = 4½ in total!", render: () => card("2¼ + 2¼ = 4½ in ✓", chartSvg({ kind: "lineplot", title: "1/8 & 1/4 Plots", unit: "in", range: [0, 1], step: 0.125, points: [0.125, 0.375, 0.375, 0.75] })) },
    ],
  },
};

export const DEMO_IDS = Object.keys(DEMOS);

/** Mount an auto-playing worked-example animation for `level` into `container`. Returns a cleanup function. */
export function mountAnimatedDemo(container, level, { autoplay = true, compact = false } = {}) {
  if (!container || !level) return () => {};
  const spec = DEMOS[level.id] || DEMOS["k1-compare"];
  const steps = spec.steps;
  let idx = 0;
  let timer = 0;
  let playing = autoplay;

  container.innerHTML = `
    <div class="demo-box${compact ? " compact" : ""}">
      <div class="demo-stage" data-demo-stage></div>
      <p class="demo-caption" data-demo-cap></p>
      <div class="demo-controls">
        <div class="demo-dots" data-demo-dots>${steps.map((_, i) => `<button type="button" class="demo-dot${i === 0 ? " on" : ""}" data-step="${i}" aria-label="Step ${i + 1} of ${steps.length}"></button>`).join("")}</div>
        <div class="demo-btns">
          <button type="button" class="btn small" data-prev aria-label="Previous step">◀</button>
          <button type="button" class="btn small" data-replay>↻ Replay</button>
          <button type="button" class="btn small" data-next-step aria-label="Next step">▶</button>
        </div>
      </div>
    </div>`;

  const stageEl = container.querySelector("[data-demo-stage]");
  const capEl = container.querySelector("[data-demo-cap]");
  const dotBtns = [...container.querySelectorAll("[data-step]")];

  function draw() {
    const cur = steps[idx];
    stageEl.innerHTML = cur.render();
    capEl.textContent = cur.caption;
    dotBtns.forEach((b, i) => b.classList.toggle("on", i === idx));
  }

  function scheduleNext() {
    clearInterval(timer);
    if (!playing || steps.length < 2) return;
    timer = setInterval(() => {
      if (!container.isConnected) { clearInterval(timer); return; }
      idx = (idx + 1) % steps.length;
      draw();
    }, spec.ms || 2000);
  }

  draw();
  scheduleNext();

  dotBtns.forEach((b) => {
    b.onclick = () => { idx = Number(b.dataset.step); draw(); scheduleNext(); };
  });
  container.querySelector("[data-prev]").onclick = () => {
    idx = (idx - 1 + steps.length) % steps.length;
    draw();
    scheduleNext();
  };
  container.querySelector("[data-next-step]").onclick = () => {
    idx = (idx + 1) % steps.length;
    draw();
    scheduleNext();
  };
  container.querySelector("[data-replay]").onclick = () => {
    idx = 0;
    playing = true;
    draw();
    scheduleNext();
    if (isVoiceActive()) speak(steps[0].caption);
  };

  return () => clearInterval(timer);
}

/** Dedicated "#/watch/:id" worked-example screen with direct "▶ Try It Myself!" jump to `#/play/:id/go`. */
export function viewWatch(app, id) {
  document.body.classList.remove("in-game");
  const level = levelById(id) || LEVELS[0];
  const lIdx = LEVELS.findIndex((x) => x.id === level.id);
  const next = LEVELS[lIdx + 1];

  app.innerHTML = `
    <section class="watch-screen">
      <div class="watch-top">
        <a class="btn small" href="#/">← Home</a>
        <span class="watch-tag">${esc(level.emoji)} ${esc(level.title)}</span>
        <a class="btn primary" href="#/play/${esc(level.id)}/go">▶ Try It Myself!</a>
      </div>
      <div class="card watch-card">
        <div class="watch-head">
          <p class="watch-rule">${level.teach}</p>
          <button class="btn small" type="button" data-read-rule>🔊 Hear rule</button>
        </div>
        <div class="watch-demo-host" data-watch-host></div>
        <div class="row center" style="margin-top:14px">
          <a class="btn big primary pulse" href="#/play/${esc(level.id)}/go">▶ Try It Myself!</a>
          ${next ? `<a class="btn small" href="#/watch/${esc(next.id)}">Next lesson: ${esc(next.emoji)} ${esc(next.title)} →</a>` : ""}
        </div>
      </div>
    </section>`;

  const stopDemo = mountAnimatedDemo(app.querySelector("[data-watch-host]"), level, { autoplay: true });
  app.querySelector("[data-read-rule]").onclick = () => speak(level.say, { force: true });
  if (isVoiceActive()) speak(level.say);

  return () => {
    stopDemo();
    stop({ count: false });
  };
}
