// Saved progress and pure board helpers for the 3D Voxel Diorama & Prize Box.
// Pure ES module with injectable `store` (localStorage-compatible) so unit tests run cleanly in Node.

import { GRID, BOX_COST, BASES, PIECES, STARTER_IDS, pieceById, baseById } from "./catalog.js";

export const BELLS_KEY = "angelio:bells";
export const DIORAMA_KEY = "angelio:diorama";

const RARITY_WEIGHT = { common: 4, special: 3, rare: 2 };
const clampInt = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
const getStore = (store) => store ?? (typeof localStorage !== "undefined" ? localStorage : null);

export function loadBells(store = null) {
  const s = getStore(store);
  try {
    const raw = JSON.parse(s?.getItem(BELLS_KEY) ?? "null") ?? {};
    return { bells: clampInt(raw.bells), earned: clampInt(raw.earned), spent: clampInt(raw.spent) };
  } catch {
    return { bells: 0, earned: 0, spent: 0 };
  }
}

export function saveBells(b, store = null) {
  const s = getStore(store);
  const clean = { bells: clampInt(b?.bells), earned: clampInt(b?.earned), spent: clampInt(b?.spent) };
  try { s?.setItem(BELLS_KEY, JSON.stringify(clean)); } catch { /* storage blocked */ }
  return clean;
}

export function defaultDiorama() {
  return {
    version: 1,
    unlocked: [...STARTER_IDS],
    welcomeClaimed: false,
    base: "chapel",
    placed: {
      chapel: [
        { uid: "s1", id: "prop-pew", gx: 2, gz: 4, rot: 0 },
        { uid: "s2", id: "server-candle", gx: 4, gz: 2, rot: 0 },
        { uid: "s3", id: "parish-boy", gx: 5, gz: 4, rot: 3 },
      ],
      garden: [],
      courtyard: [],
    },
  };
}

export function loadDiorama(store = null) {
  const s = getStore(store);
  let raw = null;
  try {
    raw = JSON.parse(s?.getItem(DIORAMA_KEY) ?? "null");
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== "object") return defaultDiorama();

  const unlockedSet = new Set(STARTER_IDS);
  if (Array.isArray(raw.unlocked)) {
    for (const id of raw.unlocked) if (pieceById(id)) unlockedSet.add(id);
  }
  const base = baseById(raw.base)?.id ?? "chapel";
  const placed = {};
  const seenUids = new Set();

  for (const b of BASES) {
    const list = Array.isArray(raw.placed?.[b.id]) ? raw.placed[b.id] : [];
    const seenTiles = new Set();
    placed[b.id] = [];
    for (const item of list) {
      if (!item || typeof item !== "object" || !unlockedSet.has(item.id)) continue;
      const gx = Number(item.gx), gz = Number(item.gz);
      if (!Number.isInteger(gx) || !Number.isInteger(gz) || gx < 0 || gx >= GRID || gz < 0 || gz >= GRID) continue;
      const tk = `${gx},${gz}`;
      if (seenTiles.has(tk)) continue;
      seenTiles.add(tk);
      let uid = String(item.uid || "").trim();
      if (!uid || seenUids.has(uid)) uid = `p-${b.id[0]}-${gx}-${gz}-${seenUids.size + 1}`;
      seenUids.add(uid);
      const rot = (((Number(item.rot) || 0) % 4) + 4) % 4;
      placed[b.id].push({ uid, id: item.id, gx, gz, rot: Math.floor(rot) });
    }
  }

  return {
    version: 1,
    unlocked: [...unlockedSet],
    welcomeClaimed: !!raw.welcomeClaimed,
    base,
    placed,
  };
}

export function saveDiorama(state, store = null) {
  const s = getStore(store);
  try { s?.setItem(DIORAMA_KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  return state;
}

export const lockedPieces = (state) => {
  const owned = new Set(state?.unlocked ?? []);
  return PIECES.filter((p) => !owned.has(p.id));
};

export function canOpenBox(bellsState, dioramaState) {
  const locked = lockedPieces(dioramaState);
  if (!locked.length) return { ok: false, free: false, cost: BOX_COST, remaining: 0, need: 0, reason: "complete" };
  if (!dioramaState?.welcomeClaimed) return { ok: true, free: true, cost: 0, remaining: locked.length, need: 0, reason: "welcome" };
  const bells = clampInt(bellsState?.bells);
  if (bells >= BOX_COST) return { ok: true, free: false, cost: BOX_COST, remaining: locked.length, need: 0, reason: "bells" };
  return { ok: false, free: false, cost: BOX_COST, remaining: locked.length, need: BOX_COST - bells, reason: "need-bells" };
}

const clonePlaced = (placed) => {
  const out = {};
  for (const b of BASES) out[b.id] = (placed?.[b.id] ?? []).map((x) => ({ ...x }));
  return out;
};

export function openPrizeBox(bellsState, dioramaState, rng = Math.random) {
  const check = canOpenBox(bellsState, dioramaState);
  if (!check.ok) return { ok: false, reason: check.reason, need: check.need };

  const locked = lockedPieces(dioramaState);
  const total = locked.reduce((sum, p) => sum + (RARITY_WEIGHT[p.rarity] ?? 2), 0);
  let roll = Math.max(0, Math.min(0.999999999, Number(rng()))) * total;
  let picked = locked[locked.length - 1];
  for (const p of locked) {
    roll -= RARITY_WEIGHT[p.rarity] ?? 2;
    if (roll <= 0) { picked = p; break; }
  }

  const nextBells = check.free
    ? { bells: clampInt(bellsState?.bells), earned: clampInt(bellsState?.earned), spent: clampInt(bellsState?.spent) }
    : { bells: clampInt(bellsState?.bells) - BOX_COST, earned: clampInt(bellsState?.earned), spent: clampInt(bellsState?.spent) + BOX_COST };

  const nextDiorama = {
    version: 1,
    unlocked: [...dioramaState.unlocked, picked.id],
    welcomeClaimed: true,
    base: dioramaState.base,
    placed: clonePlaced(dioramaState.placed),
  };

  return { ok: true, piece: picked, free: check.free, bells: nextBells, diorama: nextDiorama, remaining: locked.length - 1 };
}

const validTile = (gx, gz) => Number.isInteger(gx) && Number.isInteger(gz) && gx >= 0 && gx < GRID && gz >= 0 && gz < GRID;

export function placePiece(state, baseId, pieceId, gx, gz, rot = 0) {
  if (!baseById(baseId)) return { ok: false, diorama: state, reason: "bad-base" };
  if (!pieceById(pieceId) || !state.unlocked.includes(pieceId)) return { ok: false, diorama: state, reason: "locked" };
  if (!validTile(gx, gz)) return { ok: false, diorama: state, reason: "out-of-bounds" };

  const list = state.placed?.[baseId] ?? [];
  if (list.some((x) => x.gx === gx && x.gz === gz)) return { ok: false, diorama: state, reason: "occupied" };

  const existingUids = new Set(BASES.flatMap((b) => (state.placed?.[b.id] ?? []).map((x) => x.uid)));
  let uid = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  while (existingUids.has(uid)) uid += "x";

  const cleanRot = (((Math.floor(Number(rot) || 0)) % 4) + 4) % 4;
  const item = { uid, id: pieceId, gx, gz, rot: cleanRot };
  const placed = clonePlaced(state.placed);
  placed[baseId].push(item);

  return { ok: true, diorama: { ...state, placed }, item };
}

export function movePiece(state, baseId, uid, gx, gz) {
  if (!baseById(baseId)) return { ok: false, diorama: state, reason: "bad-base" };
  if (!validTile(gx, gz)) return { ok: false, diorama: state, reason: "out-of-bounds" };
  const list = state.placed?.[baseId] ?? [];
  const idx = list.findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, diorama: state, reason: "missing" };
  if (list.some((x) => x.uid !== uid && x.gx === gx && x.gz === gz)) return { ok: false, diorama: state, reason: "occupied" };

  const placed = clonePlaced(state.placed);
  const item = { ...placed[baseId][idx], gx, gz };
  placed[baseId][idx] = item;
  return { ok: true, diorama: { ...state, placed }, item };
}

export function rotatePiece(state, baseId, uid, delta = 1) {
  if (!baseById(baseId)) return { ok: false, diorama: state, reason: "bad-base" };
  const list = state.placed?.[baseId] ?? [];
  const idx = list.findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, diorama: state, reason: "missing" };

  const placed = clonePlaced(state.placed);
  const rot = (((placed[baseId][idx].rot + Math.floor(Number(delta) || 0)) % 4) + 4) % 4;
  const item = { ...placed[baseId][idx], rot };
  placed[baseId][idx] = item;
  return { ok: true, diorama: { ...state, placed }, item };
}

export function removePiece(state, baseId, uid) {
  if (!baseById(baseId)) return { ok: false, diorama: state, reason: "bad-base" };
  const list = state.placed?.[baseId] ?? [];
  if (!list.some((x) => x.uid === uid)) return { ok: false, diorama: state, reason: "missing" };

  const placed = clonePlaced(state.placed);
  placed[baseId] = placed[baseId].filter((x) => x.uid !== uid);
  return { ok: true, diorama: { ...state, placed } };
}

export function clearBase(state, baseId) {
  if (!baseById(baseId)) return { ok: false, diorama: state, reason: "bad-base" };
  const placed = clonePlaced(state.placed);
  placed[baseId] = [];
  return { ok: true, diorama: { ...state, placed } };
}

export function setBase(state, baseId) {
  if (!baseById(baseId)) return { ok: false, diorama: state, reason: "bad-base" };
  return { ok: true, diorama: { ...state, base: baseId } };
}
