// Monastery Porter's rules (his idea, Nov 2026; ROADMAP.md, "Monastery Porter"). Pure (no screen), tested in
// test/porter.test.js; app.js and gate.js only draw what happens here.
//
// Visitors walk up the path and line up at the monastery gate. The first in line knocks and says who they are (read
// aloud, with a picture over their head). You have three buttons:
//   🚪 Door     opens (or closes) the door. While it's open, whoever stands at it walks straight in after a moment, so a
//               line of people who belong can stream in without a tap. But an open door costs points after a few seconds
//               (a draft!), and animals and special guests who walk in that way are a mistake.
//   👋 Welcome  a proper greeting, for special guests (a bishop, the mayor, "Glory to Jesus Christ!"): the big points. (For
//               someone who only needed the door it's harmless but earns nothing.)
//   🙋 Send away kindly sends them on their way (animals, peddlers, people who aren't coming to pray).
// Each stage has its own rule about who comes in; someone in trouble always does. A visitor who waits too long gives up.
// Quick right answers in a row build a combo that multiplies the points. Timed stages end at the bell; the endless one
// ends when too many people are waiting.
import { VISITORS, ANIMALS, hintFor } from "./visitors.js";
import { STAGES } from "./stages.js";

export const ARRIVE = 0.5;      // seconds for the next visitor to step up to the door
export const GRACE = 0.8;       // an open door: a visitor walks in this long after reaching it (time to catch the wrong ones)
export const FREE_OPEN = 2.0;   // seconds the door can stay open before the draft starts costing points
export const DRAIN = 2.5;       // points a second lost to the draft after that
export const WRONG = 8;         // points lost for a wrong answer (never below 0)
export const QUICK = 0.55;      // answered with more than this much of their patience left: a quick-answer bonus
export const VIP_PATIENCE = 0.55; // an important guest (or the repairman) is in a hurry
export const COMBO = 5;         // every 5 right answers in a row, the multiplier goes up by one
export const MAX_MULT = 5;
export const START_DELAY = 4;  // seconds before the first visitor (time to hear the rule)

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The visitors who can come to a stage, as {in: […], greet: […], away: […]}. */
export function pool(stage) {
  const out = { in: [], greet: [], away: [] };
  for (const v of VISITORS) { const a = v.answers[stage.rules ?? stage.id]; if (a) out[a].push(v); }
  return out;
}

export function newGame({ seed = 1, stage = STAGES[0], length, porter = {} } = {}) {
  const g = { r: rng(seed), porter, t: 0, length: length ?? stage.length, stage, queue: [], front: null, door: false, doorOpenFor: 0, drainAcc: 0, drained: 0, nextArrival: 0, nextId: 1, last: null,
    stepAt: 0, score: 0, forgiven: 0, forgiveAt: 0, bellUsed: false, dogUntil: 0, welcomed: 0, greeted: 0, sentOn: 0, wrong: 0, missed: 0, right: 0, streak: 0, bestStreak: 0, over: false, endReason: null, pool: pool(stage) };
  g.nextArrival = START_DELAY;
  return g;
}

/** How far along a timed stage is, 0 → 1 (to the bell). */
const progress = (g) => Math.min(1, g.t / g.length);
/** The multiplier for the next right answer. */
export const multOf = (g) => Math.min(MAX_MULT, 1 + Math.floor(g.streak / (g.porter.comboEvery ?? COMBO)));
const graceOf = (g) => g.porter.grace ?? GRACE, freeOpenOf = (g) => g.porter.freeOpen ?? FREE_OPEN, stepGapOf = (g) => g.porter.stepGap ?? 0;
export const DOG_DELAY = 0.6;  // the dog gets to an animal at the door before the open door lets it in
export const DOG_POINTS = 5;   // for an animal the dog chased off (no combo)
export const DOG_BARK = 1.5;   // seconds Send away waits after the dog barks

function arrive(g) {
  const st = g.stage, [e0, e1] = st.every, mix = st.mix, x = g.r();
  const side = x < mix.in ? "in" : x < mix.in + mix.greet ? "greet" : "away";
  let list = g.pool[side].filter((v) => v.id !== g.last);
  if (!list.length) list = g.pool[side].length ? g.pool[side] : [...g.pool.in, ...g.pool.greet, ...g.pool.away];
  const def = list[Math.floor(g.r() * list.length) % list.length];
  g.last = def.id;
  const max = st.patience * (g.porter.patience ?? 1) * (def.vip ? VIP_PATIENCE : 1), rules = st.rules ?? st.id;
  const v = { id: g.nextId++, def: def.id, emoji: def.emoji, kind: def.kind, robe: def.robe, vip: !!def.vip, line: def.line, reply: def.reply ?? "", later: def.later ?? "", why: hintFor(def, rules), answer: def.answers[rules],
    patience: max, max, waited: 0, state: "line" };
  g.queue.push(v);
  // a timed stage: a little busier toward the bell. The feast day: every minute, the gaps between people shrink by a third (`perMinute`), down to `floor`
  const gap = st.endless ? Math.max(st.floor, e0 * st.perMinute ** (g.t / 60)) : e0 + (e1 - e0) * progress(g);
  g.nextArrival = g.t + gap * (0.8 + g.r() * 0.4);
  return v;
}

/** Move time on. Returns what happened: [{type: 'arrive' | 'step-up' | 'knock' | 'leave' | 'decided' | 'draft' | 'end', …}]. */
export function tick(g, dt) {
  const ev = [];
  if (g.over) return ev;
  g.t = Math.min(g.length, g.t + dt);
  if (g.t >= g.nextArrival) {
    if (g.queue.length < g.stage.maxQueue) ev.push({ type: "arrive", v: arrive(g) });
    else g.nextArrival = g.t + 0.4; // the path is full: try again in a moment
  }
  if (!g.front && g.queue.length && g.t >= g.stepAt) {
    const v = g.front = g.queue.shift(); v.state = "arriving"; v.arrivesAt = g.t + ARRIVE;
    ev.push({ type: "step-up", v });
  }
  const f = g.front;
  if (f?.state === "arriving" && g.t >= f.arrivesAt) { f.state = "waiting"; ev.push({ type: "knock", v: f }); }
  else if (f?.state === "waiting") {
    f.patience -= dt; f.waited += dt;
    if (g.porter.dog && ANIMALS.includes(f.kind) && f.waited >= DOG_DELAY) ev.push(...dogChase(g)); // his dog gets there first
    else if (g.door && f.waited >= graceOf(g)) ev.push(...resolve(g, "door", true)); // an open door: in they walk
    else if (f.patience <= 0) {
      f.patience = 0; f.state = "left"; g.front = null; g.stepAt = g.t + stepGapOf(g);
      g.missed++; g.streak = 0; g.score = Math.max(0, g.score - 2); if (f.answer !== "away") g.wrong++;
      ev.push({ type: "leave", v: f });
    }
  }
  // the draft: a door left open too long costs points
  if (g.door) {
    g.doorOpenFor += dt;
    if (g.doorOpenFor > freeOpenOf(g) && g.score > 0) {
      const lose = Math.min(g.score, DRAIN * dt); g.score -= lose; g.drained += lose; g.drainAcc += lose;
      if (g.drainAcc >= 2) { ev.push({ type: "draft", points: Math.floor(g.drainAcc) }); g.drainAcc -= Math.floor(g.drainAcc); }
    }
  }
  if (g.stage.endless && g.queue.length >= g.stage.maxLine) { g.over = true; g.endReason = "line"; ev.push({ type: "end", reason: "line", time: g.t }); }
  else if (g.t >= g.length) { g.over = true; g.endReason = "bell"; ev.push({ type: "end", reason: "bell" }); }
  return ev;
}

/** The visitor at the door (or stepping up to it), if they're waiting for your answer: you can answer as soon as they appear. */
export const waiting = (g) => (g.front?.state === "arriving" || g.front?.state === "waiting" ? g.front : null);

/** Answer the visitor at the door: how = "door" (they walk in), "greet" (a proper welcome) or "away" (sent on their way). */
function resolve(g, how, auto = false) {
  const v = waiting(g);
  if (g.over || !v) return [];
  const a = v.answer;
  // right: a person who belongs through the open door, a special guest greeted (anyone who belongs may be greeted too,
  // just for fewer points), or someone sent away who should be
  const correct = how === "door" ? a === "in" || (a === "greet" && !!g.porter.respected) : how === "greet" ? a === "greet" : a === "away";
  // greeting someone who only needed the door opened is harmless, but earns nothing and breaks the combo
  const neutral = how === "greet" && a === "in";
  const quick = auto || v.patience / v.max > QUICK;
  let points = 0, forgiven = false;
  const mult = multOf(g);
  if (correct) {
    const base = how === "greet" ? (g.porter.respected ? 12 : v.vip ? 25 : 20) : how === "door" ? (v.vip ? 15 : 10) : 8;
    points = (base + (quick ? 3 : 0)) * mult;
    g.right++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
  } else if (neutral) { g.streak = 0; }
  else if (g.porter.forgiving && g.t >= g.forgiveAt) { g.forgiveAt = g.t + 60; g.forgiven++; forgiven = true; } // kind Brother André: the first mistake each minute is forgiven
  else { points = -WRONG; g.wrong++; g.streak = 0; }
  g.score = Math.max(0, g.score + points);
  if (how === "away") g.sentOn++; else if (how === "greet") g.greeted++; else g.welcomed++;
  v.state = how === "away" ? "sent" : "welcomed"; v.how = how; g.front = null; g.stepAt = g.t + stepGapOf(g);
  return [{ type: "decided", v, how, correct: correct || neutral || forgiven, neutral, forgiven, quick, points, mult: correct ? mult : 1, streak: g.streak, auto }];
}

/** Open or close the door. Opening it lets the visitor at the door walk in right away. Returns the events. */
export function toggleDoor(g) {
  if (g.over) return [];
  g.door = !g.door; g.doorOpenFor = 0; g.drainAcc = 0;
  const ev = [{ type: "door", open: g.door }];
  if (g.door) ev.push(...resolve(g, "door"));
  return ev;
}
export const greet = (g) => resolve(g, "greet");
/** Send them on their way (not while the dog is still barking). */
export const sendAway = (g) => (g.t < g.dogUntil ? [] : resolve(g, "away"));

/** The dog chases an animal at the door off by itself: a few points, no combo, and then it barks. */
function dogChase(g) {
  const v = waiting(g);
  if (!v) return [];
  g.score += DOG_POINTS; g.right++; g.sentOn++; g.dogUntil = g.t + DOG_BARK;
  v.state = "sent"; v.how = "dog"; g.front = null; g.stepAt = g.t + stepGapOf(g);
  return [{ type: "decided", v, how: "away", dog: true, correct: true, neutral: false, quick: true, points: DOG_POINTS, mult: 1, streak: g.streak }];
}

/** Sister's bell (once a round): everyone waiting is patient again, and no one new comes for a few seconds. */
export const BELL_QUIET = 5;
export function ringBell(g) {
  if (g.over || !g.porter.bell || g.bellUsed) return [];
  g.bellUsed = true; g.nextArrival = Math.max(g.nextArrival, g.t + BELL_QUIET);
  for (const v of [g.front, ...g.queue]) if (v) { v.patience = v.max; v.waited = 0; }
  return [{ type: "bell" }];
}

/** Stars: two for steady good answers, three for quick, right and in a row. Tuned in the tests. */
export const starsFor = (g) => (g.score >= g.stage.star3 ? 3 : g.score >= g.stage.star2 ? 2 : 1);
