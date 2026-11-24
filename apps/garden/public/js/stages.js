// Stages in Garden Givers (apps/garden): four 45s timed stages + Endless Harvest.
// Pure data: used by garden.js, plot.js, app.js and test/garden.test.js.

export const STAGES = [
  {
    id: "garden", name: "The Garden", icon: "🥕", progress: "garden-garden",
    length: 45, open: true, star1: 150, star2: 250, star3: 425,
    kinds: ["bed"], pests: ["bug", "bird"], pestEvery: [5.0, 3.1],
    maxOrders: 2, orderSizes: [1, 2], orderFresh: 18,
    blurb: "Shoo bugs and birds off carrots, tomatoes, and celery, and fill food bank orders fast!",
    rule: "Tap critters to shoo them, and pick ripe veggies for the food bank!",
  },
  {
    id: "orchard", name: "The Orchard", icon: "🍎", progress: "garden-orchard",
    length: 45, after: "garden", star1: 150, star2: 250, star3: 425,
    kinds: ["bed", "tree"], pests: ["bug", "bird", "squirrel"], pestEvery: [4.3, 2.5],
    maxOrders: 2, orderSizes: [2, 3], orderFresh: 17,
    blurb: "Fruit trees join the garden! Squirrels take two taps to chase off the apples and pears.",
    rule: "Guard the apple and pear trees (tap squirrels twice!) and fill mixed fruit and veggie baskets!",
  },
  {
    id: "herbs", name: "The Herb Garden", icon: "🌿", progress: "garden-herbs",
    length: 45, after: "orchard", star1: 150, star2: 250, star3: 425,
    kinds: ["bed", "tree", "herb"], pests: ["bug", "bird", "squirrel"], pestEvery: [3.8, 2.2],
    maxOrders: 3, orderSizes: [2, 3], orderFresh: 16,
    blurb: "Basil and mint planters open along the stone wall, with busy 3-item baskets!",
    rule: "Keep beetles out of the herbs while filling three-part food bank orders!",
  },
  {
    id: "vigil", name: "Night Vigil", icon: "🌙", progress: "garden-vigil",
    length: 45, after: "herbs", star1: 150, star2: 250, star3: 425,
    night: true, vigil: true,
    kinds: ["bed", "tree", "herb"], pests: ["bug", "bird", "squirrel", "raccoon"], pestEvery: [2.0, 0.72],
    maxOrders: 0, orderSizes: [0, 0], orderFresh: 0,
    blurb: "Heavy night waves! Critters swarm faster as dawn nears, and raccoons & squirrels take two taps.",
    rule: "Tap raccoons and squirrels twice — more animals swarm in as dawn draws near!",
  },
  {
    id: "endless", name: "Endless Harvest", icon: "🌻", progress: "garden-endless",
    length: Infinity, endless: true, after: "garden", maxEaten: 10, star1: 150, star2: 250, star3: 425,
    kinds: ["bed", "tree", "herb"], pests: ["bug", "bird", "squirrel", "raccoon"],
    pestEvery: [2.7, 0.22],
    maxOrders: 2, orderSizes: [1, 3], orderFresh: 18,
    blurb: "Endless mode! More bugs and critters arrive every 30 seconds until the eaten-produce meter fills up.",
    rule: "Defend the whole garden and fill orders! Every 30 seconds more critters arrive — don't let the eaten meter fill!",
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];

export function isOpen(index, starsOf) {
  const st = STAGES[index];
  if (!st || st.open) return true;
  const req = st.after ? stageById(st.after) : STAGES[index - 1];
  return (starsOf(req) ?? 0) >= 2;
}
