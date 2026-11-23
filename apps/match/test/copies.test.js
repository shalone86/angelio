import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Saints Match draws voxel saint portraits with the same shared reader, marker recolorer, and three.js copy.
const same = (mine, theirs) => {
  const copy = fs.readFileSync(new URL(mine, import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(copy, fs.readFileSync(new URL(theirs, import.meta.url), "utf8"), `${mine} drifted from ${theirs}`);
};
test("the .vox reader is Angelio's (hub/public/js/vox.js)", () => same("../public/js/vox.js", "../../../hub/public/js/vox.js"));
test("the looks are Candle Rack's (apps/candles/public/js/looks.js)", () => same("../public/js/looks.js", "../../candles/public/js/looks.js"));
test("three.js is the same pinned copy as Candle Rack's", () => {
  assert.ok(fs.readFileSync(new URL("../public/vendor/three-r128.min.js", import.meta.url)).equals(fs.readFileSync(new URL("../../candles/public/vendor/three-r128.min.js", import.meta.url))));
});
