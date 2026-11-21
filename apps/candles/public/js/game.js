// Candle Rack's rules: the time before Mass, getting the church ready. Pure (no screen), so it's tested in Node
// (test/game.test.js) and the screen (app.js + church.js) only draws what happens here.
//
// Candles burn down; tap one that's out to light it. Tap one that's flickering (nearly out) for "just in time!",
// worth more. Keep lighting without letting any go out: the streak grows and multiplies the points. Swipe along a
// row to light several in one go (a chain). People come to pray with a colored intention: light a candle of that
// color for them. The door creaks before a draft blows out a row. The sanctuary lamp must never go out: tap it to add
// oil. When the clock reaches Mass, the round ends.

export const ROUND = 180; // seconds before Mass
export const RACKS = 2, ROWS = 2, PER_ROW = 4; // 16 candle spots
export const GLASS = ["red", "blue", "white"];
const LOW = 0.25; // a candle with less than a quarter of its wax left flickers

/** A small seeded random (mulberry32), so a round can be replayed (today's game, tests). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** How hard it is p of the way through (0 → 1): how many candles burn, how fast, how often drafts and people come. */
export function difficulty(p) {
  const q = Math.max(0, Math.min(1, p));
  return {
    active: Math.round(6 + q * 10),          // 6 candles at the start, all 16 near the end
    burn: 1 + q * 1.3,                        // burn speed
    draftEvery: q < 0.2 ? Infinity : 40 - q * 22, // no drafts in the first ~36 s
    personEvery: 18 - q * 8,
    lampDrain: 1 / (45 - q * 15),             // the lamp lasts 45 s, then 30 s
  };
}

export function newGame({ seed = 1, length = ROUND } = {}) {
  const r = rng(seed);
  const candles = [];
  for (let rack = 0; rack < RACKS; rack++) for (let row = 0; row < ROWS; row++) for (let slot = 0; slot < PER_ROW; slot++) {
    const i = candles.length;
    candles.push({ id: i, rack, row, slot, glass: GLASS[(i + rack + row) % 3], size: 0.8 + r() * 0.5, life: 0, lit: false, active: false });
  }
  const g = { r, t: 0, length, candles, lamp: 1, lampOut: false, score: 0, streak: 0, bestStreak: 0, lit: 0, justInTime: 0, prayers: 0, outs: 0,
    people: [], nextPerson: 8, nextDraft: Infinity, draft: null, over: false, nextPersonId: 1 };
  activate(g);
  for (const c of g.candles) if (c.active) { c.lit = true; c.life = 0.5 + r() * 0.5; } // the first ones already burning
  return g;
}

const mult = (g) => 1 + Math.min(4, Math.floor(g.streak / 5));
/** Turn on candle spots as the round gets busier (they start out, waiting to be lit). */
function activate(g) {
  const want = difficulty(g.t / g.length).active;
  const order = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15]; // fill both racks evenly
  for (const i of order) { if (g.candles.filter((c) => c.active).length >= want) break; g.candles[i].active = true; }
}

/** Move time on by dt seconds. Returns what happened: [{type, …}] for the screen to show and say. */
export function tick(g, dt) {
  const ev = [];
  if (g.over) return ev;
  g.t = Math.min(g.length, g.t + dt);
  const d = difficulty(g.t / g.length);
  const before = g.candles.filter((c) => c.active).length;
  activate(g);
  if (g.candles.filter((c) => c.active).length > before) ev.push({ type: "more" });
  // candles burn (a big one lasts longer); 25 s for an average candle at the start
  for (const c of g.candles) {
    if (!c.active || !c.lit) continue;
    const was = c.life;
    c.life -= (dt * d.burn) / (25 * c.size);
    if (was >= LOW && c.life < LOW) ev.push({ type: "flicker", id: c.id });
    if (c.life <= 0) { c.life = 0; c.lit = false; g.outs++; ev.push({ type: "out", id: c.id, streakLost: g.streak }); g.streak = 0; }
  }
  // the sanctuary lamp
  if (!g.lampOut) {
    const was = g.lamp;
    g.lamp = Math.max(0, g.lamp - dt * d.lampDrain);
    if (was >= 0.3 && g.lamp < 0.3) ev.push({ type: "lamp-low" });
    if (g.lamp === 0) { g.lampOut = true; ev.push({ type: "lamp-out", streakLost: g.streak }); g.streak = 0; }
  }
  // drafts: the door creaks, then two seconds later the wind blows out one row
  if (g.nextDraft === Infinity && d.draftEvery !== Infinity) g.nextDraft = g.t + 4;
  if (!g.draft && g.t >= g.nextDraft) { g.draft = { rack: Math.floor(g.r() * RACKS), row: Math.floor(g.r() * ROWS), at: g.t + 2 }; ev.push({ type: "creak", ...g.draft }); }
  if (g.draft && g.t >= g.draft.at) {
    const hit = g.candles.filter((c) => c.active && c.lit && c.rack === g.draft.rack && c.row === g.draft.row);
    for (const c of hit) { c.lit = false; c.life = 0; }
    ev.push({ type: "gust", rack: g.draft.rack, row: g.draft.row, ids: hit.map((c) => c.id) });
    if (hit.length) { g.outs += hit.length; g.streak = 0; }
    g.draft = null; g.nextDraft = g.t + d.draftEvery * (0.8 + g.r() * 0.4);
  }
  // people come to pray, each with an intention of one color, and wait a while
  if (g.t >= g.nextPerson && g.people.length < 3 && g.t < g.length - 8) {
    const p = { id: g.nextPersonId++, glass: GLASS[Math.floor(g.r() * 3)], rack: Math.floor(g.r() * RACKS), wait: 14, came: g.t };
    g.people.push(p); ev.push({ type: "person", ...p });
    g.nextPerson = g.t + d.personEvery * (0.8 + g.r() * 0.4);
  }
  for (const p of [...g.people]) { p.wait -= dt; if (p.wait <= 0) { g.people.splice(g.people.indexOf(p), 1); ev.push({ type: "person-left", id: p.id }); } }
  if (g.t >= g.length) { g.over = true; ev.push({ type: "end" }); }
  return ev;
}

/** Tap a candle. Returns what happened: {type: 'lit' | 'just-in-time' | 'already' | 'inactive', points, prayer?}. */
export function tapCandle(g, id) {
  const c = g.candles[id];
  if (!c || g.over) return { type: "inactive", points: 0 };
  if (!c.active) return { type: "inactive", points: 0 };
  if (c.lit && c.life >= LOW) return { type: "already", points: 0 };
  const jit = c.lit; // still burning, but low
  c.lit = true; c.life = 1;
  g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
  let points = (jit ? 3 : 1) * mult(g);
  if (jit) g.justInTime++; else g.lit++;
  // someone praying at this rack for this color?
  const who = g.people.find((p) => p.glass === c.glass && p.rack === c.rack) ?? g.people.find((p) => p.glass === c.glass);
  let prayer = null;
  if (who) { g.people.splice(g.people.indexOf(who), 1); points += 5 * mult(g); g.prayers++; prayer = who; }
  g.score += points;
  return { type: jit ? "just-in-time" : "lit", points, prayer, streak: g.streak };
}

/** The bonus for lighting `n` candles in one swipe (three or more), added to the score. */
export function chainBonus(g, n) {
  const bonus = n >= 3 ? (n - 2) * 2 * mult(g) : 0;
  g.score += bonus;
  return bonus;
}

/** A swipe that passed over these candles, in order: each one as a tap, and a bonus for three or more lit. */
export function swipe(g, ids) {
  const seen = [...new Set(ids)];
  const results = seen.map((id) => ({ id, ...tapCandle(g, id) }));
  const good = results.filter((x) => x.type === "lit" || x.type === "just-in-time").length;
  const bonus = chainBonus(g, good);
  return { results, chain: good >= 3 ? good : 0, bonus };
}

/** The priest's help: he lights a candle that's out (no points, the streak stays). */
export function lightFree(g, id) {
  const c = g.candles[id];
  if (!c?.active || c.lit || g.over) return false;
  c.lit = true; c.life = 1;
  return true;
}

/** Tap the sanctuary lamp: add oil (or light it again). */
export function tapLamp(g) {
  if (g.over) return { type: "inactive", points: 0 };
  if (g.lampOut) { g.lampOut = false; g.lamp = 1; return { type: "relit", points: 0 }; }
  if (g.lamp < 0.3) { g.lamp = 1; g.score += 2 * mult(g); return { type: "filled", points: 2 * mult(g) }; }
  g.lamp = Math.min(1, g.lamp + 0.15);
  return { type: "topped", points: 0 };
}

/** Stars for a finished round: two for any child who keeps lighting, three takes real focus (the best score is the
 * open-ended chase). Tuned with pretend players in test/game.test.js. */
export const STAR2 = 120, STAR3 = 700;
export function starsFor(g) {
  return g.score >= STAR3 ? 3 : g.score >= STAR2 ? 2 : 1;
}

/** The candles a child can see as needing them: out, or flickering. */
export const needy = (g) => g.candles.filter((c) => c.active && (!c.lit || c.life < LOW)).map((c) => c.id);
export { LOW };
