// Sticker World data: the stickers earned in every Angelio game on this site, and the world itself.
// Games save stickers in localStorage "angelio:stickers" (see app-template kit/stickers.js); older
// saves only had them in each game's own progress, so those are copied in once.

export const SHARED = "angelio:stickers";
export const WORLD = "angelio:world";
// Each game's own progress key → a short name.
export const GAMES = { "regroup:v1": "regroup", "snapsplit:v1": "snap", "doubles:v1": "doubles", "grammar:v1": "grammar", "fractions:v1": "fractions", "letters:v1": "letters" };

const read = (store, k, fallback) => { try { return JSON.parse(store.getItem(k) ?? "null") ?? fallback; } catch { return fallback; } };
const write = (store, k, v) => { try { store.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

/** Normalize one saved sticker (plain emoji, { emoji, mini }, or { e, big, id }). "⭐" alone was Doubles' mini sticker. */
export function normalize(s) {
  if (typeof s === "string") return { e: s, big: s !== "⭐" };
  if (s && typeof s === "object") return { e: s.e ?? s.emoji ?? "⭐", big: s.big ?? !s.mini, id: s.id };
  return null;
}

/** All stickers as [{ key, e, big, game }], oldest first. Copies stickers from older saves in once. */
export function loadStickers(store = localStorage) {
  const all = read(store, SHARED, {});
  let changed = false;
  for (const [k, game] of Object.entries(GAMES)) {
    const list = read(store, k, null)?.stickers;
    if (!Array.isArray(list)) continue;
    list.forEach((raw, i) => {
      const s = normalize(raw);
      if (!s) return;
      const key = `${game}/${s.id ?? `old-${i}`}`;
      if (!all[key]) { all[key] = { e: s.e, big: s.big, t: i }; changed = true; }
      else if (s.big && !all[key].big) { all[key].big = true; changed = true; }
    });
  }
  if (changed) write(store, SHARED, all);
  return Object.entries(all)
    .map(([key, v]) => ({ key, e: v.e, big: !!v.big, game: key.split("/")[0], t: v.t ?? 0 }))
    .sort((a, b) => a.t - b.t);
}

export const pointsFor = (stickers) => stickers.reduce((n, s) => n + (s.big ? 2 : 1), 0);

export function loadWorld(store = localStorage) {
  const w = read(store, WORLD, {});
  return { scene: w.scene ?? "meadow", placed: w.placed ?? {}, seenPoints: w.seenPoints ?? 0 };
}
export const saveWorld = (w, store = localStorage) => write(store, WORLD, w);
