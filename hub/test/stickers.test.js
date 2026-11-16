import { test } from "node:test";
import assert from "node:assert/strict";
import { loadStickers, pointsFor, normalize, SHARED } from "../public/stickers/data.js";
import { SCENES, PROPS } from "../public/stickers/scenes.js";

const fakeStore = (init = {}) => { const m = { ...init }; return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = String(v); } }; };

test("old saves are copied in once, sizes kept", () => {
  const store = fakeStore({
    "regroup:v1": JSON.stringify({ stickers: ["🦄", { e: "🐶", big: false, id: "a" }] }),
    "doubles:v1": JSON.stringify({ stickers: ["⭐", { emoji: "🪞", mini: true }] }),
    [SHARED]: JSON.stringify({ "fractions/x": { e: "🏰", big: true, t: 9 } }),
  });
  const s = loadStickers(store);
  assert.equal(s.length, 5);
  assert.deepEqual(s.find((x) => x.key === "regroup/a"), { key: "regroup/a", e: "🐶", big: false, game: "regroup", t: 1 });
  assert.equal(s.find((x) => x.e === "⭐").big, false);
  assert.equal(pointsFor(s), 2 + 1 + 1 + 1 + 2);
  assert.equal(loadStickers(store).length, 5, "no duplicates the second time");
});

test("normalize", () => {
  assert.deepEqual(normalize("🦄"), { e: "🦄", big: true });
  assert.deepEqual(normalize({ emoji: "🐸", mini: true }), { e: "🐸", big: false, id: undefined });
});

test("playsets and props unlock in order, the first is free", () => {
  assert.equal(SCENES[0].need, 0);
  assert.equal(PROPS[0].need, 0);
  for (let i = 1; i < SCENES.length; i++) assert.ok(SCENES[i].need > SCENES[i - 1].need);
  assert.equal(new Set(SCENES.map((s) => s.id)).size, SCENES.length);
});
