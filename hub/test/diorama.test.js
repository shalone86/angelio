import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import {
  GRID, BOX_COST, CATEGORIES, BASES, DEFAULT_BASES, STARTER_BASE_IDS, PIECES, STARTER_IDS,
  pieceById, baseById, cleanScene, mergeBases,
} from "../public/games/diorama/catalog.js";
import { ANIMAL_VARIANTS, animalVariantById } from "../public/games/diorama/animals.js";
import {
  BELLS_KEY, DIORAMA_KEY, loadBells, saveBells, defaultDiorama, loadDiorama, saveDiorama,
  demoDiorama, topWorldTabs, canOpenBox, openPrizeBox, placePiece, movePiece, rotatePiece, removePiece, clearBase, setBase,
} from "../public/games/diorama/store.js";
import { bellsForRound, awardBells, loadBells as kitLoadBells } from "../../kit/stickers.js";

const memStore = (init = {}) => {
  const m = { ...init };
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); } };
};

test("diorama catalog has 54 pieces (including 26 animal variants), 14 worlds (only chapel starter), valid categories, and clean merge", () => {
  assert.equal(GRID, 8);
  assert.equal(BOX_COST, 100);
  assert.equal(BASES.length, 14);
  assert.equal(DEFAULT_BASES.length, 14);
  assert.deepEqual(STARTER_BASE_IDS, ["chapel"]);
  assert.equal(new Set(BASES.map((b) => b.id)).size, 14);
  for (const b of BASES) {
    assert.ok(b.name && b.short && b.emoji && b.backdropSlug && b.style && b.palette?.sky && b.palette?.tileA);
  }

  assert.equal(PIECES.length, 54);
  assert.equal(STARTER_IDS.length, 4);
  assert.equal(new Set(PIECES.map((p) => p.id)).size, 54);
  const catIds = new Set(CATEGORIES.map((c) => c.id).filter((id) => id !== "all"));
  for (const p of PIECES) {
    assert.ok(catIds.has(p.category), `${p.id} category ${p.category}`);
    assert.ok(["common", "special", "rare"].includes(p.rarity), `${p.id} rarity ${p.rarity}`);
    assert.ok(p.name && p.blurb && Array.isArray(p.vox) && p.vox.length > 0, `${p.id} metadata`);
    if (p.animal) assert.ok(animalVariantById(p.animal), `${p.id} links valid animal ${p.animal}`);
    assert.equal(pieceById(p.id), p);
  }
  const catalogAnimals = new Set(PIECES.filter((p) => p.animal).map((p) => p.animal));
  assert.equal(catalogAnimals.size, 26);
  for (const av of ANIMAL_VARIANTS) assert.ok(catalogAnimals.has(av.id), `catalog missing animal ${av.id}`);

  const custom = cleanScene({ id: "My Forest!", name: "Secret Woods", emoji: "🌲", style: "cabin", palette: { sky: "#123456" } });
  assert.equal(custom.id, "my-forest");
  assert.equal(custom.palette.sky, "#123456");
  const merged = mergeBases(DEFAULT_BASES, [custom, { id: "moon", name: "Blue Moon", emoji: "🌕" }]);
  assert.equal(merged.length, 15);
  assert.equal(baseById("my-forest", merged).name, "Secret Woods");
  assert.equal(baseById("moon", merged).name, "Blue Moon");
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

test("Prize Box unlocks both figurines (50) and worlds (13) with zero duplicates until complete", () => {
  let bells = { bells: 0, earned: 0, spent: 0 };
  let dio = defaultDiorama();
  assert.deepEqual(dio.unlockedBases, ["chapel"]);

  const wCheck = canOpenBox(bells, dio);
  assert.equal(wCheck.ok, true);
  assert.equal(wCheck.free, true);
  assert.equal(wCheck.reason, "welcome");
  assert.equal(wCheck.remaining, 63);

  const wOpen = openPrizeBox(bells, dio, () => 0.2);
  assert.equal(wOpen.ok, true);
  assert.equal(wOpen.free, true);
  assert.equal(wOpen.bells.bells, 0);
  assert.equal(wOpen.diorama.welcomeClaimed, true);
  assert.equal(wOpen.diorama.unlocked.length + wOpen.diorama.unlockedBases.length, 6);

  bells = wOpen.bells;
  dio = wOpen.diorama;
  assert.equal(canOpenBox(bells, dio).reason, "need-bells");
  assert.equal(canOpenBox(bells, dio).need, BOX_COST);

  // Give enough bells for all remaining 62 boxes (pieces + worlds)
  bells = { bells: 62 * BOX_COST, earned: 62 * BOX_COST, spent: 0 };
  let step = 0;
  let sawBase = false, sawPiece = false;
  while (dio.unlocked.length < PIECES.length || dio.unlockedBases.length < BASES.length) {
    const r = openPrizeBox(bells, dio, () => ((step++ * 37) % 100) / 100);
    assert.equal(r.ok, true);
    assert.equal(r.free, false);
    if (r.kind === "base") sawBase = true;
    if (r.kind === "piece") sawPiece = true;
    bells = r.bells;
    dio = r.diorama;
  }

  assert.ok(sawBase && sawPiece, "boxes unbox both bases and figurines");
  assert.equal(bells.bells, 0);
  assert.equal(bells.spent, 62 * BOX_COST);
  assert.equal(new Set(dio.unlocked).size, 54);
  assert.equal(new Set(dio.unlockedBases).size, 14);
  assert.equal(canOpenBox({ bells: 500, earned: 500, spent: 0 }, dio).reason, "complete");
  assert.equal(openPrizeBox({ bells: 500, earned: 500, spent: 0 }, dio).ok, false);
});

test("diorama board placement checks unlocked worlds, unlimited piece copies, v1 migration, and persistence", () => {
  let dio = defaultDiorama();
  // Switching or placing on a locked world is refused until unlocked
  assert.equal(setBase(dio, "moon").reason, "locked");
  assert.equal(placePiece(dio, "moon", "parish-boy", 0, 0).reason, "locked-base");

  // Unlock a world & switch into it
  dio = { ...dio, unlockedBases: [...dio.unlockedBases, "garden"] };
  dio = setBase(dio, "garden").diorama;
  assert.equal(dio.base, "garden");

  // Multiple copies on chapel are allowed
  let r = placePiece(dio, "chapel", "prop-pew", 0, 0, 0);
  assert.equal(r.ok, true);
  dio = r.diorama;
  const uid1 = r.item.uid;

  r = placePiece(dio, "chapel", "prop-pew", 1, 0, 1);
  assert.equal(r.ok, true);
  dio = r.diorama;

  assert.equal(placePiece(dio, "chapel", "parish-boy", 0, 0).reason, "occupied");
  assert.equal(placePiece(dio, "chapel", "prop-altar", 7, 7).reason, "locked");
  assert.equal(placePiece(dio, "chapel", "parish-boy", 8, 0).reason, "out-of-bounds");
  assert.equal(placePiece(dio, "chapel", "parish-boy", -1, 0).reason, "out-of-bounds");

  r = rotatePiece(dio, "chapel", uid1, 3);
  assert.equal(r.item.rot, 3);
  r = rotatePiece(r.diorama, "chapel", uid1, 2);
  assert.equal(r.item.rot, 1);
  dio = r.diorama;

  assert.equal(movePiece(dio, "chapel", uid1, 1, 0).reason, "occupied");
  r = movePiece(dio, "chapel", uid1, 6, 7);
  assert.equal(r.ok, true);
  assert.deepEqual([r.item.gx, r.item.gz], [6, 7]);
  dio = r.diorama;

  dio = removePiece(dio, "chapel", uid1).diorama;
  assert.ok(!dio.placed.chapel.some((x) => x.uid === uid1));
  dio = clearBase(dio, "chapel").diorama;
  assert.equal(dio.placed.chapel.length, 0);

  // v1 migration preserves bases where user had already placed items
  const store = memStore({
    [DIORAMA_KEY]: JSON.stringify({
      unlocked: ["priest-feast"],
      base: "courtyard",
      placed: {
        chapel: [{ uid: "a", id: "priest-feast", gx: 2, gz: 2, rot: 9 }],
        courtyard: [{ uid: "b", id: "parish-boy", gx: 1, gz: 1, rot: 0 }],
      },
    }),
  });
  const migrated = loadDiorama(store);
  assert.ok(migrated.unlockedBases.includes("chapel") && migrated.unlockedBases.includes("courtyard"));
  assert.equal(migrated.base, "courtyard");
  assert.equal(migrated.placed.chapel[0].rot, 1);

  saveBells({ bells: 140, earned: 240, spent: 100 }, store);
  saveDiorama(dio, store);
  assert.deepEqual(loadBells(store), { bells: 140, earned: 240, spent: 100 });
  assert.equal(loadDiorama(store).base, "garden");
  assert.ok(BELLS_KEY === "angelio:bells");
});

test("Studio Diorama API reads, cleans, backs up history, and serves public scenes", async () => {
  const files = new Map();
  let n = 0;
  const WATCH_MEDIA = {
    async get(key) { const f = files.get(key); return f ? { body: f.body, httpEtag: `"${f.etag}"`, json: async () => JSON.parse(f.body), text: async () => f.body } : null; },
    async put(key, body) { const etag = `e${++n}`; files.set(key, { body: String(body), etag }); return { etag }; },
  };
  const env = { ADMIN_KEY: "secret", CODES: { get: async () => null }, WATCH_MEDIA, ASSETS: { fetch: async () => new Response("hub") } };

  const initPub = await (await worker.fetch(new Request("https://angelio.org/api/diorama/scenes"), env)).json();
  assert.deepEqual(initPub, { scenes: [] });

  const unauth = await worker.fetch(new Request("https://angelio.org/api/admin/studio/diorama", { headers: { "x-admin-key": "wrong" } }), env);
  assert.equal(unauth.status, 401);

  const post1 = await worker.fetch(new Request("https://angelio.org/api/admin/studio/diorama", {
    method: "POST",
    headers: { "x-admin-key": "secret" },
    body: JSON.stringify({ scenes: [{ name: "Nazareth Home", emoji: "🏠", style: "cabin", palette: { sky: "#ffeedd" } }] }),
  }), env);
  const j1 = await post1.json();
  assert.equal(j1.ok, true);
  assert.equal(j1.scenes.length, 1);
  assert.equal(j1.scenes[0].id, "nazareth-home");

  await worker.fetch(new Request("https://angelio.org/api/admin/studio/diorama", {
    method: "POST",
    headers: { "x-admin-key": "secret" },
    body: JSON.stringify({ scenes: [{ id: "nazareth-home", name: "Nazareth Workshop", emoji: "🪚" }] }),
  }), env);
  assert.ok([...files.keys()].some((k) => k.startsWith("content/diorama/history/")));

  const pub = await (await worker.fetch(new Request("https://angelio.org/api/diorama/scenes"), env)).json();
  assert.equal(pub.scenes[0].name, "Nazareth Workshop");
});

test("topWorldTabs prioritizes populated and most-viewed unlocked worlds while keeping active world visible", () => {
  let dio = defaultDiorama();
  // Only starter chapel unlocked -> returns [chapel]
  assert.deepEqual(topWorldTabs(dio).map((b) => b.id), ["chapel"]);

  // Unlock 5 more worlds, empty except chapel and moon
  dio = {
    ...dio,
    unlockedBases: ["chapel", "garden", "courtyard", "meadow", "moon", "fuji"],
    views: { chapel: 1, garden: 10, courtyard: 8, moon: 4, fuji: 2 },
  };
  dio = placePiece(dio, "moon", "parish-boy", 1, 1).diorama;
  dio = placePiece(dio, "fuji", "parish-boy", 2, 2).diorama;

  // Populated worlds (chapel, moon, fuji) outrank empty garden/courtyard even when garden has more views
  let tabs = topWorldTabs(dio, BASES, 3).map((b) => b.id);
  assert.deepEqual(tabs, ["moon", "fuji", "chapel"]);

  // Switching to courtyard bumps views and keeps active courtyard visible in top 3
  dio = setBase(dio, "courtyard").diorama;
  assert.equal(dio.views.courtyard, 9);
  tabs = topWorldTabs(dio, BASES, 3).map((b) => b.id);
  assert.ok(tabs.includes("courtyard"));
  assert.equal(tabs.length, 3);
});

test("demoDiorama unlocks all 54 pieces and 14 worlds with valid seeded builds", () => {
  const demo = demoDiorama(BASES);
  assert.equal(demo.unlocked.length, 54);
  assert.equal(demo.unlockedBases.length, 14);
  assert.equal(demo.welcomeClaimed, true);
  assert.deepEqual(topWorldTabs(demo, BASES, 3).map((b) => b.id), ["chapel", "fuji", "moon"]);

  for (const [bid, items] of Object.entries(demo.placed)) {
    assert.ok(baseById(bid, BASES));
    const seen = new Set();
    for (const it of items) {
      assert.ok(pieceById(it.id), `valid piece ${it.id}`);
      assert.ok(it.gx >= 0 && it.gx < GRID && it.gz >= 0 && it.gz < GRID);
      const key = `${it.gx},${it.gz}`;
      assert.ok(!seen.has(key), `duplicate tile ${bid}:${key}`);
      seen.add(key);
    }
  }
});
