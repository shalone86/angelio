import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("the .vox reader is the same as Angelio's (public/js/vox.js is a copy of hub/public/js/vox.js)", () => {
  const copy = fs.readFileSync(new URL("../public/js/vox.js", import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(copy, fs.readFileSync(new URL("../../../hub/public/js/vox.js", import.meta.url), "utf8"));
});
