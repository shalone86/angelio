import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, tapCandle, tapLamp, swipe, starsFor, needy, difficulty, helpPerson, blockerOf, lightFree, LOW, ROUND, COMBO_GAP } from "../public/js/game.js";

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
const slowKid = (g) => { const out = needy(g).map((id) => g.candles[id]).find((c) => !c.lit); if (out) tapCandle(g, out.id); else if (g.lampOut) tapLamp(g); };
// a focused player: lamp when low, sends for help when someone's in the way, flickering candles just in time, then any out
const focused = (g) => {
  if (g.lampOut || g.lamp < 0.3) return tapLamp(g);
  const p = g.people.find((x) => !x.helped);
  if (p) return helpPerson(g, p.id);
  const n = needy(g).map((id) => g.candles[id]);
  const pick = n.find((c) => c.lit) ?? n[0];
  if (pick) tapCandle(g, pick.id);
};

test("stars: never tapping gets 1, a slow little one 2, a quick focused player 3", () => {
  for (const seed of [1, 2, 3, 7, 42]) {
    assert.equal(starsFor(play(idle, { seed }).g), 1, `idle, seed ${seed}`);
    assert.equal(starsFor(play(slowKid, { seed, every: 2 }).g), 2, `slow kid, seed ${seed}: ${play(slowKid, { seed, every: 2 }).g.score}`);
    assert.equal(starsFor(play(focused, { seed, every: 2 }).g), 2, `focused but slow, seed ${seed}`);
    assert.equal(starsFor(play(focused, { seed, every: 0.8 }).g), 3, `focused, seed ${seed}: ${play(focused, { seed, every: 0.8 }).g.score}`);
  }
});

test("a round lasts its length and ends once", () => {
  const { g, events } = play(focused, { every: 0.6 });
  assert.equal(g.t, ROUND); assert.equal(ROUND, 90);
  assert.equal(events.filter((e) => e.type === "end").length, 1);
  assert.deepEqual(tick(g, 1), []);
});

test("lighting: out → lit (1 point), flickering → just in time (3), burning → nothing", () => {
  const g = newGame({ seed: 3 });
  g.people = [];
  const out = g.candles.find((c) => c.active); out.lit = false;
  assert.equal(tapCandle(g, out.id).type, "lit");
  assert.equal(tapCandle(g, out.id).type, "already");
  out.life = LOW / 2; g.t += 5; // a pause: the combo starts again
  const r = tapCandle(g, out.id);
  assert.equal(r.type, "just-in-time"); assert.equal(r.points, 3);
  assert.equal(tapCandle(g, 99).type, "inactive");
});

test("combos: quick lights build a multiplier, a pause ends it", () => {
  const g = newGame({ seed: 4 });
  g.people = [];
  for (const c of g.candles) { c.active = true; c.lit = false; }
  const pts = [];
  for (let i = 0; i < 7; i++) { pts.push(tapCandle(g, i).points); tick(g, 0.5); }
  assert.deepEqual(pts, [1, 1, 2, 2, 2, 3, 3]);
  const ev = tick(g, COMBO_GAP + 0.1);
  assert.equal(ev.find((e) => e.type === "combo-end")?.combo, 7);
  assert.equal(tapCandle(g, 8).points, 1);
  assert.equal(g.bestCombo, 7);
});

test("someone kneeling blocks the candles behind them until they leave or the priest sends them to a pew", () => {
  const g = newGame({ seed: 5 });
  for (let i = 0; i < 300 && !g.people.length; i++) tick(g, 0.1);
  const p = g.people[0];
  assert.ok(p, "someone came to pray");
  assert.equal(blockerOf(g, g.candles.find((c) => c.rack === p.rack && c.slot === p.slot).id), null, "not in the way while walking up");
  for (let i = 0; i < 21; i++) tick(g, 0.1);
  const behind = g.candles.filter((c) => blockerOf(g, c.id) === p);
  assert.equal(behind.length, 4); // two spots across, both rows
  for (const c of behind) { c.active = true; c.lit = false; }
  assert.equal(tapCandle(g, behind[0].id).type, "blocked");
  assert.ok(!needy(g).includes(behind[0].id), "a blocked candle isn't shown as tappable");
  assert.equal(lightFree(g, behind[0].id), false);
  assert.ok(helpPerson(g, p.id, 1));
  assert.equal(helpPerson(g, p.id), false, "he's already going");
  let left;
  for (let i = 0; i < 20 && !left; i++) left = tick(g, 0.1).find((e) => e.type === "person-left");
  assert.equal(left.id, p.id); assert.equal(left.helped, true);
  assert.equal(tapCandle(g, behind[0].id).type, "lit");
});

test("people leave on their own too, and never two at one rack", () => {
  const { events } = play(idle, { seed: 8 });
  assert.ok(events.some((e) => e.type === "person-left" && !e.helped));
  const g = newGame({ seed: 8 });
  while (!g.over) { tick(g, 0.1); if (g.people.length === 2) assert.notEqual(g.people[0].rack, g.people[1].rack); }
});

test("every candle still burning when Mass begins counts", () => {
  const g = newGame({ seed: 6, length: 5 });
  g.people = []; g.nextPerson = Infinity;
  for (const c of g.candles) if (c.active) { c.lit = true; c.life = 1; }
  const before = g.score;
  const end = tick(g, 5).find((e) => e.type === "end");
  assert.ok(end.ready > 0);
  assert.equal(g.score - before, end.bonus);
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
