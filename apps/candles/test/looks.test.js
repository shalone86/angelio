import { test } from "node:test";
import assert from "node:assert/strict";
import { MARK, randomLook, recolor, GRAY_HAIR, HAIR, isPriest } from "../public/js/looks.js";
import { rng } from "../public/js/game.js";

test("his marker colors become each person's own; everything else stays", () => {
  const look = { hair: "#111111", skin: "#222222", eyes: "#333333" };
  assert.equal(recolor("#255359", look, "#c8262f"), "#111111");
  assert.equal(recolor("#FAD689", look), "#222222");
  assert.equal(recolor("#0b346e", look), "#333333");
  assert.equal(recolor(MARK.chasuble, look, "#6b3fa0"), "#6b3fa0"); // the season's color
  assert.equal(recolor("#24936e", look), "#24936e");
  assert.equal(recolor("#255359", null), "#255359"); // no look: as he painted it
});

test("looks vary; grandparents get gray or white hair", () => {
  const r = rng(5), looks = Array.from({ length: 40 }, () => randomLook(r));
  assert.ok(new Set(looks.map((l) => l.hair + l.skin)).size > 20);
  assert.ok(looks.every((l) => HAIR.includes(l.hair)));
  assert.ok(Array.from({ length: 10 }, () => randomLook(r, { older: true })).every((l) => GRAY_HAIR.includes(l.hair)));
});

test("only priests' vestments change: Roman chasuble and Byzantine phelonion; servers' robes never", () => {
  assert.equal(recolor("#ffcc66", null, "#2e5fa8"), "#2e5fa8"); // a Byzantine priest on a feast of the Theotokos
  assert.equal(recolor("#ff77a8", null, null), "#ff77a8");       // not a priest: as painted
  assert.ok(isPriest("priest-mass-idle") && isPriest("east-priest-idle"));
  assert.ok(!isPriest("server-idle") && !isPriest("east-server-light"));
});
