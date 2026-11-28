// Animated worked examples for Measurement, Time & Money. No DOM here (tested in node): a SCENE is a list of
// steps; each step has a caption (shown and read aloud) and a few ACTS (a pointing finger glides to something,
// taps, and numbers in the scene's state tween). watch.js plays them; scene.render(state) draws the art from the
// SAME measure-svg.js functions the game uses, so it looks exactly like the real question.
//
// act = { finger?: target|false, tap?: true, set?: {k: v}, to?: {k: number}, ms?, then?: {k: v}, wait?, travel? }
//   target = { svg: [x, y] }          a point in the first <svg> of the art (its viewBox units)
//          | { el: "css selector" }   the middle of an element in the demo
//          | { pct: [fx, fy] }        a fraction of the demo stage
//          | { fn: (state) => target } follows something that moves
// Order inside an act: the finger glides, taps, `set` happens (at the tap), `to` tweens, then `then`.
import { LEVELS, makeLevel, formatTime, formatMoney, plural, unitWord, sayAmount } from "./measure.js";
import {
  fracLabel, compareLengthSvg, COMPARE_GEOM, rulerSvg, rulerGeom, clockSvg, clockPoint, CLOCK, coinSvg, moneyTraySvg,
  trayGeom, trayItems, drawCurrencyShape, MONEY_META, scaleSvg, pitcherSvg, pitcherY, PITCHER, chartSvg, lineplotGeom,
  barGeom, chartRowY, calendarSvg, rectGridSvg, rectGeom, conversionCardSvg,
} from "./measure-svg.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inject = (svg, extra) => svg.replace(/<\/svg>\s*$/, `${extra}</svg>`);

// ───────── the tiny timeline ─────────

export const TAP_MS = 300;
export function actDurations(a) {
  const travel = a.finger ? (a.travel ?? 800) : 0;
  const tap = a.tap ? TAP_MS : 0;
  const to = a.to ? (a.ms ?? 1000) : (a.wait ?? 0);
  return { travel, tap, to, total: travel + tap + to };
}
export const stepAnimMs = (acts) => acts.reduce((n, a) => n + actDurations(a).total, 0);
/** When (ms into the step) each tap lands. */
export function tapTimes(acts) {
  const out = [];
  let at = 0;
  for (const a of acts) {
    const d = actDurations(a);
    if (a.tap) out.push(at + d.travel);
    at += d.total;
  }
  return out;
}

/**
 * The scene at `t` ms into a step, as a pure function of where the step began.
 * base = { state, finger } (finger = the last target); t = Infinity gives the end of the step.
 */
export function evalStep(base, acts, t) {
  const st = { ...base.state };
  let cur = base.finger ?? null;
  const fing = { from: cur, to: cur, p: 1 };
  let tapP = null;
  let at = 0;
  for (const a of acts) {
    const d = actDurations(a);
    const a0 = at, tTravel = a0 + d.travel, tTap = tTravel + d.tap, tEnd = tTap + d.to;
    at = tEnd;
    if (t < a0) break;
    if (a.finger !== undefined) {
      fing.from = cur; fing.to = a.finger; cur = a.finger;
      fing.p = d.travel ? clamp((t - a0) / d.travel) : 1;
    }
    if (a.tap && t >= tTravel && t < tTap) tapP = (t - tTravel) / d.tap;
    if (t >= tTravel && a.set) Object.assign(st, a.set);
    if (a.to && t >= tTap) {
      const p = clamp((t - tTap) / Math.max(1, d.to));
      const e = p >= 1 ? 1 : ease(p);
      for (const [k, v] of Object.entries(a.to)) st[k] = e >= 1 ? v : lerp(st[k], v, e);
    }
    if (t >= tEnd && a.then) Object.assign(st, a.then);
  }
  if (fing.from === fing.to && fing.to === cur) fing.p = 1;
  return { state: st, finger: fing, tapP, lastFinger: cur };
}
/** Where the next step starts. */
export function endOfStep(base, acts) {
  const r = evalStep(base, acts, Infinity);
  return { state: r.state, finger: r.lastFinger };
}
/** Plain target (no fn) for a state. */
export const plainTarget = (t, st) => (t && typeof t.fn === "function" ? t.fn(st) : t);

// ───────── which kind of scene a question needs ─────────

export const SCENE_TITLES = {
  "align-ruler": "Measuring with a ruler",
  "set-clock": "Setting a clock",
  "build-money": "Making money amounts",
  "pour-jug": "Pouring a pitcher",
  "plot-x": "Plotting on a line plot",
  "intro-find": "Finding the right card",
  "intro-name": "Naming a card",
  compare: "Which is longer?",
  "compare-diff": "How much longer?",
  towers: "Which tower is taller?",
  scale: "Which is heavier?",
  "scale-balance": "A level scale",
  clock: "Reading a clock",
  "clock-ampm": "a.m. or p.m.?",
  "clock-elapsed": "How much time goes by?",
  "money-count": "Counting coins",
  calendar: "Reading a calendar",
  "calendar-count": "Counting days",
  tally: "Reading tally marks",
  picture: "Reading a picture graph",
  bar: "Reading a bar graph",
  lineplot: "Reading a line plot",
  pitcher: "Pouring a little more",
  grid: "Perimeter and area",
  convert: "Changing units",
  text: "Solving a word problem",
};

/** The kind of animated example a question needs (one per question MODE, split by what the art shows). */
export function sceneKey(q) {
  switch (q.type) {
    case "align-ruler": case "set-clock": case "build-money": case "pour-jug": case "plot-x": return q.type;
    case "intro-match": return q.askType === "visual" ? "intro-find" : "intro-name";
    default: break;
  }
  if (q.comparePair) return q.comparePair.vertical ? "towers" : (/^\d/.test(q.answer) ? "compare-diff" : "compare");
  if (q.scale) return q.scale.tilt === 0 ? "scale-balance" : "scale";
  if (q.elapsed) return "clock-elapsed";
  if (q.clock && !q.text) return /a\.m\.|p\.m\./.test(q.prompt) ? "clock-ampm" : "clock";
  if (q.clock) return "clock-elapsed";
  if (q.moneyTray) return "money-count";
  if (q.calendar) return /days after/i.test(q.prompt) ? "calendar-count" : "calendar";
  if (q.chart) return q.chart.kind;
  if (q.pitcher) return "pitcher";
  if (q.rectGrid) return "grid";
  if (q.convert) return "convert";
  return "text";
}

const cache = new Map();
/** Every kind of question a level asks, found by sampling its generator over 60 fixed seeds: [{ key, title, q }]. */
export function levelScenes(level) {
  if (cache.has(level.id)) return cache.get(level.id);
  const found = new Map();
  for (let seed = 7; seed < 67; seed++) {
    for (const q of makeLevel(level, seed)) {
      const key = sceneKey(q);
      if (!found.has(key)) found.set(key, q);
    }
  }
  const list = [...found].map(([key, q]) => ({ key, title: SCENE_TITLES[key] || key, q }));
  cache.set(level.id, list);
  return list;
}
export const sceneKeysOf = (level) => levelScenes(level).map((s) => s.key);

// ───────── shared pieces ─────────

const chips = (q, st) => `<div class="demo-choices">${q.choices.map((c) => {
  const right = c === q.answer;
  return `<span class="demo-choice${st.pick > 0.5 ? (right ? " right" : " dim") : ""}"${right ? " data-correct" : ""}>${esc(c)}</span>`;
}).join("")}</div>`;
const PICK = { finger: { el: "[data-correct]" }, tap: true, set: { pick: 1 } };
const banner = (q) => (q.text ? `<div class="problem-banner demo-banner">${esc(q.text)}</div>` : "");
const pickStep = (q, caption) => ({ caption: caption ?? `Tap ${q.answer}. ${q.why}`, acts: [PICK] });
const unitLong = (u) => ({ in: "inches", cm: "centimeters", ft: "feet", m: "meters" }[u] || u);
const fmtMoney = (c) => formatMoney(Math.round(c));
const objName = (q) => (q.ruler?.obj?.kind === "bookmark" && /ribbon/.test(q.prompt) ? "ribbon" : q.ruler?.obj?.kind ?? "object");
const wrapText = (text, max) => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
};
const counting = (n, by, limit = 6) => {
  const nums = [];
  for (let i = 1; i <= Math.min(n, limit); i++) nums.push(i * by);
  return nums.join(", ") + (n > limit ? ", …" : "");
};

// ───────── scene builders ─────────

function alignRuler(q) {
  const R = q.ruler, name = objName(q);
  const start = R.startOffset ?? 1;
  const geom = (st) => rulerGeom({ max: R.max, hasObj: true, rulerOffset: st.off });
  const g0 = geom({ off: 0 });
  const objEnd = g0.OBJ_LEFT_X + R.obj.units * g0.stepPx;
  const goLeft = start > 0;
  return {
    key: "align-ruler", prompt: q.prompt,
    state0: { off: start, ans: 0, pick: 0 },
    render: (st) => rulerSvg({ ...R, rulerOffset: st.off, showZeroGuide: true, showAnswer: st.ans > 0.5, size: 380 }),
    hud: (st) => `<div class="demo-row">
        <span class="demo-btn" data-slide${goLeft ? "" : '="x"'}>⬅️ Slide Left</span>
        <span class="align-pill ${st.off === 0 ? "ok" : "warn"}">${st.off === 0 ? "0 mark ✓ Aligned!" : "Slide ruler to line up 0"}</span>
        <span class="demo-btn"${goLeft ? "" : " data-slide"}>Slide Right ➡️</span>
      </div>${chips(q, st)}`,
    steps: [
      {
        caption: `Look where the ${name} starts. The red 0 on the ruler is NOT under it yet. Never use the blank edge!`,
        acts: [
          { finger: { svg: [g0.OBJ_LEFT_X, 34] } },
          { finger: { fn: (st) => ({ svg: [geom(st).zeroX, geom(st).rY + 8] }) } },
        ],
      },
      {
        caption: `Slide the ruler ${goLeft ? "left" : "right"} until the red 0 mark lines up with the start of the ${name}.`,
        acts: [{ finger: { el: "[data-slide]" }, tap: true, to: { off: 0 }, ms: 1700 }],
      },
      {
        caption: `Now 0 is right under the start, and the badge turns green. Follow the ruler to where the ${name} ends: ${R.obj.units}.`,
        acts: [
          { finger: { svg: [g0.zeroX, g0.rY + 8] }, travel: 700 },
          { finger: { svg: [objEnd, g0.rY + 24] }, travel: 2000, set: { ans: 1 } },
        ],
      },
      pickStep(q, q.why),
    ],
  };
}

function clockParts(m) {
  const hour = Math.floor(m / 60) % 12 || 12;
  return { hour, minute: m - Math.floor(m / 60) * 60 };
}
const minuteTip = (m) => ({ svg: clockPoint(clockParts(m).minute * 6, CLOCK.r - 18) });
const hourTip = (m) => {
  const { hour, minute } = clockParts(m);
  return { svg: clockPoint(((hour % 12) + minute / 60) * 30, CLOCK.r - 38) };
};
const totalOf = (h, m) => ((h % 12) * 60 + m) % 720;

function setClock(q, level) {
  const step = q.stepMinutes || 5;
  const start = totalOf(q.startHour, q.startMinute), target = totalOf(q.targetHour, q.targetMinute);
  let d = (((target - start) % 720) + 720) % 720;
  if (d > 360) d -= 720;
  const btns = step >= 30 ? [-60, -30, 30, 60] : [-60, -step, step, 60];
  const label = (b) => (Math.abs(b) === 60 ? `${b < 0 ? "−" : "+"}1 hr` : `${b < 0 ? "−" : "+"}${Math.abs(b)}m`);
  // plan the taps: whole hours first, then the small steps
  const plan = [];
  let rem = d;
  while (Math.abs(rem) >= 60) { const b = rem > 0 ? 60 : -60; plan.push(b); rem -= b; }
  while (rem !== 0) { const b = rem > 0 ? step : -step; plan.push(b); rem -= b; }
  const hours = plan.filter((b) => Math.abs(b) === 60), smalls = plan.filter((b) => Math.abs(b) !== 60);
  const startStr = formatTime(q.startHour, q.startMinute), targetStr = formatTime(q.targetHour, q.targetMinute);
  const ring = !!q.showMinuteRing || step < 30;
  let cum = start;
  const tapActs = (list) => list.map((b) => {
    cum += b;
    return { finger: { el: `[data-delta="${b}"]` }, tap: true, to: { m: cum }, ms: list.length > 6 ? 500 : 800, travel: 600 };
  });
  const steps = [{
    caption: `The clock shows ${startStr}. We need ${targetStr}. The short red hand is the hour. The long blue hand is the minutes.`,
    acts: [{ finger: { fn: (st) => hourTip(st.m) } }, { finger: { fn: (st) => minuteTip(st.m) }, travel: 1500 }],
  }];
  if (hours.length) {
    steps.push({
      caption: `First the hours. Tap ${label(hours[0])} ${hours.length > 1 ? `${hours.length} times` : "once"} to move the red hour hand to ${q.targetHour}.`,
      acts: tapActs(hours),
    });
  }
  if (smalls.length) {
    const by = Math.abs(smalls[0]);
    const nums = by === 5 ? ` Count by fives: ${counting(smalls.length, 5, 7)}.` : "";
    steps.push({
      caption: `Tap ${label(smalls[0])} ${smalls.length > 1 ? `${smalls.length} times` : "once"} and watch the blue minute hand move.${nums}`,
      acts: tapActs(smalls),
    });
  }
  steps.push({
    caption: `Now the clock shows ${targetStr}. Tap Check Clock!`,
    acts: [{ finger: { el: "[data-check]" }, tap: true, set: { chk: 1 } }],
  });
  return {
    key: "set-clock", prompt: q.prompt,
    state0: { m: start, chk: 0 },
    render: (st) => {
      const { hour, minute } = clockParts(st.m);
      return clockSvg({ hour, minute, showMinuteRing: ring, size: 270 });
    },
    hud: (st) => {
      const { hour, minute } = clockParts(Math.round(st.m));
      return `<div class="demo-row">${btns.map((b) => `<span class="demo-btn" data-delta="${b}">${label(b)}</span>`).join("")}</div>
        <div class="demo-row"><span class="demo-readout">Clock shows <b>${formatTime(hour, Math.round(minute))}</b></span>
        <span class="demo-btn primary${st.chk ? " glow" : ""}" data-check>✓ Check Clock</span></div>`;
    },
    steps,
  };
}

function buildMoney(q) {
  const kinds = [...q.denominations].sort((a, b) => MONEY_META[b].cents - MONEY_META[a].cents);
  const plan = [];
  let rem = q.targetCents;
  for (const k of kinds) { const v = MONEY_META[k].cents; while (rem >= v && plan.length < 20) { plan.push(k); rem -= v; } }
  const g = trayGeom(plan.length, { cols: 5, rows: Math.max(1, Math.ceil(plan.length / 5)) });
  const palX = (k) => (kinds.indexOf(k) + 0.5) * (g.W / kinds.length);
  const palY = g.H + 30;
  const cumAt = [];
  plan.reduce((s, k, i) => (cumAt[i] = s + MONEY_META[k].cents), 0);
  const word = (k, n) => `${MONEY_META[k].label.toLowerCase().replace("$", "$")}${n === 1 ? "" : "s"}`.replace("penny", n === 1 ? "penny" : "pennies").replace("pennys", "pennies");
  const steps = [{
    caption: `We need to make ${fmtMoney(q.targetCents)} in the tray. Start with the BIGGEST coins and bills, then go smaller.`,
    acts: [{ finger: { el: "[data-goal]" } }],
  }];
  let idx = 0;
  for (const k of kinds) {
    const n = plan.filter((p) => p === k).length;
    if (!n) continue;
    const totals = Array.from({ length: n }, (_, j) => fmtMoney(cumAt[idx + j])).join(", ");
    const acts = [];
    for (let j = 0; j < n; j++) {
      const i = idx + j;
      acts.push({ finger: { svg: [palX(k), palY] }, travel: 700, tap: true, to: { fly: 1, val: cumAt[i] }, ms: 900, then: { n: i + 1, fly: 0 } });
    }
    steps.push({ caption: `Tap the ${MONEY_META[k].label}${n > 1 ? ` ${n} times` : ""}. The total counts up: ${totals}.`, acts });
    idx += n;
  }
  steps.push({
    caption: `The tray holds exactly ${fmtMoney(q.targetCents)}. That matches! Tap Check Tray.`,
    acts: [{ finger: { el: "[data-check]" }, tap: true, set: { chk: 1 } }],
  });
  void word;
  return {
    key: "build-money", prompt: q.prompt,
    state0: { n: 0, fly: 0, val: 0, chk: 0 },
    render: (st) => {
      const counts = {};
      plan.slice(0, st.n).forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
      let extra = kinds.map((k) => `${drawCurrencyShape(k, palX(k), palY, 0.7)}<text x="${palX(k).toFixed(1)}" y="${palY + 33}" text-anchor="middle" font-size="12" font-weight="800" fill="#2b2340">+${esc(MONEY_META[k].tag)}</text>`).join("");
      if (st.fly > 0 && st.n < plan.length) {
        const k = plan[st.n], to = g.slot(st.n), t = ease(st.fly);
        const x = lerp(palX(k), to.x, t), y = lerp(palY, to.y, t) - Math.sin(t * Math.PI) * 26;
        extra += drawCurrencyShape(k, x, y, lerp(0.7, 0.88, t));
      }
      return moneyTraySvg(counts, { size: 380, cols: 5, rows: g.rows, extra, extraH: 70, hint: false });
    },
    hud: (st) => `<div class="demo-row"><span class="demo-readout" data-goal>Goal <b>${fmtMoney(q.targetCents)}</b></span>
        <span class="demo-readout big">Total <b>${fmtMoney(st.val)}</b></span></div>
        <div class="demo-row"><span class="demo-btn primary${st.chk ? " glow" : ""}" data-check>✓ Check Tray</span></div>`,
    steps,
  };
}

function pourJug(q) {
  const dir = q.target > q.start ? 1 : -1;
  const taps = Math.round(Math.abs(q.target - q.start) / q.step);
  const levelPt = (st) => ({ svg: [PITCHER.jX + PITCHER.jW + 10, pitcherY(st.fill, q.capacity)] });
  const acts = [];
  for (let i = 1; i <= taps; i++) acts.push({ finger: { el: dir > 0 ? "[data-pour='1']" : "[data-pour='-1']" }, tap: true, to: { fill: q.start + dir * q.step * i }, ms: 800, travel: 600 });
  return {
    key: "pour-jug", prompt: q.prompt,
    state0: { fill: q.start, goal: 0, chk: 0 },
    render: (st) => pitcherSvg({
      capacity: q.capacity, fill: st.fill, unit: q.unit, target: st.goal > 0.5 ? q.target : null, tickStep: q.step,
      label: plural(Math.round(st.fill), q.unit), size: 215,
    }),
    hud: (st) => `<div class="demo-row">
        <span class="demo-btn" data-pour="-1">− Pour Out ${plural(q.step, q.unit)}</span>
        <span class="demo-btn primary" data-pour="1">+ Pour In ${plural(q.step, q.unit)}</span>
      </div><div class="demo-row"><span class="demo-btn primary${st.chk ? " glow" : ""}" data-check>✓ Check Pitcher</span>
        <span class="demo-btn icon${st.goal > 0.5 ? " glow" : ""}" data-bulb>💡</span></div>`,
    steps: [
      {
        caption: `${q.prompt} Find ${q.target} on the side of the pitcher.`,
        acts: [
          { finger: { fn: levelPt } },
          { finger: { svg: [PITCHER.jX + PITCHER.jW - 24, pitcherY(q.target, q.capacity)] }, travel: 1600 },
        ],
      },
      {
        caption: `Tap ${dir > 0 ? "Pour In" : "Pour Out"}. Each tap ${dir > 0 ? "adds" : "takes away"} ${plural(q.step, q.unit)} and the water ${dir > 0 ? "rises" : "drops"} one step.`,
        acts,
      },
      {
        caption: `The pitcher holds exactly ${plural(q.target, q.unit)} now. Tap Check Pitcher!`,
        acts: [{ finger: { el: "[data-check]" }, tap: true, set: { chk: 1 } }],
      },
      {
        caption: `Stuck? Tap the light bulb. A red Goal line shows up to help you.`,
        acts: [{ finger: { el: "[data-bulb]" }, tap: true, set: { goal: 1 } }],
      },
    ],
  };
}

function plotX(q) {
  const ch = q.chart, tv = q.targetVal;
  const after = [...ch.points, tv];
  const geom = lineplotGeom({ range: ch.range, points: after });
  const minStack = Math.max(2, ...Object.values(geom.counts));
  const x = geom.px(tv);
  const k = geom.counts[(Math.round(tv * 8) / 8).toFixed(3)] || 1;
  const stackBefore = (lineplotGeom({ range: ch.range, points: ch.points }).counts[(Math.round(tv * 8) / 8).toFixed(3)] || 0);
  const whole = Math.floor(tv + 1e-9);
  const wholeX = geom.px(whole);
  void k;
  const label = fracLabel(tv);
  return {
    key: "plot-x", prompt: q.prompt,
    state0: { drop: 0, placed: 0, chk: 0 },
    render: (st) => {
      let svg = chartSvg({ ...ch, points: st.placed > 0.5 ? after : ch.points, interactive: false, size: 380, minStack });
      if (st.drop > 0) svg = inject(svg, `<text x="${x.toFixed(1)}" y="${lerp(14, geom.stackY(stackBefore), ease(st.drop)).toFixed(1)}" text-anchor="middle" font-size="16" font-weight="900" fill="#e5484d">✕</text>`);
      return svg;
    },
    hud: (st) => `<div class="demo-row"><span class="demo-readout">${st.placed > 0.5 ? `X placed at <b>${label}</b>` : "Tap any column to place your X"}</span>
      <span class="demo-btn primary${st.chk ? " glow" : ""}" data-check>✓ Check Plot</span></div>`,
    steps: [
      { caption: `${q.prompt} First, find ${label} on the number line.`, acts: [{ finger: { svg: [x, geom.baseY + 22] } }] },
      {
        caption: Number.isInteger(tv)
          ? `${label} is a whole number mark. Look straight up from it.`
          : `Find ${whole} on the line. Then step right, one small mark at a time, until you reach ${label}.`,
        acts: Number.isInteger(tv) ? [{ finger: { svg: [x, geom.baseY - 8] } }] : [{ finger: { svg: [wholeX, geom.baseY + 22] } }, { finger: { svg: [x, geom.baseY + 22] }, travel: 1800 }],
      },
      {
        caption: `Tap right above ${label}. Watch the X drop onto the line!`,
        acts: [{ finger: { svg: [x, geom.baseY - 30] }, tap: true, to: { drop: 1 }, ms: 900, then: { placed: 1, drop: 0 } }],
      },
      { caption: `The X sits right on ${label}. Tap Check Plot!`, acts: [{ finger: { el: "[data-check]" }, tap: true, set: { chk: 1 } }] },
    ],
  };
}

// a picture of any intro card (coin, clock, ruler…)
export function specSvg(spec, size = 150) {
  if (spec.coin) return coinSvg(spec.coin, { size: Math.round(size * 0.7) });
  if (spec.clock) return clockSvg({ ...spec.clock, size: Math.round(size * 0.9) });
  if (spec.ruler) return rulerSvg({ ...spec.ruler, size: Math.round(size * 1.6) });
  if (spec.pitcher) return pitcherSvg({ ...spec.pitcher, size: Math.round(size * 0.8) });
  if (spec.scale) return scaleSvg({ ...spec.scale, size: Math.round(size * 1.3) });
  if (spec.convert) return conversionCardSvg({ ...spec.convert, size: Math.round(size * 1.2) });
  return "";
}

function introFind(q) {
  const cards = q.choices.map((n) => q.choiceSpecs[n]);
  const ansIdx = q.choices.indexOf(q.answer);
  return {
    key: "intro-find", prompt: q.prompt,
    state0: { pick: 0 },
    render: (st) => `<div class="demo-cards">${cards.map((c, i) => `<div class="demo-card${st.pick > 0.5 ? (i === ansIdx ? " right" : " dim") : ""}" data-card="${i}">${specSvg(c, 120)}</div>`).join("")}</div>`,
    hud: () => `<div class="demo-row"><span class="demo-readout">Find <b>${esc(q.answer)}</b></span></div>`,
    steps: [
      { caption: `${q.prompt} Here is the clue: ${q.target.clue}`, acts: [{ finger: { el: ".demo-readout" }, wait: 600 }] },
      { caption: "Look at each picture and ask: does it match the clue?", acts: cards.map((_, i) => ({ finger: { el: `[data-card="${i}"]` }, travel: 900, wait: 500 })) },
      { caption: q.why, acts: [{ finger: { el: `[data-card="${ansIdx}"]` }, tap: true, set: { pick: 1 } }] },
    ],
  };
}
function introName(q) {
  return {
    key: "intro-name", prompt: q.prompt,
    state0: { pick: 0 },
    render: () => `<div class="demo-cards single" data-big>${specSvg(q, 200)}</div>`,
    hud: (st) => chips(q, st),
    steps: [
      { caption: `${q.prompt} Look closely at the picture.`, acts: [{ finger: { el: "[data-big]" }, travel: 1000, wait: 700 }] },
      { caption: `Here is a clue to help: ${q.target.clue}`, acts: [{ finger: { el: "[data-big]", at: [0.5, 0.8] }, travel: 700, wait: 600 }] },
      pickStep(q, `${q.why}`),
    ],
  };
}

// ── choose: lengths, towers, scales ──
function compare(q, diff) {
  const { a, b } = q.comparePair;
  const G = COMPARE_GEOM.h;
  const winKey = diff ? (a.units >= b.units ? "a" : "b") : (q.answer === a.label ? "a" : "b");
  const endA = G.leftX + a.units * G.pxPer, endB = G.leftX + b.units * G.pxPer;
  const lo = Math.min(endA, endB), hi = Math.max(endA, endB);
  const unit = String(q.answer).replace(/^[\d.,\s]+/, "");
  const sc = { a: 46, b: 18 };
  return {
    key: diff ? "compare-diff" : "compare", prompt: q.prompt,
    state0: { sa: sc.a, sb: sc.b, ends: 0, hil: 0, br: 0, pick: 0 },
    render: (st) => {
      let svg = compareLengthSvg(a, b, { shiftA: st.sa, shiftB: st.sb, ends: st.ends > 0.5, hilite: !diff && st.hil ? (st.hil === 1 ? "a" : "b") : null, size: 340 });
      if (diff && st.br > 0) {
        svg = inject(svg, `<line x1="${lo}" y1="${G.H - 14}" x2="${(lo + (hi - lo) * st.br).toFixed(1)}" y2="${G.H - 14}" stroke="#16a34a" stroke-width="6" stroke-linecap="round"/>
          ${st.br > 0.9 ? `<text x="${((lo + hi) / 2).toFixed(1)}" y="${G.H - 21}" text-anchor="middle" font-size="12.5" font-weight="900" fill="#137a41">${esc(q.answer)} difference</text>` : ""}`);
      }
      return svg;
    },
    hud: (st) => chips(q, st),
    steps: [
      {
        caption: "First line both things up at the same start line. Now the race is fair!",
        acts: [{ finger: { svg: [G.leftX, 30] } }, { to: { sa: 0, sb: 0 }, ms: 1500 }],
      },
      {
        caption: "Now look at where each one ENDS.",
        acts: [{ finger: { svg: [endA, G.barY[0] + 20] }, set: { ends: 1 } }, { finger: { svg: [endB, G.barY[1] + 20] }, travel: 1300 }],
      },
      diff
        ? { caption: `${q.hint} The extra bit is ${q.answer}.`, acts: [{ finger: { svg: [lo, G.H - 14] }, travel: 700 }, { finger: { svg: [hi, G.H - 14] }, travel: 1600, to: { br: 1 }, ms: 1600 }] }
        : { caption: `${q.hint}`, acts: [{ finger: { svg: [winKey === "a" ? endA : endB, G.barY[winKey === "a" ? 0 : 1]] }, travel: 900, set: { hil: winKey === "a" ? 1 : 2 } }, { wait: 600 }] },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
    _unit: unit,
  };
}

function towers(q) {
  const { a, b } = q.comparePair;
  const V = COMPARE_GEOM.v;
  const topA = V.baseY - a.units * V.perUnit, topB = V.baseY - b.units * V.perUnit;
  const topY = Math.min(topA, topB);
  const winKey = q.answer === a.label ? "a" : "b";
  return {
    key: "towers", prompt: q.prompt,
    state0: { grow: 0.04, line: 0, hil: 0, pick: 0 },
    render: (st) => {
      let svg = compareLengthSvg(a, b, { vertical: true, grow: st.grow, hilite: st.hil ? (st.hil === 1 ? "a" : "b") : null, size: 300 });
      if (st.line > 0) svg = inject(svg, `<line x1="20" y1="${topY}" x2="${lerp(20, V.W - 20, st.line).toFixed(1)}" y2="${topY}" stroke="#e5484d" stroke-width="2.6" stroke-dasharray="6 4"/>`);
      return svg;
    },
    hud: (st) => chips(q, st),
    steps: [
      { caption: "Both towers stand on the same floor, so we can fairly compare how high they reach.", acts: [{ to: { grow: 1 }, ms: 1800 }] },
      {
        caption: "Look at the very top of each tower. A line across the top shows who reaches higher.",
        acts: [{ finger: { svg: [V.cx[0], topA] } }, { finger: { svg: [V.cx[1], topB] }, travel: 1100, to: { line: 1 }, ms: 1300 }],
      },
      { caption: q.hint, acts: [{ finger: { svg: [V.cx[winKey === "a" ? 0 : 1], winKey === "a" ? topA : topB] }, travel: 900, set: { hil: winKey === "a" ? 1 : 2 } }, { wait: 500 }] },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}

function scaleScene(q, balanced) {
  const S = q.scale;
  const geom = (tilt) => {
    const rad = (tilt * 10 * Math.PI) / 180;
    return { lx: 140 - 82 * Math.cos(rad), ly: 68 - 82 * Math.sin(rad), rx: 140 + 82 * Math.cos(rad), ry: 68 + 82 * Math.sin(rad) };
  };
  const panL = (st) => ({ svg: [geom(st.tilt).lx, geom(st.tilt).ly + 26] });
  const panR = (st) => ({ svg: [geom(st.tilt).rx, geom(st.tilt).ry + 26] });
  const lowPan = S.tilt < 0 ? panL : panR;
  const heavy = S.tilt < 0 ? S.left.label : S.right.label;
  return {
    key: balanced ? "scale-balance" : "scale", prompt: q.prompt,
    state0: { tilt: balanced ? 0.9 : 0, pick: 0 },
    render: (st) => scaleSvg({ left: S.left, right: S.right, tilt: st.tilt, size: 320 }),
    hud: (st) => chips(q, st),
    steps: balanced
      ? [
        { caption: "A balance scale has two pans. Watch it settle until it is perfectly level.", acts: [{ finger: { fn: panL } }, { finger: { fn: panR }, travel: 1100, to: { tilt: 0 }, ms: 1800 }] },
        { caption: `Level means both sides weigh the SAME. ${q.hint}`, acts: [{ finger: { fn: panL } }, { finger: { fn: panR }, travel: 1200 }] },
        pickStep(q, `Tap ${q.answer}. ${q.why}`),
      ]
      : [
        { caption: "A balance scale has two pans. The heavier side always goes DOWN.", acts: [{ finger: { fn: panL } }, { finger: { fn: panR }, travel: 1100 }] },
        { caption: `Watch the scale tip! The ${heavy} pan sinks lower, so the ${heavy} is heavier.`, acts: [{ finger: { fn: lowPan }, to: { tilt: S.tilt }, ms: 2000 }] },
        { caption: q.hint, acts: [{ finger: { fn: lowPan }, wait: 700 }] },
        pickStep(q, `Tap ${q.answer}. ${q.why}`),
      ],
  };
}

// ── choose: clocks ──
function clockRead(q, level) {
  const { hour: h, minute: m } = q.clock;
  const base = h * 60;
  const ring = level.grade >= 2;
  const render = (st) => { const p = clockParts(st.m); return clockSvg({ hour: p.hour, minute: p.minute, showMinuteRing: ring, size: 280 }); };
  return {
    key: "clock", prompt: q.prompt,
    state0: { m: base, pick: 0 },
    render,
    hud: (st) => `<div class="demo-row"><span class="demo-readout">Minutes: <b>${Math.floor(((st.m - base) % 60) / 5 + 1e-6) * 5 || (st.m - base > 1 ? 0 : 0)}</b></span></div>${chips(q, st)}`,
    steps: [
      { caption: `First look at the short red hour hand. It points ${m === 0 ? "right at" : "just past"} ${h}, so the hour is ${h}.`, acts: [{ finger: { fn: (st) => hourTip(st.m) } }, { wait: 800 }] },
      {
        caption: `Now the long blue minute hand. Count by fives around the clock. ${q.hint}`,
        acts: [{ finger: { fn: (st) => minuteTip(st.m) }, travel: 700, to: { m: base + m }, ms: 700 + (m / 5) * 330 }],
      },
      pickStep(q, `So the time is ${q.answer}. ${q.why}`),
    ],
  };
}
function clockAmPm(q) {
  const { hour: h, minute: m } = q.clock;
  const t = totalOf(h, m);
  return {
    key: "clock-ampm", prompt: q.prompt,
    state0: { m: t, pick: 0 },
    render: (st) => { const p = clockParts(st.m); return clockSvg({ hour: p.hour, minute: p.minute, showMinuteRing: true, size: 260 }); },
    hud: (st) => `<div class="demo-row"><span class="demo-readout">☀️ morning = <b>a.m.</b></span><span class="demo-readout">🌙 night = <b>p.m.</b></span></div>${chips(q, st)}`,
    steps: [
      { caption: `The clock shows ${formatTime(h, m)}. But is it morning or night? The clock alone can't say!`, acts: [{ finger: { fn: (st) => hourTip(st.m) } }, { finger: { fn: (st) => minuteTip(st.m) }, travel: 1200 }] },
      { caption: `Think about the story. ${q.hint}`, acts: [{ finger: { pct: [0.5, 0.18] }, wait: 900 }] },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}
function clockElapsed(q, level) {
  const el = q.elapsed || { sh: q.clock.hour, sm: q.clock.minute, add: 30 };
  const start = totalOf(el.sh, el.sm);
  const ring = level.grade >= 2;
  return {
    key: "clock-elapsed", prompt: q.prompt,
    state0: { m: start, pick: 0 },
    render: (st) => `${banner(q)}${(() => { const p = clockParts(st.m); return clockSvg({ hour: p.hour, minute: p.minute, showMinuteRing: ring, size: 250 }); })()}`,
    hud: (st) => `<div class="demo-row"><span class="demo-readout">Time that passed: <b>${Math.round(st.m - start)} min</b></span></div>${chips(q, st)}`,
    steps: [
      { caption: `The story starts at ${formatTime(el.sh, el.sm)}. The clock shows the start. Then ${el.add} minutes go by.`, acts: [{ finger: { fn: (st) => hourTip(st.m) } }, { finger: { fn: (st) => minuteTip(st.m) }, travel: 1100 }] },
      {
        caption: `Move the minute hand forward ${el.add} minutes. ${q.hint}`,
        acts: [{ finger: { fn: (st) => minuteTip(st.m) }, travel: 500, to: { m: start + el.add }, ms: 1500 + el.add * 45 }],
      },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}

// ── choose: money, calendar, charts ──
function moneyCount(q) {
  const items = trayItems(q.moneyTray);
  const g = trayGeom(items.length);
  const vals = items.map((k) => MONEY_META[k].cents);
  const cum = [];
  vals.reduce((s, v, i) => (cum[i] = s + v), 0);
  const kinds = [...new Set(items)];
  const steps = [{ caption: "Count the coins from the BIGGEST to the smallest. Keep a running total.", acts: [{ finger: { svg: [g.slot(0).x, g.slot(0).y] } }] }];
  let idx = 0;
  for (const k of kinds) {
    const n = items.filter((i) => i === k).length;
    const acts = [];
    for (let j = 0; j < n; j++) {
      const i = idx + j;
      acts.push({ finger: { svg: [g.slot(i).x, g.slot(i).y] }, travel: 650, set: { ring: i }, to: { val: cum[i] }, ms: 450 });
    }
    steps.push({ caption: `${MONEY_META[k].label}${n > 1 ? "s" : ""} are worth ${MONEY_META[k].tag} each. Count: ${Array.from({ length: n }, (_, j) => fmtMoney(cum[idx + j])).join(", ")}.`, acts });
    idx += n;
  }
  steps.push(pickStep(q, `All together: ${q.answer}. ${q.why}`));
  return {
    key: "money-count", prompt: q.prompt,
    state0: { ring: -1, val: 0, pick: 0 },
    render: (st) => {
      const ring = st.ring >= 0 ? (() => { const s = g.slot(st.ring); return `<circle cx="${s.x}" cy="${s.y}" r="${(MONEY_META[items[st.ring]].bill ? 34 : 29)}" fill="none" stroke="#16a34a" stroke-width="4"/>`; })() : "";
      return moneyTraySvg(q.moneyTray, { size: 350, extra: ring });
    },
    hud: (st) => `<div class="demo-row"><span class="demo-readout big">Total so far <b>${fmtMoney(st.val)}</b></span></div>${chips(q, st)}`,
    steps,
  };
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function calendar(q) {
  const C = q.calendar, cw = 36, ch = 28, padX = 12, topH = 48;
  const cell = (d) => { const slot = C.startDow + d - 1; return { x: padX + (slot % 7) * cw + cw / 2, y: topH + Math.floor(slot / 7) * ch + ch / 2 }; };
  const day = C.highlightDay, p = cell(day);
  const marks = C.markDays || [];
  const count = /days after/i.test(q.prompt);
  const other = count ? marks.find((m) => m.day !== day)?.day ?? day + 7 : null;
  const o = other ? cell(other) : null;
  return {
    key: count ? "calendar-count" : "calendar", prompt: q.prompt,
    state0: { col: 0, pick: 0 },
    render: (st) => {
      let extra;
      if (count) extra = st.col > 0 ? `<line x1="${p.x}" y1="${p.y + 12}" x2="${p.x}" y2="${lerp(p.y + 12, o.y - 12, st.col).toFixed(1)}" stroke="#16a34a" stroke-width="4" stroke-linecap="round"/>` : "";
      else extra = st.col > 0 ? `<rect x="${p.x - 15}" y="${lerp(p.y - 13, 31, st.col).toFixed(1)}" width="30" height="${(p.y + 13 - lerp(p.y - 13, 31, st.col)).toFixed(1)}" rx="8" fill="#16a34a" fill-opacity=".22" stroke="#16a34a" stroke-width="2"/>` : "";
      return inject(calendarSvg({ ...C, size: 340 }), extra);
    },
    hud: (st) => chips(q, st),
    steps: count
      ? [
        { caption: `Here is October ${day}, and here is October ${other}.`, acts: [{ finger: { svg: [p.x, p.y] } }, { finger: { svg: [o.x, o.y] }, travel: 1300 }] },
        { caption: `They sit in the same column, one whole row apart. ${q.hint}`, acts: [{ finger: { svg: [p.x, p.y + 12] }, travel: 500 }, { finger: { svg: [o.x, o.y - 12] }, travel: 1500, to: { col: 1 }, ms: 1500 }] },
        pickStep(q, `Tap ${q.answer}. ${q.why}`),
      ]
      : [
        { caption: `Find ${C.month} ${day} on the calendar. It is highlighted in yellow.`, acts: [{ finger: { svg: [p.x, p.y] } }] },
        { caption: `Now slide your finger straight UP the column to the top. The label says ${DOW[(C.startDow + day - 1) % 7]}.`, acts: [{ finger: { fn: (st) => ({ svg: [p.x, lerp(p.y, 40, st.col)] }) }, travel: 400, to: { col: 1 }, ms: 2000 }] },
        pickStep(q, `That column is ${q.answer}. ${q.why}`),
      ],
  };
}

function rowsMentioned(q) {
  const rows = q.chart.rows;
  const hit = rows.map((r, i) => (String(q.prompt).toLowerCase().includes(String(r.label).toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  return hit;
}
function tally(q) {
  const rows = q.chart.rows, hit = rowsMentioned(q);
  const rowBox = (i) => `<rect x="10" y="${chartRowY(i) - 18}" width="290" height="36" rx="12" fill="#16a34a" fill-opacity=".15" stroke="#16a34a" stroke-width="2.6"/>`;
  const endX = (n) => 134 + (Math.ceil(n / 5) - 1) * 34 + (n % 5 === 0 ? 24 : (n % 5) * 6) + 6;
  const steps = [];
  if (hit.length === 1) {
    const i = hit[0], n = rows[i].count ?? rows[i].value;
    steps.push({ caption: `Find the ${rows[i].label} row.`, acts: [{ finger: { svg: [24, chartRowY(i)] }, set: { hl: i + 1 } }] });
    steps.push({
      caption: `Each bundle with a slash across it counts as 5. ${n >= 5 ? `5 for the bundle${n % 5 ? `, then one more for each single mark` : ""}` : "Count each mark"}: ${n}.`,
      acts: [{ finger: { svg: [134, chartRowY(i)] }, travel: 600 }, { finger: { svg: [endX(n), chartRowY(i)] }, travel: 700 + n * 260, to: { cnt: n }, ms: 700 + n * 260 }],
    });
  } else {
    steps.push({ caption: "Look at every row and count its tally marks. A slashed bundle is 5.", acts: rows.map((_, i) => ({ finger: { svg: [24, chartRowY(i)] }, travel: 800, set: { hl: i + 1 }, wait: 600 })) });
    steps.push({ caption: q.hint, acts: [{ finger: { svg: [200, chartRowY(Math.max(0, rows.findIndex((r) => String(q.why).includes(r.label))))] } }, { wait: 500 }] });
  }
  steps.push(pickStep(q, `Tap ${q.answer}. ${q.why}`));
  return {
    key: "tally", prompt: q.prompt,
    state0: { hl: 0, cnt: 0, pick: 0 },
    render: (st) => inject(chartSvg({ ...q.chart, size: 360 }), (st.hl ? rowBox(st.hl - 1) : "") + (hit.length === 1 && st.cnt > 0 ? `<text x="${endX(rows[hit[0]].count ?? rows[hit[0]].value) + 14}" y="${chartRowY(hit[0]) + 6}" font-size="17" font-weight="900" fill="#137a41">= ${Math.round(st.cnt)}</text>` : "")),
    hud: (st) => chips(q, st),
    steps,
  };
}
function pictureGraph(q) {
  const C = q.chart, hit = rowsMentioned(q);
  const rows = hit.length ? hit : C.rows.map((_, i) => i);
  const H = 42 + C.rows.length * 38 + 34;
  const steps = [
    { caption: `Read the key first! Each ${C.icon} stands for ${C.scale} ${C.unit || "items"}.`, acts: [{ finger: { svg: [160, H - 12] } }] },
    { caption: q.hint, acts: rows.map((i) => ({ finger: { svg: [24, chartRowY(i)] }, travel: 900, set: { hl: i + 1 }, wait: 700 })) },
    pickStep(q, `Tap ${q.answer}. ${q.why}`),
  ];
  return {
    key: "picture", prompt: q.prompt,
    state0: { hl: 0, pick: 0 },
    render: (st) => inject(chartSvg({ ...C, size: 360 }), st.hl ? `<rect x="10" y="${chartRowY(st.hl - 1) - 18}" width="300" height="36" rx="12" fill="#16a34a" fill-opacity=".15" stroke="#16a34a" stroke-width="2.6"/>` : ""),
    hud: (st) => chips(q, st),
    steps,
  };
}
function barGraph(q) {
  const C = q.chart, hit = rowsMentioned(q);
  const rows = hit.length ? hit : C.rows.map((_, i) => i);
  const G = barGeom({ rows: C.rows, scale: C.scale });
  const acts = rows.map((i) => { const b = G.bar(i); return { finger: { svg: [b.x + b.w / 2, b.y] }, travel: 900, set: { hl: i + 1, gl: 0 }, to: { gl: 1 }, ms: 1100 }; });
  return {
    key: "bar", prompt: q.prompt,
    state0: { hl: 0, gl: 0, pick: 0 },
    render: (st) => {
      let extra = "";
      if (st.hl) {
        const b = G.bar(st.hl - 1);
        extra = `<rect x="${b.x - 4}" y="${b.y - 4}" width="${b.w + 8}" height="${b.h + 8}" rx="8" fill="none" stroke="#16a34a" stroke-width="3"/>
          <line x1="${(b.x - 4).toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${lerp(b.x - 4, G.padL, st.gl).toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#e5484d" stroke-width="2.6" stroke-dasharray="5 4"/>`;
      }
      return inject(chartSvg({ ...C, size: 360 }), extra);
    },
    hud: (st) => chips(q, st),
    steps: [
      { caption: "Find the bar you need. Look at the very top of the bar, then follow a line across to the number scale.", acts },
      { caption: q.hint, acts: [{ wait: 1200 }] },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}
function linePlotRead(q) {
  const C = q.chart;
  const geom = lineplotGeom({ range: C.range, points: C.points });
  const counts = geom.counts;
  const keyOf = (v) => (Math.round(v * 8) / 8).toFixed(3);
  let focus = q.focus;
  if (!focus?.length) {
    const best = Math.max(...Object.values(counts));
    focus = Object.entries(counts).filter(([, c]) => c === best).map(([k]) => Number(k));
  }
  const col = (v) => {
    const n = counts[keyOf(v)] || 1, x = geom.px(v);
    return `<rect x="${(x - 15).toFixed(1)}" y="${geom.stackY(n - 1) - 18}" width="30" height="${(geom.baseY + 32 - (geom.stackY(n - 1) - 18)).toFixed(1)}" rx="9" fill="#16a34a" fill-opacity=".16" stroke="#16a34a" stroke-width="2.4"/>`;
  };
  const acts = focus.map((v, i) => ({ finger: { svg: [geom.px(v), geom.baseY + 22] }, travel: 900, set: { hl: i + 1 }, wait: 900 }));
  return {
    key: "lineplot", prompt: q.prompt,
    state0: { hl: 0, pick: 0 },
    render: (st) => inject(chartSvg({ ...C, size: 380 }), st.hl ? col(focus[st.hl - 1]) : ""),
    hud: (st) => {
      const v = st.hl ? focus[st.hl - 1] : null;
      return `<div class="demo-row"><span class="demo-readout">${v == null ? "Each ✕ is one measurement" : `At <b>${fracLabel(v)}</b> there ${counts[keyOf(v)] === 1 ? "is" : "are"} <b>${counts[keyOf(v)] || 0}</b> ✕`}</span></div>${chips(q, st)}`;
    },
    steps: [
      { caption: "On a line plot, each ✕ is ONE measurement. The number under the stack tells how long it was.", acts: [{ finger: { svg: [geom.px(focus[0]), geom.stackY(0)] } }] },
      { caption: q.hint, acts },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}

function textProblem(q) {
  const body = [...(q.text ? wrapText(q.text, 34) : []), ...wrapText(q.prompt, 34)];
  const work = wrapText(q.why.replace(/!$/, ""), 34);
  const W = 360, lineH = 22;
  const cardH = 18 + body.length * lineH + 8;
  const padY = cardH + 14;
  const H = padY + 18 + work.length * lineH + 14;
  const total = work.join("\n").length;
  return {
    key: "text", prompt: q.prompt,
    state0: { typed: 0, pick: 0 },
    render: (st) => {
      let n = Math.round(st.typed * total);
      const typedLines = work.map((ln) => { const t = ln.slice(0, Math.max(0, n)); n -= ln.length + 1; return t; });
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="geo-svg" aria-hidden="true">
        <rect x="3" y="3" width="${W - 6}" height="${cardH}" rx="16" fill="#fffdf7" stroke="#d7e6f7" stroke-width="2.4"/>
        ${body.map((ln, i) => `<text x="${W / 2}" y="${30 + i * lineH}" text-anchor="middle" font-size="15.5" font-weight="${i < (q.text ? wrapText(q.text, 34).length : 0) ? 700 : 900}" fill="#2b2340">${esc(ln)}</text>`).join("")}
        <rect x="3" y="${padY}" width="${W - 6}" height="${H - padY - 3}" rx="16" fill="#fff9db" stroke="#d9a20f" stroke-width="2" stroke-dasharray="6 5"/>
        <text x="16" y="${padY + 20}" font-size="12" font-weight="800" fill="#7a5a00">✏️ Scratch work</text>
        ${typedLines.map((ln, i) => `<text x="${W / 2}" y="${padY + 44 + i * lineH}" text-anchor="middle" font-size="16" font-weight="900" fill="#1d7fe0">${esc(ln)}</text>`).join("")}
      </svg>`;
    },
    hud: (st) => chips(q, st),
    steps: [
      { caption: `Read the problem carefully. ${q.prompt}`, acts: [{ finger: { svg: [W / 2, 40] }, travel: 900, wait: 500 }] },
      { caption: `Think it through. ${q.hint}`, acts: [{ finger: { svg: [W / 2, padY + 38] }, travel: 700, to: { typed: 1 }, ms: Math.max(1800, total * 55) }] },
      pickStep(q, `So the answer is ${q.answer}!`),
    ],
  };
}

function pitcherMore(q) {
  const P = q.pitcher;
  const need = Number(String(q.prompt.match(/\d[\d,]*/)?.[0] ?? P.capacity).replace(/,/g, ""));
  return {
    key: "pitcher", prompt: q.prompt,
    state0: { fill: P.fill, pick: 0 },
    render: (st) => pitcherSvg({ ...P, fill: st.fill, label: `${Math.round(st.fill)} ${P.unit}`, size: 220 }),
    hud: (st) => `<div class="demo-row"><span class="demo-readout">Need <b>${need} ${P.unit}</b> · pouring <b>+${Math.round(st.fill - P.fill)} ${P.unit}</b></span></div>${chips(q, st)}`,
    steps: [
      { caption: `The jug holds ${P.fill} ${P.unit} right now. The recipe needs ${need} ${P.unit}.`, acts: [{ finger: { fn: (st) => ({ svg: [PITCHER.jX + PITCHER.jW + 10, pitcherY(st.fill, P.capacity)] }) } }] },
      { caption: `Pour more in until we reach ${need}. How much did we add? ${q.hint}`, acts: [{ finger: { fn: (st) => ({ svg: [PITCHER.jX + PITCHER.jW + 10, pitcherY(st.fill, P.capacity)] }) }, travel: 500, to: { fill: need }, ms: 2400 }] },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}

function gridScene(q) {
  const R = q.rectGrid, G = rectGeom(R), perim = R.mode === "perimeter";
  const per = 2 * (R.rows + R.cols), area = R.rows * R.cols;
  const sides = [R.cols, R.rows, R.cols, R.rows];
  const around = (st) => {
    // a point walking clockwise around the outside
    let d = clamp(st.trace) * (G.w * 2 + G.h * 2);
    if (d <= G.w) return [G.padL + d, G.padT];
    d -= G.w; if (d <= G.h) return [G.padL + G.w, G.padT + d];
    d -= G.h; if (d <= G.w) return [G.padL + G.w - d, G.padT + G.h];
    d -= G.w; return [G.padL, G.padT + G.h - d];
  };
  const squareAt = (n) => { const i = Math.max(0, Math.min(area - 1, Math.ceil(n) - 1)); return [G.padL + (i % R.cols) * G.step + G.step / 2, G.padT + Math.floor(i / R.cols) * G.step + G.step / 2]; };
  return {
    key: "grid", prompt: q.prompt,
    state0: { trace: 0, fillN: 0, pick: 0 },
    render: (st) => rectGridSvg({ ...R, size: 310, trace: perim ? st.trace : null, fillCount: perim ? null : Math.round(st.fillN) }),
    hud: (st) => {
      if (perim) { const k = Math.min(4, Math.ceil(st.trace * 4 - 1e-6)); const parts = sides.slice(0, k); return `<div class="demo-row"><span class="demo-readout big">${parts.length ? `${parts.join(" + ")}${k === 4 ? ` = <b>${per}</b>` : ""}` : "Walk around the outside"}</span></div>${chips(q, st)}`; }
      return `<div class="demo-row"><span class="demo-readout big">Squares: <b>${Math.round(st.fillN)}</b></span></div>${chips(q, st)}`;
    },
    steps: perim
      ? [
        { caption: "Perimeter is the distance AROUND the outside edge, like walking along a fence.", acts: [{ finger: { svg: [G.padL, G.padT] } }] },
        { caption: `Walk all the way around and add every side: ${q.hint}`, acts: [{ finger: { fn: (st) => ({ svg: around(st) }) }, travel: 300, to: { trace: 1 }, ms: 4200 }] },
        pickStep(q, `Tap ${q.answer}. ${q.why}`),
      ]
      : [
        { caption: "Area is how many square tiles cover the INSIDE, like covering a rug.", acts: [{ finger: { svg: squareAt(1).slice(0, 2) } }] },
        { caption: `Count the squares, row by row. ${q.hint}`, acts: [{ finger: { fn: (st) => ({ svg: squareAt(st.fillN) }) }, travel: 300, to: { fillN: area }, ms: 800 + area * 180 }] },
        pickStep(q, `Tap ${q.answer}. ${q.why}`),
      ],
  };
}

function convertScene(q) {
  const C = q.convert;
  const ans = Number(String(q.answer).replace(/,/g, "").match(/[\d.]+/)?.[0] ?? 0);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const unit = C.rightText.replace("?", "").trim();
  return {
    key: "convert", prompt: q.prompt,
    state0: { v: 0, pick: 0 },
    render: (st) => conversionCardSvg({ ...C, rightText: st.v > 0 ? `${fmt(st.v)} ${unit}` : C.rightText, size: 330 }),
    hud: (st) => chips(q, st),
    steps: [
      { caption: `${q.say}`, acts: [{ finger: { svg: [61, 48] } }, { finger: { svg: [179, 48] }, travel: 1300 }] },
      { caption: `Use the rule on the card. ${q.hint}`, acts: [{ finger: { svg: [120, 96] }, travel: 700 }, { finger: { svg: [179, 48] }, travel: 700, to: { v: ans }, ms: 2200 }] },
      pickStep(q, `Tap ${q.answer}. ${q.why}`),
    ],
  };
}

/** The animated scene for one sample question. */
export function buildScene(key, q, level) {
  switch (key) {
    case "align-ruler": return alignRuler(q);
    case "set-clock": return setClock(q, level);
    case "build-money": return buildMoney(q);
    case "pour-jug": return pourJug(q);
    case "plot-x": return plotX(q);
    case "intro-find": return introFind(q);
    case "intro-name": return introName(q);
    case "compare": return compare(q, false);
    case "compare-diff": return compare(q, true);
    case "towers": return towers(q);
    case "scale": return scaleScene(q, false);
    case "scale-balance": return scaleScene(q, true);
    case "clock": return clockRead(q, level);
    case "clock-ampm": return clockAmPm(q);
    case "clock-elapsed": return clockElapsed(q, level);
    case "money-count": return moneyCount(q);
    case "calendar": case "calendar-count": return calendar(q);
    case "tally": return tally(q);
    case "picture": return pictureGraph(q);
    case "bar": return barGraph(q);
    case "lineplot": return linePlotRead(q);
    case "pitcher": return pitcherMore(q);
    case "grid": return gridScene(q);
    case "convert": return convertScene(q);
    default: return textProblem(q);
  }
}

export { sayAmount, unitWord, LEVELS };
