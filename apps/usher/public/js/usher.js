// Mass Usher's rules (his notes: ROADMAP.md, "Mass Usher"). Pure (no screen), tested in test/usher.test.js; the
// screen (app.js) only draws what happens here.
//
// Families arrive at the front doors before Mass. Tap a pew: you walk the family there. At the pew, swipe along it so
// the people already sitting scoot down (toward the wall or the aisle) and make room; tap the pew again to seat as
// many of the family as fit. Anyone left over: tap another pew. When the whole family is seated you go back to the
// doors for the next one. A family seated together scores the most; split it and it scores less, and less again the
// farther apart the parts are. Some people won't scoot (they like their spot). When the clock reaches Mass, the round ends.

export const ROUND = 120;          // seconds until Mass
export const QUICK = 8;            // a family seated within 8 seconds of reaching the front of the line: +3 a person
export const ROWS = 5, SEATS = 5;  // five rows, a pew on each side of the aisle; seat 0 is by the aisle, 4 by the wall
// Standing room at the back: one more "row" (row ROWS), five places on each side, worth less than a seat.
export const STAND_POINTS = 4;     // a person standing (10 seated)
export const isStanding = (id) => pewOf(id).row === ROWS;
export const RAMP = 240;           // an endless night gets busier over four minutes
export const COLORS = ["#e0453f", "#2e5fa8", "#2f8a4c", "#e3b341", "#8a5cc2", "#e07a2e", "#2a9a9a", "#d65a9a"];

/** A small seeded random (mulberry32), so a round can be replayed (tests, today's game). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The rules of the first stage (stages.js has every stage; newGame takes any of them).
export const SUNDAY = { regulars: 0.3, every: [10, 5], biggest: [3, 6], star2: 120, star3: 380 };

/** How busy it is p of the way to Mass (0 → 1): how often families arrive and how big they are. */
export function difficulty(p, stage = SUNDAY) {
  const q = Math.max(0, Math.min(1, p)), past = Math.max(0, p - 1), [e0, e1] = stage.every, [b0, b1] = stage.biggest;
  // an endless night keeps getting busier past the ramp (p > 1): families come faster and a little bigger
  return { every: Math.max(1.6, e0 + (e1 - e0) * q - past * 2), biggest: b0 + Math.round((b1 - b0) * q) + Math.min(2, Math.floor(past)) };
}
/** How far along it is: 0 → 1 to Mass; an endless night keeps counting past 1. */
const progress = (g) => (g.stage.endless ? g.t / RAMP : g.t / g.length);
/** How long someone stays at an endless night before going home (later in the night, longer). */
const stayTime = (g) => { const [a, b] = g.stage.stayFor; return (a + g.r() * (b - a)) * (1 + Math.max(0, g.t / RAMP - 1) * 0.6); };

// The kinds of people (his models <kind>-walk / <kind>-sit): who sits alone (the regulars) and who comes as a family.
export const KINDS_ALONE = ["man", "woman", "grandfather", "grandmother"];
const pick = (list, r) => list[Math.floor(r() * list.length) % list.length];
/** A family of `size`: one or two grown-ups (sometimes a grandparent), then children. */
export function familyKinds(size, r) {
  if (size === 1) return [pick(KINDS_ALONE, r)];
  const out = r() < 0.75 ? ["man", "woman"] : [pick(["man", "woman"], r), pick(["grandfather", "grandmother"], r)];
  while (out.length < size) out.push(pick(["child", "child-girl"], r));
  return out.slice(0, size);
}

/** pew id → {row, side}; side 0 = left of the aisle, 1 = right. */
export const pewOf = (id) => ({ row: Math.floor(id / 2), side: id % 2 });

export function newGame({ seed = 1, length = ROUND, stage = SUNDAY, regulars, usher = {} } = {}) {
  const r = rng(seed);
  stage = { ...SUNDAY, ...stage };
  regulars ??= stage.regulars;
  if (stage.endless) length = Infinity;
  // the pews, with some regulars already sitting here and there (some of them won't scoot: "stay")
  const pews = Array.from({ length: (ROWS + 1) * 2 }, (_, id) => ({ id, ...pewOf(id), standing: isStanding(id), seats: Array(SEATS).fill(null) }));
  let pid = 1;
  for (const p of pews) if (!p.standing) for (let s = 0; s < SEATS; s++) if (r() < regulars) p.seats[s] = { family: 0, stay: r() < 0.3, pid: pid++, kind: pick(KINDS_ALONE, r) };
  const g = { r, t: 0, length, stage, usher, pews, nextPid: pid, left: 0, queue: [], nextFamily: 1, nextArrival: 0, families: {}, at: null, group: null,
    score: 0, together: 0, split: 0, seatedPeople: 0, over: false };
  if (stage.endless) for (const p of pews) for (const who of p.seats) if (who) who.until = stayTime(g) * (0.3 + r() * 0.7); // already praying a while
  arrive(g);
  return g;
}

function arrive(g) {
  const d = difficulty(progress(g), g.stage), id = g.nextFamily++;
  const size = 1 + Math.floor(g.r() * d.biggest);
  const fam = { id, size, color: COLORS[(id - 1) % COLORS.length], parts: [], seated: 0, stay: Array.from({ length: size }, () => g.r() < 0.15),
    kinds: familyKinds(size, g.r), pids: Array.from({ length: size }, () => g.nextPid++) };
  g.families[id] = fam; g.queue.push(id);
  if (g.queue.length === 1) fam.front = g.t; // first in line: the clock for "quick!" starts
  g.nextArrival = g.t + d.every * (0.8 + g.r() * 0.4);
  return fam;
}

/** Move time on. Returns what happened: [{type: 'arrive' | 'end', …}]. */
export function tick(g, dt) {
  const ev = [];
  if (g.over) return ev;
  g.t = Math.min(g.length, g.t + dt);
  if (g.t >= g.nextArrival && g.t < g.length - 5) { const f = arrive(g); ev.push({ type: "arrive", id: f.id, size: f.size }); }
  if (g.stage.endless) {
    // people finish praying and go home, one by one (their seat is free again)
    for (const p of g.pews) p.seats.forEach((who, s) => {
      if (who?.until != null && g.t >= who.until) { p.seats[s] = null; g.left++; ev.push({ type: "leave", pew: p.id, seat: s, pid: who.pid }); }
    });
    // the night is over when the line at the doors gets too long
    if (g.queue.length >= g.stage.maxLine) { g.over = true; ev.push({ type: "end", reason: "line", time: g.t }); }
    return ev;
  }
  // every seat and standing place is taken: Mass starts now, even with time left
  if (g.pews.every((p) => p.seats.every(Boolean))) {
    g.over = true;
    const waiting = g.queue.reduce((n, id) => n + g.families[id].size - g.families[id].seated, 0);
    ev.push({ type: "end", reason: "full", waiting, left: g.length - g.t });
    return ev;
  }
  if (g.t >= g.length) {
    g.over = true;
    const waiting = g.queue.reduce((n, id) => n + g.families[id].size - g.families[id].seated, 0);
    ev.push({ type: "end", waiting });
  }
  return ev;
}

/** The family being seated now (the first in line), or null. */
export const current = (g) => (g.queue.length ? g.families[g.queue[0]] : null);
const empties = (p) => p.seats.filter((s) => !s).length;

/** Tap a pew. With a family to seat: walk them there ({type: 'walk'}); tapped again at that pew: seat them. */
export function tapPew(g, id) {
  const fam = current(g), p = g.pews[id];
  if (g.over || !fam || !p) return { type: "none" };
  if (g.at !== id) { g.at = id; return { type: "walk", pew: id }; }
  return seat(g, id);
}

/** Seat as many of the family as fit in this pew, together where possible (the longest run of empty seats first). */
export function seat(g, id) {
  const fam = current(g), p = g.pews[id];
  if (!fam || g.at !== id) return { type: "none" };
  let left = fam.size - fam.seated;
  if (!empties(p)) return { type: "full", pew: id };
  const placed = [], reserved = p.seats.slice();
  while (left > 0 && reserved.some((s) => !s)) {
    // Reserve the same seats as before, then assign people from the wall toward the aisle.
    let best = null;
    for (let s = 0; s < SEATS; s++) {
      if (reserved[s]) continue;
      let e = s; while (e + 1 < SEATS && !reserved[e + 1]) e++;
      if (!best || e - s > best[1] - best[0]) best = [s, e];
      s = e;
    }
    const run = [];
    for (let s = best[0]; s <= best[1] && left > 0; s++) { reserved[s] = true; left--; run.push(s); }
    fam.parts.push({ pew: id, seats: run });
    placed.push(...run);
  }
  // The person at the front of the walking line takes the deepest seat, even across separate gaps.
  for (const s of [...placed].sort((a, b) => b - a)) {
    p.seats[s] = { family: fam.id, stay: fam.stay[fam.seated], pid: fam.pids[fam.seated], kind: fam.kinds[fam.seated], ...(g.stage.endless ? { until: g.t + stayTime(g) } : {}) };
    fam.seated++;
  }
  g.seatedPeople += placed.length;
  if (fam.seated < fam.size) return { type: "some", pew: id, placed, left: fam.size - fam.seated };
  // the whole family is seated: score it (a little more if quick), and back to the doors for the next one
  const quick = g.t - (fam.front ?? g.t) <= QUICK;
  const points = familyPoints(fam) + (quick ? 3 * fam.size : 0);
  g.score += points;
  if (fam.parts.length === 1) g.together++; else g.split++;
  g.queue.shift(); g.at = null;
  if (g.queue.length) g.families[g.queue[0]].front = g.t;
  return { type: "seated", pew: id, placed, points, quick, together: fam.parts.length === 1, family: fam.id };
}

/** A family's points: 10 a person seated together (4 a person standing at the back); split, 8 less for each extra part
 * and 3 less for each row (or the aisle) between the parts; never less than 2 a person. */
export function familyPoints(fam) {
  const base = fam.parts.reduce((n, part) => n + part.seats.length * (isStanding(part.pew) ? STAND_POINTS : 10), 0) || fam.size * 10;
  if (fam.parts.length <= 1) return base;
  let apart = 0;
  for (let i = 1; i < fam.parts.length; i++) {
    const a = pewOf(fam.parts[i - 1].pew), b = pewOf(fam.parts[i].pew);
    apart += Math.abs(a.row - b.row) + (a.side !== b.side ? 1 : 0);
  }
  return Math.max(fam.size * 2, base - 8 * (fam.parts.length - 1) - 3 * apart);
}

/** Swipe along a pew: everyone who'll scoot slides `dir` (+1 toward the wall, -1 toward the aisle) as far as they can,
 * keeping their order; someone who won't scoot (stay) stays, and the others stop at them. Only at the pew you're at. */
export function scoot(g, id, dir) {
  const p = g.pews[id];
  if (g.over || g.at !== id || !p) return { type: "none" };
  if (g.usher.noScoot) return { type: "shy", pew: id }; // the young usher doesn't ask anyone to scoot
  const firm = (who) => who.stay && !g.usher.moveStayers; // the respected usher moves even people who like their spot
  const before = JSON.stringify(p.seats);
  const order = dir > 0 ? [...Array(SEATS).keys()].reverse() : [...Array(SEATS).keys()];
  const out = Array(SEATS).fill(null);
  let to = order[0];
  const next = (s) => s - dir; // the next seat away from the end they slide to
  for (const s of order) {
    const who = p.seats[s];
    if (!who) continue;
    if (firm(who)) { out[s] = who; to = next(s); continue; }
    while (out[to]) to = next(to);
    out[to] = who; to = next(to);
  }
  p.seats = out;
  return { type: JSON.stringify(out) === before ? "nothing" : "scooted", pew: id };
}

/** The longest run of empty seats in a pew. */
export const longestRun = (p) => { let best = 0, n = 0; for (const s of p.seats) { n = s ? 0 : n + 1; best = Math.max(best, n); } return best; };
/** The experienced usher: on reaching a pew, people scoot whichever way makes the most room (or the room the family
 * needs, toward the wall if both do). */
export function autoScoot(g, id) {
  const p = g.pews[id], fam = current(g);
  if (!g.usher.autoScoot || g.over || g.at !== id || !p || !fam) return { type: "none" };
  const need = fam.size - fam.seated, before = p.seats;
  const tryDir = (dir) => { p.seats = before; scoot(g, id, dir); const run = longestRun(p), seats = p.seats; p.seats = before; return { dir, run, seats }; };
  const [wall, aisle] = [tryDir(+1), tryDir(-1)];
  const pick = Math.min(wall.run, need) >= Math.min(aisle.run, need) ? wall : aisle;
  if (pick.run <= longestRun(p)) return { type: "nothing", pew: id };
  p.seats = pick.seats;
  return { type: "scooted", pew: id, dir: pick.dir };
}

/** Stars: two for seating families steadily, three for seating them quickly and together. Tuned in the tests. */
export const STAR2 = 120, STAR3 = 400; // Sunday Mass's; each stage has its own (stages.js)
export const starsFor = (g) => (g.score >= g.stage.star3 ? 3 : g.score >= g.stage.star2 ? 2 : 1);
