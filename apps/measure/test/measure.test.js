import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PER_LEVEL, GRADES, LEVELS, levelById, makeLevel, starsFor,
  formatTime, addMinutes, formatMoney, moneyValue, checkMoney,
} from "../public/js/measure.js";
import {
  MONEY_META, fracLabel, compareLengthSvg, rulerSvg, clockSvg, coinSvg,
  moneyTraySvg, scaleSvg, pitcherSvg, chartSvg, calendarSvg, rectGridSvg,
  conversionCardSvg,
} from "../public/js/measure-svg.js";
import { plural, unitWord, wantsScratch } from "../public/js/measure.js";
import { COMPARE_GEOM } from "../public/js/measure-svg.js";
import { levelScenes, buildScene, sceneKey, evalStep, endOfStep, plainTarget, stepAnimMs, SCENE_TITLES } from "../public/js/scenes.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(HERE, "../public");

test("curriculum structure: 4 grade bands, 23 unique levels, 5 Montessori intros", () => {
  assert.equal(PER_LEVEL, 6);
  assert.equal(GRADES.length, 4);
  assert.equal(LEVELS.length, 23);

  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, 23, "every level has a unique id");
  for (const id of ids) {
    assert.equal(levelById(id)?.id, id);
    assert.ok(levelScenes(levelById(id)).length >= 1, `animated scene exists for ${id}`);
  }

  const intros = LEVELS.filter((l) => Array.isArray(l.introCards));
  assert.equal(intros.length, 5);
  for (const l of intros) {
    assert.ok(l.introCards.length >= 5, `${l.id} has >= 5 intro cards`);
    for (const c of l.introCards) {
      assert.ok(c.id && c.name && c.badge && c.clue && c.say, `${l.id}:${c.id} has intro card text`);
      assert.ok(c.coin || c.clock || c.ruler || c.pitcher || c.scale || c.convert, `${l.id}:${c.id} has visual`);
    }
  }
});

test("all 23 levels × 200 seeds produce valid 6-question rounds without undefined/NaN", () => {
  const validTypes = new Set(["choose", "intro-match", "align-ruler", "set-clock", "build-money", "pour-jug", "plot-x"]);

  for (const lvl of LEVELS) {
    for (let seed = 1; seed <= 200; seed++) {
      const qs = makeLevel(lvl, seed);
      assert.equal(qs.length, PER_LEVEL, `${lvl.id} seed ${seed} returns 6 questions`);

      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        assert.ok(validTypes.has(q.type), `${lvl.id} seed ${seed} q${i} valid type ${q.type}`);
        assert.ok(q.prompt && q.say && q.hint && q.why, `${lvl.id} seed ${seed} q${i} text fields non-empty`);
        assert.ok(!/undefined|NaN/.test(`${q.prompt} ${q.say} ${q.hint} ${q.why}`), `${lvl.id} seed ${seed} q${i} clean text`);

        if (q.type === "choose" || q.type === "intro-match" || q.type === "align-ruler") {
          assert.ok(Array.isArray(q.choices) && q.choices.length >= 2, `${lvl.id} q${i} has choices`);
          assert.equal(new Set(q.choices).size, q.choices.length, `${lvl.id} q${i} choices unique`);
          assert.ok(q.choices.includes(q.answer), `${lvl.id} q${i} answer in choices`);
        }

        if (q.type === "intro-match" && q.askType === "visual") {
          for (const c of q.choices) assert.ok(q.choiceSpecs?.[c], `${lvl.id} q${i} choiceSpec for ${c}`);
        }

        if (q.type === "align-ruler") {
          assert.ok(q.ruler && q.ruler.obj && Number.isInteger(q.ruler.startOffset), `${lvl.id} q${i} valid align-ruler`);
        }

        if (q.type === "set-clock") {
          assert.ok(q.stepMinutes > 0 && 60 % q.stepMinutes === 0, `${lvl.id} q${i} clean minute step`);
          assert.match(formatTime(q.targetHour, q.targetMinute), /^\d{1,2}:\d{2}$/);
        }

        if (q.type === "build-money") {
          assert.ok(q.targetCents > 0 && Array.isArray(q.denominations) && q.denominations.length >= 3);
          for (const d of q.denominations) assert.ok(MONEY_META[d], `known denomination ${d}`);
        }

        if (q.type === "pour-jug") {
          assert.ok(q.start >= 0 && q.start <= q.capacity);
          assert.ok(q.target >= 0 && q.target <= q.capacity);
          assert.notEqual(q.start, q.target);
          assert.equal(Math.abs((q.target - q.start) % q.step), 0, `${lvl.id} q${i} reachable pour target`);
        }

        if (q.type === "plot-x") {
          const [min, max] = q.chart.range;
          assert.ok(q.targetVal >= min && q.targetVal <= max, `${lvl.id} q${i} targetVal in range`);
          const steps = (q.targetVal - min) / q.chart.step;
          assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, `${lvl.id} q${i} targetVal on grid tick`);
        }
      }
    }
  }
});

test("time, money, fraction & star helpers behave accurately", () => {
  assert.equal(formatTime(12, 0), "12:00");
  assert.equal(formatTime(0, 5), "12:05");
  assert.equal(formatTime(3, 60), "4:00");
  assert.deepEqual(addMinutes(11, 45, 50), { hour: 12, minute: 35 });
  assert.deepEqual(addMinutes(12, 20, -30), { hour: 11, minute: 50 });

  assert.equal(formatMoney(45), "45¢");
  assert.equal(formatMoney(100), "$1.00");
  assert.equal(formatMoney(625), "$6.25");
  assert.equal(moneyValue({ quarter: 2, dime: 1, nickel: 1, penny: 2 }), 67);
  assert.deepEqual(checkMoney({ d1: 1, quarter: 1 }, 125), { ok: true, total: 125, diff: 0 });

  assert.equal(fracLabel(2.25), "2¼");
  assert.equal(fracLabel(0.375), "⅜");
  assert.equal(fracLabel(1.5), "1½");
  assert.equal(fracLabel(3), "3");

  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(1), 2);
  assert.equal(starsFor(3), 2);
  assert.equal(starsFor(4), 1);
});

test("SVG renderers produce valid vector markup with zero NaN/undefined", () => {
  const svgs = [
    compareLengthSvg({ kind: "pencil", label: "Pencil", units: 6 }, { kind: "crayon", label: "Crayon", units: 3 }),
    compareLengthSvg({ label: "Blue", units: 4 }, { label: "Red", units: 2 }, { vertical: true }),
    rulerSvg({ unit: "in", max: 5, quarterTicks: true, obj: { kind: "key", units: 2.25 }, rulerOffset: 1, showZeroGuide: true, showAnswer: true }),
    clockSvg({ hour: 4, minute: 45, showMinuteRing: true }),
    coinSvg("quarter"),
    coinSvg("d5"),
    moneyTraySvg({ d5: 1, quarter: 2, dime: 1, penny: 3 }),
    scaleSvg({ left: { e: "🍉", label: "Melon" }, right: { e: "🍓", label: "Berry" }, tilt: -1 }),
    pitcherSvg({ capacity: 4, fill: 2, target: 3, unit: "cups" }),
    chartSvg({ kind: "tally", title: "Pets", rows: [{ label: "Dogs", count: 7 }] }),
    chartSvg({ kind: "picture", title: "Books", icon: "⭐", scale: 2, rows: [{ label: "Mia", value: 6 }] }),
    chartSvg({ kind: "bar", title: "Days", scale: 2, rows: [{ label: "June", value: 6 }, { label: "July", value: 10 }] }),
    chartSvg({ kind: "lineplot", title: "Leaves", unit: "in", range: [1, 3], step: 0.25, points: [1.5, 2.25], interactive: true }),
    calendarSvg({ month: "October", startDow: 2, days: 31, highlightDay: 10, markDays: [{ day: 10, emoji: "🎂" }] }),
    rectGridSvg({ rows: 3, cols: 4, unit: "ft", mode: "both" }),
    conversionCardSvg({ leftText: "1 ft", rightText: "12 in", sub: "3 ft = 36 in" }),
  ];

  for (const s of svgs) {
    assert.ok(s.startsWith("<svg ") && s.endsWith("</svg>"));
    assert.ok(!/NaN|undefined/.test(s), `unexpected NaN/undefined in SVG: ${s.slice(0, 140)}`);
  }
});

test("every mode a level asks has an animated scene that builds, evaluates and draws cleanly", () => {
  for (const lvl of LEVELS) {
    const found = new Set();
    for (let seed = 1; seed <= 60; seed++) for (const q of makeLevel(lvl, seed)) found.add(sceneKey(q));
    const scenes = levelScenes(lvl);
    for (const k of found) assert.ok(scenes.some((s) => s.key === k), `${lvl.id} has a scene for ${k}`);
    for (const { key, q } of scenes) {
      assert.ok(SCENE_TITLES[key], `${key} has a title`);
      const scene = buildScene(key, q, lvl);
      assert.ok(scene.steps.length >= 2, `${lvl.id}/${key} has steps`);
      let base = { state: { ...scene.state0 }, finger: null };
      let total = 0;
      for (const st of scene.steps) {
        assert.ok(st.caption && !/NaN|undefined/.test(st.caption), `${lvl.id}/${key} caption`);
        total += Math.max(3000, stepAnimMs(st.acts) + 400);
        for (const t of [0, 400, 1200, 2500, 4000, Infinity]) {
          const ev = evalStep(base, st.acts, t);
          const html = scene.render(ev.state) + (scene.hud?.(ev.state) ?? "");
          assert.ok(html.includes("<") && !/NaN|undefined/.test(html), `${lvl.id}/${key} draws at ${t}`);
          for (const d of [ev.finger.from, ev.finger.to]) {
            const p = plainTarget(d, ev.state);
            if (p?.svg) assert.ok(p.svg.every(Number.isFinite), `${lvl.id}/${key} finger point is a number`);
          }
        }
        base = endOfStep(base, st.acts);
      }
      assert.ok(total >= 9000 && total <= 40000, `${lvl.id}/${key} lasts ${total} ms`);
    }
  }
});

test("scene timeline: tweens are eased and finish exactly", () => {
  const acts = [{ finger: { pct: [0.5, 0.5] }, tap: true, to: { x: 10 }, ms: 1000 }];
  const base = { state: { x: 0 }, finger: null };
  assert.equal(evalStep(base, acts, 0).state.x, 0);
  const mid = evalStep(base, acts, 800 + 300 + 500).state.x;
  assert.ok(mid > 0 && mid < 10);
  assert.equal(evalStep(base, acts, Infinity).state.x, 10);
});

test("plural helper: 1 cup, 2 cups; short units stay", () => {
  assert.equal(plural(1, "cups"), "1 cup");
  assert.equal(plural(2, "cup"), "2 cups");
  assert.equal(plural(1, "quarts"), "1 quart");
  assert.equal(plural(3, "gallon"), "3 gallons");
  assert.equal(plural(1, "Liters"), "1 Liter");
  assert.equal(plural(1, "liters"), "1 liter");
  assert.equal(plural(1, "pints"), "1 pint");
  for (const u of ["mL", "L", "g", "kg", "oz", "lb", "in", "cm"]) assert.equal(plural(1, u), `1 ${u}`);
  assert.equal(unitWord(2, "mL"), "mL");
});

test("no question, button or hint says '1 cups' or any other '1 <plural>'", () => {
  const bad = /\b1 (cups|quarts|pints|gallons|liters|Liters|days|hours|minutes|weeks|dollars|feet inches|yards|meters|pounds|ounces|grams)\b/;
  for (const lvl of LEVELS) for (let seed = 1; seed <= 60; seed++) for (const q of makeLevel(lvl, seed)) {
    const text = [q.prompt, q.say, q.hint, q.why, q.text, ...(q.choices || [])].join(" | ");
    assert.ok(!bad.test(text), `${lvl.id}: ${text.match(bad)?.[0]}`);
    if (q.type === "pour-jug") {
      assert.ok(!bad.test(pitcherSvg({ capacity: q.capacity, fill: 1, unit: q.unit })), "pitcher label");
    }
  }
  assert.match(pitcherSvg({ capacity: 4, fill: 1, unit: "cups" }), />1 cup</);
});

test("pour jug: the Goal line is hidden until a hint, and the goal is said in words and numbers", () => {
  const plain = pitcherSvg({ capacity: 4, fill: 1, unit: "cups", tickStep: 1 });
  assert.ok(!plain.includes("Goal"));
  assert.ok(pitcherSvg({ capacity: 4, fill: 1, unit: "cups", target: 3 }).includes("Goal"));
  let seen = 0;
  for (let seed = 1; seed <= 20; seed++) for (const q of makeLevel(levelById("g3-pour-weigh"), seed)) {
    if (q.type !== "pour-jug") continue;
    seen++;
    assert.ok(q.prompt.includes(plural(q.target, q.unit)), "prompt names the target");
    assert.match(q.hint, /Goal line/);
    assert.ok(!/Goal line/.test(q.prompt + q.say), "the goal line is only mentioned in the hint");
  }
  assert.ok(seen > 0);
});

test("compare art: labels sit above their bar, inside the viewBox", () => {
  const svg = compareLengthSvg({ kind: "bookmark", label: "Bookmark (6 in)", units: 6 }, { kind: "leaf", label: "Leaf (2 in)", units: 2 });
  const G = COMPARE_GEOM.h;
  const labels = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)].filter((m) => /in\)/.test(m[3]));
  assert.equal(labels.length, 2);
  for (const m of labels) {
    const end = Number(m[1]) + m[3].length * 8.5; // generous: 13px bold text
    assert.ok(end <= G.W, `label "${m[3]}" ends at ${end} (viewBox ${G.W})`);
  }
  const barTop = Math.min(...G.barY) - 20;
  assert.ok(Number(labels[0][2]) < G.barY[0] - 13 && Number(labels[0][2]) > 16 && barTop > 16);
});

test("scratchpad button: grades 2-5 questions with numbers, never K-1 or intros", () => {
  const lvl = (id) => levelById(id);
  for (const q of makeLevel(lvl("g3-money-change"), 3)) assert.ok(wantsScratch(lvl("g3-money-change"), q));
  for (const q of makeLevel(lvl("k1-coins-count"), 3)) assert.ok(!wantsScratch(lvl("k1-coins-count"), q));
  for (const q of makeLevel(lvl("g2-ruler-intro"), 3)) assert.ok(!wantsScratch(lvl("g2-ruler-intro"), q));
  assert.ok(makeLevel(lvl("g4-convert-units"), 3).every((q) => wantsScratch(lvl("g4-convert-units"), q)));
});

test("service worker ASSETS all exist on disk in public/", () => {
  const sw = fs.readFileSync(path.join(PUB, "sw.js"), "utf8");
  const match = sw.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(match, "ASSETS array present in sw.js");
  const items = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(items.length >= 20);
  assert.ok(items.includes("js/scenes.js") && items.includes("js/kit/scratch.js"));
  for (const rel of items) {
    if (rel === "./") continue;
    const abs = path.join(PUB, rel);
    assert.ok(fs.existsSync(abs), `sw.js asset exists: ${rel}`);
  }
});
