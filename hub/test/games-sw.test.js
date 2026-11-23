import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const pub = new URL("../public", import.meta.url).pathname;

test("the Games page service worker exists and every precached file exists", () => {
  const sw = readFileSync(join(pub, "games/sw.js"), "utf8");
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1];
  const paths = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(paths.length > 5);
  for (const p of paths) {
    const f = p.endsWith("/") ? p + "index.html" : p;
    assert.ok(existsSync(join(pub, f)), `missing ${p}`);
  }
  const reg = readFileSync(join(pub, "games/games.js"), "utf8");
  assert.match(reg, /register\("\/games\/sw\.js", \{ scope: "\/games\/" \}\)/);
});
