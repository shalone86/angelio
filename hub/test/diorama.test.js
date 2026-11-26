import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID, BOX_COST, CATEGORIES, BASES, PIECES, STARTER_IDS, pieceById } from "../public/games/diorama/catalog.js";
import {
  BELLS_KEY, DIORAMA_KEY, loadBells, saveBells, defaultDiorama, loadDiorama, saveDiorama,
  canOpenBox, openPrizeBox, placePiece, movePiece, rotatePiece, removePiece, clearBase, setBase,
} from "../public/games/diorama/store.js";
import { bellsForRound, awardBells, loadBells as kitLoadBells } from "../../kit/stickers.js";

const memStore = (init = {}) => {
  const m = { ...init };
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); } };
};

test("diorama catalog has 30 unique pieces, 4 starters, 3 bases, and valid categories", () => {
  assert.equal(GRID, 8);
  assert.equal(BOX_COST, 100);
  assert.equal(BASES.length, 3);
  assert.equal(PIECES.length, 30);
  assert.equal(STARTER_IDS.length, 4);
  assert.equal(new Set(PIECES.map((p) => p.id)).size, 30);
  const catIds = new Set(CATEGORIES.map((c) => c.id).filter((id) => id !== "all"));
  for (const p of PIECES) {
    assert.ok(catIds.has(p.category), `${p.id} category ${p.category}`);
    assert.ok(["common", "special", "rare"].includes(p.rarity), `${p.id} rarity ${p.rarity}`);
    assert.ok(p.name && p.blurb && Array.isArray(p.vox) && p.vox.length > 0, `${p.id} metadata`);
    assert.equal(pieceById(p.id), p);
  }
});

test("shared kit bellsForRound and awardBells accumulate cleanly across arcade rounds", () => {
  const store = memStore();
  assert.deepEqual([bellsForRound(1), bellsForRound(2), bellsForRound(3)], [25, 40, 60]);
  assert.deepEqual([bellsForRound(1, true), bellsForRound(2, true), bellsForRound(3, true)], [50, 65, 85]);

  let r = awardBells(60, store);
  assert.deepEqual(r, { added: 60, bells: 60, earned: 60, spent: 0, ready: false });
  r = awardBells(40, store);
  assert.deepEqual(r, { added: 40, bells: 100, earned: 100, spent: 0, ready: true });
  assert.deepEqual(kitLoadBells(store), { bells: 100, earned: 100, spent: 0 });
  assert.deepEqual(loadBells(store), { bells: 100, earned: 100, spent: 0 });
});

test("Prize Box grants free welcome box, spends 100 bells per roll, yields zero duplicates, and stops at 30/30", () => {
  let bells = { bells: 0, earned: 0, spent: 0 };
  let dio = defaultDiorama();

  const wCheck = canOpenBox(bells, dio);
  assert.equal(wCheck.ok, true);
  assert.equal(wCheck.free, true);
  assert.equal(wCheck.reason, "welcome");

  const wOpen = openPrizeBox(bells, dio, () => 0.2);
  assert.equal(wOpen.ok, true);
  assert.equal(wOpen.free, true);
  assert.equal(wOpen.bells.bells, 0);
  assert.equal(wOpen.diorama.welcomeClaimed, true);
  assert.equal(wOpen.diorama.unlocked.length, 5);
  assert.ok(!STARTER_IDS.includes(wOpen.piece.id));

  bells = wOpen.bells;
  dio = wOpen.diorama;
  assert.equal(canOpenBox(bells, dio).reason, "need-bells");
  assert.equal(canOpenBox(bells, dio).need, BOX_COST);

  // Give enough bells for all remaining 25 boxes and unbox every piece
  bells = { bells: 25 * BOX_COST, earned: 25 * BOX_COST, spent: 0 };
  let step = 0;
  while (dio.unlocked.length < PIECES.length) {
    const r = openPrizeBox(bells, dio, () => ((step++ * 37) % 100) / 100);
    assert.equal(r.ok, true);
    assert.equal(r.free, false);
    bells = r.bells;
    dio = r.diorama;
  }

  assert.equal(bells.bells, 0);
  assert.equal(bells.spent, 25 * BOX_COST);
  assert.equal(new Set(dio.unlocked).size, 30);
  assert.equal(canOpenBox({ bells: 500, earned: 500, spent: 0 }, dio).reason, "complete");
  assert.equal(openPrizeBox({ bells: 500, earned: 500, spent: 0 }, dio).ok, false);
});

test("diorama board placement supports multiple copies, collision checks, move/rotate/remove/clear, and persistence", () => {
  let dio = defaultDiorama();
  // Multiple copies of an unlocked starter are allowed on empty tiles
  let r = placePiece(dio, "chapel", "prop-pew", 0, 0, 0);
  assert.equal(r.ok, true);
  dio = r.diorama;
  const uid1 = r.item.uid;

  r = placePiece(dio, "chapel", "prop-pew", 1, 0, 1);
  assert.equal(r.ok, true);
  dio = r.diorama;

  // Reject occupied, locked, or out-of-bounds
  assert.equal(placePiece(dio, "chapel", "parish-boy", 0, 0).reason, "occupied");
  assert.equal(placePiece(dio, "chapel", "prop-altar", 7, 7).reason, "locked");
  assert.equal(placePiece(dio, "chapel", "parish-boy", 8, 0).reason, "out-of-bounds");
  assert.equal(placePiece(dio, "chapel", "parish-boy", -1, 0).reason, "out-of-bounds");

  // Rotate wraps modulo 4
  r = rotatePiece(dio, "chapel", uid1, 3);
  assert.equal(r.item.rot, 3);
  r = rotatePiece(r.diorama, "chapel", uid1, 2);
  assert.equal(r.item.rot, 1);
  dio = r.diorama;

  // Move to free vs occupied tile
  assert.equal(movePiece(dio, "chapel", uid1, 1, 0).reason, "occupied");
  r = movePiece(dio, "chapel", uid1, 6, 7);
  assert.equal(r.ok, true);
  assert.deepEqual([r.item.gx, r.item.gz], [6, 7]);
  dio = r.diorama;

  // Remove, switch base, clear
  dio = removePiece(dio, "chapel", uid1).diorama;
  assert.ok(!dio.placed.chapel.some((x) => x.uid === uid1));
  dio = setBase(dio, "garden").diorama;
  assert.equal(dio.base, "garden");
  dio = clearBase(dio, "chapel").diorama;
  assert.equal(dio.placed.chapel.length, 0);

  // Save/load round-trip & sanitization of corrupted state
  const store = memStore();
  saveBells({ bells: 140, earned: 240, spent: 100 }, store);
  saveDiorama(dio, store);
  assert.deepEqual(loadBells(store), { bells: 140, earned: 240, spent: 100 });
  assert.equal(loadDiorama(store).base, "garden");

  store.setItem(DIORAMA_KEY, JSON.stringify({
    unlocked: ["priest-feast", "not-real"],
    base: "nope",
    placed: {
      chapel: [
        { uid: "a", id: "priest-feast", gx: 2, gz: 2, rot: 9 },
        { uid: "b", id: "prop-altar", gx: 3, gz: 3, rot: 0 }, // locked -> filtered
        { uid: "c", id: "parish-boy", gx: 2, gz: 2, rot: 0 }, // colliding tile -> filtered
        { uid: "d", id: "parish-boy", gx: 99, gz: 0, rot: 0 }, // OOB -> filtered
      ],
    },
  }));
  const cleaned = loadDiorama(store);
  assert.equal(cleaned.base, "chapel");
  assert.ok(STARTER_IDS.every((id) => cleaned.unlocked.includes(id)));
  assert.ok(cleaned.unlocked.includes("priest-feast"));
  assert.equal(cleaned.placed.chapel.length, 1);
  assert.equal(cleaned.placed.chapel[0].rot, 1);
  assert.ok(BELLS_KEY === "angelio:bells");
});
