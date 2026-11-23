import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, toggleDoor, greet, sendAway, waiting, starsFor, pool, multOf, GRACE, FREE_OPEN } from "../public/js/porter.js";
import { STAGES, isOpen } from "../public/js/stages.js";
import { VISITORS, ANIMALS, hintFor, WELCOMES } from "../public/js/visitors.js";

// A pretend porter. After `delay` seconds of seeing someone at the door it does `strat`'s action; the door is kept
// open only while the next visitor is one who belongs (a person looks at the line).
export function play(delay, strat, { seed = 7, stage = STAGES[0], cap = 400, err = 0 } = {}) {
  const g = newGame({ seed, stage });
  const slip = (() => { let a = seed * 7919 + 13; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })(); // a porter who sometimes slips (err = how often)
  let seen = 0, who = null;
  while (!g.over && g.t < cap) {
    tick(g, 0.1);
    const v = waiting(g);
    if (v !== who) { who = v; seen = 0; }
    if (strat === "right") {
      const next = g.front ?? g.queue[0];
      if (g.door && next && next.answer !== "in") toggleDoor(g);
      if (v) {
        seen += 0.1;
        if (seen >= delay) {
          const ans = slip() < err ? ["in", "greet", "away"].filter((x) => x !== v.answer)[Math.floor(slip() * 2)] : v.answer;
          if (ans === "in") { if (!g.door) toggleDoor(g); } else if (ans === "greet") greet(g); else sendAway(g);
        }
      }
    } else if (v) {
      seen += 0.1;
      if (seen >= delay) { if (strat === "door") { if (!g.door) toggleDoor(g); } else if (strat === "greet") greet(g); else if (strat === "away") sendAway(g); }
    }
  }
  return g;
}

test("every stage has people who belong, special guests and people to send on, and each has its words", () => {
  for (const st of STAGES) {
    const p = pool(st);
    assert.ok(p.in.length >= 4 && p.greet.length >= 3 && p.away.length >= 8, `${st.id} has all three kinds of visitor`);
    for (const v of [...p.in, ...p.greet, ...p.away]) {
      assert.ok(v.line && v.emoji, v.id);
      const a = v.answers[st.rules ?? st.id];
      if (a === "away") assert.ok(v.later, `${v.id} says something kind when sent on`);
      if (a === "greet") assert.ok(v.reply, `${v.id} has a greeting to be answered with`);
      assert.ok(hintFor(v, st.rules ?? st.id), `${v.id} has a gentle hint`);
    }
    assert.equal(st.mix.in + st.mix.greet + st.mix.away, 1, `${st.id} mix adds up`);
  }
  assert.equal(new Set(VISITORS.map((v) => v.id)).size, VISITORS.length);
  assert.ok(ANIMALS.length >= 10 && ANIMALS.every((a) => VISITORS.some((v) => v.kind === a)), "every animal comes to the door");
  assert.ok(new Set(WELCOMES).size >= 10, "plenty of different ways to welcome someone");
});

test("someone in trouble always comes in; animals are never let in; dignitaries are greeted", () => {
  for (const st of STAGES) for (const id of ["hurt", "cold"]) assert.equal(VISITORS.find((v) => v.id === id).answers[st.rules ?? st.id], "in");
  for (const v of VISITORS.filter((x) => ANIMALS.includes(x.kind))) for (const a of Object.values(v.answers)) assert.equal(a, "away", v.id);
  for (const id of ["bishop", "mayor", "glory"]) assert.ok(Object.values(VISITORS.find((v) => v.id === id).answers).every((a) => a === "greet"));
});

test("the same seed brings the same visitors", () => {
  const names = (seed) => { const g = newGame({ seed }); const out = []; while (!g.over && out.length < 10) { for (const e of tick(g, 0.1)) if (e.type === "arrive") out.push(e.v.def); } return out.join(); };
  assert.equal(names(5), names(5));
});

test("the door: opening it lets the visitor in; an open door lets the next walk in by themselves; the wrong ones are mistakes", () => {
  const g = newGame({ seed: 3, stage: { ...STAGES[0], mix: { in: 1, greet: 0, away: 0 } } });
  while (!waiting(g)) tick(g, 0.1);
  const ev = toggleDoor(g);
  assert.ok(ev.find((e) => e.type === "door").open); const d = ev.find((e) => e.type === "decided");
  assert.ok(d.correct && d.how === "door" && d.points >= 13);
  // the next one walks in by themselves after a moment, with no tap
  let again = null; for (let i = 0; i < 80 && !again; i++) again = tick(g, 0.1).find((e) => e.type === "decided");
  assert.ok(again?.auto && again.correct, "the next one walked in");
  // a goat who walks in through the open door is a mistake
  const h = newGame({ seed: 3, stage: { ...STAGES[0], mix: { in: 0, greet: 0, away: 1 } } });
  h.score = 20; h.nextArrival = 0.1; toggleDoor(h);
  let bad = null; for (let i = 0; i < 80 && !bad; i++) bad = tick(h, 0.1).find((e) => e.type === "decided");
  assert.ok(bad && !bad.correct && bad.how === "door" && h.wrong === 1 && h.score === 12);
  assert.ok(GRACE < 1.5, "there's a moment to catch the wrong ones");
});

test("an open door costs points after a few seconds (a draft)", () => {
  const g = newGame({ seed: 2, stage: { ...STAGES[0], mix: { in: 0, greet: 0, away: 1 }, every: [999, 999] } });
  g.queue = []; g.nextArrival = 1e9; g.score = 50; toggleDoor(g);
  for (let i = 0; i < FREE_OPEN * 10; i++) tick(g, 0.1);
  assert.equal(Math.round(g.score), 50, "free for the first moments");
  for (let i = 0; i < 40; i++) tick(g, 0.1);
  assert.ok(g.score < 45 && g.drained > 5, `the draft cost ${g.drained}`);
  toggleDoor(g); const s = g.score; for (let i = 0; i < 30; i++) tick(g, 0.1); assert.equal(g.score, s, "closed again: no more cost");
});

test("greeting: a special guest is worth the most; walking in without a greeting, or being sent away, is a mistake", () => {
  const mk = (mix) => { const g = newGame({ seed: 4, stage: { ...STAGES[0], mix } }); while (!waiting(g)) tick(g, 0.1); return g; };
  let g = mk({ in: 0, greet: 1, away: 0 }); g.score = 30;
  const r = greet(g)[0]; assert.ok(r.correct && r.points >= 23 && r.mult === 1, `greeted for ${r.points}`);
  g = mk({ in: 0, greet: 1, away: 0 }); g.score = 30;
  const r2 = sendAway(g)[0]; assert.ok(!r2.correct && g.score === 22);
  g = mk({ in: 0, greet: 1, away: 0 }); g.score = 30;
  assert.ok(!toggleDoor(g).find((e) => e.type === "decided").correct, "no greeting: a mistake");
  g = mk({ in: 1, greet: 0, away: 0 });
  assert.ok(greet(g)[0].correct, "greeting an ordinary visitor is fine, just worth less");
});

test("a combo of right answers in a row multiplies the points; a mistake ends it", () => {
  const g = newGame({ seed: 6, stage: { ...STAGES[0], mix: { in: 0, greet: 0, away: 1 } } });
  const pts = [];
  for (let i = 0; i < 12; i++) { while (!waiting(g)) tick(g, 0.1); pts.push(sendAway(g)[0].mult); }
  assert.deepEqual(pts, [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3]); assert.equal(multOf(g), 3);
  while (!waiting(g)) tick(g, 0.1); toggleDoor(g); assert.equal(g.streak, 0); assert.equal(multOf(g), 1);
});

test("someone made to wait too long gives up (a mistake only if they should have come in)", () => {
  const g = newGame({ seed: 4 });
  const left = [];
  while (!g.over && left.length < 3) for (const e of tick(g, 0.1)) if (e.type === "leave") left.push(e.v);
  assert.equal(left.length, 3); assert.equal(g.missed, 3);
  assert.equal(g.wrong, left.filter((v) => v.answer !== "away").length);
});

test("important guests are in a hurry", () => {
  const v = VISITORS.find((x) => x.vip);
  const g = newGame({ seed: 1 });
  g.pool = { in: [v], greet: [v], away: [v] }; g.queue = []; g.nextArrival = 0; g.last = null;
  tick(g, 0.1);
  assert.ok((g.queue[0] ?? g.front).max < g.stage.patience);
});

test("stages open in order; the feast day opens with two stars on Sunday Mass", () => {
  const stars = { porter: 2, "porter-guests": 0, "porter-night": 0 };
  const starsOf = (s) => stars[s.progress ?? `porter-${s.id}`] ?? 0;
  assert.deepEqual(STAGES.map((_, i) => isOpen(i, starsOf)), [true, true, false, true]);
});

test("stars on every stage: idle 1; opening everything, greeting everything or sending everyone away never 3; a careful one 2; a quick and right one 3 on most", () => {
  for (const stage of STAGES) {
    let threes = 0;
    for (const seed of [1, 2, 3, 7, 42]) {
      assert.equal(starsFor(play(1, "idle", { seed, stage })), 1, `${stage.id} idle`);
      for (const s of ["door", "greet", "away"]) { const g = play(0.5, s, { seed, stage }); assert.ok(starsFor(g) < 3, `${stage.id} always ${s}, seed ${seed}: ${g.score}`); }
      const careful = play(1.4, "right", { seed, stage, err: 0.15 }), slow = play(2.5, "right", { seed, stage }), quick = play(0.7, "right", { seed, stage });
      assert.ok(starsFor(careful) >= 2, `${stage.id} careful (slips 1 in 7), seed ${seed}: ${careful.score}`);
      assert.ok(starsFor(slow) >= 2, `${stage.id} slow but right, seed ${seed}: ${slow.score}`);
      assert.ok(starsFor(quick) >= starsFor(slow), `${stage.id} quick, seed ${seed}`);
      if (starsFor(quick) === 3) threes++;
    }
    assert.ok(threes >= 3, `${stage.id}: a quick porter gets three stars on ${threes} of 5`);
  }
});

test("the feast day: too many waiting ends it, a quick porter lasts far longer", () => {
  const stage = STAGES.find((s) => s.endless);
  const idle = play(1, "idle", { stage }), quick = play(0.7, "right", { stage });
  assert.equal(idle.endReason, "line"); assert.ok(idle.queue.length >= stage.maxLine);
  assert.ok(quick.t > 2 * idle.t, `a quick porter keeps the door ${Math.round(quick.t)} s, an idle one ${Math.round(idle.t)} s`);
});

test("a timed round ends once, at the bell", () => {
  const g = newGame({ seed: 2 });
  let ends = 0;
  while (!g.over) for (const e of tick(g, 0.1)) if (e.type === "end") ends++;
  assert.equal(ends, 1); assert.equal(g.t, g.length); assert.equal(g.endReason, "bell"); assert.deepEqual(tick(g, 1), []);
});
