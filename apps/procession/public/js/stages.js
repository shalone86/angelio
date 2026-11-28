// Stages in Procession! (apps/procession): 4 timed routes + Feast Procession endless mode.
// Pure data: used by procession.js, road.js, app.js and test/procession.test.js.

export const STAGES = [
  {
    id: "town", progress: "procession-town", name: "Parish Town", icon: "⛪",
    length: 75, open: true, star2: 400, star3: 900,
    stretch: "town",
    kinds: ["pothole", "person", "wanderer", "car"], gap: [2.8, 1.8], speedStart: 10.5,
    windEvery: 0, bridgeEvery: 0,
    blurb: "Patch potholes, light lamps, watch for wandering neighbors, and steer past parked cars!",
    rule: "Tap hazards to fix them ahead of the procession, or use ◀ ▶ to steer between lanes!",
  },
  {
    id: "market", progress: "procession-market", name: "Market Day", icon: "🛍️",
    length: 80, after: "town", star2: 500, star3: 1100,
    stretch: "market",
    kinds: ["pothole", "wanderer", "dog", "cat", "puddle", "car", "truck"], gap: [2.5, 1.6], speedStart: 11.5,
    windEvery: 0, bridgeEvery: 0,
    blurb: "Busy streets! Catch dashing pups, darting cats, wandering shoppers, and delivery trucks.",
    rule: "Watch the animals and puddles — delivery trucks give huge points & Bells!",
  },
  {
    id: "river", progress: "procession-river", name: "River Crossing", icon: "🌉",
    length: 85, after: "market", star2: 600, star3: 1350,
    stretch: "river",
    kinds: ["pothole", "puddle", "wanderer", "dog", "cat"], gap: [2.45, 1.55], speedStart: 12.0,
    windEvery: 0, bridgeEvery: 26, bossAt: [{ t: 54, kind: "bossBridge" }],
    blurb: "Mop puddles before they flood across lanes, catch animals, and plank the Washed-Out Bridge!",
    rule: "Puddles spread wide across lanes if you wait! Plank bridges fast or steer clear.",
  },
  {
    id: "night", progress: "procession-night", name: "Candlelight Vigil", icon: "🌙",
    length: 75, after: "river", star2: 500, star3: 1100,
    night: true, stretch: "night",
    kinds: ["pothole", "wanderer", "cat", "puddle"], gap: [2.8, 1.85], speedStart: 11.0,
    windEvery: 28, bridgeEvery: 0,
    blurb: "Evening procession! Keep street lamps glowing while puddles spread and cats dart across lanes.",
    rule: "Keep dark street lamps lit along the sidewalk and watch for darting cats!",
  },
  {
    id: "endless", progress: "procession-endless", name: "Feast Procession", icon: "🚩",
    length: Infinity, endless: true, after: "town", star2: 1200, star3: 3200,
    stretch: "town",
    kinds: ["pothole", "person", "wanderer", "dog", "cat", "puddle", "car", "truck"], gap: [2.7, 0.95], speedStart: 11.0,
    windEvery: 28, bridgeEvery: 28, bossEvery: 85,
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
