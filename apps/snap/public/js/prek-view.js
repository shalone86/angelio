// The PreK math screens (prek.js makes the questions): drawn shapes, tap to answer, sort into baskets,
// patterns, more / fewer, sizes. Everything is said out loud; a miss gets a hint, two misses show the answer.

import { speak } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { vary, leadIn, praise } from "./kit/vary.js";
import { say } from "./kit/ui.js";
import { COLORS } from "./prek.js";

// ───────── drawing ─────────
const star = (() => { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 19 : 46, a = -Math.PI / 2 + (i * Math.PI) / 5; p.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(52 + r * Math.sin(a)).toFixed(1)}`); } return p.join(" "); })();
const PATHS = {
  circle: `<circle cx="50" cy="50" r="42"/>`,
  square: `<rect x="13" y="13" width="74" height="74" rx="4"/>`,
  triangle: `<polygon points="50,9 94,88 6,88" stroke-linejoin="round"/>`,
  rectangle: `<rect x="4" y="26" width="92" height="48" rx="4"/>`,
  star: `<polygon points="${star}" stroke-linejoin="round"/>`,
  heart: `<path d="M50 88 C18 64 4 46 14 26 C24 8 46 12 50 30 C54 12 76 8 86 26 C96 46 82 64 50 88 Z"/>`,
  oval: `<ellipse cx="50" cy="50" rx="45" ry="29"/>`,
  diamond: `<polygon points="50,5 88,50 50,95 12,50" stroke-linejoin="round"/>`,
};
/** One drawn shape: { shape, color, rot, scale } → SVG. */
export function shapeSvg(it, cls = "") {
  const s = it.scale ?? 1, r = it.rot ?? 0;
  return `<svg class="shp ${cls}" viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 50) scale(${s}) rotate(${r}) translate(-50 -50)" fill="${COLORS[it.color] ?? it.color}" stroke="#00000033" stroke-width="3">${PATHS[it.shape]}</g></svg>`;
}
const nameOf = (it) => `${it.color} ${it.shape}`;
const card = (it, i, extra = "") => `<button class="choice-card shape-card${extra}" data-i="${i}" aria-label="${nameOf(it)}">${shapeSvg(it)}</button>`;

// ───────── "How it works" cards ─────────
const row = (...its) => `<div class="lesson-row prek-row">${its.map((it) => `<span class="lesson-focus">${shapeSvg(it)}</span>`).join("")}</div>`;
export const PREK_LESSONS = {
  "find-shape": { emoji: "🔷", title: "Shapes", rule: "A <b>circle</b> is round. A <b>square</b> has 4 sides, all the same. A <b>triangle</b> has 3 sides. A <b>rectangle</b> has 4 sides, 2 long and 2 short.",
    exampleHtml: row({ shape: "circle", color: "red" }, { shape: "square", color: "blue" }, { shape: "triangle", color: "green" }, { shape: "rectangle", color: "orange" }),
    voice: "Let's learn shapes! A circle is round, like a ball. A square has four sides, all the same. A triangle has three sides. And a rectangle has four sides, two long and two short. Listen for the shape, and tap it!" },
  "find-shape-2": { emoji: "⭐", title: "More shapes", rule: "A <b>star</b> has 5 points. A <b>heart</b> is for love. An <b>oval</b> is like an egg. A <b>diamond</b> is like a kite.",
    exampleHtml: row({ shape: "star", color: "yellow" }, { shape: "heart", color: "red" }, { shape: "oval", color: "purple" }, { shape: "diamond", color: "blue" }),
    voice: "Here are more shapes! A star has five points. A heart is for love. An oval is like an egg. And a diamond is like a kite. Listen for the shape, and tap it!" },
  "world-shape": { emoji: "🍕", title: "Shapes all around", rule: "Shapes are everywhere! A pizza slice is a <b>triangle</b>. A ball is a <b>circle</b>. A door is a <b>rectangle</b>.",
    exampleHtml: `<div class="lesson-row prek-row"><span class="lesson-focus big-emoji">🍕</span>=<span class="lesson-focus">${shapeSvg({ shape: "triangle", color: "orange" })}</span></div>`,
    voice: "Shapes are all around us! A pizza slice is a triangle. A ball is a circle. A door is a rectangle. Look at the picture, and find its shape!" },
  "find-color": { emoji: "🎨", title: "Colors", rule: "Listen for the color, then tap it: <b style=\"color:#e8443a\">red</b>, <b style=\"color:#2f80ed\">blue</b>, <b style=\"color:#c9a227\">yellow</b>, <b style=\"color:#27ae60\">green</b>, <b style=\"color:#f2994a\">orange</b>, <b style=\"color:#9b51e0\">purple</b>.",
    exampleHtml: row(...["red", "blue", "yellow", "green", "orange", "purple"].map((c) => ({ shape: "circle", color: c }))),
    voice: "Let's find colors! Red, blue, yellow, green, orange, and purple. Listen for the color, and tap it!" },
  sort: { emoji: "🧺", title: "Sorting", rule: "<b>Sort</b> means put things that go together in the same basket. Look at each one, then tap its basket!",
    exampleHtml: `<div class="lesson-row prek-row">${shapeSvg({ shape: "circle", color: "red" })}${shapeSvg({ shape: "square", color: "red" })}<span class="lesson-focus">🧺</span>${shapeSvg({ shape: "circle", color: "blue" })}<span class="lesson-focus">🧺</span></div>`,
    voice: "Sorting means putting things that go together in the same basket. Look at each one. Is it red, or blue? Then tap its basket!" },
  odd: { emoji: "🤔", title: "Which one doesn't belong?", rule: "Three are <b>the same</b>. One is <b>different</b>: a different color, a different shape, or a different size. Find it!",
    exampleHtml: row({ shape: "circle", color: "blue" }, { shape: "circle", color: "blue" }, { shape: "circle", color: "red" }, { shape: "circle", color: "blue" }),
    voice: "Three are the same, and one is different. It could be a different color, a different shape, or a different size. Find the one that doesn't belong!" },
  pattern: { emoji: "🔁", title: "Patterns", rule: "A <b>pattern</b> repeats: red, blue, red, blue… Say it out loud, and guess what comes next!",
    exampleHtml: row({ shape: "circle", color: "red" }, { shape: "circle", color: "blue" }, { shape: "circle", color: "red" }, { shape: "circle", color: "blue" }) + `<p class="lesson-say"><span class="lesson-focus">red, blue, red, blue, <b>red!</b></span></p>`,
    voice: "A pattern repeats, again and again. Red, blue, red, blue. Say it out loud! What comes next? Red!" },
  compare: { emoji: "⚖️", title: "More or fewer", rule: "<b>More</b> means a bigger number. <b>Fewer</b> means a smaller number. Count each group to check!",
    exampleHtml: `<div class="lesson-row prek-row"><span class="lesson-focus big-emoji">🍎🍎🍎🍎</span><span class="lesson-focus big-emoji">🍎🍎</span></div><p class="lesson-say"><span class="lesson-focus">4 is <b>more</b>. 2 is <b>fewer</b>.</span></p>`,
    voice: "More means a bigger number. Fewer means a smaller number. Four apples is more than two apples. Two apples is fewer. Count each group to check!" },
  "compare-same": { emoji: "🟰", title: "More, fewer or the same", rule: "Count both groups. If they have the <b>same</b> number, tap <b>Same</b>!",
    exampleHtml: `<div class="lesson-row prek-row"><span class="lesson-focus big-emoji">🐟🐟🐟</span><span class="lesson-focus big-emoji">🐟🐟🐟</span></div><p class="lesson-say"><span class="lesson-focus">3 and 3: the <b>same</b>!</span></p>`,
    voice: "Count both groups. Which has more? Which has fewer? And if they have the same number, tap the button that says same!" },
  size: { emoji: "🐘", title: "Big and small", rule: "<b>Bigger</b> and <b>smaller</b>. <b>Longer</b> and <b>shorter</b>. <b>Taller</b> and <b>shorter</b>. Look carefully, and compare!",
    exampleHtml: `<div class="lesson-row prek-row" style="align-items:flex-end"><span class="lesson-focus" style="font-size:3.4rem">🌲</span><span class="lesson-focus" style="font-size:1.8rem">🌲</span></div><p class="lesson-say"><span class="lesson-focus">This tree is <b>taller</b>!</span></p>`,
    voice: "Some things are bigger and some are smaller. Some are longer and some are shorter. Some are taller. Look carefully, and compare!" },
};
export const prekLessonFor = (level) => PREK_LESSONS[level.id === "shapes-2" ? "find-shape-2" : level.id === "more-same" ? "compare-same" : level.type];

// ───────── answering ─────────
/** Taps on `buttons` (index = data-i); resolves after the right one, or after 2 misses with it shown. */
function choose(ctx, buttons, answer, { hint, right, reveal }) {
  let tries = 0;
  return new Promise((resolve) => {
    buttons.forEach((b) => b.onclick = () => {
      if (!ctx.alive() || b.disabled) return;
      sfx.select();
      const i = b.dataset.i;
      if (String(i) === String(answer)) {
        buttons.forEach((x) => { x.disabled = true; });
        b.classList.add("right"); sfx.right(); FX.confetti(20);
        say(ctx.bubble, `${praise()} ${right}`);
        return resolve(true);
      }
      tries++; ctx.miss();
      b.classList.add("wrong"); b.disabled = true; FX.shake(b); sfx.oops();
      if (tries >= 2) {
        buttons.forEach((x) => { x.disabled = true; if (String(x.dataset.i) === String(answer)) x.classList.add("right"); });
        say(ctx.bubble, reveal);
        return setTimeout(() => resolve(false), 1400);
      }
      say(ctx.bubble, hint);
    });
  });
}

const opener = (ctx) => (ctx.k > 0 ? `${leadIn()} ` : "");

export async function runPrekQuestion(q, ctx) {
  const { stage, dock, bubble } = ctx;
  stage.innerHTML = ""; dock.innerHTML = "";
  stage.className = `stage prek prek-${q.type}`;
  switch (q.type) {
    case "find-shape":
    case "find-color": {
      dock.innerHTML = `<div class="choices shape-choices">${q.choices.map((c, i) => card(c, i)).join("")}</div>`;
      stage.innerHTML = q.type === "find-shape" ? `<div class="prek-ask">Find the <b>${q.target}</b></div>` : `<div class="prek-ask">Find <b style="color:${COLORS[q.target]}">${q.target}</b></div>`;
      say(bubble, `${opener(ctx)}${q.say}`);
      const isShape = q.type === "find-shape";
      return choose(ctx, [...dock.querySelectorAll("[data-i]")], q.answer, {
        hint: isShape ? vary("shape-hint", [`Look for the ${q.target}. ${shapeHint(q.target)}`, `Hmm, that's not it. ${shapeHint(q.target)}`]) : `That one is ${q.choices.find((c, i) => i !== q.answer && dock.querySelector(`[data-i="${i}"]`)?.disabled)?.color ?? "a different color"}. Find ${q.target}!`,
        right: isShape ? `That's the ${q.target}!` : `That's ${q.target}!`,
        reveal: isShape ? `Here's the ${q.target}. ${shapeHint(q.target)}` : `Here's ${q.target}!`,
      });
    }
    case "world-shape": {
      stage.innerHTML = `<div class="world-pic" aria-hidden="true">${q.emoji}</div><div class="prek-ask">What shape is the <b>${q.thing}</b>?</div>`;
      dock.innerHTML = `<div class="choices shape-choices">${q.choices.map((c, i) => `<button class="choice-card shape-card named" data-i="${i}" aria-label="${c.shape}">${shapeSvg(c)}<span>${c.shape}</span></button>`).join("")}</div>`;
      say(bubble, `${opener(ctx)}${q.say}`);
      dock.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("pointerenter", () => {}));
      return choose(ctx, [...dock.querySelectorAll("[data-i]")], q.answer, {
        hint: `Look at the ${q.thing}'s edges. ${shapeHint(q.target)}`, right: `The ${q.thing} is a ${q.target}!`, reveal: `The ${q.thing} is a ${q.target}. ${shapeHint(q.target)}`,
      });
    }
    case "odd": {
      dock.innerHTML = `<div class="choices shape-choices four">${q.items.map((c, i) => card(c, i)).join("")}</div>`;
      stage.innerHTML = `<div class="prek-ask">Which one <b>doesn't belong</b>?</div>`;
      say(bubble, `${opener(ctx)}${q.say} Three are the same, and one is different.`);
      return choose(ctx, [...dock.querySelectorAll("[data-i]")], q.answer, {
        hint: q.by === "color" ? "Look at the colors." : q.by === "shape" ? "Look at the shapes." : "Look at the sizes.", right: q.why, reveal: `This one doesn't belong. ${q.why}`,
      });
    }
    case "pattern": {
      // one row, each piece an equal share of it, so a long pattern still fits a phone
      stage.innerHTML = `<div class="pattern-row" style="grid-template-columns: repeat(${q.seq.length + 1}, minmax(0, 64px))">${q.seq.map((c) => `<span class="pat">${shapeSvg(c)}</span>`).join("")}<span class="pat slot" aria-label="what comes next">?</span></div>`;
      dock.innerHTML = `<div class="choices shape-choices">${q.choices.map((c, i) => card(c, i)).join("")}</div>`;
      const said = q.seq.map(word).join(", ");
      say(bubble, `${opener(ctx)}${q.say}`);
      const ok = await choose(ctx, [...dock.querySelectorAll("[data-i]")], q.answer, {
        hint: `Say it out loud: ${said}… What comes next?`, right: `${said}, ${word(q.choices[q.answer])}!`, reveal: `${said}, ${word(q.choices[q.answer])}. The pattern keeps going!`,
      });
      const slot = stage.querySelector(".slot");
      slot.classList.remove("slot"); slot.innerHTML = shapeSvg(q.choices[q.answer]); FX.pop(slot, 1.2);
      return ok;
    }
    case "compare": {
      const group = (n, i) => `<button class="group-card" data-i="${i}" aria-label="${n} ${q.things}"><span class="things">${q.emoji.repeat(n)}</span><span class="n" hidden>${n}</span></button>`;
      stage.innerHTML = `<div class="groups">${q.groups.map(group).join("")}</div>`;
      const withSame = q.withSame || q.ask === "same";
      dock.innerHTML = withSame ? `<div class="choices"><button class="btn big same-btn" data-i="same">🟰 Same</button></div>` : "";
      say(bubble, `${opener(ctx)}${q.say}`);
      const [a, b] = q.groups;
      const tell = a === b ? `${a} and ${b}. They're the same!` : `${Math.max(a, b)} is more than ${Math.min(a, b)}. ${Math.min(a, b)} is fewer.`;
      const ok = await choose(ctx, [...stage.querySelectorAll("[data-i]"), ...dock.querySelectorAll("[data-i]")], q.answer, {
        hint: "Count each group, one at a time. Then compare the numbers!", right: tell, reveal: tell,
      });
      stage.querySelectorAll(".n").forEach((x) => { x.hidden = false; }); // show the counts
      return ok;
    }
    case "size": {
      const els = q.sizes.map((s, i) => {
        if (q.dim === "long") return `<button class="size-card long" data-i="${i}" aria-label="${q.thing}">${q.thing === "pencil" ? pencil(s) : snake(s)}</button>`;
        return `<button class="size-card" data-i="${i}" aria-label="${q.thing}"><span style="font-size:${(1.6 + s * 4.2).toFixed(2)}rem">${q.emoji}</span></button>`;
      }).join("");
      stage.innerHTML = `<div class="sizes ${q.dim}">${els}</div>`;
      say(bubble, `${opener(ctx)}${q.say}`);
      return choose(ctx, [...stage.querySelectorAll("[data-i]")], q.answer, {
        hint: `Look carefully. Which one is ${q.word}?`, right: `That ${q.thing} is ${q.word}!`, reveal: `This ${q.thing} is ${q.word}.`,
      });
    }
    case "sort": return sortQuestion(q, ctx);
  }
}

const word = (c) => (c.shape === "circle" && c.color ? c.color : c.color === "blue" ? c.shape : `${c.color} ${c.shape}`);
function shapeHint(s) {
  return { circle: "A circle is round, with no corners.", square: "A square has 4 sides that are all the same.", triangle: "A triangle has 3 sides and 3 corners.",
    rectangle: "A rectangle has 4 sides: 2 long and 2 short.", star: "A star has 5 points.", heart: "A heart is the shape of love.", oval: "An oval is like an egg.", diamond: "A diamond is like a kite." }[s] ?? "";
}
const pencil = (s) => `<svg viewBox="0 0 300 40" style="width:${Math.round(s * 100)}%" aria-hidden="true"><rect x="22" y="8" width="250" height="24" rx="3" fill="#f2c94c" stroke="#c9a227" stroke-width="2"/><polygon points="22,8 0,20 22,32" fill="#f4d9b0"/><polygon points="7,16 0,20 7,24" fill="#333"/><rect x="272" y="8" width="22" height="24" rx="4" fill="#f28ca0"/></svg>`;
const snake = (s) => `<svg viewBox="0 0 300 40" style="width:${Math.round(s * 100)}%" aria-hidden="true"><rect x="0" y="10" width="285" height="20" rx="10" fill="#27ae60"/><circle cx="282" cy="20" r="14" fill="#27ae60"/><circle cx="287" cy="15" r="3" fill="#fff"/><circle cx="288" cy="15" r="1.5" fill="#000"/></svg>`;

/** Sort: one piece at a time; tap its basket. A wrong basket shakes and says which one. */
function sortQuestion(q, ctx) {
  const { stage, dock, bubble } = ctx;
  const field = q.by;
  stage.innerHTML = `<div class="to-sort">${q.items.map((it, i) => `<span class="pat sortee" data-n="${i}">${shapeSvg(it)}</span>`).join("")}</div>`;
  dock.innerHTML = `<div class="baskets">${q.baskets.map((b, i) => `<button class="basket" data-b="${i}" aria-label="${b.label} basket">
      <span class="basket-label">${field === "color" ? `<b style="color:${COLORS[b.color]}">${b.label}</b>` : `<span class="mini">${shapeSvg({ shape: b.shape, color: "blue" })}</span>${b.label}`}</span>
      <span class="pile"></span><span class="basket-emoji" aria-hidden="true">🧺</span></button>`).join("")}</div>`;
  say(bubble, `${opener(ctx)}${q.say}`);
  const pieces = [...stage.querySelectorAll(".sortee")], baskets = [...dock.querySelectorAll(".basket")];
  let n = 0, missedThis = false, busy = false; // busy: a piece is still flying to its basket
  const current = () => pieces[n];
  const mark = () => { pieces.forEach((p, i) => p.classList.toggle("now", i === n)); };
  mark();
  return new Promise((resolve) => {
    baskets.forEach((b) => b.onclick = async () => {
      if (!ctx.alive() || busy || n >= pieces.length) return;
      const it = q.items[n], want = q.baskets.findIndex((x) => x[field] === it[field]);
      if (+b.dataset.b === want) {
        sfx.select();
        busy = true;
        const p = current();
        const before = FX.capture([p]);
        p.classList.remove("now");
        b.querySelector(".pile").append(p);
        await FX.flip(before, { dur: 450, arc: 30 });
        n++; missedThis = false; busy = false;
        if (n === pieces.length) { FX.confetti(25); say(bubble, `${praise()} ${vary("sorted", ["All sorted!", "Every one is in its basket!", "You sorted them all!"])}`); return resolve(true); }
        speak(field === "color" ? q.items[n].color : q.items[n].shape);
        mark();
        return;
      }
      if (!missedThis) { ctx.miss(); missedThis = true; }
      FX.shake(b); sfx.oops();
      say(bubble, field === "color" ? `This one is ${it.color}. Find the ${it.color} basket!` : `This one is a ${it.shape}. Find the ${it.shape}s!`);
    });
  });
}
