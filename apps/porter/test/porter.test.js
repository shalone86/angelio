import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, decide, waiting, starsFor, pool } from "../public/js/porter.js";
import { STAGES, isOpen } from "../public/js/stages.js";
import { VISITORS } from "../public/js/visitors.js";

// a pretend porter: answers the visitor at the door after `delay` seconds; `policy(v)` picks the answer (null: never)
function play(delay, policy, { seed = 7, stage = STAGES[0] } = {}) {
  const g = newGame({ seed, stage });
  let seen = 0, who = null;
  while (!g.over) {
    tick(g, 0.1);
    const v = waiting(g);
    if (v !== who) { who = v; seen = 0; }
    if (v) { seen += 0.1; const c = policy(v); if (c && seen >= delay) decide(g, c); }
  }
  return g;
}
const right = (v) => v.answer, always = (c) => () => c, never = () => null;
const wrongWay = (v) => (v.answer === "in" ? "later" : "in");

test("every stage has visitors to welcome and visitors to send on, and each has its words", () => {
  for (const st of STAGES) {
    const p = pool(st);
    assert.ok(p.in.length >= 3 && p.later.length >= 3, `${st.id} has both kinds of visitor`);
    for (const v of [...p.in, ...p.later]) {
      assert.ok(v.line && v.emoji, v.id);
      if (v.answers[st.id] === "later") assert.ok(v.later, `${v.id} says something kind when sent on`);
      assert.ok(v.why[st.id], `${v.id} has a gentle hint for ${st.id}`);
    }
  }
  assert.equal(new Set(VISITORS.map((v) => v.id)).size, VISITORS.length);
});

test("someone in trouble always comes in; the goat and the peddler never do", () => {
  for (const st of STAGES) for (const id of ["hurt", "cold"]) assert.equal(VISITORS.find((v) => v.id === id).answers[st.id] ?? "in", "in");
  for (const st of STAGES) for (const id of ["goat", "peddler"]) assert.equal(VISITORS.find((v) => v.id === id).answers[st.id], "later");
});

test("the same seed brings the same visitors", () => {
  const names = (seed) => { const g = newGame({ seed }); const out = []; while (!g.over && out.length < 8) { for (const e of tick(g, 0.1)) if (e.type === "arrive") out.push(e.v.def); } return out.join(); };
  assert.equal(names(5), names(5));
});

test("deciding: right answers score (quick ones more), wrong ones cost a little, and the door is busy a while", () => {
  const g = newGame({ seed: 3 });
  let v;
  while (!(v = waiting(g))) tick(g, 0.1);
  const r = decide(g, v.answer);
  assert.ok(r.correct && r.points >= 8 && r.quick);
  assert.equal(decide(g, "in").type, "none", "nobody at the door right now");
  const g2 = newGame({ seed: 3 });
  while (!(v = waiting(g2))) tick(g2, 0.1);
  g2.score = 10;
  assert.equal(decide(g2, wrongWay(v)).points, -8); assert.equal(g2.score, 2); assert.equal(g2.wrong, 1);
});

test("someone made to wait too long gives up (and it only counts against you if they should have come in)", () => {
  const g = newGame({ seed: 4 });
  const left = [];
  while (!g.over && left.length < 3) for (const e of tick(g, 0.1)) if (e.type === "leave") left.push(e.v);
  assert.equal(left.length, 3); assert.equal(g.missed, 3);
  assert.equal(g.wrong, left.filter((v) => v.answer === "in").length);
});

test("important guests are in a hurry", () => {
  const v = VISITORS.find((x) => x.vip);
  assert.ok(v);
  const st = STAGES.find((s) => v.answers[s.id]);
  const g = newGame({ seed: 1, stage: { ...st, inShare: 1 } });
  g.pool = { in: [v], later: [v] }; g.queue = []; g.nextArrival = 0; g.last = null;
  tick(g, 0.1);
  const seen = g.queue[0] ?? g.front;
  assert.ok(seen.max < st.patience);
});

test("stages open in order, each with two stars on the one before", () => {
  const stars = { porter: 2, "porter-guests": 0 };
  const starsOf = (s) => stars[s.progress ?? `porter-${s.id}`] ?? 0;
  assert.deepEqual(STAGES.map((_, i) => isOpen(i, starsOf)), [true, true, false]);
});

test("stars on every stage: idle 1, welcoming (or sending away) everyone never 3, a slow careful porter 2 or more, a quick one 3 on most nights", () => {
  for (const stage of STAGES) {
    let threes = 0;
    for (const seed of [1, 2, 3, 7, 42]) {
      assert.equal(starsFor(play(1, never, { seed, stage })), 1, `${stage.id} idle`);
      for (const c of ["in", "later"]) { const all = play(1.5, always(c), { seed, stage }); assert.ok(starsFor(all) < 3, `${stage.id} always ${c}, seed ${seed}: ${all.score}`); }
      const slow = play(5, right, { seed, stage }), quick = play(1.5, right, { seed, stage });
      assert.ok(starsFor(slow) >= 2, `${stage.id} slow but right, seed ${seed}: ${slow.score}`);
      assert.ok(starsFor(quick) >= starsFor(slow), `${stage.id} quick, seed ${seed}`);
      if (starsFor(quick) === 3) threes++;
    }
    assert.ok(threes >= 3, `${stage.id}: a quick porter gets three stars on ${threes} of 5`);
  }
});

test("a round ends once, at the bell", () => {
  const g = newGame({ seed: 2 });
  let ends = 0;
  while (!g.over) for (const e of tick(g, 0.1)) if (e.type === "end") ends++;
  assert.equal(ends, 1); assert.equal(g.t, g.length); assert.deepEqual(tick(g, 1), []);
});
