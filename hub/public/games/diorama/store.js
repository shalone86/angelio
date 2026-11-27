// Saved progress and pure board helpers for the 3D Voxel Diorama & Prize Box.
// Pure ES module with injectable `store` (localStorage-compatible) so unit tests run cleanly in Node.

import { GRID, BOX_COST, BASES, PIECES, STARTER_IDS, pieceById, baseById } from "./catalog.js";

export const BELLS_KEY = "angelio:bells";
export const DIORAMA_KEY = "angelio:diorama";

const PIECE_WEIGHT = { common: 4, special: 3, rare: 2 };
const BASE_WEIGHT = { common: 4, special: 4, rare: 3 };
const clampInt = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
const getStore = (store) => store ?? (typeof localStorage !== "undefined" ? localStorage : null);
const starterBases = (bases) => {
  const starters = bases.filter((b) => b.starter).map((b) => b.id);
  return starters.length ? starters : [bases[0]?.id ?? "chapel"];
};

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

export function defaultDiorama(bases = BASES) {
  const unlockedBases = starterBases(bases);
  const placed = {};
  for (const b of bases) placed[b.id] = [];
  if (placed.chapel) {
    placed.chapel = [
      { uid: "s1", id: "prop-pew", gx: 2, gz: 4, rot: 0 },
      { uid: "s2", id: "server-candle", gx: 4, gz: 2, rot: 0 },
      { uid: "s3", id: "parish-boy", gx: 5, gz: 4, rot: 3 },
    ];
  }
  return {
    version: 2,
    unlocked: [...STARTER_IDS],
    unlockedBases,
    welcomeClaimed: false,
    base: unlockedBases[0],
    placed,
  };
}

export function loadDiorama(store = null, bases = BASES) {
  const s = getStore(store);
  let raw = null;
  try {
    raw = JSON.parse(s?.getItem(DIORAMA_KEY) ?? "null");
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== "object") return defaultDiorama(bases);

  const unlockedSet = new Set(STARTER_IDS);
  if (Array.isArray(raw.unlocked)) {
    for (const id of raw.unlocked) if (pieceById(id)) unlockedSet.add(id);
  }

  const starters = starterBases(bases);
  const unlockedBaseSet = new Set(starters);
  if (Array.isArray(raw.unlockedBases)) {
    for (const bid of raw.unlockedBases) if (baseById(bid, bases)) unlockedBaseSet.add(bid);
  } else {
    // v1 migration: keep any base unlocked that already holds placed items so no child build is lost.
    for (const b of bases) {
      if (Array.isArray(raw.placed?.[b.id]) && raw.placed[b.id].length > 0) unlockedBaseSet.add(b.id);
    }
  }

  const placed = {};
  const seenUids = new Set();

  for (const b of bases) {
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
  // Preserve placed items for any saved custom Studio base temporarily absent (e.g. offline first load)
  if (raw.placed && typeof raw.placed === "object") {
    for (const [k, list] of Object.entries(raw.placed)) {
      if (!(k in placed) && Array.isArray(list)) placed[k] = list.map((x) => ({ ...x }));
    }
  }

  const base = unlockedBaseSet.has(raw.base) ? raw.base : starters[0];

  return {
    version: 2,
    unlocked: [...unlockedSet],
    unlockedBases: [...unlockedBaseSet],
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

export const lockedBases = (state, bases = BASES) => {
  const owned = new Set(state?.unlockedBases ?? starterBases(bases));
  return bases.filter((b) => !owned.has(b.id));
};

export const lockedRewards = (state, bases = BASES) => [
  ...lockedPieces(state).map((p) => ({ kind: "piece", item: p, weight: PIECE_WEIGHT[p.rarity] ?? 2 })),
  ...lockedBases(state, bases).map((b) => ({ kind: "base", item: b, weight: BASE_WEIGHT[b.rarity] ?? 3 })),
];

export function canOpenBox(bellsState, dioramaState, bases = BASES) {
  const rewards = lockedRewards(dioramaState, bases);
  if (!rewards.length) return { ok: false, free: false, cost: BOX_COST, remaining: 0, need: 0, reason: "complete" };
  if (!dioramaState?.welcomeClaimed) return { ok: true, free: true, cost: 0, remaining: rewards.length, need: 0, reason: "welcome" };
  const bells = clampInt(bellsState?.bells);
  if (bells >= BOX_COST) return { ok: true, free: false, cost: BOX_COST, remaining: rewards.length, need: 0, reason: "bells" };
  return { ok: false, free: false, cost: BOX_COST, remaining: rewards.length, need: BOX_COST - bells, reason: "need-bells" };
}

const clonePlaced = (placed, bases = BASES) => {
  const out = {};
  for (const b of bases) out[b.id] = (placed?.[b.id] ?? []).map((x) => ({ ...x }));
  for (const [k, list] of Object.entries(placed ?? {})) {
    if (!(k in out) && Array.isArray(list)) out[k] = list.map((x) => ({ ...x }));
  }
  return out;
};

export function openPrizeBox(bellsState, dioramaState, rng = Math.random, bases = BASES) {
  const check = canOpenBox(bellsState, dioramaState, bases);
  if (!check.ok) return { ok: false, reason: check.reason, need: check.need };

  const rewards = lockedRewards(dioramaState, bases);
  const total = rewards.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.max(0, Math.min(0.999999999, Number(rng()))) * total;
  let picked = rewards[rewards.length - 1];
  for (const r of rewards) {
    roll -= r.weight;
    if (roll <= 0) { picked = r; break; }
  }

  const nextBells = check.free
    ? { bells: clampInt(bellsState?.bells), earned: clampInt(bellsState?.earned), spent: clampInt(bellsState?.spent) }
    : { bells: clampInt(bellsState?.bells) - BOX_COST, earned: clampInt(bellsState?.earned), spent: clampInt(bellsState?.spent) + BOX_COST };

  const placed = clonePlaced(dioramaState.placed, bases);
  const nextUnlocked = [...(dioramaState.unlocked ?? STARTER_IDS)];
  const nextBases = [...(dioramaState.unlockedBases ?? starterBases(bases))];

  if (picked.kind === "base") {
    if (!nextBases.includes(picked.item.id)) nextBases.push(picked.item.id);
    placed[picked.item.id] ??= [];
  } else {
    if (!nextUnlocked.includes(picked.item.id)) nextUnlocked.push(picked.item.id);
  }

  const nextDiorama = {
    version: 2,
    unlocked: nextUnlocked,
    unlockedBases: nextBases,
    welcomeClaimed: true,
    base: dioramaState.base,
    placed,
  };

  return {
    ok: true,
    kind: picked.kind,
    ...(picked.kind === "base" ? { base: picked.item } : { piece: picked.item }),
    free: check.free,
    bells: nextBells,
    diorama: nextDiorama,
    remaining: rewards.length - 1,
  };
}

const validTile = (gx, gz) => Number.isInteger(gx) && Number.isInteger(gz) && gx >= 0 && gx < GRID && gz >= 0 && gz < GRID;

export function placePiece(state, baseId, pieceId, gx, gz, rot = 0, bases = BASES) {
  if (!baseById(baseId, bases)) return { ok: false, diorama: state, reason: "bad-base" };
  if (!(state.unlockedBases ?? starterBases(bases)).includes(baseId)) return { ok: false, diorama: state, reason: "locked-base" };
  if (!pieceById(pieceId) || !state.unlocked.includes(pieceId)) return { ok: false, diorama: state, reason: "locked" };
  if (!validTile(gx, gz)) return { ok: false, diorama: state, reason: "out-of-bounds" };

  const list = state.placed?.[baseId] ?? [];
  if (list.some((x) => x.gx === gx && x.gz === gz)) return { ok: false, diorama: state, reason: "occupied" };

  const existingUids = new Set(Object.values(state.placed ?? {}).flat().map((x) => x.uid));
  let uid = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  while (existingUids.has(uid)) uid += "x";

  const cleanRot = (((Math.floor(Number(rot) || 0)) % 4) + 4) % 4;
  const item = { uid, id: pieceId, gx, gz, rot: cleanRot };
  const placed = clonePlaced(state.placed, bases);
  placed[baseId].push(item);

  return { ok: true, diorama: { ...state, placed }, item };
}

export function movePiece(state, baseId, uid, gx, gz, bases = BASES) {
  if (!baseById(baseId, bases)) return { ok: false, diorama: state, reason: "bad-base" };
  if (!validTile(gx, gz)) return { ok: false, diorama: state, reason: "out-of-bounds" };
  const list = state.placed?.[baseId] ?? [];
  const idx = list.findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, diorama: state, reason: "missing" };
  if (list.some((x) => x.uid !== uid && x.gx === gx && x.gz === gz)) return { ok: false, diorama: state, reason: "occupied" };

  const placed = clonePlaced(state.placed, bases);
  const item = { ...placed[baseId][idx], gx, gz };
  placed[baseId][idx] = item;
  return { ok: true, diorama: { ...state, placed }, item };
}

export function rotatePiece(state, baseId, uid, delta = 1, bases = BASES) {
  if (!baseById(baseId, bases)) return { ok: false, diorama: state, reason: "bad-base" };
  const list = state.placed?.[baseId] ?? [];
  const idx = list.findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, diorama: state, reason: "missing" };

  const placed = clonePlaced(state.placed, bases);
  const rot = (((placed[baseId][idx].rot + Math.floor(Number(delta) || 0)) % 4) + 4) % 4;
  const item = { ...placed[baseId][idx], rot };
  placed[baseId][idx] = item;
  return { ok: true, diorama: { ...state, placed }, item };
}

export function removePiece(state, baseId, uid, bases = BASES) {
  if (!baseById(baseId, bases)) return { ok: false, diorama: state, reason: "bad-base" };
  const list = state.placed?.[baseId] ?? [];
  if (!list.some((x) => x.uid === uid)) return { ok: false, diorama: state, reason: "missing" };

  const placed = clonePlaced(state.placed, bases);
  placed[baseId] = placed[baseId].filter((x) => x.uid !== uid);
  return { ok: true, diorama: { ...state, placed } };
}

export function clearBase(state, baseId, bases = BASES) {
  if (!baseById(baseId, bases)) return { ok: false, diorama: state, reason: "bad-base" };
  const placed = clonePlaced(state.placed, bases);
  placed[baseId] = [];
  return { ok: true, diorama: { ...state, placed } };
}

export function setBase(state, baseId, bases = BASES) {
  if (!baseById(baseId, bases)) return { ok: false, diorama: state, reason: "bad-base" };
  if (!(state.unlockedBases ?? starterBases(bases)).includes(baseId)) return { ok: false, diorama: state, reason: "locked" };
  return { ok: true, diorama: { ...state, base: baseId } };
}
