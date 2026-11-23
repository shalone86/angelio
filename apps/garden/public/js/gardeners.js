// Gardeners in Garden Givers (apps/garden): base Brother/Sister starters plus four unlockable
// specialists (2 monks, 2 nuns), reusing shared `monk` / `nun` voxel models.
// Pure data: used by garden.js, plot.js, app.js and test/garden.test.js.

export const GARDENERS = [
  {
    id: "brother", name: "Brother Gardener", icon: "🧑‍🌾", model: "monk", nun: false, robe: "#5a4030",
    blurb: "Tends the beds and trees alongside the food bank courier.",
    say: "Brother Gardener is ready with boots and trowel!",
  },
  {
    id: "sister", name: "Sister Gardener", icon: "👩‍🌾", model: "nun", nun: true, robe: "#5a4030",
    blurb: "Tends the beds and trees alongside the food bank courier.",
    say: "Sister Gardener is ready to guard the harvest!",
  },
  {
    id: "bugs", name: "Brother Bug-Shooer", icon: "🪲", model: "monk", nun: false, robe: "#2f6b3f",
    opens: { stage: "garden", stars: 2 },
    autoBugs: true, pointsScale: 0.9,
    blurb: "Automatically shoos bugs off every plant! Other critters and orders earn a tiny bit less.",
    say: "Brother Bug-Shooer sweeps away every beetle by himself! You watch for birds and fill baskets.",
  },
  {
    id: "double", name: "Sister Double Harvest", icon: "🧺", model: "nun", nun: true, robe: "#2e5fa8",
    opens: { stage: "orchard", stars: 2 },
    doubleHarvest: true, growScale: 0.88,
    blurb: "One tap harvests two matching items into food bank baskets! Crops regrow a little slower.",
    say: "Sister Double Harvest fills two slots in one tap! Plants take a touch longer to grow back.",
  },
  {
    id: "patient", name: "Brother Patient", icon: "⏳", model: "monk", nun: false, robe: "#6b4a2a",
    opens: { stage: "herbs", stars: 2 },
    orderPatience: 1.65, orderScale: 0.85,
    blurb: "Food bank orders stay fresh much longer before losing points, though each starts a bit smaller.",
    say: "Brother Patient gives you extra time on every basket, though orders start slightly smaller.",
  },
  {
    id: "green", name: "Sister Green Thumb", icon: "🌱", model: "nun", nun: true, robe: "#6b3fa0",
    opens: { stage: "vigil", stars: 2 },
    growScale: 1.6, pestStay: 1.25,
    blurb: "Crops ripen and regrow fast and critters take longer to nibble!",
    say: "Sister Green Thumb helps everything bloom fast and slows down hungry critters!",
  },
];

export const gardenerById = (id) => GARDENERS.find((g) => g.id === id) ?? GARDENERS[0];

export const gardenerOpen = (g, starsOfId) => !g.opens || (starsOfId(g.opens.stage) ?? 0) >= g.opens.stars;
