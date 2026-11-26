// Catalog for the 3D Voxel Diorama & Prize Box (angelio.org/games/diorama/).
// Pure data module: 30 collectible figurines & church/garden props across 4 categories + 3 tabletop bases.

export const GRID = 8;
export const BOX_COST = 100;

export const CATEGORIES = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "clergy", label: "Clergy", emoji: "⛪" },
  { id: "people", label: "People", emoji: "👨‍👩‍👧" },
  { id: "props", label: "Church", emoji: "🪑" },
  { id: "nature", label: "Garden", emoji: "🌿" },
];

export const BASES = [
  { id: "chapel", name: "Little Chapel", short: "Chapel", emoji: "⛪", say: "The little parish chapel!", sky: "#dbeeff", theme: "warm" },
  { id: "garden", name: "Monastery Garden", short: "Garden", emoji: "🌿", say: "The sunny monastery garden!", sky: "#dff6e8", theme: "garden" },
  { id: "courtyard", name: "Parish Courtyard", short: "Courtyard", emoji: "🏛️", say: "The stone parish courtyard!", sky: "#f4ebd9", theme: "stone" },
];

export const PIECES = [
  // ── Clergy & Servers (8) ──
  {
    id: "server-candle", name: "Candle Server", category: "clergy", rarity: "common", starter: true,
    vox: ["server-candle-idle", "server-idle"],
    look: { hair: "#4a2c1a", skin: "#f6d7b8", eyes: "#3b2414", shirt: "#b02a2a", belt: "#f4efe2", shoes: "#1b1410" },
    blurb: "Carries a bright glowing altar candle.", sound: "chime",
  },
  {
    id: "priest-sunday", name: "Sunday Priest", category: "clergy", rarity: "common",
    vox: ["priest-mass-idle", "priest-idle"], vestment: "#2f8a4c",
    look: { hair: "#2e1d12", skin: "#efc6a0", eyes: "#3b2414", shirt: "#1d1b22", shoes: "#1b1410" },
    blurb: "Ready for Sunday Mass in green vestments.", sound: "chime",
  },
  {
    id: "priest-feast", name: "Blessing Priest", category: "clergy", rarity: "rare",
    vox: ["priest-bless", "priest-mass-idle"], vestment: "#e3b341",
    look: { hair: "#6b4226", skin: "#f6d7b8", eyes: "#2f6db5", shirt: "#1d1b22", shoes: "#1b1410" },
    blurb: "Raises his hand in a joyful feast-day blessing!", sound: "bell",
  },
  {
    id: "priest-eastern", name: "Eastern Priest", category: "clergy", rarity: "rare",
    vox: ["east-priest-cense", "east-priest-phelonion-idle"], vestment: "#c8262f",
    look: { hair: "#4a2c1a", skin: "#e2b085", eyes: "#5a3a1e", shirt: "#2b2135", shoes: "#1b1410" },
    blurb: "Swings a fragrant golden censer for Divine Liturgy.", sound: "bell",
  },
  {
    id: "priest-advent", name: "Advent Priest", category: "clergy", rarity: "special",
    vox: ["east-priest-phelonion-idle", "priest-mass-idle"], vestment: "#6b3fa0",
    look: { hair: "#8f8f8f", skin: "#efc6a0", eyes: "#3f7a4a", shirt: "#1d1b22", shoes: "#1b1410" },
    blurb: "Wears royal purple for Advent and Lent.", sound: "chime",
  },
  {
    id: "server-cross", name: "Cross Server", category: "clergy", rarity: "common",
    vox: ["server-cross-idle", "server-idle"],
    look: { hair: "#1b1410", skin: "#cf9a6c", eyes: "#3b2414", shirt: "#b02a2a", belt: "#f4efe2", shoes: "#1b1410" },
    blurb: "Leads the procession holding the altar cross.", sound: "chime",
  },
  {
    id: "server-ripidion", name: "Ripidion Server", category: "clergy", rarity: "special",
    vox: ["east-server-ripidion-idle", "east-server-cross-idle"],
    look: { hair: "#a8692f", skin: "#f6d7b8", eyes: "#2f6db5", shirt: "#c89b2c", belt: "#f4efe2", shoes: "#4a2c1a" },
    blurb: "Holds a shining Byzantine liturgical fan.", sound: "chime",
  },
  {
    id: "server-taper", name: "Taper Server", category: "clergy", rarity: "special",
    vox: ["server-light", "east-server-light"],
    look: { hair: "#2e1d12", skin: "#e2b085", eyes: "#5a3a1e", shirt: "#b02a2a", belt: "#f4efe2", shoes: "#1b1410" },
    blurb: "Lights the tall altar candles before Mass.", sound: "chime",
  },

  // ── Parish Family & Friends (8) ──
  {
    id: "parish-boy", name: "Parish Boy", category: "people", rarity: "common", starter: true,
    vox: ["child-idle", "child-walk"],
    look: { hair: "#4a2c1a", skin: "#efc6a0", eyes: "#2f6db5", shirt: "#2e5fa8", belt: "#4a2c1a", shoes: "#1b1410" },
    blurb: "Ready to explore the parish!", sound: "pop",
  },
  {
    id: "parish-girl", name: "Parish Girl", category: "people", rarity: "common",
    vox: ["child-girl-idle", "child-girl-walk"],
    look: { hair: "#6b4226", skin: "#f6d7b8", eyes: "#3f7a4a", dress: "#d95b8c", belt: "#f4efe2", shoes: "#4a2c1a" },
    blurb: "Loves ringing the parish bells.", sound: "pop",
  },
  {
    id: "praying-boy", name: "Praying Boy", category: "people", rarity: "common",
    vox: ["child-kneel", "child-idle"],
    look: { hair: "#1b1410", skin: "#cf9a6c", eyes: "#3b2414", shirt: "#2f8a4c", belt: "#4a2c1a", shoes: "#1b1410" },
    blurb: "Kneels quietly to say a prayer.", sound: "pop",
  },
  {
    id: "praying-girl", name: "Praying Girl", category: "people", rarity: "common",
    vox: ["child-girl-kneel", "child-girl-idle"],
    look: { hair: "#a8692f", skin: "#f6d7b8", eyes: "#2f6db5", dress: "#e3b341", belt: "#f4efe2", shoes: "#6b4226" },
    blurb: "Says a gentle prayer by the candles.", sound: "pop",
  },
  {
    id: "parish-dad", name: "Parish Dad", category: "people", rarity: "common",
    vox: ["man-beard-idle", "man-idle"],
    look: { hair: "#4a2c1a", skin: "#e2b085", eyes: "#5a3a1e", shirt: "#1f5a4a", belt: "#1b1410", shoes: "#1b1410" },
    blurb: "Brings the whole family early to church.", sound: "pop",
  },
  {
    id: "parish-mom", name: "Parish Mom", category: "people", rarity: "special",
    vox: ["woman-kneel", "woman-idle"],
    look: { hair: "#2e1d12", skin: "#efc6a0", eyes: "#3b2414", dress: "#3a78b8", belt: "#e3b341", shoes: "#4a2c1a" },
    blurb: "Leads the family rosary at dusk.", sound: "pop",
  },
  {
    id: "parish-grandpa", name: "Grandfather", category: "people", rarity: "special",
    vox: ["grandfather-idle", "grandfather-walk"],
    look: { hair: "#d8d4cc", skin: "#e2b085", eyes: "#5f7180", shirt: "#7a5a3a", belt: "#1b1410", shoes: "#1b1410" },
    blurb: "Knows every parish story by heart.", sound: "pop",
  },
  {
    id: "parish-grandma", name: "Grandmother", category: "people", rarity: "special",
    vox: ["grandmother-idle", "grandmother-walk"],
    look: { hair: "#ece9e2", skin: "#f6d7b8", eyes: "#3f7a4a", dress: "#7b5ca8", belt: "#f4efe2", shoes: "#4a2c1a" },
    blurb: "Bakes warm bread for the parish hall.", sound: "pop",
  },

  // ── Church & Monastery Props (8) ──
  {
    id: "prop-pew", name: "Oak Pew", category: "props", rarity: "common", starter: true,
    vox: ["church-pew", "usher-pew"], procedural: "pew",
    blurb: "A warm oak pew with a little kneeler.", sound: "pop",
  },
  {
    id: "prop-altar", name: "Golden Altar", category: "props", rarity: "rare",
    vox: ["church-roman-altar"], procedural: "altar",
    blurb: "Marble altar with a golden cross and glowing candles.", sound: "bell",
  },
  {
    id: "prop-candle-rack", name: "Candle Rack", category: "props", rarity: "special",
    vox: ["church-votive-rack"], procedural: "candle-rack",
    blurb: "Six shimmering prayer candles on an iron stand.", sound: "chime",
  },
  {
    id: "prop-bell-tower", name: "Bell Arch", category: "props", rarity: "rare",
    vox: ["porter-gatehouse"], procedural: "bell-tower",
    blurb: "Stone bell arch — tap it to swing and ring the golden bell!", sound: "bell",
  },
  {
    id: "prop-monstrance", name: "Monstrance", category: "props", rarity: "rare",
    vox: ["monstrance"], procedural: "monstrance",
    blurb: "A radiant golden monstrance for night adoration.", sound: "bell",
  },
  {
    id: "prop-well", name: "Stone Well", category: "props", rarity: "common",
    vox: ["porter-well"], procedural: "well",
    blurb: "A cool stone well for the monastery courtyard.", sound: "pop",
  },
  {
    id: "prop-lamp", name: "Sanctuary Lamp", category: "props", rarity: "special",
    vox: ["church-sanctuary-lamp"], procedural: "lamp",
    blurb: "The glowing ruby sanctuary lamp that stays lit.", sound: "chime",
  },
  {
    id: "prop-lantern", name: "Path Lantern", category: "props", rarity: "common",
    vox: ["porter-lantern"], procedural: "lantern",
    blurb: "A warm glowing lantern along the stone path.", sound: "chime",
  },

  // ── Garden, Nature & Animals (6) ──
  {
    id: "prop-pine", name: "Evergreen Pine", category: "nature", rarity: "common", starter: true,
    vox: ["diorama-pine"], procedural: "pine",
    blurb: "A tall evergreen pine tree for your diorama.", sound: "pop",
  },
  {
    id: "prop-apple-tree", name: "Apple Tree", category: "nature", rarity: "special",
    vox: ["garden-apple-tree"], procedural: "apple-tree",
    blurb: "An orchard tree dotted with bright red apples.", sound: "pop",
  },
  {
    id: "prop-flowers", name: "Flower Bed", category: "nature", rarity: "common",
    vox: ["diorama-flowers"], procedural: "flowers",
    blurb: "A wooden planter bursting with colorful blossoms.", sound: "pop",
  },
  {
    id: "prop-sheep", name: "Woolly Lamb", category: "nature", rarity: "common",
    vox: ["sheep-idle"], procedural: "sheep",
    blurb: "A woolly little lamb wandering the meadow.", sound: "sheep",
  },
  {
    id: "prop-dog", name: "Parish Pup", category: "nature", rarity: "rare",
    vox: ["dog-idle"], procedural: "dog",
    blurb: "The friendly monastery pup with a wagging tail!", sound: "dog",
  },
  {
    id: "prop-wagon", name: "Harvest Wagon", category: "nature", rarity: "special",
    vox: ["garden-foodbank"], procedural: "wagon",
    blurb: "A harvest cart piled high for the food bank.", sound: "pop",
  },
];

export const STARTER_IDS = PIECES.filter((p) => p.starter).map((p) => p.id);
export const pieceById = (id) => PIECES.find((p) => p.id === id) ?? null;
export const baseById = (id) => BASES.find((b) => b.id === id) ?? null;
