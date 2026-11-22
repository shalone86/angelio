import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, tick, tapPew, scoot, current, familyPoints, starsFor, SEATS, ROUND } from "../public/js/usher.js";

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
  const near = { size: 4, parts: [{ pew: 0 }, { pew: 2 }] }, far = { size: 4, parts: [{ pew: 0 }, { pew: 13 }] };
  assert.equal(familyPoints({ size: 4, parts: [{ pew: 0 }] }), 40);
  assert.ok(familyPoints(near) < 40 && familyPoints(far) < familyPoints(near));
  assert.ok(familyPoints({ size: 3, parts: [{ pew: 0 }, { pew: 13 }, { pew: 1 }] }) >= 6);
});

// a pretend usher: picks the pew with the longest run of empty seats (scooting first if that makes room), every `every` s
function play(every, { seed = 7, smart = true } = {}) {
  const g = newGame({ seed });
  const run = (p) => { let best = 0, n = 0; for (const s of p.seats) { n = s ? 0 : n + 1; best = Math.max(best, n); } return best; };
  let wait = 0;
  while (!g.over) {
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

test("stars: no usher gets 1, a slow usher 2, a quick and careful one 3", () => {
  for (const seed of [1, 2, 3, 7, 42]) {
    assert.equal(starsFor(play(1e9, { seed })), 1);
    assert.equal(starsFor(play(6, { seed, smart: false })), 2, `slow, seed ${seed}: ${play(6, { seed, smart: false }).score}`);
    assert.equal(starsFor(play(1.2, { seed })), 3, `quick, seed ${seed}: ${play(1.2, { seed }).score}`);
  }
});

test("a round lasts until Mass and ends once", () => {
  const g = play(2);
  assert.equal(g.t, ROUND);
  assert.deepEqual(tick(g, 1), []);
  assert.ok(g.pews.every((p) => p.seats.length === SEATS));
});

test("a family seated quickly after reaching the front scores a little more", () => {
  const g = newGame({ seed: 5, regulars: 0 });
  const fam = current(g); fam.size = 2; fam.stay = [false, false];
  tapPew(g, 0); const r = tapPew(g, 0);
  assert.equal(r.quick, true); assert.equal(r.points, 26);
});
