// Pure rules and deterministic simulation engine for Garden Givers (apps/garden).
import { cropById, pestById } from "./crops.js";
import { stageById } from "./stages.js";
import { gardenerById } from "./gardeners.js";

const LAYOUT = [
  // 6 vegetable beds (front-center & mid)
  { id: "b1", kind: "bed", crop: "carrot", x: -11, z: 3 },
  { id: "b2", kind: "bed", crop: "tomato", x: -4, z: 3 },
  { id: "b3", kind: "bed", crop: "celery", x: 3, z: 3 },
  { id: "b4", kind: "bed", crop: "carrot", x: -11, z: -4 },
  { id: "b5", kind: "bed", crop: "tomato", x: -4, z: -4 },
  { id: "b6", kind: "bed", crop: "celery", x: 3, z: -4 },
  // 4 fruit trees (upper orchard row)
  { id: "t1", kind: "tree", crop: "apple", x: -14, z: -13 },
  { id: "t2", kind: "tree", crop: "pear", x: -6, z: -13 },
  { id: "t3", kind: "tree", crop: "apple", x: 2, z: -13 },
  { id: "t4", kind: "tree", crop: "pear", x: 10, z: -13 },
  // 4 herb planters (left garden border)
  { id: "h1", kind: "herb", crop: "basil", x: -19, z: 4 },
  { id: "h2", kind: "herb", crop: "mint", x: -19, z: -2 },
  { id: "h3", kind: "herb", crop: "basil", x: -19, z: -8 },
  { id: "h4", kind: "herb", crop: "mint", x: -19, z: -14 },
];

function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function orderReward(o) {
  if (o.age <= o.fresh) return Math.max(0, Math.round(o.basePoints * (1 - o.age / o.fresh)));
  return -Math.min(12, Math.floor((o.age - o.fresh) / 2) * 2) || 0;
}

function makeOrder(g) {
  const crops = [...new Set(g.spots.map((s) => s.crop))];
  const [minN, maxN] = g.stage.orderSizes;
  const size = minN + Math.floor(g.r() * (maxN - minN + 1));
  const items = [];
  // Favor distinct varieties in larger orders while allowing repeats (e.g., 2 apples).
  const bag = [...crops].sort(() => g.r() - 0.5);
  for (let i = 0; i < size; i++) {
    const pick = i < bag.length && g.r() < 0.8 ? bag[i] : crops[Math.floor(g.r() * crops.length)];
    items.push({ crop: pick, done: false });
  }
  const fresh = g.stage.orderFresh * (g.gardener.orderPatience ?? 1);
  const basePoints = Math.round((10 + size * 5) * (g.gardener.orderScale ?? 1));
  return { id: ++g.orderIds, items, age: 0, fresh, basePoints, penalized: 0 };
}

export function newGame({ seed = 1, stage = stageById("garden"), gardener = gardenerById("brother") } = {}) {
  const spots = LAYOUT.filter((s) => stage.kinds.includes(s.kind)).map((s) => ({
    ...s,
    ripe: true,
    grow: 1,
    growTime: cropById(s.crop).growTime / (gardener.growScale ?? 1),
  }));
  const g = {
    seed,
    stage,
    gardener,
    r: rng(seed),
    t: 0,
    length: stage.endless ? Infinity : (stage.length ?? 45),
    over: false,
    endReason: null,
    wave: 1,
    score: 0,
    spots,
    pests: [],
    orders: [],
    pestIds: 0,
    orderIds: 0,
    streak: 0,
    bestStreak: 0,
    shooed: 0,
    autoShooed: 0,
    eaten: 0,
    picked: 0,
    delivered: 0,
    wrong: 0,
    guardWaves: 0,
    nextPestIn: 1.4,
    nextOrderIn: 0.4,
    nextGuardAt: 10,
  };
  if (!stage.vigil && stage.maxOrders > 0) {
    g.orders.push(makeOrder(g));
    if (stage.maxOrders > 1) g.nextOrderIn = 1.6;
  }
  return g;
}

export const timeLeft = (g) => (g.stage.endless ? Infinity : Math.max(0, g.length - g.t));
export const multOf = (g) => Math.min(4, 1 + Math.floor(g.streak / 4));
export function starsFor(g) {
  if (g.score >= g.stage.star3) return 3;
  if (g.score >= g.stage.star2) return 2;
  if (g.score >= (g.stage.star1 ?? 100)) return 1;
  return 0;
}

function spawnPest(g, events) {
  const busy = new Set(g.pests.map((p) => p.spotId));
  const pool = g.stage.pests.map(pestById);
  let free = g.spots.filter((s) => !busy.has(s.id) && (g.stage.vigil || s.ripe || g.r() < (g.stage.endless ? 0.5 : 0.35)));
  if (!free.length && (g.stage.endless || g.stage.vigil)) free = g.spots.filter((s) => !busy.has(s.id));
  if (!free.length) return;
  const targetSpot = free[Math.floor(g.r() * free.length)];
  const allowed = pool.filter((p) => p.targets.includes(targetSpot.kind));
  let list = allowed.length ? allowed : pool;
  if (g.stage.vigil && g.t / g.length > 0.35 && g.r() < 0.48) {
    const tough = list.filter((p) => (p.taps ?? 1) > 1);
    if (tough.length) list = tough;
  }
  const kind = list[Math.floor(g.r() * list.length)];
  const eatScale = g.stage.endless
    ? Math.max(0.55, 1 - (g.wave - 1) * 0.06)
    : g.stage.vigil
    ? Math.max(0.76, 1 - (g.t / g.length) * 0.24)
    : 1;
  const stay = kind.eatTime * eatScale * (g.gardener.pestStay ?? 1);
  const taps = kind.taps ?? 1;
  const pest = {
    id: ++g.pestIds,
    type: kind.id,
    name: kind.name,
    emoji: kind.emoji,
    isBug: kind.isBug,
    points: kind.points,
    hp: taps,
    maxHp: taps,
    spotId: targetSpot.id,
    x: targetSpot.x,
    z: targetSpot.z,
    age: 0,
    left: stay,
    max: stay,
  };
  g.pests.push(pest);
  events.push({ type: "pest-spawn", pest, spot: targetSpot });
}

export function tick(g, dt) {
  const events = [];
  if (g.over || dt <= 0) return events;
  g.t += dt;

  // Endless Harvest ramps every 30 seconds with bigger critter waves.
  if (g.stage.endless) {
    const nextWave = 1 + Math.floor(g.t / 30);
    if (nextWave > g.wave) {
      g.wave = nextWave;
      events.push({ type: "wave", wave: g.wave });
    }
  }

  // Regrow picked spots.
  for (const s of g.spots) {
    if (!s.ripe) {
      s.grow = Math.min(1, s.grow + dt / s.growTime);
      if (s.grow >= 1) {
        s.ripe = true;
        events.push({ type: "ripen", spot: s });
      }
    }
  }

  // Pest timers & auto-shoo bugs helper.
  for (let i = g.pests.length - 1; i >= 0; i--) {
    const p = g.pests[i];
    p.age += dt;
    if (g.gardener.autoBugs && p.isBug && p.age >= 0.7) {
      g.pests.splice(i, 1);
      g.autoShooed += 1;
      const pts = Math.round(3 * (g.gardener.pointsScale ?? 1));
      g.score += pts;
      events.push({ type: "auto-shoo", pest: p, spot: g.spots.find((s) => s.id === p.spotId), points: pts });
      continue;
    }
    p.left -= dt;
    if (p.left <= 0) {
      g.pests.splice(i, 1);
      const sp = g.spots.find((s) => s.id === p.spotId);
      if (sp) { sp.ripe = false; sp.grow = 0; }
      g.eaten += 1;
      g.streak = 0;
      g.wrong += 1;
      events.push({ type: "eat", pest: p, spot: sp });
      if (g.stage.endless && g.eaten >= (g.stage.maxEaten ?? 10)) {
        g.over = true;
        g.endReason = "eaten";
        events.push({ type: "end", reason: "eaten" });
        return events;
      }
    }
  }

  // Spawn pests (timed stages ramp gently; Night Vigil swarms harder near dawn; Endless escalates every 30s wave).
  g.nextPestIn -= dt;
  if (g.nextPestIn <= 0 && g.t < g.length - 0.5) {
    if (g.stage.endless) {
      const w = g.wave - 1;
      const burst = w >= 5 ? 3 : w >= 3 ? 2 : 1;
      for (let b = 0; b < burst; b++) spawnPest(g, events);
      const [e0, e1] = g.stage.pestEvery;
      const gap = Math.max(e1, e0 * (0.68 ** w));
      g.nextPestIn = gap * (0.8 + g.r() * 0.4);
    } else if (g.stage.vigil) {
      const frac = Math.min(1, g.t / g.length);
      const burst = frac >= 0.76 ? 3 : frac >= 0.50 ? 2 : 1;
      for (let b = 0; b < burst; b++) spawnPest(g, events);
      const [e0, e1] = g.stage.pestEvery;
      const gap = e0 + (e1 - e0) * frac;
      g.nextPestIn = gap * (0.85 + g.r() * 0.3);
    } else {
      spawnPest(g, events);
      const frac = Math.min(1, g.t / g.length);
      const [e0, e1] = g.stage.pestEvery;
      const gap = e0 + (e1 - e0) * frac;
      g.nextPestIn = gap * (0.8 + g.r() * 0.4);
    }
  }

  // Food bank orders: decay toward 0, then tick negative points as they wait overdue.
  if (!g.stage.vigil && g.stage.maxOrders > 0) {
    for (const o of g.orders) {
      o.age += dt;
      if (o.age > o.fresh) {
        const wantPenalty = Math.min(12, Math.floor((o.age - o.fresh) / 2) * 2);
        if (wantPenalty > o.penalized) {
          const delta = wantPenalty - o.penalized;
          o.penalized = wantPenalty;
          g.score = Math.max(0, g.score - delta);
          events.push({ type: "order-late", order: o, delta });
        }
      }
    }
    if (g.orders.length < g.stage.maxOrders && g.t < g.length - 3) {
      g.nextOrderIn -= dt;
      if (g.nextOrderIn <= 0) {
        const ord = makeOrder(g);
        g.orders.push(ord);
        g.nextOrderIn = 1.6;
        events.push({ type: "order-new", order: ord });
      }
    }
  }

  // Night Vigil: periodic protection waves award bonus points for intact crops.
  if (g.stage.vigil && g.t >= g.nextGuardAt && g.nextGuardAt <= g.length) {
    const intact = g.spots.filter((s) => s.ripe).length;
    const points = Math.round((intact + Math.round((intact / g.spots.length) * 6)) * (g.gardener.pointsScale ?? 1));
    g.score += points;
    g.guardWaves += 1;
    events.push({ type: "guard-bonus", intact, total: g.spots.length, points });
    g.nextGuardAt += 10;
  }

  if (!g.stage.endless && g.t >= g.length) {
    g.t = g.length;
    g.over = true;
    g.endReason = "time";
    events.push({ type: "end", reason: "time" });
  }
  return events;
}

export function tapPest(g, pestId) {
  const events = [];
  if (g.over) return events;
  const idx = g.pests.findIndex((p) => p.id === pestId);
  if (idx < 0) return events;
  const p = g.pests[idx];
  const sp = g.spots.find((s) => s.id === p.spotId);
  p.hp = (p.hp ?? 1) - 1;
  if (p.hp > 0) {
    p.left = Math.min(p.max, p.left + 1.4);
    events.push({ type: "shoo-hit", pest: p, spot: sp, leftHp: p.hp });
    return events;
  }
  g.pests.splice(idx, 1);
  g.streak += 1;
  g.shooed += 1;
  g.bestStreak = Math.max(g.bestStreak, g.streak);
  const quick = p.left >= p.max * 0.55;
  const mult = multOf(g);
  const points = Math.max(1, Math.round((p.points + (quick ? 2 : 0)) * mult * (g.gardener.pointsScale ?? 1)));
  g.score += points;
  events.push({ type: "shoo", pest: p, spot: sp, points, mult, quick });
  return events;
}

export function tapSpot(g, spotId) {
  if (g.over) return [];
  const p = g.pests.find((x) => x.spotId === spotId);
  if (p) return tapPest(g, p.id);

  const sp = g.spots.find((s) => s.id === spotId);
  if (!sp) return [];
  if (g.stage.vigil) return [{ type: "vigil-safe", spot: sp }];
  if (!sp.ripe) return [{ type: "growing", spot: sp }];

  const events = [];
  const maxTake = g.gardener.doubleHarvest ? 2 : 1;
  // Prioritize most urgent open order needing this crop.
  const rankedOrders = [...g.orders].sort((a, b) => (b.age / b.fresh) - (a.age / a.fresh));
  const touched = [];
  let taken = 0;

  for (const ord of rankedOrders) {
    for (const item of ord.items) {
      if (!item.done && item.crop === sp.crop && taken < maxTake) {
        item.done = true;
        taken += 1;
        if (!touched.includes(ord)) touched.push(ord);
      }
    }
    if (taken >= maxTake) break;
  }

  if (taken === 0) {
    g.wrong += 1;
    g.streak = 0;
    events.push({ type: "wrong-crop", spot: sp });
    return events;
  }

  sp.ripe = false;
  sp.grow = 0;
  g.picked += taken;
  events.push({ type: "pick", spot: sp, count: taken });

  for (const ord of touched) {
    if (ord.items.every((it) => it.done)) {
      const i = g.orders.indexOf(ord);
      if (i >= 0) g.orders.splice(i, 1);
      const reward = Math.max(0, orderReward(ord));
      g.score += reward;
      g.delivered += 1;
      g.streak += 1;
      g.bestStreak = Math.max(g.bestStreak, g.streak);
      if (g.orders.length < g.stage.maxOrders) g.nextOrderIn = Math.min(g.nextOrderIn, 0.9);
      events.push({ type: "deliver", order: ord, reward, late: ord.penalized > 0 });
    }
  }
  return events;
}
