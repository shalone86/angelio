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

test("the feast day: more people every minute, too many waiting ends it, a quick porter lasts longer", () => {
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

test("the feast day: every minute more people come (the gaps between them shrink by about a third)", () => {
  const stage = STAGES.find((s) => s.endless);
  const arrivals = [];
  const g = newGame({ seed: 5, stage });
  while (!g.over && g.t < 300) { for (const e of tick(g, 0.1)) if (e.type === "arrive") arrivals.push(g.t); waiting(g) && greet(g); if (g.front) { g.front.state = "welcomed"; g.front = null; } }
  const per = (a, b) => arrivals.filter((t) => t >= a && t < b).length;
  const m1 = per(0, 60), m2 = per(60, 120), m3 = per(120, 180);
  assert.ok(m2 > m1 * 1.25 && m3 > m2 * 1.25, `people per minute: ${m1}, ${m2}, ${m3}`);
});

// ── the six porters ──
import { PORTERS, porterById, porterOpen } from "../public/js/porters.js";
import { ringBell, DOG_POINTS } from "../public/js/porter.js";
const at = (porter, mix, extra = {}) => { const g = newGame({ seed: 4, stage: { ...STAGES[0], mix, ...extra }, porter }); while (!waiting(g)) tick(g, 0.1); return g; };
const MIX = { in: { in: 1, greet: 0, away: 0 }, greet: { in: 0, greet: 1, away: 0 }, away: { in: 0, greet: 0, away: 1 } };

test("three monks and three nuns, each opening with stars on a stage", () => {
  assert.equal(PORTERS.length, 7); assert.equal(PORTERS[0].opens, undefined);
  for (const p of PORTERS.slice(1)) assert.ok(STAGES.some((s) => s.id === p.opens.stage) && p.opens.stars >= 2, p.id);
  const stars = { sunday: 2 }; const open = PORTERS.filter((p) => porterOpen(p, (id) => stars[id] ?? 0)).map((p) => p.id);
  assert.deepEqual(open, ["porter", "andre"]);
  assert.equal(porterById("nobody").id, "porter");
});

test("Brother André forgives the first mistake each minute, but his combos grow slowly", () => {
  const g = at(porterById("andre"), MIX.away); g.score = 30; g.streak = 3;
  const r = toggleDoor(g).find((e) => e.type === "decided");
  assert.ok(r.forgiven && r.correct && g.score === 30 && g.wrong === 0 && g.streak === 3, "forgiven: no points lost, not counted, combo kept");
  while (!waiting(g)) tick(g, 0.1);
  toggleDoor(g); toggleDoor(g); // (closed again, so nothing walks in by itself)
  const g2 = at(porterById("andre"), MIX.away); g2.forgiveAt = g2.t + 60; g2.score = 30;
  assert.ok(!toggleDoor(g2).find((e) => e.type === "decided").correct && g2.score === 22 && g2.wrong === 1, "the second one in the same minute is a real mistake");
  const slow = newGame({ porter: porterById("andre") }), usual = newGame({});
  slow.streak = usual.streak = 5; assert.equal(multOf(usual), 2); assert.equal(multOf(slow), 1);
  slow.streak = 7; assert.equal(multOf(slow), 2);
});

test("the Old Brother Porter: the door can stay open longer, people take their time, but the next visitor is slow to step up", () => {
  const g = newGame({ seed: 2, porter: porterById("old"), stage: { ...STAGES[0], mix: MIX.away, every: [999, 999] } });
  g.queue = []; g.nextArrival = 1e9; g.score = 50; toggleDoor(g);
  for (let i = 0; i < 45; i++) tick(g, 0.1);   // 4.5 s open: an ordinary porter would be paying for the draft by now
  assert.equal(Math.round(g.score), 50);
  for (let i = 0; i < 40; i++) tick(g, 0.1); assert.ok(g.score < 50, "but not forever");
  const h = newGame({ seed: 3, porter: porterById("old") }); h.nextArrival = 0; tick(h, 0.1);
  const arriving = h.front; assert.ok(arriving.arrivesAt - h.t > 1, "slower to call the next visitor");
});

test("Brother with the Dog: the dog chases animals off by itself, then barks and nobody can be sent away for a moment", () => {
  const dog = porterById("dog");
  const g = newGame({ seed: 5, porter: dog, stage: { ...STAGES[0], mix: MIX.away } });
  g.pool = { in: [], greet: [], away: [VISITORS.find((v) => v.id === "goat")] }; g.nextArrival = 0;
  let chase = null; for (let i = 0; i < 60 && !chase; i++) chase = tick(g, 0.1).find((e) => e.type === "decided");
  assert.ok(chase.dog && chase.correct && chase.points === DOG_POINTS && g.streak === 0, "chased off for a few points");
  g.pool = { in: [], greet: [], away: [VISITORS.find((v) => v.id === "peddler")] }; g.nextArrival = g.t;
  while (!waiting(g)) tick(g, 0.1);
  assert.deepEqual(sendAway(g), [], "barking: can't send anyone away just yet");
  while (g.t < g.dogUntil) tick(g, 0.1);
  assert.ok(sendAway(g)[0].correct, "and then it's quiet again");
});

test("Sister Portress's visitors are in more of a hurry, and special guests glow", () => {
  const g = at(porterById("sister"), MIX.greet); assert.ok(g.front.max < STAGES[0].patience);
  assert.ok(porterById("sister").glow);
});

test("Sister with the Bell rings it once: everyone waiting is patient again, and no one new comes for a moment", () => {
  const g = at(porterById("bell"), MIX.in);
  for (let i = 0; i < 30; i++) tick(g, 0.1);
  const before = g.front.patience; assert.ok(before < g.front.max);
  const t = g.t; g.nextArrival = t + 0.5;
  assert.equal(ringBell(g)[0].type, "bell");
  assert.equal(g.front.patience, g.front.max); assert.ok(g.nextArrival >= t + 5);
  assert.deepEqual(ringBell(g), [], "only once");
  assert.deepEqual(ringBell(at(porterById("porter"), MIX.in)), [], "only Sister with the Bell has one");
});

test("the Respected Sister: a special guest who just walks in is fine, but her greetings are worth less", () => {
  const g = at(porterById("respected"), MIX.greet); const r = toggleDoor(g).find((e) => e.type === "decided");
  assert.ok(r.correct && !r.neutral && r.points > 0 && g.wrong === 0, "everyone knows her");
  const h = at(porterById("respected"), MIX.greet), u = at(porterById("porter"), MIX.greet);
  assert.ok(greet(h)[0].points < greet(u)[0].points, "a greeting is worth less");
});

test("every porter can play every stage and beat an idle one", () => {
  for (const p of PORTERS) for (const stage of STAGES.slice(0, 3)) {
    const g = newGame({ seed: 7, stage, porter: p }); let seen = 0, who = null;
    while (!g.over) {
      tick(g, 0.1); const v = waiting(g); if (v !== who) { who = v; seen = 0; }
      const next = g.front ?? g.queue[0]; if (g.door && next && next.answer !== "in") toggleDoor(g);
      if (v && (seen += 0.1) >= 1) { if (v.answer === "in") { if (!g.door) toggleDoor(g); } else if (v.answer === "greet") greet(g); else sendAway(g); }
    }
    assert.ok(g.score > 200, `${p.id} on ${stage.id}: ${Math.round(g.score)}`);
  }
});
