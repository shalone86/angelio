// How each person looks: his models are painted with fixed MARKER colors (his rule, Nov 2026), and every person in
// the game gets their own hair, skin and eyes, so a model is a kind of person, not one person.
//   hair #255359 · eyes #0b346e · skin #fad689
//   a priest's vestments, the season's color: the Roman chasuble #ff77a8, the Byzantine phelonion #ffcc66
// Only priests' vestments change with the season; altar servers keep their robes as he painted them.
// He uses these colors for nothing else. Pure, tested (test/looks.test.js). The video workshop has the same markers
// (workshop/video/voxel-draw.js), where he picks each one by hand instead.

export const MARK = { hair: "#255359", eyes: "#0b346e", skin: "#fad689", chasuble: "#ff77a8", phelonion: "#ffcc66" };
/** Is this model a priest (whose vestments follow the season)? */
export const isPriest = (name) => /^(east-)?priest-/.test(name);

export const HAIR = ["#1b1410", "#2e1d12", "#4a2c1a", "#6b4226", "#8a3b1e", "#a8692f", "#d9b25f", "#e8cf8a"];
export const GRAY_HAIR = ["#8f8f8f", "#b3b0aa", "#d8d4cc", "#ece9e2"];
export const SKIN = ["#f6d7b8", "#efc6a0", "#e2b085", "#cf9a6c", "#b97f55", "#9a6442", "#7a4c31", "#5a3622"];
export const EYES = ["#3b2414", "#5a3a1e", "#2a1a10", "#2f6db5", "#3f7a4a", "#7a5a2a", "#5f7180"];

const pick = (list, r) => list[Math.floor(r() * list.length) % list.length];
/** A random look; `older` gives gray or white hair. */
export const randomLook = (r = Math.random, { older = false } = {}) => ({ hair: pick(older ? GRAY_HAIR : HAIR, r), skin: pick(SKIN, r), eyes: pick(EYES, r) });

/** The color a model's voxel is drawn in: a marker becomes that person's color; a priest's vestments (`vestment`,
 * given only for priests) the season's. */
export function recolor(hex, look, vestment) {
  const h = String(hex).toLowerCase();
  if (h === MARK.chasuble || h === MARK.phelonion) return vestment ?? hex;
  if (look && h === MARK.hair) return look.hair;
  if (look && h === MARK.skin) return look.skin;
  if (look && h === MARK.eyes) return look.eyes;
  return hex;
}
