// Stickers shared by every app on the same website, for the Sticker World (angelio.org/stickers/),
// where kids place the stickers they've earned in little play scenes.
//
//   localStorage["angelio:stickers"] = { "<app>/<level>": { e: "🦄", big: true, t: 1700000000000 } }
//
// One sticker per level: a mini one when the level had mistakes, giant when it had none.
// A mini sticker grows into a giant one when the level is played again with no mistakes.

const KEY = "angelio:stickers";
export const STICKER_WORLD = "https://angelio.org/stickers/"; // set to "" in your own app to hide the link

export function shareSticker(app, level, e, big) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    const k = `${app}/${level}`, old = all[k];
    all[k] = { e: old?.e ?? e, big: !!(big || old?.big), t: old?.t ?? Date.now() };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage blocked */ }
}

// Parish Bells (angelio:bells): earned across the 5 arcade games to open Prize Boxes in the 3D Voxel Diorama.
export const BELLS_KEY = "angelio:bells";
export const BOX_COST = 100;
export const DIORAMA_WORLD = "https://angelio.org/games/diorama/";

export const bellsForRound = (stars, daily = false) => (stars >= 3 ? 60 : stars >= 2 ? 40 : 25) + (daily ? 25 : 0);

const clampInt = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);

export function loadBells(store = typeof localStorage !== "undefined" ? localStorage : null) {
  try {
    const raw = JSON.parse(store?.getItem(BELLS_KEY) ?? "null") ?? {};
    return { bells: clampInt(raw.bells), earned: clampInt(raw.earned), spent: clampInt(raw.spent) };
  } catch {
    return { bells: 0, earned: 0, spent: 0 };
  }
}

export function awardBells(amount, store = typeof localStorage !== "undefined" ? localStorage : null) {
  const added = Math.max(0, Math.round(Number(amount) || 0));
  const cur = loadBells(store);
  const next = { bells: cur.bells + added, earned: cur.earned + added, spent: cur.spent };
  try { store?.setItem(BELLS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  return { added, ...next, ready: next.bells >= BOX_COST };
}
