// Monastery Porter's rules (his idea, Nov 2026; ROADMAP.md, "Monastery Porter"). Pure (no screen), tested in
// test/porter.test.js; app.js and gate.js only draw what happens here.
//
// Visitors walk up the path and line up at the monastery gate. The first in line knocks and says who they are (read
// aloud, with a picture over their head). One quick move per person:
//   👋 Welcome   swipe up, tap the gate, or tap Welcome to let people who belong in (the door opens by itself;
//                important guests bring warm greetings and bonus points!).
//   🙋 Send away swipe sideways or tap Send away to kindly send everyone else on their way (peddlers, goats…).
// Brothers also walk out through the gate to the garden, bakery or bell tower. Wait for a brother crossing the gate
// before welcoming the next visitor in, or they'll bump elbows (a funny little stumble that breaks your combo!).
// Each stage has its own rule about who comes in; someone in trouble always does. A visitor who waits too long gives up.
// Right answers in a row build a combo that multiplies the points. Timed stages end at the bell; the endless one ends
// when too many people are waiting.
import { VISITORS, ANIMALS, OUTGOING, hintFor } from "./visitors.js";
import { STAGES } from "./stages.js";

export const ARRIVE = 0.5;        // base seconds for the next visitor to step up to the gate
export const OUT_APPROACH = 1.0;  // base seconds for an outgoing brother to walk from chapel to gate
export const OUT_CROSS = 1.45;    // base seconds for an outgoing brother to walk through the gate
export const WRONG = 8;           // points lost for a wrong answer (never below 0)
export const QUICK = 0.55;        // answered with more than this much of their patience left: a quick-answer bonus
export const VIP_PATIENCE = 0.55; // an important guest (or the repairman) is in a hurry
export const COMBO = 5;           // every 5 right answers in a row, the multiplier goes up by one
export const MAX_MULT = 5;
export const START_DELAY = 4;     // seconds before the first visitor (time to hear the rule)
export const DOG_DELAY = 0.6;     // his dog gets to an animal at the gate right after it knocks
export const DOG_POINTS = 5;      // for an animal the dog chased off (no combo)
export const DOG_BARK = 1.5;      // seconds Send away waits after the dog barks
export const BELL_QUIET = 5;      // Sister's bell holds off new arrivals and outgoing brothers

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
  const g = { r: rng(seed), porter, t: 0, length: length ?? stage.length, stage, queue: [], front: null,
    outgoing: [], nextOut: START_DELAY + 6, lastOut: null, nextArrival: START_DELAY, nextId: 1, last: null,
    stepAt: 0, score: 0, forgiven: 0, forgiveAt: 0, bellUsed: false, dogUntil: 0,
    welcomed: 0, greeted: 0, sentOn: 0, wrong: 0, missed: 0, bumps: 0, brothersOut: 0,
    right: 0, streak: 0, bestStreak: 0, over: false, endReason: null, pool: pool(stage) };
  return g;
}

/** How far along a timed stage is, 0 → 1 (to the bell). */
const progress = (g) => Math.min(1, g.t / g.length);
/** How much brisker walking gets as the day (or feast crowd) ramps up. */
export const speedOf = (g) => (g.stage.endless ? Math.min(1.6, 1 + (g.t / 60) * 0.15) : 1 + 0.25 * progress(g));
/** The multiplier for the next right answer. */
export const multOf = (g) => Math.min(MAX_MULT, 1 + Math.floor(g.streak / (g.porter.comboEvery ?? COMBO)));
const stepGapOf = (g) => g.porter.stepGap ?? 0;
const belongs = (a) => a === "in" || a === "greet";
/** The brother currently walking out through the gate (wait for him before welcoming someone in), or null. */
export const brotherInGate = (g) => g.outgoing.find((b) => b.state === "crossing") ?? null;

function arrive(g) {
  const st = g.stage, [e0, e1] = st.every, mix = st.mix, x = g.r();
  const side = x < mix.in ? "in" : x < mix.in + mix.greet ? "greet" : "away";
  let list = g.pool[side].filter((v) => v.id !== g.last);
  if (!list.length) list = g.pool[side].length ? g.pool[side] : [...g.pool.in, ...g.pool.greet, ...g.pool.away];
  const def = list[Math.floor(g.r() * list.length) % list.length];
  g.last = def.id;
  const max = st.patience * (g.porter.patience ?? 1) * (def.vip ? VIP_PATIENCE : 1), rules = st.rules ?? st.id;
  const v = { id: g.nextId++, def: def.id, emoji: def.emoji, kind: def.kind, robe: def.robe, vip: !!def.vip, who: def.who, line: def.line, reply: def.reply ?? "", later: def.later ?? "", why: hintFor(def, rules), answer: def.answers[rules],
    patience: max, max, waited: 0, state: "line" };
  g.queue.push(v);
  // a timed stage: a little busier toward the bell. The feast day: every minute, the gaps between people shrink by a third (`perMinute`), down to `floor`
  const gap = st.endless ? Math.max(st.floor, e0 * st.perMinute ** (g.t / 60)) : e0 + (e1 - e0) * progress(g);
  g.nextArrival = g.t + gap * (0.8 + g.r() * 0.4);
  return v;
}

function spawnBrother(g) {
  const st = g.stage;
  const choices = OUTGOING.filter((o) => o.id !== g.lastOut);
  const def = choices[Math.floor(g.r() * choices.length) % choices.length];
  g.lastOut = def.id;
  const spd = speedOf(g), approachDur = OUT_APPROACH / spd, crossDur = OUT_CROSS / spd;
  const b = { id: g.nextId++, dest: def.id, place: def.place, emoji: def.emoji, robe: def.robe, line: def.line,
    state: "coming", approachDur, crossDur, crossAt: g.t + approachDur, clearAt: g.t + approachDur + crossDur, bumped: false };
  g.outgoing.push(b);
  const [o0, o1] = st.outEvery ?? [11, 6.5];
  const gap = st.endless ? Math.max(st.outFloor ?? 3.0, o0 * (st.outPerMinute ?? 0.7) ** (g.t / 60)) : o0 + (o1 - o0) * progress(g);
  g.nextOut = g.t + gap * (0.85 + g.r() * 0.3);
  return b;
}

/** Move time on. Returns what happened: [{type: 'arrive' | 'step-up' | 'knock' | 'leave' | 'brother-start' | 'brother-cross' | 'brother-clear' | 'decided' | 'end', …}]. */
export function tick(g, dt) {
  const ev = [];
  if (g.over) return ev;
  g.t = Math.min(g.length, g.t + dt);
  if (g.t >= g.nextArrival) {
    if (g.queue.length < g.stage.maxQueue) ev.push({ type: "arrive", v: arrive(g) });
    else g.nextArrival = g.t + 0.4; // the path is full: try again in a moment
  }
  if (g.t >= g.nextOut) {
    if (g.outgoing.length === 0) ev.push({ type: "brother-start", b: spawnBrother(g) });
    else g.nextOut = g.t + 0.5;
  }
  for (const b of g.outgoing) {
    if (b.state === "coming" && g.t >= b.crossAt) { b.state = "crossing"; ev.push({ type: "brother-cross", b }); }
    if (b.state === "crossing" && g.t >= b.clearAt) { b.state = "clear"; g.brothersOut++; ev.push({ type: "brother-clear", b }); }
  }
  g.outgoing = g.outgoing.filter((b) => b.state !== "clear");
  if (!g.front && g.queue.length && g.t >= g.stepAt) {
    const v = g.front = g.queue.shift(); v.state = "arriving"; v.arrivesAt = g.t + ARRIVE / speedOf(g);
    ev.push({ type: "step-up", v });
  }
  const f = g.front;
  if (f?.state === "arriving" && g.t >= f.arrivesAt) { f.state = "waiting"; ev.push({ type: "knock", v: f }); }
  else if (f?.state === "waiting") {
    f.waited += dt;
    if (g.porter.dog && ANIMALS.includes(f.kind) && f.waited >= DOG_DELAY) ev.push(...dogChase(g)); // his dog gets there first
    else {
      if (!(brotherInGate(g) && belongs(f.answer))) f.patience -= dt; // visitors who belong politely wait while a brother crosses the gate
      if (f.patience <= 0) {
        f.patience = 0; f.state = "left"; g.front = null; g.stepAt = g.t + stepGapOf(g);
        g.missed++; g.streak = 0; g.score = Math.max(0, g.score - 2); if (f.answer !== "away") g.wrong++;
        ev.push({ type: "leave", v: f });
      }
    }
  }
  if (g.stage.endless && g.queue.length >= g.stage.maxLine) { g.over = true; g.endReason = "line"; ev.push({ type: "end", reason: "line", time: g.t }); }
  else if (g.t >= g.length) { g.over = true; g.endReason = "bell"; ev.push({ type: "end", reason: "bell" }); }
  return ev;
}

/** The visitor at the gate (or stepping up to it), if they're waiting for your answer: you can answer as soon as they appear. */
export const waiting = (g) => (g.front?.state === "arriving" || g.front?.state === "waiting" ? g.front : null);

/** Answer the visitor at the gate: how = "welcome" (let them in) or "away" (kindly send them on). */
function resolve(g, how) {
  const v = waiting(g);
  if (g.over || !v) return [];
  const a = v.answer, special = a === "greet", correct = how === "welcome" ? belongs(a) : a === "away";
  const blocker = how === "welcome" ? brotherInGate(g) : null;
  const bumped = !!blocker && !g.porter.noBump;
  const quick = v.patience / v.max > QUICK;
  let points = 0, forgiven = false;
  const mult = multOf(g);
  if (correct && !bumped) {
    const rawBase = how === "welcome" ? (special ? (v.vip ? 25 : 20) : v.vip ? 15 : 10) : 8;
    const base = Math.max(1, Math.round(rawBase * (g.porter.pointsScale ?? 1)));
    points = (base + (quick ? 3 : 0)) * mult;
    g.right++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
    g.score += points;
  } else if (correct && bumped) {
    g.streak = 0; g.bumps++; blocker.bumped = true;
  } else if (g.porter.forgiving && g.t >= g.forgiveAt) {
    g.forgiveAt = g.t + 60; g.forgiven++; forgiven = true;
    if (bumped) blocker.bumped = true;
  } else {
    points = -WRONG; g.wrong++; g.streak = 0; g.score = Math.max(0, g.score + points);
    if (bumped) { g.bumps++; blocker.bumped = true; }
  }
  if (how === "away") g.sentOn++; else if (special) g.greeted++; else g.welcomed++;
  v.state = how === "away" ? "sent" : "welcomed"; v.how = how; g.front = null; g.stepAt = g.t + stepGapOf(g);
  return [{ type: "decided", v, how, special, correct: correct || forgiven, bumped, brother: bumped ? blocker : null,
    forgiven, quick: correct && !bumped ? quick : false, points, mult: correct && !bumped ? mult : 1, streak: g.streak }];
}

/** Welcome the visitor at the gate in (swipe up, tap the gate, or Welcome). */
export const welcome = (g) => resolve(g, "welcome");
/** Kindly send them on their way (not while the dog is still barking). */
export const sendAway = (g) => (g.t < g.dogUntil ? [] : resolve(g, "away"));

/** The dog chases an animal at the gate off by itself: a few points, no combo, and then it barks. */
function dogChase(g) {
  const v = waiting(g);
  if (!v) return [];
  g.score += DOG_POINTS; g.right++; g.sentOn++; g.dogUntil = g.t + DOG_BARK;
  v.state = "sent"; v.how = "dog"; g.front = null; g.stepAt = g.t + stepGapOf(g);
  return [{ type: "decided", v, how: "away", dog: true, special: false, correct: true, bumped: false, brother: null,
    forgiven: false, quick: true, points: DOG_POINTS, mult: 1, streak: g.streak }];
}

/** Sister's bell (once a round): everyone waiting is patient again, and arrivals and outgoing brothers pause for a moment. */
export function ringBell(g) {
  if (g.over || !g.porter.bell || g.bellUsed) return [];
  g.bellUsed = true;
  g.nextArrival = Math.max(g.nextArrival, g.t + BELL_QUIET);
  g.nextOut = Math.max(g.nextOut, g.t + BELL_QUIET);
  for (const v of [g.front, ...g.queue]) if (v) { v.patience = v.max; v.waited = 0; }
  return [{ type: "bell" }];
}

/** Stars: two for steady good answers, three for quick, right and in a row. Tuned in the tests. */
export const starsFor = (g) => (g.score >= g.stage.star3 ? 3 : g.score >= g.stage.star2 ? 2 : 1);
