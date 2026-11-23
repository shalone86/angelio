// Crops and garden critters for Garden Givers (apps/garden). Pure data: no DOM.

export const CROPS = [
  { id: "carrot", name: "Carrot", emoji: "🥕", kind: "bed", growTime: 6.8, color: "#ff7a22" },
  { id: "tomato", name: "Tomato", emoji: "🍅", kind: "bed", growTime: 7.4, color: "#e0453f" },
  { id: "celery", name: "Celery", emoji: "🥬", kind: "bed", growTime: 7.0, color: "#4ab848" },
  { id: "apple", name: "Apple", emoji: "🍎", kind: "tree", growTime: 8.2, color: "#d62828" },
  { id: "pear", name: "Pear", emoji: "🍐", kind: "tree", growTime: 8.6, color: "#c9d43b" },
  { id: "basil", name: "Basil", emoji: "🌿", kind: "herb", growTime: 6.2, color: "#2d8a4e" },
  { id: "mint", name: "Mint", emoji: "🌱", kind: "herb", growTime: 6.2, color: "#3cb878" },
];

export const PESTS = [
  { id: "bug", name: "Garden Beetle", emoji: "🐛", isBug: true, targets: ["bed", "herb"], eatTime: 5.6, points: 5 },
  { id: "bird", name: "Hungry Crow", emoji: "🐦", isBug: false, targets: ["tree", "bed"], eatTime: 5.0, points: 6 },
  { id: "squirrel", name: "Squirrel", emoji: "🐿️", isBug: false, targets: ["tree", "bed"], eatTime: 4.8, points: 7 },
  { id: "raccoon", name: "Night Critter", emoji: "🦝", isBug: false, targets: ["bed", "tree", "herb"], eatTime: 4.6, points: 8 },
];

export const cropById = (id) => CROPS.find((c) => c.id === id) ?? CROPS[0];
export const pestById = (id) => PESTS.find((p) => p.id === id) ?? PESTS[0];
