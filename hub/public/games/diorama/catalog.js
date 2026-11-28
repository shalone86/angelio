// Catalog for the 3D Voxel Diorama & Prize Box (angelio.org/games/diorama/).
// Pure data module: 54 collectible figurines/props, 14 unlockable 3D worlds, and Studio scene merge helpers.

import { ANIMAL_VARIANTS } from "./animals.js";

export const GRID = 8;
export const BOX_COST = 100;

export const CATEGORIES = [
  { id: "all", label: "All", emoji: "✨" },
  { id: "clergy", label: "Clergy", emoji: "⛪" },
  { id: "people", label: "People", emoji: "👨‍👩‍👧" },
  { id: "props", label: "Church", emoji: "🪑" },
  { id: "nature", label: "Garden", emoji: "🌿" },
  { id: "animals", label: "Animals", emoji: "🐾" },
];

export const STYLE_OPTIONS = [
  { id: "chapel", label: "Chapel aisle & stained glass" },
  { id: "garden", label: "Garden path & cobble rim" },
  { id: "courtyard", label: "Courtyard pillars" },
  { id: "byzantine", label: "Byzantine iconostasis" },
  { id: "meadow", label: "Brook & wooden fence" },
  { id: "hall", label: "Cozy fireplace & bunting" },
  { id: "snow", label: "Snowy chapel & star" },
  { id: "hilltop", label: "Hilltop grotto & clouds" },
  { id: "moon", label: "Lunar ridge & voxel Earth" },
  { id: "clouds", label: "Fluffy clouds & rainbow" },
  { id: "cabin", label: "Log cabin, pines & stream" },
  { id: "suburb", label: "Neighborhood houses & fence" },
  { id: "fuji", label: "Mount Fuji, Torii gate & sakura" },
  { id: "islands", label: "Ocean surf, palms & volcano" },
  { id: "plain", label: "Plain tabletop only" },
];

const VALID_STYLES = new Set(STYLE_OPTIONS.map((s) => s.id));
const HEX6 = /^#[0-9a-f]{6}$/i;

const baseDef = ({ id, name, short, emoji, starter = false, rarity = "special", say, blurb, style, backdropSlug, palette }) => ({
  id,
  name,
  short: short ?? name,
  emoji,
  starter,
  rarity,
  say,
  blurb,
  backdropSlug: backdropSlug ?? `diorama-bg-${id}`,
  style: VALID_STYLES.has(style) ? style : "plain",
  palette,
});

export const BASES = [
  baseDef({
    id: "chapel", name: "Little Chapel", short: "Chapel", emoji: "⛪", starter: true, rarity: "common",
    say: "The little parish chapel!",
    blurb: "Sunlight streams through colorful stained-glass windows.",
    style: "chapel",
    palette: { sky: "#dbeeff", slab: "#b59d7e", rim: "#8a6745", tileA: "#efe4cf", tileB: "#e4d5ba", accent: "#b2323b" },
  }),
  baseDef({
    id: "garden", name: "Monastery Garden", short: "Garden", emoji: "🌿", rarity: "special",
    say: "The sunny monastery garden!",
    blurb: "Mossy stone walls and stepping stones through soft grass.",
    style: "garden",
    palette: { sky: "#dff6e8", slab: "#73583a", rim: "#7c887d", tileA: "#76b960", tileB: "#68ab53", accent: "#c7c0b0" },
  }),
  baseDef({
    id: "courtyard", name: "Parish Courtyard", short: "Courtyard", emoji: "🏛️", rarity: "special",
    say: "The stone parish courtyard!",
    blurb: "Warm sandstone flagstones framed by quiet colonnade pillars.",
    style: "courtyard",
    palette: { sky: "#f4ebd9", slab: "#8f857a", rim: "#a59b8e", tileA: "#ddd0b8", tileB: "#cfbfa3", accent: "#d8cebe" },
  }),
  baseDef({
    id: "byzantine", name: "Byzantine Church", short: "Byzantine", emoji: "☦️", rarity: "rare",
    say: "The golden Byzantine church!",
    blurb: "A shining golden iconostasis with Royal Doors and icons.",
    style: "byzantine",
    palette: { sky: "#272348", slab: "#6f4928", rim: "#d4a438", tileA: "#eee0c6", tileB: "#dfc8a2", accent: "#c8262f" },
  }),
  baseDef({
    id: "meadow", name: "Shepherd's Meadow", short: "Meadow", emoji: "🐑", rarity: "special",
    say: "Shepherd's sunny meadow!",
    blurb: "A sparkling blue brook and split-rail fence for flocks.",
    style: "meadow",
    palette: { sky: "#cfefff", slab: "#745435", rim: "#6f9a4b", tileA: "#8ed06c", tileB: "#7ec25d", accent: "#429ae0" },
  }),
  baseDef({
    id: "hall", name: "Parish Hall", short: "Hall", emoji: "🥖", rarity: "special",
    say: "Welcome to the parish hall!",
    blurb: "Warm floorboards, a glowing brick hearth, and festive bunting.",
    style: "hall",
    palette: { sky: "#fce8d2", slab: "#694127", rim: "#8a5632", tileA: "#d5a36e", tileB: "#c5925d", accent: "#c94c38" },
  }),
  baseDef({
    id: "snow", name: "Midnight Christmas", short: "Christmas", emoji: "❄️", rarity: "rare",
    say: "Silent night under the Christmas star!",
    blurb: "Soft snow, warm church windows, and a shining golden star.",
    style: "snow",
    palette: { sky: "#121a3a", slab: "#5f708f", rim: "#e2edf8", tileA: "#f5f9ff", tileB: "#e3eefc", accent: "#ffd24c" },
  }),
  baseDef({
    id: "hilltop", name: "Hilltop Shrine", short: "Shrine", emoji: "⛰️", rarity: "rare",
    say: "High on the hillside shrine!",
    blurb: "A peaceful stone grotto perched above drifting morning clouds.",
    style: "hilltop",
    palette: { sky: "#b8deff", slab: "#736b62", rim: "#91897e", tileA: "#9ec46c", tileB: "#8fb55f", accent: "#6aa8d8" },
  }),
  baseDef({
    id: "moon", name: "The Moon", short: "The Moon", emoji: "🌙", rarity: "rare",
    say: "Walking on the quiet Moon!",
    blurb: "Silver dust craters with planet Earth glowing in deep space.",
    style: "moon",
    palette: { sky: "#0b1024", slab: "#52586a", rim: "#7c8498", tileA: "#b9c0cf", tileB: "#a8b0c0", accent: "#3988e0" },
  }),
  baseDef({
    id: "clouds", name: "Cloud Kingdom", short: "Clouds", emoji: "☁️", rarity: "rare",
    say: "Floating high in the clouds!",
    blurb: "Soft sky-pillows floating beneath a bright seven-color rainbow.",
    style: "clouds",
    palette: { sky: "#82c8ff", slab: "#8fb7e8", rim: "#dbeaff", tileA: "#ffffff", tileB: "#eef6ff", accent: "#ff7a8a" },
  }),
  baseDef({
    id: "cabin", name: "Woodland Cabin", short: "Cabin", emoji: "🪵", rarity: "special",
    say: "Cozy cabin in the woods!",
    blurb: "Tall evergreens, a cool forest stream, and a warm log cabin.",
    style: "cabin",
    palette: { sky: "#c6e7da", slab: "#543b24", rim: "#487344", tileA: "#689b55", tileB: "#5a8c49", accent: "#3b95d9" },
  }),
  baseDef({
    id: "suburb", name: "Sunny Suburb", short: "Suburb", emoji: "🏡", rarity: "special",
    say: "Welcome to the sunny neighborhood!",
    blurb: "Green lawns, a clean front sidewalk, white picket fence, and homes.",
    style: "suburb",
    palette: { sky: "#d6efff", slab: "#68707a", rim: "#a9b2bc", tileA: "#81c662", tileB: "#72b755", accent: "#d85748" },
  }),
  baseDef({
    id: "fuji", name: "Mount Fuji", short: "Mt. Fuji", emoji: "🗻", rarity: "rare",
    say: "Greetings from Mount Fuji!",
    blurb: "Cherry blossoms, a red Torii gate, and snow-capped Mount Fuji.",
    style: "fuji",
    palette: { sky: "#ffdff0", slab: "#737a87", rim: "#a5acb8", tileA: "#9ec974", tileB: "#8ebe65", accent: "#d93535" },
  }),
  baseDef({
    id: "islands", name: "Tropical Islands", short: "Islands", emoji: "🏝️", rarity: "rare",
    say: "Aloha from the sunny islands!",
    blurb: "Golden sand beside turquoise surf, palms, and a distant island.",
    style: "islands",
    palette: { sky: "#a9e8ff", slab: "#1d8eb8", rim: "#33b7d9", tileA: "#f6df9b", tileB: "#eed285", accent: "#27b8c9" },
  }),
];

export const DEFAULT_BASES = BASES;
export const STARTER_BASE_IDS = BASES.filter((b) => b.starter).map((b) => b.id);

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
    id: "prop-wagon", name: "Harvest Wagon", category: "nature", rarity: "special",
    vox: ["garden-foodbank"], procedural: "wagon",
    blurb: "A harvest cart piled high for the food bank.", sound: "pop",
  },

  // ── Parish & Monastery Animals (26 sculpted variants) ──
  {
    id: "prop-sheep", name: "Woolly Lamb", category: "animals", rarity: "common",
    vox: ["sheep-idle"], animal: "sheep-a", procedural: "sheep",
    blurb: "A woolly little lamb wandering the meadow.", sound: "sheep",
  },
  {
    id: "prop-dog", name: "Parish Pup", category: "animals", rarity: "rare",
    vox: ["dog-idle"], animal: "dog-a", procedural: "dog",
    blurb: "The friendly monastery pup with floppy ears and a wagging tail!", sound: "dog",
  },
  ...ANIMAL_VARIANTS.filter((a) => a.id !== "sheep-a" && a.id !== "dog-a").map((a) => ({
    id: `animal-${a.id}`,
    name: a.name,
    category: "animals",
    rarity: a.rarity,
    vox: [`${a.kind}-idle`],
    animal: a.id,
    blurb: a.blurb,
    sound: a.sound,
  })),
];

export const STARTER_IDS = PIECES.filter((p) => p.starter).map((p) => p.id);
export const pieceById = (id) => PIECES.find((p) => p.id === id) ?? null;
export const baseById = (id, bases = BASES) => bases.find((b) => b.id === id) ?? null;

const slugify = (v) => String(v ?? "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const cleanHex = (v, fb) => (HEX6.test(String(v ?? "").trim()) ? String(v).trim().toLowerCase() : fb);

/** Sanitize a custom Studio scene definition; returns null if invalid. Shared by Worker & client. */
export function cleanScene(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = slugify(raw.id || raw.name);
  if (!id) return null;
  const fallback = BASES.find((b) => b.id === id) ?? BASES[0];
  const name = String(raw.name ?? fallback.name ?? id).trim().slice(0, 40) || id;
  const short = String(raw.short ?? name).trim().slice(0, 16) || name.slice(0, 16);
  const emoji = String(raw.emoji ?? fallback.emoji ?? "🧱").trim().slice(0, 8) || "🧱";
  const rarity = ["common", "special", "rare"].includes(raw.rarity) ? raw.rarity : "special";
  const style = VALID_STYLES.has(raw.style) ? raw.style : (BASES.some((b) => b.id === id) ? id : "plain");
  const backdropSlug = slugify(raw.backdropSlug) || `diorama-bg-${id}`;
  const say = String(raw.say ?? `${name}!`).trim().slice(0, 120) || `${name}!`;
  const blurb = String(raw.blurb ?? `Custom ${name} scene from the Studio.`).trim().slice(0, 160);
  const p = raw.palette ?? {};
  const fbPal = fallback.palette;
  const palette = {
    sky: cleanHex(p.sky, fbPal.sky),
    slab: cleanHex(p.slab, fbPal.slab),
    rim: cleanHex(p.rim, fbPal.rim),
    tileA: cleanHex(p.tileA, fbPal.tileA),
    tileB: cleanHex(p.tileB, fbPal.tileB),
    accent: cleanHex(p.accent, fbPal.accent),
  };
  return { id, name, short, emoji, starter: !!raw.starter, rarity, say, blurb, backdropSlug, style, palette };
}

/** Merge Studio-saved scenes over built-in worlds (matching IDs replace in place; new IDs append). */
export function mergeBases(builtIn = BASES, custom = []) {
  const out = builtIn.map((b) => ({ ...b, palette: { ...b.palette } }));
  const index = new Map(out.map((b, i) => [b.id, i]));
  for (const raw of Array.isArray(custom) ? custom : []) {
    const clean = cleanScene(raw);
    if (!clean) continue;
    if (index.has(clean.id)) out[index.get(clean.id)] = clean;
    else {
      index.set(clean.id, out.length);
      out.push(clean);
    }
  }
  return out;
}
