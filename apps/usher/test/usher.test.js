import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, tapPew, scoot, autoScoot, longestRun, current, familyPoints, starsFor, ROWS, SEATS, ROUND } from "../public/js/usher.js";
import { SEAT_W, AISLE, ROW_GAP, LANE, WALK_GAP, ENTRY_STAGGER, doorOffsets, seatSpot, pewEnd } from "../public/js/nave.js";
import { STAGES, isOpen } from "../public/js/stages.js";

const P = (spec) => spec.split("").map((c) => (c === "." ? null : { family: 0, stay: c === "S" })); // "x" sits, "S" stays
const show = (p) => p.seats.map((s) => (!s ? "." : s.stay ? "S" : s.family ? String(s.family) : "x")).join("");

test("scooting: everyone slides toward the wall or the aisle, keeping order; someone who stays is a wall", () => {
  const g = newGame({ seed: 1, regulars: 0 });
  g.at = 0;
  g.pews[0].seats = P("x.x.x"); scoot(g, 0, +1); assert.equal(show(g.pews[0]), "..xxx");
  g.pews[0].seats = P("x.x.x"); scoot(g, 0, -1); assert.equal(show(g.pews[0]), "xxx..");
  g.pews[0].seats = P(".x.S."); scoot(g, 0, +1); assert.equal(show(g.pews[0]), "..xS.");
  g.pews[0].seats = P("x.S.x"); scoot(g, 0, -1); assert.equal(show(g.pews[0]), "x.Sx.");
  assert.equal(scoot(g, 1, +1).type, "none", "only at the pew you're at");
});

test("walk a family to a pew, seat them together; leftovers go to another pew; then back to the doors", () => {
  const g = newGame({ seed: 2, regulars: 0 });
  const fam = current(g); fam.size = 7; fam.stay = Array(7).fill(false);
  assert.equal(tapPew(g, 4).type, "walk");
  const a = tapPew(g, 4);
  assert.equal(a.type, "some"); assert.equal(a.left, 2);
  assert.equal(tapPew(g, 6).type, "walk");
  const b = tapPew(g, 6);
  assert.equal(b.type, "seated"); assert.equal(b.together, false);
  assert.equal(g.at, null); assert.equal(g.split, 1);
});

test("points: together scores most; split less, and less the farther apart", () => {
  const near = { size: 4, parts: [{ pew: 0, seats: [0, 1] }, { pew: 2, seats: [0, 1] }] }, far = { size: 4, parts: [{ pew: 0, seats: [0, 1] }, { pew: 9, seats: [0, 1] }] };
  assert.equal(familyPoints({ size: 4, parts: [{ pew: 0, seats: [0, 1, 2, 3] }] }), 40);
  assert.ok(familyPoints(near) < 40 && familyPoints(far) < familyPoints(near));
  assert.ok(familyPoints({ size: 3, parts: [{ pew: 0, seats: [0] }, { pew: 9, seats: [0] }, { pew: 1, seats: [0] }] }) >= 6);
});

// a pretend usher: picks the pew with the longest run of empty seats (scooting first if that makes room), every `every` s
function play(every, { seed = 7, smart = true, stage, cap = 1200 } = {}) {
  const g = newGame({ seed, stage });
  const run = (p) => { let best = 0, n = 0; for (const s of p.seats) { n = s ? 0 : n + 1; best = Math.max(best, n); } return best; };
  let wait = 0;
  while (!g.over && g.t < cap) {
    tick(g, 0.1); wait -= 0.1;
    if (wait > 0) continue;
    wait = every;
    const fam = current(g);
    if (!fam) continue;
    const need = fam.size - fam.seated;
    if (g.at === null || (g.pews[g.at].seats.every(Boolean))) {
      const room = (p) => (smart ? Math.max(run(p), p.seats.filter((s) => !s || !s.stay).length - p.seats.filter((s) => s && !s.stay).length) : run(p));
      const pews = g.pews.filter((p) => p.seats.some((s) => !s)).sort((a, b) => Math.min(room(b), need) - Math.min(room(a), need) || a.id - b.id);
      if (pews.length) tapPew(g, pews[0].id);
    } else if (smart && run(g.pews[g.at]) < need && g.pews[g.at].seats.filter((s) => !s).length > run(g.pews[g.at]) && scoot(g, g.at, +1).type === "scooted") { /* made room */ }
    else tapPew(g, g.at);
  }
  return g;
}

test("every stage: no usher gets 1, a slow usher at least 2, a quick and careful one 3 on most nights", () => {
  for (const stage of STAGES) {
    let threes = 0;
    for (const seed of [1, 2, 3, 7, 42]) {
      assert.equal(starsFor(play(1e9, { seed, stage })), 1, `${stage.id} idle`);
      const slow = play(6, { seed, smart: false, stage }), quick = play(1.2, { seed, stage });
      assert.ok(starsFor(slow) >= 2, `${stage.id} slow, seed ${seed}: ${slow.score}`);
      assert.ok(starsFor(quick) >= starsFor(slow), `${stage.id} seed ${seed}`);
      if (starsFor(quick) === 3) threes++;
    }
    assert.ok(threes >= 3, `${stage.id}: a quick usher gets three stars on ${threes} of 5`);
  }
});

test("Adoration at Night: people go home and their seats free up; the night ends when the line gets too long", () => {
  const stage = STAGES.find((s) => s.endless), g = newGame({ seed: 3, stage });
  const ev = [];
  while (!g.over && g.t < 900) ev.push(...tick(g, 0.1));
  assert.ok(ev.some((e) => e.type === "leave"), "people went home");
  const end = ev.find((e) => e.type === "end");
  assert.equal(end.reason, "line"); assert.ok(g.queue.length >= stage.maxLine);
  assert.ok(play(1.2, { seed: 3, stage }).t > 2 * play(6, { seed: 3, smart: false, stage }).t, "a quick usher keeps going far longer");
});

test("stages open in order; Adoration opens with two stars on Sunday Mass", () => {
  const stars = { sunday: 2 };
  const open = STAGES.map((st, i) => isOpen(i, (x) => stars[x.id] ?? 0));
  assert.deepEqual(open, [true, true, false, false, true]);
});

test("a round lasts until Mass and ends once", () => {
  const g = play(2);
  assert.equal(g.t, ROUND); assert.equal(newGame({ stage: STAGES[0] }).pews.length, 12); // ten pews and two standing places
  assert.deepEqual(tick(g, 1), []);
  assert.ok(g.pews.every((p) => p.seats.length === SEATS));
});

test("a family seated quickly after reaching the front scores a little more", () => {
  const g = newGame({ seed: 5, regulars: 0 });
  const fam = current(g); fam.size = 2; fam.stay = [false, false];
  tapPew(g, 0); const r = tapPew(g, 0);
  assert.equal(r.quick, true); assert.equal(r.points, 26);
});

test("standing room at the back: five places a side, no regulars there, fewer points than a seat", () => {
  const g = newGame({ seed: 4, regulars: 0.5 });
  const stand = g.pews.filter((p) => p.standing);
  assert.equal(g.pews.length, 12); assert.equal(stand.length, 2);
  assert.ok(stand.every((p) => p.seats.length === 5 && p.seats.every((s) => !s)));
  const seated = { size: 3, parts: [{ pew: 0, seats: [0, 1, 2] }] }, standing = { size: 3, parts: [{ pew: stand[0].id, seats: [0, 1, 2] }] };
  assert.ok(familyPoints(standing) < familyPoints(seated));
});

test("a full church: Mass starts early, even with time left", () => {
  const g = newGame({ seed: 2 });
  let pid = 900;
  for (const p of g.pews) p.seats = p.seats.map((s) => s ?? { family: 0, stay: false, pid: pid++, kind: "man" });
  const ev = tick(g, 0.1);
  const end = ev.find((e) => e.type === "end");
  assert.equal(end.reason, "full"); assert.ok(g.over); assert.ok(end.left > 100);
});

test("the ushers: the young one can't scoot, the experienced one scoots on arrival, the respected one moves anyone", async () => {
  const { USHERS, usherOpen } = await import("../public/js/ushers.js");
  const u = (id) => USHERS.find((x) => x.id === id);
  const setup = (usher) => {
    const g = newGame({ seed: 1, regulars: 0, usher });
    const p = g.pews[0];
    p.seats = [{ family: 0, stay: false, pid: 501, kind: "man" }, null, { family: 0, stay: true, pid: 502, kind: "woman" }, null, null];
    while (current(g).size < 2) { g.queue.shift(); if (!g.queue.length) tick(g, 30); }
    tapPew(g, 0);
    return g;
  };
  let g = setup(u("young"));
  assert.equal(scoot(g, 0, -1).type, "shy");
  g = setup(u("usher"));
  scoot(g, 0, +1); assert.equal(g.pews[0].seats[2].pid, 502, "someone who likes their spot stays put");
  g = setup(u("respected"));
  scoot(g, 0, -1); assert.deepEqual(g.pews[0].seats.map((s) => s?.pid ?? null), [501, 502, null, null, null], "the respected usher moves them too");
  g = setup(u("experienced"));
  g.pews[0].seats = [null, { family: 0, stay: false, pid: 601, kind: "man" }, null, { family: 0, stay: false, pid: 602, kind: "man" }, null];
  const r = autoScoot(g, 0);
  assert.equal(r.type, "scooted"); assert.equal(longestRun(g.pews[0]), 3);
  assert.ok(usherOpen(USHERS[0], () => 0) && !usherOpen(u("young"), () => 0) && usherOpen(u("young"), (id) => (id === "sunday" ? 2 : 0)));
});

test("nave spacing keeps 5×5 pews with 0.85× head clearance, wider door arc, single-file aisle, and 0.24 s pew stagger", () => {
  assert.equal(ROWS, 5);
  assert.equal(SEATS, 5);
  assert.ok(SEAT_W >= 6.58 && AISLE >= 6.5 && ROW_GAP >= 10.5 && LANE >= 4.0 && WALK_GAP >= 4.8);
  assert.equal(ENTRY_STAGGER, 0.24);
  const pts = [[0, 0], ...doorOffsets(7)];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      assert.ok(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) >= 5.2, `door slots ${i} and ${j} clear`);
    }
  }
  assert.ok(pewEnd(0).x > 0 && pewEnd(1).x < 0, "usher stands across the aisle from the pew");
  assert.ok(Math.abs(seatSpot(0, 0).x) >= AISLE && Math.abs((seatSpot(0, 1).x - seatSpot(0, 0).x) + SEAT_W) < 1e-9);
});
