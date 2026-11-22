import { test } from "node:test";
import assert from "node:assert/strict";
import { writeVox, pewVox } from "../public/js/voxwrite.js";
import { readVox } from "../public/js/vox.js";

test("a written .vox reads back the same (size, voxels, colors)", () => {
  const vox = readVox(writeVox([3, 2, 2], [[0, 0, 0, "#ff0000"], [2, 1, 1, "#00ff88"], [1, 0, 1, "#FF0000"]]));
  assert.deepEqual(vox.frames[0].size, [3, 2, 2]);
  assert.deepEqual(vox.frames[0].voxels.map(([x, y, z, c]) => [x, y, z, vox.palette[c]]), [[0, 0, 0, "#ff0000"], [2, 1, 1, "#00ff88"], [1, 0, 1, "#ff0000"]]);
});

test("Mass Usher's pew: five seats of 5, the game's colors, the back behind the seat", () => {
  const vox = readVox(pewVox()), f = vox.frames[0];
  assert.deepEqual(f.size, [26, 4, 4]);
  const at = (x, y, z) => f.voxels.find((v) => v[0] === x && v[1] === y && v[2] === z);
  assert.equal(vox.palette[at(12, 0, 1)[3]], "#8a5a2e", "the seat");
  assert.equal(vox.palette[at(12, 3, 2)[3]], "#7a4c24", "the back, behind it");
  assert.equal(at(12, 0, 2), undefined, "nothing above the seat");
  assert.equal(vox.palette[at(25, 0, 3)[3]], "#6a4020", "the end by the aisle");
});
