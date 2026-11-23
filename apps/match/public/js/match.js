// Pure rules & arcade state machine for Saints Match (apps/match).
// Deterministic PRNG given `seed` so tests and daily play work cleanly without DOM.
import { saintsForStage } from "./saints.js";
import { stageById, waveConfig } from "./stages.js";
import { helperById } from "./helpers.js";

export const FLASH_TIME = 2.0;
export const MISMATCH_TIME = 0.72;
export const CLEAR_DELAY = 0.65;
export const COMBO_WINDOW = 4.6;

function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function shuffle(arr, r) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dealWave(g) {
  const cfg = waveConfig(g.stage, g.wave);
  const pool = saintsForStage(g.stage.id);
  const chosen = [];
  // Prefer cycling evenly across all saints in the pool before repeating.
  while (chosen.length < cfg.pairs) {
    for (const s of shuffle(pool, g.r)) {
      if (!chosen.some((x) => x.id === s.id)) {
        chosen.push(s);
        if (chosen.length >= cfg.pairs) break;
      }
    }
  }
  const goldenIdx = cfg.golden ? Math.floor(g.r() * chosen.length) : -1;
  const rawCards = [];
  chosen.forEach((s, idx) => {
    const pairId = `${g.wave}-${s.id}`;
    const symbolPair = idx < cfg.symbolPairs;
    const golden = idx === goldenIdx;
    rawCards.push(
      { id: `${pairId}-a`, pairId, saintId: s.id, kind: "saint", golden, faceUp: true, matched: false, swapped: false, hinted: false },
      { id: `${pairId}-b`, pairId, saintId: s.id, kind: symbolPair ? "symbol" : "saint", golden, faceUp: true, matched: false, swapped: false, hinted: false },
    );
  });
  g.cards = shuffle(rawCards, g.r).map((c, slot) => ({ ...c, slot }));
  g.open = [];
  g.phase = "peek";
  g.peekLeft = Math.max(0.7, FLASH_TIME + (g.helper.peekBonus ?? 0));
  g.mismatchLeft = 0;
  g.clearLeft = 0;
  g.hintLeft = 0;
  g.hintUsedThisWave = false;
  g.waveMisses = 0;
  g.waveForgives = 0;
  const swapScale = g.helper.swapScale ?? 1;
  g.swapInterval = (!cfg.swapEvery || g.helper.noSwap) ? 0 : Math.max(3.5, cfg.swapEvery * swapScale);
  g.swapLeft = g.swapInterval;
}

export function newGame({ seed = 1, stage = stageById("apostles"), helper = helperById("starter") } = {}) {
  const g = {
    seed,
    stage,
    helper,
    r: rng(seed),
    t: 0,
    clock: stage.endless ? (stage.startTime ?? 45) : (stage.length ?? 90),
    wave: 1,
    wavesCleared: 0,
    score: 0,
    matches: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    sharpEyes: 0,
    rushMatches: 0,
    swapsSeen: 0,
    maxMult: helper.maxMult ?? 5,
    comboStep: helper.comboStep ?? 2,
    comboWindow: helper.comboWindow ?? COMBO_WINDOW,
    comboLeft: 0,
    rushLeft: 0,
    phase: "peek",
    over: false,
    cards: [],
    open: [],
    peekLeft: FLASH_TIME,
    mismatchLeft: 0,
    clearLeft: 0,
    hintLeft: 0,
    hintUsedThisWave: false,
    waveMisses: 0,
    waveForgives: 0,
    swapInterval: 0,
    swapLeft: 0,
  };
  dealWave(g);
  return g;
}

export const cardById = (g, id) => g.cards.find((c) => c.id === id);

export const multOf = (g) => (g.streak <= 0 ? 1 : Math.min(g.maxMult, 1 + Math.floor(g.streak / g.comboStep)));

export const timeLeft = (g) => (g.stage.endless ? Math.max(0, g.clock) : Math.max(0, (g.stage.length ?? 90) - g.t));

export function starsFor(g) {
  if (g.score >= g.stage.star3) return 3;
  if (g.score >= g.stage.star2) return 2;
  return g.matches > 0 ? 1 : 0;
}

function closeOpen(g, events) {
  const closed = [];
  for (const id of g.open) {
    const c = cardById(g, id);
    if (c && !c.matched && c.faceUp) { c.faceUp = false; closed.push(c.id); }
  }
  g.open = [];
  g.mismatchLeft = 0;
  if (closed.length) events.push({ type: "close", ids: closed });
}

function triggerWindSwap(g, events) {
  const candidates = g.cards.filter((c) => !c.matched && !c.faceUp && !c.hinted);
  if (candidates.length < 2) return;
  const pickA = candidates[Math.floor(g.r() * candidates.length)];
  const rest = candidates.filter((c) => c.id !== pickA.id && c.pairId !== pickA.pairId);
  const poolB = rest.length ? rest : candidates.filter((c) => c.id !== pickA.id);
  const pickB = poolB[Math.floor(g.r() * poolB.length)];
  const slotA = pickA.slot, slotB = pickB.slot;
  pickA.slot = slotB;
  pickB.slot = slotA;
  pickA.swapped = true;
  pickB.swapped = true;
  g.swapsSeen += 1;
  events.push({ type: "wind-swap", ids: [pickA.id, pickB.id], slots: [pickA.slot, pickB.slot] });
}

export function tick(g, dt) {
  const events = [];
  if (g.over || dt <= 0) return events;
  g.t += dt;

  // Timed stages end on wall time; Endless Rush ticks down during active play.
  if (g.stage.endless) {
    if (g.phase === "play") g.clock = Math.max(0, g.clock - dt);
    if (g.clock <= 0) {
      g.over = true;
      g.phase = "over";
      events.push({ type: "end" });
      return events;
    }
  } else if (g.t >= (g.stage.length ?? 90)) {
    g.over = true;
    g.phase = "over";
    events.push({ type: "end" });
    return events;
  }

  if (g.phase === "peek") {
    g.peekLeft -= dt;
    if (g.peekLeft <= 0) {
      g.peekLeft = 0;
      g.phase = "play";
      for (const c of g.cards) c.faceUp = false;
      events.push({ type: "peek-end" });
    }
    return events;
  }

  if (g.phase === "clear") {
    g.clearLeft -= dt;
    if (g.clearLeft <= 0) {
      g.wave += 1;
      dealWave(g);
      events.push({ type: "deal", wave: g.wave });
    }
    return events;
  }

  if (g.mismatchLeft > 0) {
    g.mismatchLeft -= dt;
    if (g.mismatchLeft <= 0) closeOpen(g, events);
  }

  if (g.comboLeft > 0) {
    g.comboLeft = Math.max(0, g.comboLeft - dt);
    if (g.comboLeft === 0) g.streak = 0;
  }

  if (g.rushLeft > 0) {
    g.rushLeft = Math.max(0, g.rushLeft - dt);
    if (g.rushLeft === 0) events.push({ type: "rush-end" });
  }

  if (g.hintLeft > 0) {
    g.hintLeft = Math.max(0, g.hintLeft - dt);
    if (g.hintLeft === 0) {
      for (const c of g.cards) c.hinted = false;
      events.push({ type: "hint-end" });
    }
  }

  if (g.swapInterval > 0) {
    g.swapLeft -= dt;
    if (g.swapLeft <= 0) {
      g.swapLeft = g.swapInterval;
      triggerWindSwap(g, events);
    }
  }

  return events;
}

export function flip(g, cardId) {
  const events = [];
  if (g.over || g.phase !== "play") return events;
  const c = cardById(g, cardId);
  if (!c || c.matched) return events;

  // Tapping a third face-down card immediately flips back a mismatched pair.
  if (g.open.length >= 2) closeOpen(g, events);
  if (c.faceUp) return events;

  c.faceUp = true;
  g.open.push(c.id);
  events.push({ type: "flip", card: c });
  if (g.open.length < 2) return events;

  const a = cardById(g, g.open[0]);
  const b = cardById(g, g.open[1]);

  if (a.pairId === b.pairId) {
    a.matched = true;
    b.matched = true;
    a.hinted = false;
    b.hinted = false;
    g.open = [];
    g.streak += 1;
    g.matches += 1;
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    g.comboLeft = g.comboWindow;

    const mult = multOf(g);
    const rushActive = g.rushLeft > 0 || a.golden;
    const rushMult = rushActive ? 2 : 1;
    if (rushMult > 1) g.rushMatches += 1;
    if (a.golden) g.rushLeft = g.helper.rushDuration ?? 6.0;

    const symbolPair = a.kind !== b.kind;
    const sharpEye = a.swapped || b.swapped;
    if (sharpEye) g.sharpEyes += 1;

    const base = 100 + (a.golden ? 50 : 0) + (symbolPair ? (g.helper.symbolBonus ?? 0) : 0) + (sharpEye ? 75 : 0);
    const points = Math.max(10, Math.round(base * mult * rushMult * (g.helper.pointsScale ?? 1)));
    g.score += points;

    let timeAdded = 0;
    if (g.stage.endless) {
      const cap = g.stage.maxTime ?? 45;
      timeAdded = Math.max(0.15, Number((1.35 - (g.wave - 1) * 0.16).toFixed(2))) + (g.helper.rushTimeBonus ?? 0);
      g.clock = Math.min(cap, g.clock + timeAdded);
    }

    events.push({
      type: "match",
      ids: [a.id, b.id],
      saintId: a.saintId,
      symbolPair,
      golden: a.golden,
      sharpEye,
      points,
      mult,
      rush: rushMult > 1,
      timeAdded,
    });

    if (g.cards.every((x) => x.matched)) {
      const flawless = g.waveMisses === 0;
      const bonus = Math.round((250 + g.wave * 50 + (flawless ? 150 : 0)) * (g.helper.pointsScale ?? 1));
      g.score += bonus;
      g.wavesCleared += 1;
      let waveTime = 0;
      if (g.stage.endless) {
        const cap = g.stage.maxTime ?? 45;
        waveTime = Math.max(0.5, Number((4.5 - (g.wave - 1) * 0.5).toFixed(2)));
        g.clock = Math.min(cap, g.clock + waveTime);
      }
      g.phase = "clear";
      g.clearLeft = CLEAR_DELAY;
      events.push({ type: "wave-clear", wave: g.wave, bonus, flawless, timeAdded: waveTime });
    }
    return events;
  }

  const forgiveMax = g.helper.forgivePerWave ?? 0;
  const forgiven = g.waveForgives < forgiveMax;
  if (forgiven) {
    g.waveForgives += 1;
  } else {
    g.wrong += 1;
    g.waveMisses += 1;
    g.streak = 0;
    g.comboLeft = 0;
  }
  g.mismatchLeft = MISMATCH_TIME;
  events.push({ type: "mismatch", ids: [a.id, b.id], forgiven });
  return events;
}

export function useHint(g) {
  const events = [];
  if (g.over || g.phase !== "play" || !g.helper.hint || g.hintUsedThisWave) return events;
  const byPair = new Map();
  for (const c of g.cards) {
    if (c.matched || c.faceUp) continue;
    const list = byPair.get(c.pairId) ?? [];
    list.push(c);
    byPair.set(c.pairId, list);
  }
  const pair = [...byPair.values()].find((list) => list.length === 2);
  if (!pair) return events;
  g.hintUsedThisWave = true;
  g.hintLeft = 2.2;
  pair.forEach((c) => { c.hinted = true; });
  events.push({ type: "hint", ids: pair.map((c) => c.id), saintId: pair[0].saintId });
  return events;
}
