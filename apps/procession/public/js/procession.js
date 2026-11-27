// Pure simulation engine for Procession! (carts/procession.p8 rules + touch lane-steering).
// Runs identically in Node tests and the 3D browser road without touching DOM or Three.js.

import { UPGRADES, SYNERGIES, HELPER_CATS, upgradeById, rollOffers } from "./upgrades.js";
import { crewById } from "./crew.js";

export const LANE_X = [-20, 0, 20];
export const ROAD_HALF = 30;
export const SIDEWALK_X = 34.5;
export const SPAWN_Z = -100;
export const FRONT_Z = 34;
export const PROC_HALF_W = 8.2;
export const CREW_BOUNDS = { minX: -35, maxX: 35, minZ: -86, maxZ: 22 };
export const MAX_CANDLES = 7;

export const KINDS = {
  pothole:      { halfW: 7.2, halfZ: 5.2, need: 1.25, pts: 10,  xp: 1, hz: true,  cat: "hole",  msg: "They tripped in a pothole!" },
  lamp:         { halfW: 4.5, halfZ: 4.5, need: 0.72, pts: 20,  xp: 2, hz: false, cat: "lamp",  msg: "It was too dark to see the way!" },
  person:       { halfW: 5.0, halfZ: 5.0, need: 0.72, pts: 20,  xp: 1, hz: true,  cat: "crowd", moveOut: 18, msg: "They bumped into someone on the road!" },
  car:          { halfW: 8.2, halfZ: 8.5, need: 2.05, pts: 40,  xp: 3, hz: true,  cat: "crowd", moveOut: 14, msg: "A parked car blocked the lane!" },
  brokenBridge: { halfW: 9.2, halfZ: 6.5, need: 1.45, pts: 25,  xp: 2, hz: true,  cat: "hole",  msg: "Watch out — a broken bridge!" },
  dog:          { halfW: 5.0, halfZ: 4.5, need: 0.65, pts: 30,  xp: 2, hz: true,  cat: "crowd", moveOut: 28, msg: "A playful pup ran right across the path!" },
  truck:        { halfW: 9.2, halfZ: 11.5,need: 2.75, pts: 100, xp: 5, hz: true,  cat: "crowd", moveOut: 13, msg: "A delivery truck blocked the way!" },
  puddle:       { halfW: 6.2, halfZ: 5.5, need: 1.20, pts: 20,  xp: 2, hz: true,  cat: "hole",  msg: "They splashed in a growing puddle!" },
  bossBridge:   { halfW: 30,  halfZ: 8.5, need: 4.50, pts: 500, xp: 10,hz: true,  cat: "hole",  slow: 0.52, boss: true, msg: "They had to wade through the river!" },
  bossBand:     { halfW: 17.5,halfZ: 6.5, need: 3.20, pts: 400, xp: 8, hz: true,  cat: "crowd", slow: 0.55, boss: true, moveOut: 26, msg: "A marching band marched into the procession!" },
};

const STRETCHES = [
  { id: "town",   name: "Parish Town!",    say: "Back in town — faster and busier!" },
  { id: "market", name: "The Market!",     say: "Entering the market: watch for pups and delivery trucks!" },
  { id: "river",  name: "The River!",      say: "Crossing the river: mop puddles and mend bridges!" },
  { id: "wind",   name: "Windy Ridge!",    say: "The wind picks up — watch those street lamps!" },
  { id: "night",  name: "Candlelight Night!", say: "Night falls! Keep every street lamp burning!" },
];

const BOSS_ROTATION = ["bossBridge", "bossBand", "bossTraffic", "bossStorm"];

export function stretchOf(g) {
  if (!g.stage.endless) return g.stage.stretch ?? "town";
  return STRETCHES[g.mins % STRETCHES.length].id;
}

export const isNight = (g) => !!g.stage.night || stretchOf(g) === "night";

export function multiplierOf(g) {
  const sBonus = g.streak >= 50 ? 3 : g.streak >= 25 ? 2 : g.streak >= 10 ? 1 : 0;
  return 1 + (g.lv.incense ?? 0) + sBonus;
}

export function starsFor(stage, score, survived) {
  if (score >= stage.star3 && (stage.endless || survived)) return 3;
  if (score >= stage.star2) return 2;
  return (survived && !stage.endless) || score >= 120 ? 1 : 0;
}

export function newGame(stage, { crewId = "sacristan", rng = Math.random } = {}) {
  const lv = Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
  const syn = Object.fromEntries(SYNERGIES.map((s) => [s.id, false]));
  const who = crewById(crewId);

  let candles = 5;
  if (who.startUpgrade === "candle") candles = Math.min(MAX_CANDLES, candles + 1);
  else if (who.startUpgrade && lv[who.startUpgrade] != null) lv[who.startUpgrade] = 1;

  const g = {
    stage,
    crewInfo: who,
    rng,
    t: 0,
    elapsed: 0,
    mins: 0,
    dist: 0,
    score: 0,
    fixes: 0,
    dodges: 0,
    streak: 0,
    candles,
    maxCandles: MAX_CANDLES,
    xp: 0,
    lvl: 1,
    xpNeed: 1,
    lv,
    syn,
    seenRun: { [who.startUpgrade]: true },
    pickOffer: null,

    // Procession column (lane 0..2; lane-steering!)
    procLane: 1,
    procX: LANE_X[1],
    wobble: 0,
    stumbleCooldown: 0,

    // Advance crew runner
    crew: {
      x: 0, z: 6,
      vx: 0, vz: 0,
      stickX: 0, stickZ: 0,
      target: null, // { x, z, obId }
      fixingId: null,
      moving: false,
      dir: 0,
    },

    helpers: [],
    obs: [],
    nextId: 1,

    // Speed & wave timers
    speed: stage.speedStart ?? 11.0,
    speedNow: stage.speedStart ?? 11.0,
    gap: [...(stage.gap ?? [2.6, 1.5])],
    spawnTimer: 1.5,
    lampTimer: 2.2,
    bridgeTimer: stage.bridgeEvery ? stage.bridgeEvery * 0.65 : Infinity,
    windTimer: stage.windEvery ? stage.windEvery * 0.8 : Infinity,
    nextBossAt: stage.bossEvery ?? Infinity,
    bossIdx: 0,
    firedBossAt: new Set(),

    // Timers for passive powers / boss storm
    bannerTimer: 0,
    bellTimer: 6.5,
    angelTimer: 11.0,
    angelusTimer: 36.0,
    freezeTimer: 0,
    holyRings: 0,
    stormTimer: 0,
    stormTick: 0,
    secondStumble: false,
    over: false,
    won: false,
  };

  if (HELPER_CATS[who.startUpgrade]) spawnHelper(g, who.startUpgrade);

  // Starter pothole right ahead on Center lane so the player sees the first fix & upgrade in ~2s!
  spawnOb(g, "pothole", LANE_X[1], -22);
  return g;
}

function spawnOb(g, kind, x, z, extra = null) {
  const q = KINDS[kind];
  const o = {
    id: g.nextId++,
    kind,
    cat: q.cat,
    x, z,
    halfW: q.halfW,
    halfZ: q.halfZ,
    need: q.need,
    pts: q.pts,
    xp: q.xp,
    hz: q.hz,
    slow: q.slow ?? 1,
    boss: !!q.boss,
    moveOut: q.moveOut ?? 0,
    pr: 0,
    done: false,
    miss: false,
    dodged: false,
    vx: 0,
    targetX: null,
    takenBy: null,
    tintIdx: Math.floor(g.rng() * 5),
    ...extra,
  };
  g.obs.push(o);
  return o;
}

function spawnHelper(g, upId) {
  const idx = g.helpers.length;
  const sideSlots = [-24, 24, -12, 12, -30, 30, 0];
  g.helpers.push({
    id: `h-${upId}-${idx + 1}`,
    upId,
    cat: HELPER_CATS[upId],
    homeX: sideSlots[idx % sideSlots.length],
    homeZ: FRONT_Z - 15,
    x: sideSlots[idx % sideSlots.length],
    z: FRONT_Z - 14,
    obId: null,
    moving: false,
    fixing: false,
  });
}

/** Steer the procession between Left (0), Center (1), and Right (2) lanes. Pass delta (-1/+1) or lane index. */
export function steerProcession(g, target, relative = true) {
  if (g.over) return false;
  const next = relative
    ? Math.max(0, Math.min(2, g.procLane + target))
    : Math.max(0, Math.min(2, target));
  if (next === g.procLane) return false;
  g.procLane = next;
  return true;
}

/** Tap anywhere on the road or on an obstacle to send the advance crew running there. */
export function setTarget(g, x, z, obId = null) {
  if (g.over) return;
  g.crew.stickX = 0;
  g.crew.stickZ = 0;
  g.crew.target = {
    x: Math.max(CREW_BOUNDS.minX, Math.min(CREW_BOUNDS.maxX, x)),
    z: Math.max(CREW_BOUNDS.minZ, Math.min(CREW_BOUNDS.maxZ, z)),
    obId,
  };
}

/** Continuous directional input (keyboard arrows / WASD / thumb drag). */
export function setStick(g, dx, dz) {
  const len = Math.hypot(dx, dz);
  if (len < 0.05) {
    g.crew.stickX = 0;
    g.crew.stickZ = 0;
    return;
  }
  g.crew.stickX = dx / len;
  g.crew.stickZ = dz / len;
  g.crew.target = null;
}

function awardFix(g, o, events) {
  if (o.done) return;
  o.done = true;
  o.pr = o.need;
  g.secondStumble = false;
  g.streak += 1;
  g.fixes += 1;
  g.xp += o.xp;

  const mult = multiplierOf(g);
  const gained = o.pts * mult;
  g.score += gained;
  events.push({ type: "fixed", o, pts: gained, mult, streak: g.streak });

  if (o.moveOut) {
    o.vx = o.x < 0 ? -o.moveOut : o.moveOut;
  }

  if (g.streak === 10 || g.streak === 25 || g.streak === 50) {
    events.push({ type: "milestone", streak: g.streak, mult });
  }

  if (g.xp >= g.xpNeed && !g.pickOffer) {
    triggerLevelUp(g, events);
  }
}

function triggerLevelUp(g, events) {
  g.xp = Math.max(0, g.xp - g.xpNeed);
  g.lvl += 1;
  g.xpNeed = g.lvl * 4 - 2;
  const offer = rollOffers(g.lv, g.candles, g.maxCandles, g.seenRun, {}, g.rng);
  if (!offer.length) {
    g.score += 100;
    events.push({ type: "allMax" });
    return;
  }
  for (const u of offer) g.seenRun[u.id] = true;
  g.pickOffer = offer;
  events.push({ type: "levelup", lvl: g.lvl, offer });
}

/** Player picks one of the 3 offered upgrades (0..offer.length-1 or by upgrade id). */
export function pickUpgrade(g, choice) {
  if (!g.pickOffer || g.over) return { ok: false, events: [] };
  const u = typeof choice === "number" ? g.pickOffer[choice] : g.pickOffer.find((x) => x.id === choice);
  if (!u) return { ok: false, events: [] };

  g.pickOffer = null;
  g.lv[u.id] = Math.min(u.max, (g.lv[u.id] ?? 0) + 1);
  const events = [{ type: "upgrade", upgrade: u, level: g.lv[u.id] }];

  if (HELPER_CATS[u.id]) spawnHelper(g, u.id);
  if (u.id === "candle") g.candles = Math.min(g.maxCandles, g.candles + 1);
  if (u.id === "holyWater") {
    g.holyRings += 1;
    let cleared = 0;
    for (const o of [...g.obs]) {
      if (o.done || o.z < SPAWN_Z + 4) continue;
      if (o.boss) {
        o.pr += o.need / 3;
        if (o.pr >= o.need) { awardFix(g, o, events); cleared++; }
      } else {
        awardFix(g, o, events);
        cleared++;
      }
    }
    events.push({ type: "holyWater", cleared });
  }

  for (const s of SYNERGIES) {
    if (!g.syn[s.id] && s.parts.every((p) => (g.lv[p] ?? 0) >= (upgradeById(p)?.max ?? 99))) {
      g.syn[s.id] = true;
      events.push({ type: "synergy", synergy: s });
    }
  }
  return { ok: true, events };
}

function handleStumble(g, o, events) {
  if (g.lv.banner > 0 && g.bannerTimer <= 0) {
    g.bannerTimer = g.lv.banner > 1 ? 11 : 18;
    events.push({ type: "blocked", by: "banner", msg: "The Saint's Banner kept them steady!", o });
    return;
  }
  if (g.lv.christopher > 0 && g.secondStumble) {
    g.secondStumble = false;
    events.push({ type: "blocked", by: "christopher", msg: "St. Christopher kept them steady!", o });
    return;
  }

  g.secondStumble = true;
  g.streak = 0;
  g.candles = Math.max(0, g.candles - (o.boss ? 2 : 1));
  g.wobble = 0.75;
  events.push({ type: "stumble", o, candles: g.candles, msg: KINDS[o.kind].msg });

  if (g.candles <= 0) {
    g.over = true;
    g.won = false;
    events.push({ type: "end", won: false, score: g.score, reason: "candles" });
  }
}

function triggerBoss(g, bossKind, events) {
  if (bossKind === "bossBridge") {
    spawnOb(g, "bossBridge", 0, SPAWN_Z);
    events.push({ type: "boss", kind: bossKind, msg: "Washed-out bridge ahead! Fix the river crossing!" });
  } else if (bossKind === "bossBand") {
    spawnOb(g, "bossBand", 0, SPAWN_Z, { vx: 15 });
    events.push({ type: "boss", kind: bossKind, msg: "A marching band crossed the route!" });
  } else if (bossKind === "bossTraffic") {
    const lanes = [0, 1, 2];
    const startLane = lanes[Math.floor(g.rng() * lanes.length)];
    for (let i = 0; i < 5; i++) {
      const lx = LANE_X[(startLane + (i % 2 === 0 ? 0 : 1)) % 3];
      spawnOb(g, "car", lx, SPAWN_Z - i * 19);
    }
    events.push({ type: "boss", kind: bossKind, msg: "Traffic jam ahead — steer & wave cars through!" });
  } else if (bossKind === "bossStorm") {
    g.stormTimer = 18;
    g.stormTick = 2.0;
    events.push({ type: "boss", kind: bossKind, msg: "Thunderstorm! Re-light lamps and watch for potholes!" });
  }
}

export function stepSpawnInterval(g) {
  if (g.stage.endless) {
    const minsFloor = Math.floor(g.elapsed / 60);
    const scale = Math.max(0.28, Math.pow(0.78, minsFloor));
    const [a, b] = g.gap;
    const base = a * scale;
    return Math.max(0.55, base * (0.75 + g.rng() * 0.5));
  }
  const frac = Math.min(1, g.elapsed / Math.max(1, g.stage.length));
  const [a, b] = g.gap;
  const mean = a + (b - a) * frac;
  return mean * (0.8 + g.rng() * 0.4);
}

function spawnNextWave(g, events) {
  const kinds = g.stage.kinds ?? ["pothole", "person", "car"];
  const kind = kinds[Math.floor(g.rng() * kinds.length)];
  const laneIdx = Math.floor(g.rng() * 3);
  const x = LANE_X[laneIdx];

  if (kind === "person") {
    const side = g.rng() < 0.5 ? -SIDEWALK_X : SIDEWALK_X;
    spawnOb(g, "person", side, SPAWN_Z + 12 + g.rng() * 14, { targetX: x });
  } else if (kind === "dog") {
    spawnOb(g, "dog", x, SPAWN_Z, { vx: (g.rng() < 0.5 ? -1 : 1) * 19 });
  } else {
    // Avoid overlapping another unfixed ob right at the spawn gate
    const crowded = g.obs.some((o) => !o.done && Math.abs(o.x - x) < 12 && o.z < SPAWN_Z + 16);
    const altX = crowded ? LANE_X[(laneIdx + 1) % 3] : x;
    spawnOb(g, kind, altX, SPAWN_Z);
  }
}

/** Advance simulation by `dt` seconds. Returns array of events for UI/SFX. */
export function tick(g, dt) {
  const events = [];
  if (g.over || g.pickOffer || dt <= 0) return events;
  const step = Math.min(dt, 0.08);
  g.t += step;
  g.elapsed += step;

  // Timed stage completion
  if (!g.stage.endless && g.elapsed >= g.stage.length) {
    g.over = true;
    g.won = g.candles > 0;
    events.push({ type: "end", won: g.won, score: g.score, reason: "finish" });
    return events;
  }

  // Timed bosses (e.g., River Crossing bridge boss)
  if (Array.isArray(g.stage.bossAt)) {
    for (let i = 0; i < g.stage.bossAt.length; i++) {
      const b = g.stage.bossAt[i];
      if (g.elapsed >= b.t && !g.firedBossAt.has(i)) {
        g.firedBossAt.add(i);
        triggerBoss(g, b.kind, events);
      }
    }
  }

  // Minute milestones & Endless stretch switches
  const curMin = Math.floor(g.elapsed / 60);
  if (g.stage.endless && curMin > g.mins) {
    g.mins = curMin;
    g.speed = Math.min(g.stage.speedStart * 4, g.speed * 1.2);
    const st = STRETCHES[g.mins % STRETCHES.length];
    events.push({ type: "stretch", mins: g.mins, stretch: st.id, name: st.name, say: st.say });
  }
  if (g.stage.endless && g.elapsed >= g.nextBossAt) {
    g.nextBossAt += g.stage.bossEvery;
    const bossKind = BOSS_ROTATION[g.bossIdx % BOSS_ROTATION.length];
    g.bossIdx += 1;
    triggerBoss(g, bossKind, events);
  }

  // Angelus synergy: every 40s stops the road for 3s
  if (g.syn.angelus) {
    g.angelusTimer -= step;
    if (g.angelusTimer <= 0) {
      g.angelusTimer = 40;
      g.freezeTimer = 3.0;
      events.push({ type: "angelus", msg: "The Angelus! Everything pauses for 3 seconds." });
    }
  }
  g.freezeTimer = Math.max(0, g.freezeTimer - step);
  g.wobble = Math.max(0, g.wobble - step);
  g.bannerTimer = Math.max(0, g.bannerTimer - step);

  // Active road speed (halved/stopped by Freeze or Slow Hymn)
  const slowHymn = Math.pow(0.85, g.lv.slowHymn ?? 0);
  const targetRoadSpeed = g.freezeTimer > 0 ? 0 : g.speed * slowHymn;
  g.speedNow = targetRoadSpeed;
  g.dist += targetRoadSpeed * step;

  // Steer procession smoothly toward lane center
  const destProcX = LANE_X[g.procLane];
  const pdx = destProcX - g.procX;
  const maxProcStep = 92 * step;
  g.procX = Math.abs(pdx) <= maxProcStep ? destProcX : g.procX + Math.sign(pdx) * maxProcStep;

  // Crew movement
  const crewSpeed = 36 * (1 + (g.lv.coffee ?? 0) * 0.25);
  const crew = g.crew;
  crew.fixingId = null;
  if (crew.stickX !== 0 || crew.stickZ !== 0) {
    crew.x += crew.stickX * crewSpeed * step;
    crew.z += crew.stickZ * crewSpeed * step + targetRoadSpeed * step * 0.35;
    crew.moving = true;
    crew.dir = Math.atan2(crew.stickX, crew.stickZ);
  } else if (crew.target) {
    const tracked = crew.target.obId ? g.obs.find((o) => o.id === crew.target.obId && !o.done) : null;
    if (crew.target.obId && !tracked) {
      crew.target = null;
      crew.moving = false;
    } else {
      const tx = tracked ? tracked.x : crew.target.x;
      const tz = tracked ? tracked.z : crew.target.z;
      const dx = tx - crew.x, dz = tz - crew.z;
      const d = Math.hypot(dx, dz);
      const stopDist = tracked ? Math.max(1.5, 4 + (g.lv.longArms ?? 0) * 2) : 1.0;
      if (d > stopDist) {
        const mv = Math.min(d, crewSpeed * step);
        crew.x += (dx / d) * mv;
        crew.z += (dz / d) * mv;
        crew.moving = true;
        crew.dir = Math.atan2(dx, dz);
      } else {
        if (!tracked) crew.target = null;
        crew.moving = false;
      }
    }
  } else {
    // Gently drift with road slightly when idle so crew feels grounded on the street
    crew.moving = false;
    crew.z = Math.min(CREW_BOUNDS.maxZ, crew.z + targetRoadSpeed * step * 0.25);
  }
  crew.x = Math.max(CREW_BOUNDS.minX, Math.min(CREW_BOUNDS.maxX, crew.x));
  crew.z = Math.max(CREW_BOUNDS.minZ, Math.min(CREW_BOUNDS.maxZ, crew.z));

  // Helpers movement & targeting
  const helperSpeed = crewSpeed * 0.72;
  for (const h of g.helpers) {
    h.fixing = false;
    let targetOb = h.obId ? g.obs.find((o) => o.id === h.obId && !o.done && o.z < FRONT_Z - 3) : null;
    if (!targetOb) {
      h.obId = null;
      let bestZ = -Infinity;
      for (const o of g.obs) {
        if (o.done || !h.cat.has(o.cat) || o.z < SPAWN_Z + 4 || o.z >= FRONT_Z - 3) continue;
        if (o.takenBy && o.takenBy !== h.id) continue;
        if (o.z > bestZ) { bestZ = o.z; targetOb = o; }
      }
      if (targetOb) { targetOb.takenBy = h.id; h.obId = targetOb.id; }
    }
    const tx = targetOb ? targetOb.x : h.homeX;
    const tz = targetOb ? targetOb.z : h.homeZ;
    const dx = tx - h.x, dz = tz - h.z;
    const d = Math.hypot(dx, dz);
    if (d > 3.5) {
      const mv = Math.min(d, helperSpeed * step);
      h.x += (dx / d) * mv;
      h.z += (dz / d) * mv;
      h.moving = true;
    } else {
      h.moving = false;
    }
  }

  // Passive Church Bell & Guardian Angel timers
  if (g.lv.bell > 0) {
    g.bellTimer -= step;
    if (g.bellTimer <= 0) {
      g.bellTimer = g.lv.bell > 1 ? 4.5 : 7.0;
      const target = g.obs.filter((o) => !o.done && !o.boss && o.z > SPAWN_Z + 4 && o.z < FRONT_Z - 2)
        .sort((a, b) => b.z - a.z)[0];
      if (target) {
        awardFix(g, target, events);
        events.push({ type: "bell", o: target });
      }
    }
  }
  if (g.lv.angel > 0) {
    g.angelTimer -= step;
    if (g.angelTimer <= 0) {
      g.angelTimer = g.lv.angel > 1 ? 8.5 : 13.0;
      const cand = g.obs.filter((o) => !o.done && !o.boss && o.z > SPAWN_Z + 4 && o.z < FRONT_Z - 2);
      if (cand.length) {
        const pick = cand[Math.floor(g.rng() * cand.length)];
        awardFix(g, pick, events);
        events.push({ type: "angel", o: pick });
      }
    }
  }

  // Advance obstacles, puddles, patrolling dogs/band, and check progress + collisions
  const fixRate = 1 + (g.lv.quickHands ?? 0) * 0.5;
  const reachPad = 5.5 + (g.lv.longArms ?? 0) * 4.2;
  const helperRate = g.syn.parishCouncil ? 1.0 : 0.5;

  for (const o of g.obs) {
    o.z += targetRoadSpeed * o.slow * step;

    if (!o.done) {
      if (o.targetX != null) {
        const dx = o.targetX - o.x;
        const m = Math.min(Math.abs(dx), 14 * step);
        o.x += Math.sign(dx) * m;
        if (Math.abs(dx) <= m) o.targetX = null;
      }
      if (o.kind === "puddle") {
        o.halfW = Math.min(22, o.halfW + 0.9 * step);
        o.need = Math.min(3.5, o.halfW * 0.16);
      }
    }

    if (o.vx !== 0) {
      o.x += o.vx * step;
      if (!o.done && (o.kind === "dog" || o.kind === "bossBand")) {
        const bound = ROAD_HALF - o.halfW;
        if (o.x < -bound) { o.x = -bound; o.vx = Math.abs(o.vx); }
        else if (o.x > bound) { o.x = bound; o.vx = -Math.abs(o.vx); }
      }
    }

    if (!o.done) {
      let progressAdd = 0;

      // Crew close enough (or Aspergillum wide forward arc)
      const nearCrew = Math.abs(crew.x - o.x) <= o.halfW + reachPad && Math.abs(crew.z - o.z) <= o.halfZ + reachPad;
      const inAspergillum = g.syn.aspergillum && o.z < crew.z && (crew.z - o.z) < 28 && Math.abs(o.x - crew.x) < o.halfW + 14;
      if (nearCrew || inAspergillum) {
        if (g.lv.wheelbarrow > 0 && o.kind === "pothole") {
          progressAdd += o.need + 1;
        } else {
          progressAdd += fixRate * step;
        }
        crew.fixingId = o.id;
      } else if (g.lv.thurible > 0 && crew.moving) {
        const thPad = 4 + g.lv.thurible * 5;
        if (Math.abs(crew.x - o.x) <= o.halfW + thPad && Math.abs(crew.z - o.z) <= o.halfZ + thPad) {
          progressAdd += 0.75 * step;
        }
      }

      // Helper fixes
      for (const h of g.helpers) {
        if (h.cat.has(o.cat) && Math.abs(h.x - o.x) <= o.halfW + 5 && Math.abs(h.z - o.z) <= o.halfZ + 5) {
          progressAdd += helperRate * step;
          h.fixing = true;
        }
      }

      // Thurifer synergy: nearby lit street lamps emit incense smoke that repairs hazards
      if (g.syn.thurifer && o.kind !== "lamp") {
        for (const lamp of g.obs) {
          if (lamp.kind === "lamp" && lamp.done && !lamp.miss && Math.hypot(lamp.x - o.x, lamp.z - o.z) < 24) {
            progressAdd += 0.55 * step;
            break;
          }
        }
      }

      if (progressAdd > 0) {
        o.pr += progressAdd;
        if (o.pr >= o.need) awardFix(g, o, events);
      }
    }

    // Check procession arrival at FRONT_Z
    if (!o.done && o.z + o.halfZ >= FRONT_Z) {
      o.done = true;
      o.miss = true;
      if (o.kind === "lamp") {
        if (isNight(g)) handleStumble(g, o, events);
        else {
          g.streak = 0;
          events.push({ type: "dimLamp", o });
        }
      } else if (Math.abs(o.x - g.procX) < o.halfW + PROC_HALF_W) {
        handleStumble(g, o, events);
      } else {
        o.dodged = true;
        g.dodges += 1;
        events.push({ type: "dodged", o });
      }
    }
  }

  g.obs = g.obs.filter((o) => o.z < FRONT_Z + 38 && Math.abs(o.x) < 62);

  // Regular obstacle spawns
  g.spawnTimer -= step;
  if (g.spawnTimer <= 0 && !g.over) {
    g.spawnTimer = stepSpawnInterval(g);
    spawnNextWave(g, events);
  }

  // Street lamps along sidewalks (twice as frequent at night!)
  g.lampTimer -= step * (targetRoadSpeed / 10.5);
  if (g.lampTimer <= 0 && !g.over) {
    g.lampTimer = (2.6 + g.rng() * 2.4) / (isNight(g) ? 1.85 : 1);
    const lx = g.rng() < 0.5 ? -SIDEWALK_X : SIDEWALK_X;
    spawnOb(g, "lamp", lx, SPAWN_Z);
  }

  // Broken bridges (2 lanes out of 3, leaving 1 clear lane to steer!)
  if (g.stage.bridgeEvery || stretchOf(g) === "river") {
    g.bridgeTimer -= step;
    if (g.bridgeTimer <= 0 && !g.over) {
      g.bridgeTimer = (g.stage.bridgeEvery || 26) + g.rng() * 8;
      const openLane = Math.floor(g.rng() * 3);
      for (let li = 0; li < 3; li++) {
        if (li !== openLane) spawnOb(g, "brokenBridge", LANE_X[li], SPAWN_Z - 2);
      }
      events.push({ type: "warning", msg: "Broken bridge ahead — steer or plank it!" });
    }
  }

  // Wind gusts blow lit lamps back out
  if (g.stage.windEvery || stretchOf(g) === "wind" || stretchOf(g) === "night") {
    g.windTimer -= step;
    if (g.windTimer <= 0 && !g.over) {
      g.windTimer = (g.stage.windEvery || 20) + g.rng() * 7;
      let blew = 0;
      for (const o of g.obs) {
        if (o.kind === "lamp" && o.done && !o.miss && o.z < FRONT_Z - 14) {
          o.done = false;
          o.pr = 0;
          o.takenBy = null;
          blew++;
        }
      }
      if (blew > 0) events.push({ type: "wind", count: blew, msg: "A gust of wind blew street lamps dark!" });
    }
  }

  // Thunderstorm boss tick
  if (g.stormTimer > 0) {
    g.stormTimer -= step;
    g.stormTick -= step;
    if (g.stormTick <= 0 && !g.over) {
      g.stormTick = 2.0;
      for (const o of g.obs) {
        if (o.kind === "lamp" && o.done && !o.miss && o.z < FRONT_Z - 16) {
          o.done = false; o.pr = 0; o.takenBy = null;
        }
      }
      const lx = LANE_X[Math.floor(g.rng() * 3)];
      spawnOb(g, "pothole", lx, SPAWN_Z + 12);
      events.push({ type: "lightning" });
    }
    if (g.stormTimer <= 0 && !g.over) {
      g.score += 300;
      events.push({ type: "stormClear", pts: 300, msg: "The storm cleared! +300 bonus!" });
    }
  }

  return events;
}
