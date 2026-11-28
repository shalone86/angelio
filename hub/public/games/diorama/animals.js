// Sculpted 3D voxel animal catalog shared between Monastery Porter (apps/porter) and Voxel Diorama (hub/public/games/diorama).
// Pure data + Three.js mesh builder: all boxes face +z with feet resting on y = 0.

const eyes = (ex, ey, ez, col = "#1d1e24", w = 0.42, h = 0.52, emissive = false, sclera = false) => {
  const out = [];
  for (const sx of [-1, 1]) {
    if (sclera) out.push([w + 0.28, h + 0.14, 0.18, sx * ex, ey - 0.04, ez - 0.05, "#fffaf2"]);
    out.push([w, h, 0.25, sx * ex, ey, ez, col, emissive]);
  }
  return out;
};

const legs = (xs, zs, w, h, d, legCol, hoofCol, hoofH = 0.55) => {
  const out = [];
  for (const x of xs) for (const z of zs) {
    out.push([w, h - hoofH, d, x, hoofH, z, legCol]);
    out.push([w + 0.06, hoofH, d + 0.06, x, 0, z, hoofCol]);
  }
  return out;
};

const pairX = (fn) => [-1, 1].flatMap(fn);

export const ANIMAL_VARIANTS = [
  // ── Goats (A, B, C) ──
  {
    id: "goat-a", kind: "goat", variant: "A", name: "Alpine Kid", rarity: "common", sound: "goat", porterScale: 1.0,
    blurb: "A perky cream goat with swept horns and a tuft beard.",
    boxes: [
      ...legs([-0.95, 0.95], [-1.7, 1.6], 0.65, 2.0, 0.65, "#ded7c6", "#3d3935", 0.5),
      [2.6, 2.4, 4.4, 0, 2.0, 0, "#f5f0e4"], [2.1, 2.2, 1.6, 0, 3.1, 1.7, "#ede6d6"],
      [2.2, 2.2, 2.1, 0, 4.7, 2.3, "#f7f3ea"], [1.5, 1.25, 1.3, 0, 4.5, 3.6, "#ded4c2"],
      [1.1, 0.35, 0.25, 0, 5.15, 4.2, "#4b3c34"], [0.55, 1.4, 0.65, 0, 3.25, 3.4, "#8b7968"],
      ...pairX((sx) => [
        [0.48, 1.6, 0.48, sx * 0.65, 6.85, 2.1, "#7d7265"],
        [0.45, 0.6, 0.45, sx * 0.65, 8.2, 1.75, "#5c5348"],
        [0.9, 0.55, 0.45, sx * 1.45, 6.1, 1.9, "#e6ddd0"],
      ]),
      [0.6, 1.1, 0.9, 0, 4.0, -2.4, "#8b7968"],
      ...eyes(0.72, 5.7, 3.35, "#d89e28", 0.42, 0.44, false, true),
    ],
  },
  {
    id: "goat-b", kind: "goat", variant: "B", name: "Meadow Billy", rarity: "special", sound: "goat", porterScale: 1.0,
    blurb: "A warm tan saddle goat with curved horns and floppy ears.",
    boxes: [
      ...legs([-1.0, 1.0], [-1.8, 1.6], 0.68, 2.1, 0.68, "#cabba6", "#2e2824", 0.55),
      [2.8, 2.5, 4.6, 0, 2.1, 0, "#cbbba4"], [2.9, 1.4, 2.6, 0, 3.3, 0.9, "#f3ede2"],
      [1.9, 2.3, 1.7, 0, 3.3, 1.9, "#efe7d8"], [2.1, 2.1, 2.2, 0, 4.9, 2.4, "#f3ede2"],
      [1.4, 1.2, 1.2, 0, 4.8, 3.6, "#d9c2a3"], [0.7, 1.6, 0.8, 0, 3.4, 3.6, "#755f4c"],
      ...pairX((sx) => [
        [0.45, 1.4, 0.55, sx * 0.7, 6.9, 2.1, "#665b50"],
        [0.45, 0.9, 1.1, sx * 0.7, 7.6, 1.5, "#665b50"],
        [0.4, 1.1, 0.6, sx * 1.25, 5.2, 2.0, "#baa992"],
      ]),
      [0.65, 1.3, 0.7, 0, 4.2, -2.5, "#755f4c"],
      ...eyes(0.72, 5.9, 3.45, "#231e1b", 0.4, 0.45, false, true),
    ],
  },
  {
    id: "goat-c", kind: "goat", variant: "C", name: "Bell Goat", rarity: "rare", sound: "goat", porterScale: 1.0,
    blurb: "A charcoal-and-cream mountain goat wearing a brass bell.",
    boxes: [
      ...legs([-0.95, 0.95], [-1.7, 1.65], 0.65, 2.1, 0.65, "#423a35", "#241e1a", 0.55),
      [2.6, 2.5, 4.5, 0, 2.1, 0, "#ede8de"], [2.7, 2.1, 1.9, 0, 2.6, 1.35, "#423a35"],
      [1.9, 2.5, 1.5, 0, 3.6, 1.9, "#423a35"], [2.1, 2.2, 2.0, 0, 5.3, 2.3, "#ede8de"],
      [1.5, 0.45, 2.05, 0, 6.2, 2.35, "#423a35"], [1.3, 1.2, 1.2, 0, 5.1, 3.5, "#e0d6c6"],
      [0.55, 1.5, 0.6, 0, 3.7, 3.4, "#241e1a"], [0.75, 0.65, 0.6, 0, 4.1, 2.9, "#d4a634"],
      ...pairX((sx) => [
        [0.45, 2.0, 0.45, sx * 0.65, 7.2, 2.0, "#756a5e"],
        [0.9, 0.5, 0.4, sx * 1.35, 6.4, 1.95, "#423a35"],
      ]),
      [0.55, 1.2, 0.8, 0, 4.3, -2.4, "#423a35"],
      ...eyes(0.7, 6.2, 3.28, "#231e1b", 0.38, 0.42, false, true),
    ],
  },

  // ── Sheep (A, B) ──
  {
    id: "sheep-a", kind: "sheep", variant: "A", name: "Woolly Lamb", rarity: "common", sound: "sheep", porterScale: 1.0,
    blurb: "A woolly little lamb wandering the meadow.",
    boxes: [
      ...legs([-1.15, 1.15], [-1.5, 1.4], 0.65, 1.7, 0.65, "#363840", "#1e1f24", 0.45),
      [3.6, 2.9, 4.6, 0, 1.7, 0, "#f5f1e6"], [3.9, 2.2, 3.8, 0, 2.0, 0, "#fffaf0"],
      [2.2, 1.2, 2.2, 0, 4.3, 1.6, "#fffaf0"], [2.1, 2.0, 1.9, 0, 2.9, 2.2, "#363840"],
      [1.4, 1.1, 0.9, 0, 2.9, 3.1, "#4c4e59"],
      ...pairX((sx) => [[1.0, 0.65, 0.55, sx * 1.45, 3.8, 2.0, "#363840"]]),
      [1.2, 1.2, 0.9, 0, 3.2, -2.5, "#fffaf0"],
      ...eyes(0.62, 3.85, 3.16, "#14151a", 0.36, 0.44, false, true),
    ],
  },
  {
    id: "sheep-b", kind: "sheep", variant: "B", name: "Fluffy Ewe", rarity: "special", sound: "sheep", porterScale: 1.0,
    blurb: "A cloud-soft storybook sheep with fluffy wool bangs.",
    boxes: [
      ...legs([-1.2, 1.2], [-1.55, 1.45], 0.7, 1.65, 0.7, "#3a3634", "#242120", 0.4),
      [3.8, 3.0, 4.6, 0, 1.65, 0, "#fbf6eb"], [4.3, 2.1, 3.5, 0, 2.1, -0.1, "#f2eadb"],
      [3.0, 0.7, 3.4, 0, 4.5, -0.2, "#fffdf8"], [2.3, 2.2, 2.0, 0, 3.0, 2.25, "#3a3634"],
      [1.8, 0.9, 1.4, 0, 4.9, 2.0, "#fffdf8"],
      ...pairX((sx) => [[0.55, 1.1, 0.65, sx * 1.25, 3.2, 2.0, "#3a3634"]]),
      [1.3, 1.3, 1.0, 0, 3.0, -2.6, "#fbf6eb"],
      ...eyes(0.68, 3.95, 3.25, "#19191c", 0.36, 0.44, false, true),
    ],
  },

  // ── Cows (A, B) ──
  {
    id: "cow-a", kind: "cow", variant: "A", name: "Holstein Cow", rarity: "special", sound: "cow", porterScale: 1.08,
    blurb: "A spotted dairy cow with a gentle pink snout.",
    boxes: [
      ...legs([-1.5, 1.5], [-2.5, 2.3], 0.9, 2.6, 0.9, "#f4f2ec", "#2e2e34", 0.65),
      [4.4, 3.9, 7.2, 0, 2.6, 0, "#f7f5f0"], [4.5, 2.1, 2.6, -0.1, 3.9, -0.8, "#25262c"],
      [2.6, 2.0, 2.2, 1.1, 3.0, 1.7, "#25262c"], [2.3, 0.9, 1.8, 0, 2.4, -0.6, "#f0b4be"],
      [3.2, 3.0, 2.6, 0, 4.5, 4.1, "#f7f5f0"], [2.5, 1.7, 1.6, 0, 4.2, 5.6, "#f0b4be"],
      ...pairX((sx) => [
        [0.4, 0.4, 0.25, sx * 0.65, 5.1, 6.4, "#c97485"],
        [0.6, 1.3, 0.6, sx * 1.1, 7.3, 3.9, "#e6d8bd"],
        [1.0, 0.65, 0.5, sx * 1.9, 6.4, 3.7, "#25262c"],
      ]),
      [0.5, 2.6, 0.5, 0, 3.3, -3.7, "#f4f2ec"], [0.7, 0.9, 0.7, 0, 2.7, -3.9, "#25262c"],
      ...eyes(0.95, 6.0, 5.4, "#1c1c20", 0.48, 0.52, false, true),
    ],
  },
  {
    id: "cow-b", kind: "cow", variant: "B", name: "Jersey Cow", rarity: "rare", sound: "cow", porterScale: 1.08,
    blurb: "A warm caramel Jersey cow wearing a golden bell.",
    boxes: [
      ...legs([-1.45, 1.45], [-2.5, 2.2], 0.88, 2.6, 0.88, "#d88a4a", "#3a271a", 0.6),
      [4.3, 3.8, 7.2, 0, 2.6, 0, "#d88a4a"], [4.4, 1.9, 2.4, 0, 3.5, 0.3, "#fbf7ee"],
      [2.8, 2.7, 1.8, 0, 3.8, 2.9, "#c47536"], [3.0, 3.0, 2.7, 0, 4.6, 4.2, "#d88a4a"],
      [2.3, 1.6, 1.5, 0, 4.4, 5.6, "#f3d5bd"], [0.95, 0.75, 0.7, 0, 3.4, 3.9, "#e3b341"],
      ...pairX((sx) => [
        [0.5, 1.1, 0.5, sx * 1.0, 7.4, 4.0, "#f0e5d1"],
        [1.1, 0.65, 0.6, sx * 1.8, 6.5, 3.8, "#8c5024"],
      ]),
      [0.45, 2.4, 0.45, 0, 3.5, -3.7, "#d88a4a"], [0.65, 0.85, 0.65, 0, 2.9, -3.9, "#4a2c16"],
      ...eyes(0.9, 6.1, 5.55, "#241911", 0.48, 0.52, false, true),
    ],
  },

  // ── Pigs (A, B, C) ──
  {
    id: "pig-a", kind: "pig", variant: "A", name: "Rosy Piglet", rarity: "common", sound: "pig", porterScale: 0.96,
    blurb: "A cheerful pink piglet with a curly tail and flat snout.",
    boxes: [
      ...legs([-1.1, 1.1], [-1.5, 1.4], 0.72, 1.35, 0.72, "#f29fb2", "#6e4c44", 0.42),
      [3.5, 2.9, 5.0, 0, 1.35, 0, "#f6adc0"], [3.0, 2.6, 2.2, 0, 1.85, 2.3, "#f8b8c8"],
      [1.75, 1.25, 1.0, 0, 2.15, 3.4, "#eb7f99"],
      ...pairX((sx) => [
        [0.32, 0.42, 0.25, sx * 0.42, 2.6, 3.85, "#9c3e55"],
        [0.7, 1.0, 0.55, sx * 1.1, 4.1, 2.1, "#eb7f99"],
      ]),
      [0.45, 0.95, 0.45, 0, 3.1, -2.7, "#eb7f99"], [0.65, 0.45, 0.45, 0.35, 3.85, -2.9, "#eb7f99"],
      ...eyes(0.88, 3.3, 3.4, "#231f20", 0.4, 0.48, false, true),
    ],
  },
  {
    id: "pig-b", kind: "pig", variant: "B", name: "Muddy Pig", rarity: "special", sound: "pig", porterScale: 0.96,
    blurb: "Rolled in a happy puddle on its way to the gate!",
    boxes: [
      ...legs([-1.15, 1.15], [-1.5, 1.4], 0.75, 1.35, 0.75, "#f5adc0", "#4f3a36", 0.42),
      [3.7, 3.0, 5.2, 0, 1.35, 0, "#f7b5c5"], [3.8, 1.4, 2.0, 0, 2.4, -0.6, "#8c5c42"],
      [3.1, 2.7, 2.2, 0, 1.9, 2.3, "#f7b5c5"], [1.8, 1.3, 1.1, 0, 2.2, 3.4, "#ea809c"],
      ...pairX((sx) => [
        [0.34, 0.42, 0.25, sx * 0.42, 2.65, 3.9, "#943b52"],
        [0.75, 0.7, 0.9, sx * 1.15, 3.9, 2.7, "#ea809c"],
      ]),
      [0.45, 1.1, 0.5, 0, 3.2, -2.75, "#ea809c"],
      ...eyes(0.88, 3.35, 3.4, "#231f20", 0.4, 0.46, false, true),
    ],
  },
  {
    id: "pig-c", kind: "pig", variant: "C", name: "Belted Pig", rarity: "rare", sound: "pig", porterScale: 0.96,
    blurb: "A rosy farm pig wearing a crisp white Hampshire belt.",
    boxes: [
      ...legs([-1.1, 1.1], [-1.5, 1.45], 0.72, 1.45, 0.72, "#73483e", "#33221d", 0.45),
      [3.5, 2.9, 5.0, 0, 1.45, 0, "#e88a9d"], [3.6, 2.95, 1.9, 0, 1.45, 0.3, "#faf2ee"],
      [2.9, 2.5, 2.2, 0, 2.1, 2.3, "#e88a9d"], [1.65, 1.2, 1.0, 0, 2.4, 3.4, "#d1627b"],
      ...pairX((sx) => [[0.7, 1.1, 0.5, sx * 1.0, 4.35, 2.1, "#73483e"]]),
      [0.45, 0.9, 0.45, 0, 3.2, -2.65, "#73483e"],
      ...eyes(0.85, 3.5, 3.4, "#231f20", 0.38, 0.45, false, true),
    ],
  },

  // ── Dogs (A, B, C) ──
  {
    id: "dog-a", kind: "dog", variant: "A", name: "Parish Pup", rarity: "common", sound: "dog", porterScale: 0.96,
    blurb: "The friendly monastery pup with floppy ears and a wagging tail!",
    boxes: [
      ...legs([-0.85, 0.85], [-1.6, 1.5], 0.65, 1.85, 0.65, "#bd7b38", "#f4efe2", 0.45),
      [2.4, 2.3, 4.6, 0, 1.85, 0, "#c88642"], [2.0, 1.6, 1.6, 0, 1.9, 1.8, "#f5ead6"],
      [2.5, 2.3, 2.3, 0, 3.3, 2.0, "#c88642"], [1.6, 1.25, 1.4, 0, 3.3, 3.3, "#f5ead6"],
      [0.75, 0.55, 0.45, 0, 4.1, 3.9, "#241d19"], [0.75, 0.3, 0.25, 0, 3.2, 3.9, "#e86b7f"],
      ...pairX((sx) => [[0.55, 1.55, 0.85, sx * 1.25, 3.7, 1.9, "#7d4a22"]]),
      [0.65, 1.6, 0.7, 0, 3.6, -2.5, "#c88642"],
      ...eyes(0.7, 4.65, 3.16, "#231c18", 0.42, 0.48, false, true),
    ],
  },
  {
    id: "dog-b", kind: "dog", variant: "B", name: "Shepherd Dog", rarity: "rare", sound: "dog", porterScale: 1.0,
    blurb: "A loyal golden-and-sable watch dog in a bright red collar.",
    boxes: [
      ...legs([-0.9, 0.9], [-1.7, 1.5], 0.68, 2.0, 0.68, "#d8a45e", "#f7ecd7", 0.5),
      [2.6, 2.5, 4.8, 0, 2.0, 0, "#e3b26f"], [2.4, 1.7, 1.8, 0, 2.7, 1.8, "#fbf3e3"],
      [2.4, 2.3, 2.3, 0, 3.8, 2.0, "#e3b26f"], [1.5, 1.2, 1.4, 0, 3.8, 3.3, "#4c382a"],
      [0.7, 0.5, 0.4, 0, 4.5, 3.9, "#241d19"], [2.5, 0.45, 1.8, 0, 2.9, 1.8, "#c83838"],
      ...pairX((sx) => [[0.55, 1.2, 0.6, sx * 0.85, 5.9, 1.7, "#7d4f28"]]),
      [0.75, 1.7, 1.2, 0, 3.4, -2.7, "#c9924d"],
      ...eyes(0.68, 5.1, 3.16, "#231c18", 0.42, 0.46, false, true),
    ],
  },
  {
    id: "dog-c", kind: "dog", variant: "C", name: "Abbey Hound", rarity: "special", sound: "dog", porterScale: 0.96,
    blurb: "A tricolored beagle hound with a white-tipped tail.",
    boxes: [
      ...legs([-0.9, 0.9], [-1.7, 1.5], 0.65, 1.9, 0.65, "#f5efe6", "#d8cfc2", 0.4),
      [2.5, 2.4, 4.6, 0, 1.9, 0, "#f5efe6"], [2.6, 1.8, 2.4, 0, 2.6, -0.3, "#362f2c"],
      [2.4, 2.2, 2.2, 0, 3.5, 2.0, "#b86b32"], [0.75, 1.1, 0.3, 0, 4.5, 3.1, "#f5efe6"],
      [1.5, 1.15, 1.3, 0, 3.4, 3.3, "#f5efe6"], [0.7, 0.5, 0.4, 0, 4.15, 3.9, "#231d1a"],
      ...pairX((sx) => [[0.5, 1.6, 0.95, sx * 1.25, 3.7, 1.9, "#4d2f1a"]]),
      [0.55, 1.9, 0.55, 0, 3.7, -2.5, "#b86b32"], [0.6, 0.6, 0.6, 0, 5.3, -2.5, "#ffffff"],
      ...eyes(0.72, 4.8, 3.1, "#231d1a", 0.42, 0.48, false, true),
    ],
  },

  // ── Cats (A, B) ──
  {
    id: "cat-a", kind: "cat", variant: "A", name: "Ginger Tabby", rarity: "common", sound: "cat", porterScale: 0.85,
    blurb: "A sunny orange kitty with white mittens and golden eyes.",
    boxes: [
      ...legs([-0.68, 0.68], [-1.45, 1.3], 0.55, 1.4, 0.55, "#e08a38", "#f7f1e6", 0.42),
      [2.0, 1.9, 3.9, 0, 1.4, 0, "#e08a38"], [2.1, 1.9, 2.0, 0, 2.65, 1.7, "#e08a38"],
      [1.3, 0.95, 0.7, 0, 2.6, 2.7, "#f7f1e6"], [0.45, 0.35, 0.25, 0, 3.2, 3.05, "#e87e92"],
      ...pairX((sx) => [
        [0.6, 0.95, 0.55, sx * 0.72, 4.4, 1.5, "#e08a38"],
        [0.3, 0.5, 0.2, sx * 0.72, 4.45, 1.72, "#f0a0b0"],
      ]),
      [0.55, 2.4, 0.55, 0, 2.4, -2.15, "#e08a38"], [0.58, 0.75, 0.65, 0, 4.4, -2.45, "#f7f1e6"],
      ...eyes(0.56, 3.65, 2.7, "#fff08a", 0.44, 0.46, true, false),
    ],
  },
  {
    id: "cat-b", kind: "cat", variant: "B", name: "Tuxedo Cat", rarity: "rare", sound: "cat", porterScale: 0.85,
    blurb: "Dressed in a neat black-and-white coat with bright emerald eyes.",
    boxes: [
      ...legs([-0.68, 0.68], [-1.45, 1.3], 0.55, 1.4, 0.55, "#32353d", "#f4f2ec", 0.45),
      [2.05, 1.95, 3.9, 0, 1.4, 0, "#32353d"], [1.6, 1.5, 1.1, 0, 1.55, 1.5, "#f8f6f0"],
      [2.15, 1.95, 2.05, 0, 2.7, 1.7, "#32353d"], [1.35, 0.95, 0.55, 0, 2.7, 2.7, "#f8f6f0"],
      [0.45, 0.32, 0.22, 0, 3.28, 2.98, "#eb889c"],
      ...pairX((sx) => [[0.6, 0.95, 0.55, sx * 0.72, 4.45, 1.5, "#32353d"]]),
      [0.55, 2.3, 0.55, 0, 2.5, -2.1, "#32353d"], [0.6, 0.7, 0.6, 0, 4.5, -2.4, "#f8f6f0"],
      ...eyes(0.56, 3.7, 2.72, "#9ff06b", 0.42, 0.48, true, false),
    ],
  },

  // ── Chickens (A, B, C) ──
  {
    id: "chicken-a", kind: "chicken", variant: "A", name: "White Hen", rarity: "common", sound: "bird", porterScale: 0.85,
    blurb: "A plump white hen with folded wings and a bright red comb.",
    boxes: [
      ...pairX((sx) => [
        [0.38, 1.35, 0.38, sx * 0.65, 0.25, 0.1, "#e39d28"],
        [0.95, 0.28, 1.15, sx * 0.65, 0, 0.35, "#e39d28"],
        [0.45, 1.5, 2.2, sx * 1.45, 1.95, -0.1, "#ede3cf"],
      ]),
      [2.6, 2.3, 3.2, 0, 1.55, 0, "#fbf7ee"], [1.75, 1.75, 1.75, 0, 3.25, 1.0, "#fbf7ee"],
      [0.45, 0.75, 1.1, 0, 4.9, 0.95, "#d62d28"], [0.45, 0.4, 0.4, 0, 5.4, 1.15, "#d62d28"],
      [0.65, 0.55, 0.85, 0, 3.65, 2.1, "#f2aa24"], [0.45, 0.65, 0.45, 0, 3.0, 1.9, "#d62d28"],
      [0.95, 1.55, 1.15, 0, 2.8, -1.7, "#e3b56f"],
      ...eyes(0.85, 4.15, 1.4, "#1e1f24", 0.25, 0.38, false, false),
    ],
  },
  {
    id: "chicken-b", kind: "chicken", variant: "B", name: "Red Hen", rarity: "special", sound: "bird", porterScale: 0.85,
    blurb: "A russet farm hen with glossy teal tail feathers.",
    boxes: [
      ...pairX((sx) => [
        [0.38, 1.35, 0.38, sx * 0.65, 0.25, 0.1, "#df9822"],
        [0.9, 0.28, 1.1, sx * 0.65, 0, 0.35, "#df9822"],
        [0.45, 1.55, 2.2, sx * 1.5, 2.0, -0.1, "#a85624"],
      ]),
      [2.7, 2.35, 3.3, 0, 1.55, 0, "#c87138"], [1.8, 1.8, 1.75, 0, 3.25, 1.0, "#d47e42"],
      [0.48, 0.85, 1.25, 0, 4.95, 0.95, "#cf2924"], [0.65, 0.5, 0.85, 0, 3.65, 2.1, "#f5be32"],
      [0.45, 0.65, 0.45, 0, 3.0, 1.9, "#cf2924"], [0.85, 1.9, 1.25, 0, 2.9, -1.8, "#2c4c3b"],
      ...eyes(0.88, 4.2, 1.4, "#1e1f24", 0.25, 0.38, false, false),
    ],
  },
  {
    id: "chicken-c", kind: "chicken", variant: "C", name: "Speckled Rooster", rarity: "rare", sound: "bird", porterScale: 0.88,
    blurb: "Wakes the courtyard early with a proud dark tail plume.",
    boxes: [
      ...pairX((sx) => [
        [0.38, 1.4, 0.38, sx * 0.62, 0.25, 0.1, "#e89c24"],
        [0.95, 0.28, 1.15, sx * 0.62, 0, 0.35, "#e89c24"],
        [0.48, 1.4, 2.1, sx * 1.4, 2.05, -0.1, "#383634"],
      ]),
      [2.5, 2.2, 3.2, 0, 1.6, 0, "#f5f1e8"], [1.75, 1.85, 1.7, 0, 3.45, 1.15, "#f5f1e8"],
      [0.5, 0.95, 1.35, 0, 5.2, 1.05, "#db2929"], [0.7, 0.55, 0.9, 0, 3.9, 2.2, "#f0b428"],
      [0.5, 0.75, 0.5, 0, 3.2, 2.0, "#db2929"], [0.9, 2.0, 1.2, 0, 3.0, -1.75, "#383634"],
      ...eyes(0.86, 4.4, 1.55, "#19191c", 0.26, 0.38, false, false),
    ],
  },

  // ── Ducks (A, B, C) ──
  {
    id: "duck-a", kind: "duck", variant: "A", name: "Pond Duck", rarity: "common", sound: "duck", porterScale: 0.85,
    blurb: "A white-and-emerald pond duck looking for breadcrumbs.",
    boxes: [
      ...pairX((sx) => [
        [0.36, 1.0, 0.36, sx * 0.65, 0.24, 0, "#e67f22"],
        [1.1, 0.25, 1.25, sx * 0.65, 0, 0.35, "#e67f22"],
        [0.4, 1.2, 2.5, sx * 1.38, 1.6, -0.1, "#c8bfa8"],
      ]),
      [2.5, 1.95, 3.8, 0, 1.2, 0, "#f5f1e8"], [1.75, 1.55, 1.4, 0, 2.45, 1.45, "#f5f1e8"],
      [1.9, 1.75, 1.8, 0, 3.45, 1.65, "#237846"], [1.4, 0.45, 1.2, 0, 3.7, 2.85, "#f2b824"],
      [1.3, 0.8, 0.9, 0, 2.4, -2.1, "#f5f1e8"],
      ...eyes(0.92, 4.35, 2.0, "#191a1d", 0.26, 0.38, false, true),
    ],
  },
  {
    id: "duck-b", kind: "duck", variant: "B", name: "Sunny Duckling", rarity: "special", sound: "duck", porterScale: 0.82,
    blurb: "A bright yellow duckling waddling beside the well.",
    boxes: [
      ...pairX((sx) => [
        [0.36, 1.05, 0.36, sx * 0.65, 0.24, 0, "#e87820"],
        [1.1, 0.25, 1.25, sx * 0.65, 0, 0.35, "#e87820"],
        [0.42, 1.25, 2.5, sx * 1.45, 1.65, -0.1, "#f2dc72"],
      ]),
      [2.6, 2.0, 3.9, 0, 1.2, 0, "#fff29c"], [1.9, 1.8, 1.85, 0, 3.2, 1.55, "#fff29c"],
      [1.5, 0.48, 1.2, 0, 3.45, 2.8, "#f07e22"], [1.2, 0.85, 0.9, 0, 2.45, -2.1, "#fff29c"],
      ...eyes(0.92, 4.1, 1.95, "#1b1c20", 0.28, 0.4, false, false),
    ],
  },
  {
    id: "duck-c", kind: "duck", variant: "C", name: "Mallard Drake", rarity: "rare", sound: "duck", porterScale: 0.86,
    blurb: "A colorful mallard drake with blue wing feathers and white collar.",
    boxes: [
      ...pairX((sx) => [
        [0.36, 1.05, 0.36, sx * 0.65, 0.24, 0, "#e87e22"],
        [1.1, 0.25, 1.25, sx * 0.65, 0, 0.35, "#e87e22"],
        [0.42, 1.2, 2.4, sx * 1.45, 1.6, -0.1, "#3d62a8"],
      ]),
      [2.6, 1.95, 3.8, 0, 1.2, 0, "#9c948c"], [2.1, 1.4, 1.6, 0, 1.95, 1.2, "#753f28"],
      [1.78, 0.45, 1.5, 0, 3.1, 1.45, "#f7f4ec"], [1.9, 1.8, 1.8, 0, 3.5, 1.55, "#1f6e3f"],
      [1.4, 0.45, 1.2, 0, 3.75, 2.75, "#f0c22e"], [0.9, 0.8, 0.9, 0, 2.6, -2.1, "#2f2f35"],
      ...eyes(0.92, 4.4, 1.95, "#191a1d", 0.26, 0.38, false, true),
    ],
  },

  // ── Rabbits (A, B, C) ──
  {
    id: "rabbit-a", kind: "rabbit", variant: "A", name: "Cottontail Bunny", rarity: "common", sound: "pop", porterScale: 0.84,
    blurb: "A gentle bunny with pink inner ears and a fluffy white tail.",
    boxes: [
      ...pairX((sx) => [
        [0.65, 0.45, 1.55, sx * 0.85, 0, -0.45, "#c4bbb0"],
        [0.55, 1.1, 0.55, sx * 0.65, 0, 1.1, "#c4bbb0"],
        [0.55, 2.2, 0.5, sx * 0.62, 4.0, 0.85, "#dcd5c8"],
        [0.28, 1.55, 0.18, sx * 0.62, 4.15, 1.05, "#f2b0bf"],
      ]),
      [2.5, 2.25, 3.4, 0, 0.45, -0.1, "#dcd5c8"], [2.2, 1.95, 2.0, 0, 2.15, 1.15, "#dcd5c8"],
      [0.6, 0.42, 0.25, 0, 2.75, 2.18, "#f08ea6"], [0.95, 0.95, 0.95, 0, 0.9, -1.9, "#ffffff"],
      ...eyes(0.72, 3.25, 2.15, "#231e1f", 0.38, 0.44, false, true),
    ],
  },
  {
    id: "rabbit-b", kind: "rabbit", variant: "B", name: "Lop-Eared Bunny", rarity: "special", sound: "pop", porterScale: 0.84,
    blurb: "A cinnamon lop bunny with soft floppy ears.",
    boxes: [
      ...pairX((sx) => [
        [0.7, 0.45, 1.6, sx * 0.88, 0, -0.45, "#a87a52"],
        [0.55, 1.1, 0.55, sx * 0.68, 0, 1.15, "#a87a52"],
        [0.55, 2.1, 0.75, sx * 1.22, 2.05, 0.95, "#a17249"],
      ]),
      [2.6, 2.35, 3.5, 0, 0.45, -0.1, "#be8f64"], [1.9, 1.4, 1.2, 0, 1.1, 1.3, "#f7f0e6"],
      [2.25, 2.0, 2.05, 0, 2.2, 1.2, "#be8f64"], [0.6, 0.42, 0.25, 0, 2.8, 2.25, "#eb889e"],
      [1.0, 1.0, 1.0, 0, 0.95, -1.95, "#fffcf5"],
      ...eyes(0.72, 3.3, 2.22, "#231c18", 0.4, 0.44, false, true),
    ],
  },
  {
    id: "rabbit-c", kind: "rabbit", variant: "C", name: "Dutch Bunny", rarity: "rare", sound: "pop", porterScale: 0.84,
    blurb: "A crisp black-and-white tuxedo bunny who loves hopping by the roses.",
    boxes: [
      ...pairX((sx) => [
        [0.65, 0.45, 1.5, sx * 0.85, 0, -0.5, "#34353c"],
        [0.55, 1.3, 0.55, sx * 0.65, 0, 1.1, "#f7f5f0"],
        [0.52, 2.2, 0.48, sx * 0.6, 4.15, 0.9, "#34353c"],
      ]),
      [2.5, 2.3, 3.4, 0, 0.6, -0.1, "#34353c"], [2.58, 2.35, 1.45, 0, 0.6, 0.9, "#f7f5f0"],
      [2.2, 1.95, 2.0, 0, 2.3, 1.2, "#34353c"], [0.7, 1.4, 0.3, 0, 2.75, 2.2, "#f7f5f0"],
      [0.55, 0.38, 0.25, 0, 2.85, 2.3, "#f08ea6"], [0.95, 0.95, 0.95, 0, 1.05, -1.9, "#ffffff"],
      ...eyes(0.72, 3.35, 2.18, "#1e1f24", 0.38, 0.44, false, true),
    ],
  },

  // ── Horses (B, C) ──
  {
    id: "horse-b", kind: "horse", variant: "B", name: "Dapple Steed", rarity: "rare", sound: "horse", porterScale: 1.08,
    blurb: "A silver dapple horse wearing a neat leather bridle.",
    boxes: [
      ...legs([-1.1, 1.1], [-2.9, 2.6], 0.88, 3.4, 0.88, "#dcd3c2", "#b8aa96", 0.65),
      [3.4, 3.1, 7.6, 0, 3.4, 0, "#eee8dc"], [3.5, 1.2, 1.6, 0, 4.7, -1.2, "#c8bfb0"],
      [2.1, 3.2, 1.9, 0, 5.2, 2.75, "#eee8dc"], [0.65, 3.5, 1.2, 0, 5.5, 1.7, "#b8afa2"],
      [2.15, 2.2, 2.4, 0, 7.4, 3.8, "#eee8dc"], [1.55, 1.5, 1.7, 0, 7.1, 5.45, "#d8cebe"],
      [2.25, 0.45, 2.6, 0, 7.2, 4.4, "#8a4228"],
      ...pairX((sx) => [[0.48, 1.15, 0.55, sx * 0.75, 9.5, 3.5, "#c8bfb0"]]),
      [0.75, 3.1, 0.95, 0, 3.3, -4.1, "#b8afa2"],
      ...eyes(0.9, 8.65, 4.95, "#231e1b", 0.36, 0.46, false, true),
    ],
  },
  {
    id: "horse-c", kind: "horse", variant: "C", name: "Palomino Pony", rarity: "rare", sound: "horse", porterScale: 1.08,
    blurb: "A golden palomino with white socks and a maroon parish saddle.",
    boxes: [
      ...legs([-1.1, 1.1], [-2.9, 2.6], 0.88, 3.4, 0.88, "#d99d4c", "#423020", 0.65),
      ...[-1.1, 1.1].flatMap((x) => [-2.9, 2.6].map((z) => [0.92, 0.75, 0.92, x, 0.65, z, "#faf5ec"])),
      [3.4, 3.1, 7.6, 0, 3.4, 0, "#d99d4c"], [3.5, 1.9, 2.4, 0, 4.7, -0.4, "#7a3b2e"],
      [2.1, 3.2, 1.9, 0, 5.2, 2.75, "#d99d4c"], [0.65, 3.5, 1.2, 0, 5.5, 1.7, "#faf5ec"],
      [2.15, 2.2, 2.4, 0, 7.4, 3.8, "#d99d4c"], [1.55, 1.5, 1.7, 0, 7.1, 5.45, "#e8b976"],
      ...pairX((sx) => [[0.48, 1.15, 0.55, sx * 0.75, 9.5, 3.5, "#b37b30"]]),
      [0.75, 3.2, 0.95, 0, 3.2, -4.1, "#faf5ec"],
      ...eyes(0.9, 8.65, 4.95, "#241b14", 0.36, 0.46, false, true),
    ],
  },
];

export const variantsOf = (kind) => ANIMAL_VARIANTS.filter((a) => a.kind === kind);
export const animalVariantById = (id) => ANIMAL_VARIANTS.find((a) => a.id === id) ?? null;

/** Build a centered Three.js Group for a sculpted animal variant; optional `fit` caps max footprint (Diorama tiles). */
export function buildAnimalGroup(THREE, variant, { box, mat, basicMat = null, fit = null } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const list = variant?.boxes ?? [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;

  for (const [w, h, d, x, y, z, col, emissive] of list) {
    const m = emissive && basicMat ? basicMat(col) : mat(col);
    const mesh = new THREE.Mesh(box, m);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y + h / 2, z);
    body.add(mesh);
    minX = Math.min(minX, x - w / 2); maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y + h);
    minZ = Math.min(minZ, z - d / 2); maxZ = Math.max(maxZ, z + d / 2);
  }

  const cx = list.length ? (minX + maxX) / 2 : 0;
  const cz = list.length ? (minZ + maxZ) / 2 : 0;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - Math.min(0, minY));
  const spanZ = Math.max(1, maxZ - minZ);
  const scale = fit ? Math.min(1.28, fit / Math.max(spanX, spanZ)) : 1;

  body.position.set(-cx * scale, 0, -cz * scale);
  body.scale.setScalar(scale);
  g.add(body);
  g.userData.frames = [];
  g.userData.scale = variant?.porterScale ?? 1;
  g.userData.bounds = { w: spanX * scale, h: spanY * scale, d: spanZ * scale };
  return g;
}
