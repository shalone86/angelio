// Monastery Porter's rules (his idea, Nov 2026; ROADMAP.md, "Monastery Porter"). Pure (no screen), tested in
// test/porter.test.js; app.js and gate.js only draw what happens here.
//
// Visitors walk up the path and line up at the monastery gate. The first in line knocks and says who they are (read
// aloud). You choose: 👋 Welcome (the door opens and they come in) or 🙋 Come back later (kindly sent on their way).
// Each stage has its own rule (who is expected), and someone in trouble always comes in. A visitor who is made to
// wait too long gives up and goes home. The round lasts until the bell for Mass (or the Liturgy, or morning).
import { VISITORS } from "./visitors.js";
import { STAGES } from "./stages.js";

export const ARRIVE = 1.4;      // seconds for the next visitor to step up to the door
export const BUSY_IN = 3.0;     // the door opens, they walk in, it closes
export const BUSY_LATER = 2.2;  // they're sent on their way
export const LEAVE = 1.6;       // someone who waited too long walks off
export const WRONG = 8;          // points lost for a wrong answer (never below 0)
export const QUICK = 0.55;      // answered with more than this much of their patience left: a quick-answer bonus
export const VIP_PATIENCE = 0.55; // an important guest (or the repairman) is in a hurry

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The visitors who can come to a stage, as {in: […], later: […]}. */
export function pool(stage) {
  const out = { in: [], later: [] };
  for (const v of VISITORS) { const a = v.answers[stage.id]; if (a) out[a].push(v); }
  return out;
}

export function newGame({ seed = 1, stage = STAGES[0], length } = {}) {
  const g = { r: rng(seed), t: 0, length: length ?? stage.length, stage, queue: [], front: null, busyUntil: 0, nextArrival: 0, nextId: 1, last: null,
    score: 0, welcomed: 0, sentOn: 0, wrong: 0, missed: 0, right: 0, over: false, pool: pool(stage) };
  arrive(g);
  return g;
}

function arrive(g) {
  const st = g.stage, p = Math.min(1, g.t / g.length), [e0, e1] = st.every;
  const side = g.r() < st.inShare ? "in" : "later";
  let list = g.pool[side].filter((v) => v.id !== g.last);
  if (!list.length) list = g.pool[side].length ? g.pool[side] : [...g.pool.in, ...g.pool.later];
  const def = list[Math.floor(g.r() * list.length) % list.length];
  g.last = def.id;
  const max = st.patience * (def.vip ? VIP_PATIENCE : 1);
  const v = { id: g.nextId++, def: def.id, emoji: def.emoji, kind: def.kind, robe: def.robe, vip: !!def.vip, line: def.line, later: def.later, why: def.why[st.id] ?? "", answer: def.answers[st.id],
    patience: max, max, state: "line" };
  g.queue.push(v);
  g.nextArrival = g.t + (e0 + (e1 - e0) * p) * (0.8 + g.r() * 0.4);
  return v;
}

/** Move time on. Returns what happened: [{type: 'arrive' | 'step-up' | 'knock' | 'leave' | 'end', v?}]. */
export function tick(g, dt) {
  const ev = [];
  if (g.over) return ev;
  g.t = Math.min(g.length, g.t + dt);
  if (g.t >= g.nextArrival) {
    if (g.queue.length < g.stage.maxQueue) ev.push({ type: "arrive", v: arrive(g) });
    else g.nextArrival = g.t + 0.5; // the path is full: try again in a moment
  }
  if (!g.front && g.t >= g.busyUntil && g.queue.length) {
    const v = g.front = g.queue.shift(); v.state = "arriving"; v.arrivesAt = g.t + ARRIVE;
    ev.push({ type: "step-up", v });
  }
  const f = g.front;
  if (f?.state === "arriving" && g.t >= f.arrivesAt) { f.state = "waiting"; ev.push({ type: "knock", v: f }); }
  else if (f?.state === "waiting") {
    f.patience -= dt;
    if (f.patience <= 0) {
      f.patience = 0; f.state = "left"; g.front = null; g.busyUntil = g.t + LEAVE;
      g.missed++; g.score = Math.max(0, g.score - 2); if (f.answer === "in") g.wrong++;
      ev.push({ type: "leave", v: f });
    }
  }
  if (g.t >= g.length) { g.over = true; ev.push({ type: "end" }); }
  return ev;
}

/** The visitor at the door, if they're waiting for your answer. */
export const waiting = (g) => (g.front?.state === "waiting" ? g.front : null);

/** Your answer for the visitor at the door: "in" (welcome) or "later". */
export function decide(g, choice) {
  const v = waiting(g);
  if (g.over || !v || (choice !== "in" && choice !== "later")) return { type: "none" };
  const correct = choice === v.answer, quick = v.patience / v.max > QUICK;
  let points;
  if (correct) { points = (choice === "in" ? (v.vip ? 15 : 10) : 8) + (quick ? (choice === "in" ? 3 : 2) : 0); g.right++; }
  else { points = -WRONG; g.wrong++; }
  g.score = Math.max(0, g.score + points);
  if (choice === "in") g.welcomed++; else g.sentOn++;
  v.state = choice === "in" ? "welcomed" : "sent"; g.front = null; g.busyUntil = g.t + (choice === "in" ? BUSY_IN : BUSY_LATER);
  return { type: "decided", v, choice, correct, quick, points };
}

/** Stars: two for steady good answers, three for quick and right. Tuned in the tests. */
export const starsFor = (g) => (g.score >= g.stage.star3 ? 3 : g.score >= g.stage.star2 ? 2 : 1);
