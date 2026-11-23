import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Candle Rack's people walk around each other with Angelio's steering (a copy; first line: a note).
const same = (mine, theirs) => {
  const copy = fs.readFileSync(new URL(mine, import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(copy, fs.readFileSync(new URL(theirs, import.meta.url), "utf8"), `${mine} drifted from ${theirs}`);
};
test("the steering (people walking around each other) is Angelio's (hub/public/js/steer.js)", () => same("../public/js/steer.js", "../../../hub/public/js/steer.js"));
