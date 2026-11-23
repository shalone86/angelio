// A copy of apps/candles/public/js/looks.js (test/copies.test.js keeps them the same).
// How each person looks: his models are painted with fixed MARKER colors (his rule, Nov 2026), and every person in
// the game gets their own colors, so a model is a kind of person, not one person.
//   everyone:          hair #255359 · eyes #0066ff (or #0b346e) · skin #cccc99 (or #fad689)
//   people who pray:   shirt #ffcc99 · dress #ff9966 · belt #ff9999 · shoes #ffcccc
//   a priest's vestments, the season's color: the Roman chasuble #ff77a8, the Byzantine phelonion #ffcc66
// Only priests' vestments change with the season; altar servers keep their robes as he painted them. (Skin and eyes
// have two colors each: he named #fad689 and #0b346e, and his palette from Nov 22 paints them #cccc99 and #0066ff.)
// He uses these colors for nothing else. Pure, tested (test/looks.test.js). The video workshop has the same markers
// (workshop/video/voxel-draw.js), where he picks each one by hand instead.

export const MARK = {
  hair: ["#255359"], eyes: ["#0066ff", "#0b346e"], skin: ["#cccc99", "#fad689"],
  shirt: ["#ffcc99"], dress: ["#ff9966"], belt: ["#ff9999"], shoes: ["#ffcccc"],
  chasuble: ["#ff77a8"], phelonion: ["#ffcc66"],
};
/** Is this model a priest (whose vestments follow the season)? */
export const isPriest = (name) => /^(east-)?priest-/.test(name);

export const HAIR = ["#1b1410", "#2e1d12", "#4a2c1a", "#6b4226", "#8a3b1e", "#a8692f", "#d9b25f", "#e8cf8a"];
export const GRAY_HAIR = ["#8f8f8f", "#b3b0aa", "#d8d4cc", "#ece9e2"];
export const SKIN = ["#f6d7b8", "#efc6a0", "#e2b085", "#cf9a6c", "#b97f55", "#9a6442", "#7a4c31", "#5a3622"];
export const EYES = ["#3b2414", "#5a3a1e", "#2a1a10", "#2f6db5", "#3f7a4a", "#7a5a2a", "#5f7180"];
// Sunday clothes: bright and plain colors that read well small
export const CLOTHES = ["#c8262f", "#2e5fa8", "#2f8a4c", "#e3b341", "#f4efe2", "#6b3fa0", "#e07a2e", "#1f3a5f", "#2a8a8a", "#e58fb3", "#7a5a3a", "#3a3a40"];
export const BELTS = ["#4a2c1a", "#1b1410", "#a8692f", "#f4efe2", "#c8262f", "#2e5fa8"];
export const SHOES = ["#1b1410", "#4a2c1a", "#6b4226", "#f4efe2", "#1f3a5f", "#c8262f"];

const pick = (list, r) => list[Math.floor(r() * list.length) % list.length];
/** A random look; `older` gives gray or white hair; `clothes` (people who come to pray) also picks their clothes. */
export function randomLook(r = Math.random, { older = false, clothes = false } = {}) {
  const look = { hair: pick(older ? GRAY_HAIR : HAIR, r), skin: pick(SKIN, r), eyes: pick(EYES, r) };
  if (clothes) Object.assign(look, { shirt: pick(CLOTHES, r), dress: pick(CLOTHES, r), belt: pick(BELTS, r), shoes: pick(SHOES, r) });
  return look;
}

const OF = new Map(Object.entries(MARK).flatMap(([part, hexes]) => hexes.map((h) => [h, part])));
/** The color a model's voxel is drawn in: a marker becomes that person's color; a priest's vestments (`vestment`,
 * given only for priests) the season's. */
export function recolor(hex, look, vestment) {
  const part = OF.get(String(hex).toLowerCase());
  if (!part) return hex;
  if (part === "chasuble" || part === "phelonion") return vestment ?? hex;
  return look?.[part] ?? hex;
}
