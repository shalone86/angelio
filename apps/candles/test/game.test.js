import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, tapCandle, tapLamp, swipe, starsFor, needy, difficulty, LOW } from "../public/js/game.js";

/** Play a whole round: every `every` seconds the player does one thing (or nothing). */
function play(policy, { seed = 7, every = 1, dt = 0.1 } = {}) {
  const g = newGame({ seed });
  let wait = 0, events = [];
  while (!g.over) {
    events.push(...tick(g, dt));
    wait -= dt;
    if (wait <= 0) { policy(g); wait = every; }
  }
  return { g, events };
}
const idle = () => {};
// a small child: taps any candle that's out, now and then; remembers the lamp only when it's out
const slowKid = (g) => { const out = g.candles.find((c) => c.active && !c.lit); if (out) tapCandle(g, out.id); else if (g.lampOut) tapLamp(g); };
// a focused player: lamp when low, intentions first, flickering candles just in time, then any that are out
const focused = (g) => {
  if (g.lampOut || g.lamp < 0.3) return tapLamp(g);
  const want = new Set(g.people.map((p) => p.glass));
  const n = needy(g).map((id) => g.candles[id]);
  const pick = n.find((c) => want.has(c.glass)) ?? n.find((c) => c.lit) ?? n[0];
  if (pick) tapCandle(g, pick.id);
};

test("stars: never tapping gets 1, a slow little one 2, a quick focused player 3", () => {
  for (const seed of [1, 2, 3, 7, 42]) {
    assert.equal(starsFor(play(idle, { seed }).g), 1, `idle, seed ${seed}`);
    assert.equal(starsFor(play(slowKid, { seed, every: 2 }).g), 2, `slow kid, seed ${seed}`);
    assert.equal(starsFor(play(focused, { seed, every: 2 }).g), 2, `focused but slow, seed ${seed}`);
    assert.equal(starsFor(play(focused, { seed, every: 0.6 }).g), 3, `focused, seed ${seed}: ${play(focused, { seed, every: 0.6 }).g.score}`);
  }
});

test("a round lasts its length and ends once", () => {
  const { g, events } = play(focused, { every: 0.6 });
  assert.equal(g.t, 180);
  assert.equal(events.filter((e) => e.type === "end").length, 1);
  assert.deepEqual(tick(g, 1), []);
});

test("lighting: out → lit (1 point), flickering → just in time (3), burning → nothing; the streak multiplies", () => {
  const g = newGame({ seed: 3 });
  const out = g.candles.find((c) => c.active && !c.lit) ?? (() => { const c = g.candles.find((x) => x.active); c.lit = false; return c; })();
  assert.equal(tapCandle(g, out.id).type, "lit");
  assert.equal(tapCandle(g, out.id).type, "already");
  out.life = LOW / 2;
  const r = tapCandle(g, out.id);
  assert.equal(r.type, "just-in-time"); assert.equal(r.points, 3);
  g.streak = 4;
  const c2 = g.candles.find((c) => c.active && c.id !== out.id); c2.lit = false;
  assert.equal(tapCandle(g, c2.id).points, 2); // the fifth in a row → ×2
  assert.equal(tapCandle(g, 99).type, "inactive");
});

test("a candle going out, a draft, or the lamp going out resets the streak; the door creaks first", () => {
  const { events } = play(idle);
  const creak = events.findIndex((e) => e.type === "creak"), gust = events.findIndex((e) => e.type === "gust");
  assert.ok(creak >= 0 && gust > creak, "a creak comes before the gust");
  assert.ok(events.some((e) => e.type === "out"));
  assert.ok(events.some((e) => e.type === "lamp-out"));
  assert.ok(events.find((e) => e.type === "creak").rack >= 0);
});

test("intentions: lighting the right color for someone praying is worth more and they leave happy", () => {
  const g = newGame({ seed: 5 });
  for (let i = 0; i < 200 && !g.people.length; i++) tick(g, 0.1);
  const p = g.people[0];
  assert.ok(p, "someone came to pray");
  const c = g.candles.find((x) => x.active && x.glass === p.glass) ?? Object.assign(g.candles.find((x) => x.glass === p.glass), { active: true });
  c.lit = false;
  const r = tapCandle(g, c.id);
  assert.equal(r.prayer.id, p.id);
  assert.ok(r.points >= 6);
  assert.equal(g.people.length, 0);
});

test("a swipe across three or more lights them all and adds a chain bonus", () => {
  const g = newGame({ seed: 9 });
  const row = g.candles.filter((c) => c.rack === 0 && c.row === 0);
  for (const c of row) { c.active = true; c.lit = false; }
  const s = swipe(g, row.map((c) => c.id).concat(row[0].id));
  assert.equal(s.chain, 4);
  assert.ok(s.bonus > 0);
});

test("it gets harder: more candles, faster burning, drafts only after the start", () => {
  assert.equal(difficulty(0).active, 6); assert.equal(difficulty(1).active, 16);
  assert.ok(difficulty(1).burn > difficulty(0).burn);
  assert.equal(difficulty(0.1).draftEvery, Infinity);
  assert.ok(difficulty(0.9).draftEvery < difficulty(0.3).draftEvery);
});

test("the same seed plays the same round (today's game)", () => {
  assert.equal(play(focused, { seed: 11, every: 0.6 }).g.score, play(focused, { seed: 11, every: 0.6 }).g.score);
});
