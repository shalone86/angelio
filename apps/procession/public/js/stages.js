// Stages in Procession! (apps/procession): 4 timed routes + Feast Procession endless mode.
// Pure data: used by procession.js, road.js, app.js and test/procession.test.js.

export const STAGES = [
  {
    id: "town", progress: "procession-town", name: "Parish Town", icon: "⛪",
    length: 75, open: true, star2: 400, star3: 900,
    stretch: "town",
    kinds: ["pothole", "person", "car"], gap: [2.8, 1.8], speedStart: 10.5,
    windEvery: 0, bridgeEvery: 0,
    blurb: "Patch potholes, light lamps, greet neighbors, and steer the procession past parked cars!",
    rule: "Tap hazards to fix them ahead of the procession, or use ◀ ▶ to steer between lanes!",
  },
  {
    id: "market", progress: "procession-market", name: "Market Day", icon: "🛍️",
    length: 80, after: "town", star2: 500, star3: 1100,
    stretch: "market",
    kinds: ["pothole", "person", "car", "dog", "truck"], gap: [2.5, 1.55], speedStart: 12.0,
    windEvery: 0, bridgeEvery: 0,
    blurb: "Busy streets! Catch dashing parish pups and wave big delivery trucks off the route.",
    rule: "Delivery trucks give huge points & XP — clear them or steer around!",
  },
  {
    id: "river", progress: "procession-river", name: "River Crossing", icon: "🌉",
    length: 90, after: "market", star2: 650, star3: 1400,
    stretch: "river",
    kinds: ["pothole", "puddle", "person", "dog"], gap: [2.4, 1.45], speedStart: 12.5,
    windEvery: 0, bridgeEvery: 26, bossAt: [{ t: 58, kind: "bossBridge" }],
    blurb: "Mop growing puddles before they spread, plank broken bridges, and mend the Washed-Out Bridge!",
    rule: "Puddles grow wider if you wait! Plank both halves of a broken bridge or steer into the open lane.",
  },
  {
    id: "night", progress: "procession-night", name: "Candlelight Vigil", icon: "🌙",
    length: 90, after: "river", star2: 650, star3: 1450,
    night: true, stretch: "night",
    kinds: ["pothole", "person", "puddle", "car"], gap: [2.3, 1.4], speedStart: 12.5,
    windEvery: 18, bridgeEvery: 0,
    blurb: "Evening procession! Keep every street lamp burning — wind gusts blow lit lamps dark again.",
    rule: "At night dark lamps trip the procession! Re-light lamps quickly and watch for wind gusts.",
  },
  {
    id: "endless", progress: "procession-endless", name: "Feast Procession", icon: "🚩",
    length: Infinity, endless: true, after: "town", star2: 1200, star3: 3200,
    stretch: "town",
    kinds: ["pothole", "person", "car", "dog", "truck", "puddle"], gap: [2.7, 0.9], speedStart: 11.0,
    windEvery: 22, bridgeEvery: 28, bossEvery: 85,
    blurb: "Endless Feast route! Every minute speeds up & shifts towns — face all four boss waves.",
    rule: "Keep the candles burning! Every 60s shifts the route and boss waves test your crew.",
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];

export function isOpen(index, starsOf) {
  const st = STAGES[index];
  if (!st || st.open) return true;
  const req = st.after ? stageById(st.after) : STAGES[index - 1];
  return (starsOf(req) ?? 0) >= 2;
}
