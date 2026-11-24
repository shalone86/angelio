import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadStickers, pointsFor, normalize, SHARED } from "../public/stickers/data.js";
import { SCENES, PROPS } from "../public/stickers/scenes.js";
import { VOX_STICKERS, VOX_NAMES } from "../../kit/ui.js";

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

test("every voxel sticker in kit/ui.js has a baked SVG and Sticker World mapping", () => {
  assert.ok(VOX_STICKERS.length >= 16);
  const worldSrc = fs.readFileSync(new URL("../public/stickers/world.js", import.meta.url), "utf8");
  assert.match(worldSrc, /VOX_NAMES\s*=/);
  assert.match(worldSrc, /startsWith\("vox:"\)/);
  for (const v of VOX_STICKERS) {
    assert.ok(v.startsWith("vox:"), `${v} starts with vox:`);
    const slug = v.slice(4);
    assert.ok(VOX_NAMES[slug], `${slug} has a VOX_NAMES label`);
    assert.ok(worldSrc.includes(`"${slug}"`), `world.js lists ${slug}`);
    const svgPath = new URL(`../public/stickers/vox/${slug}.svg`, import.meta.url);
    assert.ok(fs.existsSync(svgPath), `${slug}.svg exists`);
    const svg = fs.readFileSync(svgPath, "utf8");
    assert.ok(svg.includes("<svg ") && svg.includes("<polygon"), `${slug}.svg renders voxel polygons`);
  }
});
