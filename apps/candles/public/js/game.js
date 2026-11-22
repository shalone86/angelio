// Candle Rack's rules: the minute and a half before Mass, getting the church ready. Pure (no screen), so it's tested
// in Node (test/game.test.js) and the screen (app.js + church.js) only draws what happens here.
//
// Candles burn down; tap one that's out to light it. Tap one that's flickering (nearly out) for "just in time!",
// worth more. Light them quickly one after another for a combo: each light within COMBO_GAP seconds of the last adds
// to it, and the combo multiplies the points; pause too long and it ends. Swipe along a row to light several in one go
// (a chain). People come and kneel in front of a rack to pray, and the candles behind them can't be reached until they
// leave on their own; the priest or the server can go round behind the rack and light those for you (helperLight). The
// door creaks before a draft blows out a row. The sanctuary lamp must never go out: tap it to add oil. At Mass, the
// round ends, and every candle still burning counts.
//
// STAGES (stages.js) change the rules: from the second on, the player's TAPER lights only so many candles before it has
// to be lit again at the big candle (tapBigCandle); busier feasts bring more people (up to two at a rack, side by side);
// at Pascha the church starts dark, every candle out.

export const ROUND = 90; // seconds before Mass
export const RACKS = 2, ROWS = 2, PER_ROW = 4; // 16 candle spots
export const COMBO_GAP = 2; // seconds between lights to keep a combo going
const LOW = 0.25; // a candle with less than a quarter of its wax left flickers
export const READY_BONUS = 2; // each candle burning when Mass begins
export const WALK_IN = 2; // seconds someone takes to walk up to the rack before kneeling
/** The rules of the first stage (stages.js has every stage; newGame takes any of them). */
export const SUNDAY = { taper: 0, maxPeople: 2, peopleRate: 1, burn: 1, dark: false, star2: 30, star3: 450 };

/** A small seeded random (mulberry32), so a round can be replayed (today's game, tests). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** How hard it is p of the way through (0 → 1): how many candles burn, how fast, how often drafts and people come.
 * `total`: how many candle spots the church has (16 on two racks; the chapel's four racks have 32). */
export function difficulty(p, total = 16) {
  const q = Math.max(0, Math.min(1, p));
  return {
    active: Math.min(total, Math.round(((6 + q * 10) * total) / 16)), // 6 of 16 candles at the start, all near the end
    burn: 1 + q * 1.2,                             // burn speed
    draftEvery: q < 0.2 ? Infinity : 22 - q * 10,  // no drafts in the first ~18 s
    personEvery: 14 - q * 6,
    lampDrain: 1 / (30 - q * 10),                  // the lamp lasts 30 s, then 20 s
  };
}

// ENDLESS (the Adoration chapel at night): no clock to Mass. It gets harder for RAMP seconds, then keeps burning a little
// faster; the night ends when the chapel stays dark (fewer than DARK_SHARE of the candles lit) for DARK_LIMIT seconds.
export const RAMP = 240, DARK_SHARE = 0.34, DARK_LIMIT = 8;
/** How far into the round it is, 0 → 1 (an endless night: how far up the ramp). */
const progress = (g) => (g.stage.endless ? Math.min(1, g.t / RAMP) : g.t / g.length);

export function newGame({ seed = 1, length = ROUND, stage = SUNDAY } = {}) {
  const r = rng(seed);
  const candles = [], racks = stage.racks ?? RACKS;
  if (stage.endless) length = Infinity;
  for (let rack = 0; rack < racks; rack++) for (let row = 0; row < ROWS; row++) for (let slot = 0; slot < PER_ROW; slot++) {
    candles.push({ id: candles.length, rack, row, slot, size: 0.8 + r() * 0.5, life: 0, lit: false, active: false });
  }
  const g = { r, t: 0, length, candles, lamp: 1, lampOut: false, score: 0, combo: 0, bestCombo: 0, lastLight: -Infinity,
    lit: 0, justInTime: 0, outs: 0, helperLit: 0, ready: 0, people: [], nextPerson: 10, nextDraft: Infinity, draft: null,
    over: false, nextPersonId: 1, stage: { ...SUNDAY, ...stage }, taper: stage.taper ?? 0, tapers: 0, racks, dark: 0, darkWarned: false };
  g.nextPerson = 10 / g.stage.peopleRate;
  activate(g);
  // the first ones already burning (at Pascha, all dark)
  if (!g.stage.dark) for (const c of g.candles) if (c.active) { c.lit = true; c.life = 0.5 + r() * 0.5; }
  return g;
}

/** The combo multiplier: ×2 at 3 in a row, ×3 at 6, ×4 at 9, ×5 at 12. */
export const multFor = (combo) => 1 + Math.min(4, Math.floor(combo / 3));
const mult = (g) => multFor(g.combo);

/** Turn on candle spots as the round gets busier (they start out, waiting to be lit). */
function activate(g) {
  const want = difficulty(progress(g), g.candles.length).active;
  // fill every rack evenly: the first spot of each rack's rows, then the second…
  const order = [];
  for (let slot = 0; slot < PER_ROW; slot++) for (let rack = 0; rack < g.racks; rack++) for (let row = 0; row < ROWS; row++) order.push(rack * ROWS * PER_ROW + row * PER_ROW + slot);
  for (const i of order) { if (g.candles.filter((c) => c.active).length >= want) break; g.candles[i].active = true; }
}

/** Who is kneeling in front of this candle, if anyone (a person blocks two spots across, both rows). */
export function blockerOf(g, id) {
  const c = g.candles[id];
  return c ? g.people.find((p) => g.t >= p.at && p.rack === c.rack && (c.slot === p.slot || c.slot === p.slot + 1)) ?? null : null;
}

/** Move time on by dt seconds. Returns what happened: [{type, …}] for the screen to show and say. */
export function tick(g, dt) {
  const ev = [];
  if (g.over) return ev;
  g.t = Math.min(g.length, g.t + dt);
  const d = difficulty(progress(g), g.candles.length);
  if (g.stage.endless) d.burn += Math.max(0, g.t - RAMP) / 400; // past the ramp, a little faster all night
  const before = g.candles.filter((c) => c.active).length;
  activate(g);
  if (g.candles.filter((c) => c.active).length > before) ev.push({ type: "more" });
  // a combo ends when the child pauses too long
  if (g.combo && g.t - g.lastLight > COMBO_GAP) { ev.push({ type: "combo-end", combo: g.combo }); g.combo = 0; }
  // candles burn (a big one lasts longer); 18 s for an average candle at the start
  for (const c of g.candles) {
    if (!c.active || !c.lit) continue;
    const was = c.life;
    c.life -= (dt * d.burn * g.stage.burn) / (18 * c.size);
    if (was >= LOW && c.life < LOW) ev.push({ type: "flicker", id: c.id });
    if (c.life <= 0) { c.life = 0; c.lit = false; g.outs++; ev.push({ type: "out", id: c.id }); }
  }
  // the sanctuary lamp
  if (!g.lampOut) {
    const was = g.lamp;
    g.lamp = Math.max(0, g.lamp - dt * d.lampDrain);
    if (was >= 0.3 && g.lamp < 0.3) ev.push({ type: "lamp-low" });
    if (g.lamp === 0) { g.lampOut = true; ev.push({ type: "lamp-out" }); }
  }
  // drafts: the door creaks, then two seconds later the wind blows out one row
  if (g.nextDraft === Infinity && d.draftEvery !== Infinity) g.nextDraft = g.t + 3;
  if (!g.draft && g.t >= g.nextDraft) { g.draft = { rack: Math.floor(g.r() * g.racks), row: Math.floor(g.r() * ROWS), at: g.t + 2 }; ev.push({ type: "creak", ...g.draft }); }
  if (g.draft && g.t >= g.draft.at) {
    const hit = g.candles.filter((c) => c.active && c.lit && c.rack === g.draft.rack && c.row === g.draft.row);
    for (const c of hit) { c.lit = false; c.life = 0; }
    ev.push({ type: "gust", rack: g.draft.rack, row: g.draft.row, ids: hit.map((c) => c.id) });
    g.outs += hit.length;
    g.draft = null; g.nextDraft = g.t + d.draftEvery * (0.8 + g.r() * 0.4);
  }
  // people come and kneel in front of a rack, in the way, for a while (never two in the same spot)
  if (g.t >= g.nextPerson && g.people.length < g.stage.maxPeople && g.t < g.length - 10) {
    const free = [];
    for (let rack = 0; rack < g.racks; rack++) for (let slot = 0; slot < PER_ROW - 1; slot++) {
      if (!g.people.some((q) => q.rack === rack && Math.abs(q.slot - slot) < 2)) free.push({ rack, slot });
    }
    // one rack at a time while there's room elsewhere, so both racks get busy
    const empty = free.filter((f) => !g.people.some((q) => q.rack === f.rack));
    const pool = empty.length ? empty : free;
    if (pool.length) {
      const { rack, slot } = pool[Math.floor(g.r() * pool.length)];
      // they walk in for WALK_IN seconds (the screen shows it), then kneel and are in the way
      const p = { id: g.nextPersonId++, rack, slot, came: g.t, at: g.t + WALK_IN, until: g.t + WALK_IN + 10 + g.r() * 5 };
      g.people.push(p); ev.push({ type: "person", ...p });
    }
    g.nextPerson = g.t + (d.personEvery / g.stage.peopleRate) * (0.8 + g.r() * 0.4);
  }
  for (const p of [...g.people]) {
    if (g.t >= p.until) { g.people.splice(g.people.indexOf(p), 1); ev.push({ type: "person-left", id: p.id }); }
  }
  // the endless night: too dark for too long, and the night is over (a warning first)
  if (g.stage.endless) {
    const active = g.candles.filter((c) => c.active), lit = active.filter((c) => c.lit).length;
    if (lit < active.length * DARK_SHARE) {
      g.dark += dt;
      if (!g.darkWarned && g.dark >= 1.5) { g.darkWarned = true; ev.push({ type: "dark" }); }
      if (g.dark >= DARK_LIMIT) { g.over = true; ev.push({ type: "end", reason: "dark", time: g.t }); }
    } else { g.dark = Math.max(0, g.dark - dt * 2); if (g.dark === 0) g.darkWarned = false; }
    return ev;
  }
  if (g.t >= g.length) {
    g.over = true;
    g.ready = g.candles.filter((c) => c.active && c.lit).length;
    g.score += g.ready * READY_BONUS;
    ev.push({ type: "end", ready: g.ready, bonus: g.ready * READY_BONUS });
  }
  return ev;
}

/** Tap a candle. Returns {type: 'lit' | 'just-in-time' | 'already' | 'blocked' | 'no-taper' | 'inactive', points, combo,
 * person?, taper?}. */
export function tapCandle(g, id) {
  const c = g.candles[id];
  if (!c || g.over || !c.active) return { type: "inactive", points: 0 };
  const person = blockerOf(g, id);
  if (person) return { type: "blocked", points: 0, person };
  if (c.lit && c.life >= LOW) return { type: "already", points: 0 };
  if (g.stage.taper && g.taper <= 0) return { type: "no-taper", points: 0 };
  if (g.stage.taper) g.taper--;
  const jit = c.lit; // still burning, but low
  c.lit = true; c.life = 1;
  g.combo = g.t - g.lastLight <= COMBO_GAP ? g.combo + 1 : 1;
  g.lastLight = g.t;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  const points = (jit ? 3 : 1) * mult(g);
  if (jit) g.justInTime++; else g.lit++;
  g.score += points;
  return { type: jit ? "just-in-time" : "lit", points, combo: g.combo, mult: mult(g), taper: g.taper };
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

/** The candles someone kneeling is in the way of that need lighting (out or flickering). */
export const blockedNeedy = (g, personId) => g.candles.filter((c) => c.active && (!c.lit || c.life < LOW) && blockerOf(g, c.id)?.id === personId).map((c) => c.id);

/** The priest or the server, from behind the rack, lights the candles this person is in the way of: a point each (the
 * combo doesn't change). Returns the ids he lit. */
export function helperLight(g, personId) {
  if (g.over || g.stage.helpers === false) return []; // the chapel at night: nobody to help
  const ids = blockedNeedy(g, personId);
  for (const id of ids) { const c = g.candles[id]; c.lit = true; c.life = 1; }
  g.helperLit += ids.length; g.score += ids.length;
  return ids;
}

/** The server's own help: he lights a candle that's out (no points, the combo stays). */
export function lightFree(g, id) {
  const c = g.candles[id];
  if (!c?.active || c.lit || g.over || blockerOf(g, id)) return false;
  c.lit = true; c.life = 1;
  return true;
}

/** Tap the big candle: light the taper again (full). The combo keeps going if the child is quick about it. */
export function tapBigCandle(g) {
  if (g.over || !g.stage.taper) return { type: "inactive" };
  if (g.taper >= g.stage.taper) return { type: "full" };
  g.taper = g.stage.taper; g.tapers++;
  if (g.combo) g.lastLight = g.t; // the trip to the big candle doesn't break the combo
  return { type: "taper" };
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
 * open-ended chase). Each stage has its own (stages.js), tuned with pretend players in test/game.test.js. */
export function starsFor(g) {
  return g.score >= g.stage.star3 ? 3 : g.score >= g.stage.star2 ? 2 : 1;
}

/** The candles a child can tap now: out or flickering, and not behind someone kneeling. */
export const needy = (g) => g.candles.filter((c) => c.active && (!c.lit || c.life < LOW) && !blockerOf(g, c.id)).map((c) => c.id);
export { LOW };
