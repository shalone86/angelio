import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, welcome, sendAway, ringBell, waiting, brotherInGate, speedOf, starsFor, pool, multOf, DOG_POINTS } from "../public/js/porter.js";
import { STAGES, isOpen } from "../public/js/stages.js";
import { VISITORS, ANIMALS, OUTGOING, BUMP_LINES, hintFor, WELCOMES } from "../public/js/visitors.js";
import { PORTERS, porterById, porterOpen } from "../public/js/porters.js";

// A pretend porter. After `delay` seconds of seeing someone at the gate it does `strat`'s action; when `waitOut` is on,
// it waits for any outgoing brother crossing the gate before welcoming the next visitor in.
export function play(delay, strat, { seed = 7, stage = STAGES[0], cap = 400, err = 0, waitOut = true, porter = {} } = {}) {
  const g = newGame({ seed, stage, porter });
  const slip = (() => { let a = seed * 7919 + 13; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
  let seen = 0, who = null;
  while (!g.over && g.t < cap) {
    tick(g, 0.1);
    const v = waiting(g);
    if (v !== who) { who = v; seen = 0; }
    if (!v) continue;
    seen += 0.1;
    if (seen < delay) continue;
    if (strat === "right") {
      const rightAct = v.answer === "away" ? "away" : "welcome";
      const act = slip() < err ? (rightAct === "away" ? "welcome" : "away") : rightAct;
      if (waitOut && act === "welcome" && brotherInGate(g)) continue;
      if (act === "welcome") welcome(g); else sendAway(g);
    } else if (strat === "welcome") {
      welcome(g);
    } else if (strat === "away") {
      sendAway(g);
    }
  }
  return g;
}

const MIX = { in: { in: 1, greet: 0, away: 0 }, greet: { in: 0, greet: 1, away: 0 }, away: { in: 0, greet: 0, away: 1 } };
const at = (porter, mix, extra = {}) => { const g = newGame({ seed: 4, stage: { ...STAGES[0], mix, ...extra }, porter }); g.nextOut = 1e9; while (!waiting(g)) tick(g, 0.1); return g; };

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
  assert.ok(ANIMALS.length >= 10 && ANIMALS.every((a) => VISITORS.some((v) => v.kind === a)), "every animal comes to the gate");
  assert.ok(new Set(WELCOMES).size >= 10, "plenty of different ways to welcome someone");
  assert.deepEqual(OUTGOING.map((o) => o.id), ["garden", "bakery", "tower"]);
  assert.ok(OUTGOING.every((o) => o.place && o.emoji && o.robe && o.line));
  assert.ok(BUMP_LINES.length >= 3);
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

test("one move per person: welcome lets people who belong (and special guests) in; sendAway sends the rest on", () => {
  const gIn = at(porterById("porter"), MIX.in);
  const rIn = welcome(gIn)[0];
  assert.ok(rIn.correct && !rIn.special && rIn.how === "welcome" && rIn.points >= 13 && gIn.welcomed === 1);

  const gGreet = at(porterById("porter"), MIX.greet);
  const rGreet = welcome(gGreet)[0];
  assert.ok(rGreet.correct && rGreet.special && rGreet.how === "welcome" && rGreet.points > rIn.points && gGreet.greeted === 1);

  const gAwayWrong = at(porterById("porter"), MIX.away); gAwayWrong.score = 30;
  const rBad = welcome(gAwayWrong)[0];
  assert.ok(!rBad.correct && gAwayWrong.wrong === 1 && gAwayWrong.score === 22);

  const gAway = at(porterById("porter"), MIX.away);
  const rOut = sendAway(gAway)[0];
  assert.ok(rOut.correct && rOut.how === "away" && rOut.points >= 8 && gAway.sentOn === 1);

  const gInWrong = at(porterById("porter"), MIX.in); gInWrong.score = 30;
  const rBad2 = sendAway(gInWrong)[0];
  assert.ok(!rBad2.correct && gInWrong.wrong === 1 && gInWrong.score === 22);

  const gGreetWrong = at(porterById("porter"), MIX.greet); gGreetWrong.score = 30;
  const rBad3 = sendAway(gGreetWrong)[0];
  assert.ok(!rBad3.correct && gGreetWrong.wrong === 1 && gGreetWrong.score === 22);
});

test("outgoing brothers: start approaching, cross the gate, then clear; welcoming during crossing causes a funny stumble", () => {
  const g = newGame({ seed: 3, stage: { ...STAGES[0], mix: MIX.in } });
  g.nextArrival = 1e9; g.nextOut = 0.2;
  const seen = [];
  while (!brotherInGate(g)) for (const e of tick(g, 0.05)) seen.push(e.type);
  assert.ok(seen.includes("brother-start") && seen.includes("brother-cross"));
  const b = brotherInGate(g);
  assert.ok(b && b.state === "crossing");

  // Put a belonging visitor at the gate while the brother is crossing: their patience pauses
  g.nextArrival = g.t;
  while (!waiting(g)) tick(g, 0.05);
  while (g.front.state !== "waiting") tick(g, 0.05);
  const pBefore = g.front.patience;
  tick(g, 0.2);
  assert.equal(g.front.patience, pBefore, "belonging visitor waits politely while brother crosses");

  // Welcoming too soon triggers a stumble: breaks combo, 0 points, increments bumps, NOT counted as wrong
  g.score = 40; g.streak = 6;
  const ev = welcome(g)[0];
  assert.ok(ev.correct && ev.bumped && ev.brother.id === b.id && ev.points === 0);
  assert.equal(g.streak, 0);
  assert.equal(g.score, 40, "stumble doesn't take points away");
  assert.equal(g.bumps, 1);
  assert.equal(g.wrong, 0, "stumble is not a wrong-rule mistake");

  // Sending an unwanted visitor away while a brother crosses does NOT bump
  const h = newGame({ seed: 3, stage: { ...STAGES[0], mix: MIX.away } });
  h.nextArrival = 1e9; h.nextOut = 0.2;
  while (!brotherInGate(h)) tick(h, 0.05);
  h.nextArrival = h.t;
  while (!waiting(h)) tick(h, 0.05);
  h.streak = 3;
  const evAway = sendAway(h)[0];
  assert.ok(evAway.correct && !evAway.bumped && h.bumps === 0 && h.streak === 4);

  // Finish crossing clears the brother and increments brothersOut
  while (brotherInGate(h)) tick(h, 0.05);
  assert.equal(h.brothersOut, 1);
  assert.equal(h.outgoing.length, 0);
});

test("a combo of right answers in a row multiplies the points; a mistake ends it", () => {
  const g = newGame({ seed: 6, stage: { ...STAGES[0], mix: MIX.away } });
  g.nextOut = 1e9;
  const pts = [];
  for (let i = 0; i < 12; i++) { while (!waiting(g)) tick(g, 0.1); pts.push(sendAway(g)[0].mult); }
  assert.deepEqual(pts, [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3]); assert.equal(multOf(g), 3);
  while (!waiting(g)) tick(g, 0.1); welcome(g); assert.equal(g.streak, 0); assert.equal(multOf(g), 1);
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

test("stars on every stage: idle 1; always welcome or always away never 3; careful & slow >= 2; quick 3 on most; waiting for brothers beats bumping", () => {
  for (const stage of STAGES) {
    let threes = 0, bumpedSeeds = 0;
    for (const seed of [1, 2, 3, 7, 42]) {
      assert.equal(starsFor(play(1, "idle", { seed, stage })), 1, `${stage.id} idle`);
      for (const s of ["welcome", "away"]) { const g = play(0.5, s, { seed, stage }); assert.ok(starsFor(g) < 3, `${stage.id} always ${s}, seed ${seed}: ${g.score}`); }
      const careful = play(1.4, "right", { seed, stage, err: 0.15 }), slow = play(2.5, "right", { seed, stage }), quick = play(0.7, "right", { seed, stage });
      assert.ok(starsFor(careful) >= 2, `${stage.id} careful (slips 1 in 7), seed ${seed}: ${careful.score}`);
      assert.ok(starsFor(slow) >= 2, `${stage.id} slow but right, seed ${seed}: ${slow.score}`);
      assert.ok(starsFor(quick) >= starsFor(slow), `${stage.id} quick, seed ${seed}`);
      if (starsFor(quick) === 3) threes++;
      const reckless = play(0.7, "right", { seed, stage, waitOut: false });
      if (reckless.bumps > 0) {
        bumpedSeeds++;
        assert.ok(quick.score > reckless.score, `${stage.id} seed ${seed}: waiting (${quick.score}) beats bumping (${reckless.score})`);
      }
    }
    assert.ok(threes >= 3, `${stage.id}: a quick porter gets three stars on ${threes} of 5`);
    assert.ok(bumpedSeeds >= 4, `${stage.id}: ignoring brothers causes bumps on ${bumpedSeeds} of 5 seeds`);
  }
});

test("the feast day: more visitors and brothers every minute, faster walking, too many waiting ends it, quick porter lasts longer", () => {
  const stage = STAGES.find((s) => s.endless);
  const idle = play(1, "idle", { stage }), quick = play(0.7, "right", { stage });
  assert.equal(idle.endReason, "line"); assert.ok(idle.queue.length >= stage.maxLine);
  assert.ok(quick.t > 2 * idle.t, `a quick porter keeps the gate ${Math.round(quick.t)} s, an idle one ${Math.round(idle.t)} s`);

  const arrivals = [], bros = [];
  const g = newGame({ seed: 5, stage });
  const s0 = speedOf(g);
  while (!g.over && g.t < 240) {
    for (const e of tick(g, 0.1)) { if (e.type === "arrive") arrivals.push(g.t); if (e.type === "brother-start") bros.push(g.t); }
    const v = waiting(g);
    if (v) { if (v.answer === "away") sendAway(g); else if (!brotherInGate(g)) welcome(g); }
  }
  const per = (arr, a, b) => arr.filter((t) => t >= a && t < b).length;
  const vm1 = per(arrivals, 0, 60), vm2 = per(arrivals, 60, 120), vm3 = per(arrivals, 120, 180);
  const bm1 = per(bros, 0, 60), bm3 = per(bros, 120, 180);
  assert.ok(vm2 > vm1 * 1.25 && vm3 > vm2 * 1.25, `visitors per minute: ${vm1}, ${vm2}, ${vm3}`);
  assert.ok(bm3 > bm1, `brothers per minute increase: ${bm1} -> ${bm3}`);
  assert.ok(speedOf(g) > s0, "walking speed ramps up");
});

test("a timed round ends once, at the bell", () => {
  const g = newGame({ seed: 2 });
  let ends = 0;
  while (!g.over) for (const e of tick(g, 0.1)) if (e.type === "end") ends++;
  assert.equal(ends, 1); assert.equal(g.t, g.length); assert.equal(g.endReason, "bell"); assert.deepEqual(tick(g, 1), []);
});

// ── the six porters (redone for the new controls) ──

test("base Brother/Sister starters plus three monks and three nuns, each opening with stars on a stage", () => {
  assert.equal(PORTERS.length, 8);
  assert.equal(PORTERS[0].opens, undefined);
  assert.equal(PORTERS[1].opens, undefined);
  assert.equal(PORTERS[1].nun, true);
  for (const p of PORTERS.slice(2)) assert.ok(STAGES.some((s) => s.id === p.opens.stage) && p.opens.stars >= 2, p.id);
  const stars = { sunday: 2 }; const open = PORTERS.filter((p) => porterOpen(p, (id) => stars[id] ?? 0)).map((p) => p.id);
  assert.deepEqual(open, ["porter", "sister-porter", "andre"]);
  assert.equal(porterById("nobody").id, "porter");
});

test("Brother André forgives the first mistake each minute, but his combos grow slowly", () => {
  const g = at(porterById("andre"), MIX.away); g.score = 30; g.streak = 3;
  const r = welcome(g)[0];
  assert.ok(r.forgiven && r.correct && g.score === 30 && g.wrong === 0 && g.streak === 3, "forgiven: no points lost, not counted, combo kept");
  const g2 = at(porterById("andre"), MIX.away); g2.forgiveAt = g2.t + 60; g2.score = 30;
  assert.ok(!welcome(g2)[0].correct && g2.score === 22 && g2.wrong === 1, "the second one in the same minute is a real mistake");
  const slow = newGame({ porter: porterById("andre") }), usual = newGame({});
  slow.streak = usual.streak = 5; assert.equal(multOf(usual), 2); assert.equal(multOf(slow), 1);
  slow.streak = 7; assert.equal(multOf(slow), 2);
});

test("Old Brother Porter: visitors wait much longer, but he is slow to call the next visitor", () => {
  const o = at(porterById("old"), MIX.in);
  const u = at(porterById("porter"), MIX.in);
  assert.ok(o.front.max > u.front.max * 1.3, `old patience ${o.front.max} > usual ${u.front.max}`);

  const h = newGame({ seed: 3, porter: porterById("old"), stage: { ...STAGES[0], mix: MIX.away, every: [0.2, 0.2] } });
  h.nextArrival = 0; h.nextOut = 1e9;
  while (!waiting(h)) tick(h, 0.1);
  sendAway(h); const t0 = h.t; while (!waiting(h)) tick(h, 0.05);
  assert.ok(h.t - t0 >= 0.55, `slow to call the next visitor (${(h.t - t0).toFixed(2)} s)`);

  const n = newGame({ seed: 3, stage: { ...STAGES[0], mix: MIX.away, every: [0.2, 0.2] } });
  n.nextArrival = 0; n.nextOut = 1e9;
  while (!waiting(n)) tick(n, 0.1);
  sendAway(n); const t1 = n.t; while (!waiting(n)) tick(n, 0.05);
  assert.ok(n.t - t1 < 0.2, "an ordinary porter's next visitor is right there");
});

test("Brother with the Dog: the dog chases animals off by itself, then barks and nobody can be sent away for a moment", () => {
  const dog = porterById("dog");
  const g = newGame({ seed: 5, porter: dog, stage: { ...STAGES[0], mix: MIX.away } });
  g.pool = { in: [], greet: [], away: [VISITORS.find((v) => v.id === "goat")] }; g.nextArrival = 0; g.nextOut = 1e9;
  let chase = null; for (let i = 0; i < 60 && !chase; i++) chase = tick(g, 0.1).find((e) => e.type === "decided");
  assert.ok(chase.dog && chase.correct && chase.points === DOG_POINTS && g.streak === 0, "chased off for a few points");
  g.pool = { in: [], greet: [], away: [VISITORS.find((v) => v.id === "peddler")] }; g.nextArrival = g.t;
  while (!waiting(g)) tick(g, 0.1);
  assert.deepEqual(sendAway(g), [], "barking: can't send anyone away just yet");
  while (g.t < g.dogUntil) tick(g, 0.1);
  assert.ok(sendAway(g)[0].correct, "and then it's quiet again");
});

test("Sister Portress's visitors are in more of a hurry, and visitors who belong glow", () => {
  const g = at(porterById("sister"), MIX.greet); assert.ok(g.front.max < STAGES[0].patience);
  assert.ok(porterById("sister").glow);
});

test("Sister with the Bell rings it once: everyone waiting is patient again, and arrivals and brothers pause for a moment", () => {
  const g = at(porterById("bell"), MIX.in);
  for (let i = 0; i < 30; i++) tick(g, 0.1);
  const before = g.front.patience; assert.ok(before < g.front.max);
  const t = g.t; g.nextArrival = t + 0.5; g.nextOut = t + 0.5;
  assert.equal(ringBell(g)[0].type, "bell");
  assert.equal(g.front.patience, g.front.max);
  assert.ok(g.nextArrival >= t + 5 && g.nextOut >= t + 5);
  assert.deepEqual(ringBell(g), [], "only once");
  assert.deepEqual(ringBell(at(porterById("porter"), MIX.in)), [], "only Sister with the Bell has one");
});

test("Respected Sister: nobody bumps at the gate when a brother is crossing, though each answer earns a little less", () => {
  const res = porterById("respected");
  const g = newGame({ seed: 3, porter: res, stage: { ...STAGES[0], mix: MIX.in } });
  g.nextArrival = 1e9; g.nextOut = 0.2;
  while (!brotherInGate(g)) tick(g, 0.05);
  g.nextArrival = g.t;
  while (!waiting(g)) tick(g, 0.05);
  g.streak = 4;
  const ev = welcome(g)[0];
  assert.ok(ev.correct && !ev.bumped && g.bumps === 0 && g.streak === 5 && ev.points > 0, "everyone steps aside for her");

  const r1 = at(res, MIX.in), u1 = at(porterById("porter"), MIX.in);
  assert.ok(welcome(r1)[0].points < welcome(u1)[0].points, "each answer earns a little less");
});

test("every porter can play every timed stage and beat an idle one", () => {
  for (const p of PORTERS) for (const stage of STAGES.slice(0, 3)) {
    const g = play(1, "right", { seed: 7, stage, porter: p });
    assert.ok(g.score > 200, `${p.id} on ${stage.id}: ${Math.round(g.score)}`);
  }
});

test("you can answer as soon as a visitor appears, even while they're still stepping up to the gate", () => {
  const g = newGame({ seed: 3, stage: { ...STAGES[0], mix: MIX.away } }); g.nextArrival = 0; g.nextOut = 1e9;
  while (!g.front) tick(g, 0.1);
  assert.equal(g.front.state, "arriving"); assert.ok(waiting(g), "the controls are live");
  assert.ok(sendAway(g)[0].correct);
});

test("special guests carry a short name for reminders", () => {
  for (const v of VISITORS) if (Object.values(v.answers).includes("greet")) assert.ok(v.who, v.id);
  const g = at(porterById("porter"), MIX.greet); assert.ok(g.front.who);
});
