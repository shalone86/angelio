// All 16 PICO-8 Procession upgrades & 4 synergies (carts/procession.p8).

export const UPGRADES = [
  { id: "coffee", name: "Hot Coffee", icon: "☕", max: 3, blurb: "Advance crew sprints 25% faster down the road." },
  { id: "server", name: "Altar Server", icon: "🕯️", max: 3, blurb: "Helper who runs ahead to light dark street lamps." },
  { id: "deacon", name: "Deacon", icon: "🛠️", max: 2, blurb: "Helper who repairs potholes, puddles, and bridges." },
  { id: "usher", name: "Parish Usher", icon: "🙋", max: 2, blurb: "Helper who clears people, cars, trucks, and dogs." },
  { id: "longArms", name: "Long Arms", icon: "⭕", max: 3, blurb: "Fix hazards from farther away (wider reach circle)." },
  { id: "quickHands", name: "Quick Hands", icon: "⚡", max: 3, blurb: "Fix every hazard 50% faster." },
  { id: "slowHymn", name: "Slow Hymn", icon: "🎵", max: 2, blurb: "The procession sings slowly (−15% road speed)." },
  { id: "incense", name: "Sweet Incense", icon: "💨", max: 3, blurb: "+1 score multiplier on every fix!" },
  { id: "banner", name: "Saint's Banner", icon: "🚩", max: 2, blurb: "Blocks a stumble, then recharges every 18s (11s at max)." },
  { id: "bell", name: "Church Bell", icon: "🔔", max: 2, blurb: "Rings every 7s (4.5s at max) to fix the closest danger." },
  { id: "candle", name: "New Candle", icon: "🕯️", max: 99, blurb: "Add +1 candle right now for more safety." },
  { id: "holyWater", name: "Holy Water", icon: "💧", max: 3, blurb: "Splash! Immediately fixes all hazards on the road now." },
  { id: "wheelbarrow", name: "Wheelbarrow", icon: "🛞", max: 1, blurb: "Fills potholes in a single instant touch!" },
  { id: "angel", name: "Guardian Angel", icon: "👼", max: 2, blurb: "Swoops in every 13s (8.5s at max) to clear a hazard." },
  { id: "thurible", name: "Swing Thurible", icon: "🟡", max: 2, blurb: "Fixes hazards gently just as you walk past them." },
  { id: "christopher", name: "St. Christopher", icon: "🏅", max: 1, blurb: "Blocks any second stumble in a row until you fix again." },
];

export const SYNERGIES = [
  { id: "thurifer", parts: ["server", "incense"], name: "Thurifer", icon: "💨", blurb: "Lit street lamps drift incense and repair nearby hazards!" },
  { id: "angelus", parts: ["bell", "slowHymn"], name: "The Angelus", icon: "🔔", blurb: "Every 40s the Angelus bell freezes the road for 3 seconds!" },
  { id: "parishCouncil", parts: ["deacon", "usher"], name: "Parish Council", icon: "🤝", blurb: "All Altar Servers, Deacons, and Ushers fix twice as fast!" },
  { id: "aspergillum", parts: ["longArms", "holyWater"], name: "Aspergillum", icon: "💦", blurb: "Blesses and repairs hazards in a wide arc ahead of you!" },
];

export const HELPER_CATS = {
  server: new Set(["lamp"]),
  deacon: new Set(["hole"]),
  usher: new Set(["crowd"]),
};

export const upgradeById = (id) => UPGRADES.find((u) => u.id === id);

/** Pick up to 3 available upgrades, favoring uncollected/unseen choices (like carts/procession.p8). */
export function rollOffers(lv, candles, maxCandles, seenRun = {}, seenEver = {}, rng = Math.random) {
  const pool = [];
  for (const u of UPGRADES) {
    const cur = lv[u.id] ?? 0;
    if (cur >= u.max) continue;
    if (u.id === "candle" && candles >= maxCandles) continue;
    const weight = 1 + (seenRun[u.id] ? 0 : 2) + (seenEver[u.id] ? 0 : 3);
    pool.push({ u, weight });
  }
  const picked = [];
  const bag = [...pool];
  while (picked.length < 3 && bag.length > 0) {
    const total = bag.reduce((s, x) => s + x.weight, 0);
    let r = rng() * total;
    let idx = bag.length - 1;
    for (let i = 0; i < bag.length; i++) {
      r -= bag[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(bag[idx].u);
    bag.splice(idx, 1);
  }
  return picked;
}
