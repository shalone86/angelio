// Unlockable advance crew for Procession! (from carts/procession.p8).
// Reuses Shalone's own .vox models from art/vox/.

export const CREW = [
  {
    id: "sacristan", name: "Sacristan", short: "Sacristan", icon: "🕯️",
    voxIdle: "server-idle", voxWalk: "server-walk", role: "server",
    startUpgrade: "candle",
    blurb: "Starts every procession with an extra glowing candle (+1 candle).",
    say: "Sacristan! Starts with an extra candle.",
  },
  {
    id: "hospitality", name: "Hospitality", short: "Hospitality", icon: "☕",
    voxIdle: "woman-idle", voxWalk: "woman-walk", role: "woman",
    opens: { stage: "town" }, startUpgrade: "coffee",
    blurb: "Sips warm coffee to dash down the road 25% faster from the start!",
    say: "Hospitality! Walks 25 percent faster.",
  },
  {
    id: "groundskeeper", name: "Groundskeeper", short: "Grounds", icon: "🛠️",
    voxIdle: "man-beard-idle", voxWalk: "man-beard-walk", role: "beard",
    opens: { stage: "market" }, startUpgrade: "quickHands",
    blurb: "Quick Hands! Patches potholes and repairs hazards 50% faster right away.",
    say: "Groundskeeper! Starts with Quick Hands for faster fixes.",
  },
  {
    id: "choir", name: "Choir Director", short: "Choir", icon: "🎶",
    voxIdle: "child-girl-idle", voxWalk: "child-girl-walk", role: "girl",
    opens: { stage: "river" }, startUpgrade: "slowHymn",
    blurb: "Leads a steady hymn that calms and slows the procession behind you.",
    say: "Choir Director! Slows the procession so you have more time.",
  },
  {
    id: "monsignor", name: "Monsignor", short: "Monsignor", icon: "🔔",
    voxIdle: "priest-idle", voxWalk: "priest-walk-fast", role: "priest",
    opens: { stage: "night" }, startUpgrade: "bell",
    blurb: "Rings the Church Bell to clear the closest road hazard automatically!",
    say: "Monsignor! Rings the Church Bell to fix hazards automatically.",
  },
];

export const crewById = (id) => CREW.find((c) => c.id === id) ?? CREW[0];
export const crewOpen = (c, starsById) => !c.opens || (starsById(c.opens.stage) ?? 0) >= 2;
