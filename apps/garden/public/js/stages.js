// Stages in Garden Givers (apps/garden): four 1:30 stages, NO endless mode.
// Pure data: used by garden.js, plot.js, app.js and test/garden.test.js.

export const STAGES = [
  {
    id: "garden", name: "The Garden", icon: "🥕", progress: "garden-garden",
    length: 60, open: true, star2: 180, star3: 540,
    kinds: ["bed"], pests: ["bug", "bird"], pestEvery: [5.0, 3.1],
    maxOrders: 2, orderSizes: [1, 2], orderFresh: 18,
    blurb: "Shoo bugs and birds off carrots, tomatoes, and celery, and fill food bank orders fast!",
    rule: "Tap critters to shoo them, and pick ripe veggies for the food bank!",
  },
  {
    id: "orchard", name: "The Orchard", icon: "🍎", progress: "garden-orchard",
    length: 60, after: "garden", star2: 140, star3: 580,
    kinds: ["bed", "tree"], pests: ["bug", "bird", "squirrel"], pestEvery: [4.3, 2.5],
    maxOrders: 2, orderSizes: [2, 3], orderFresh: 17,
    blurb: "Fruit trees join the garden! Watch for squirrels climbing for apples and pears.",
    rule: "Guard the apple and pear trees and fill mixed fruit and veggie baskets!",
  },
  {
    id: "herbs", name: "The Herb Garden", icon: "🌿", progress: "garden-herbs",
    length: 60, after: "orchard", star2: 170, star3: 560,
    kinds: ["bed", "tree", "herb"], pests: ["bug", "bird", "squirrel"], pestEvery: [3.8, 2.2],
    maxOrders: 3, orderSizes: [2, 3], orderFresh: 16,
    blurb: "Basil and mint planters open along the stone wall, with busy 3-item baskets!",
    rule: "Keep beetles out of the herbs while filling three-part food bank orders!",
  },
  {
    id: "vigil", name: "Night Vigil", icon: "🌙", progress: "garden-vigil",
    length: 60, after: "herbs", star2: 260, star3: 850,
    night: true, vigil: true,
    kinds: ["bed", "tree", "herb"], pests: ["bug", "bird", "squirrel", "raccoon"], pestEvery: [2.2, 1.0],
    maxOrders: 0, orderSizes: [0, 0], orderFresh: 0,
    blurb: "Lanterns glow at night! Protect every bed, tree, and herb until dawn — no deliveries tonight.",
    rule: "Watch the garden by lantern light and shoo every nighttime critter before dawn!",
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];

export function isOpen(index, starsOf) {
  const st = STAGES[index];
  if (!st || st.open) return true;
  const req = st.after ? stageById(st.after) : STAGES[index - 1];
  return (starsOf(req) ?? 0) >= 2;
}
