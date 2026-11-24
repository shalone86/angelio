import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CROPS, PESTS, pestById } from "../public/js/crops.js";
import { STAGES, stageById, isOpen } from "../public/js/stages.js";
import { GARDENERS, gardenerById, gardenerOpen } from "../public/js/gardeners.js";
import { newGame, tick, tapSpot, tapPest, orderReward, starsFor, timeLeft } from "../public/js/garden.js";
import { stepWithCollisions, clearTarget, TREE_COLLIDER_R } from "../public/js/plot.js";

test("four 45s stages + Endless Harvest, 100/200/300 stars, plus Brother/Sister starters and 2-monk / 2-nun unlocks", () => {
  assert.equal(STAGES.length, 5);
  const timed = STAGES.filter((st) => !st.endless);
  const endless = STAGES.find((st) => st.endless);
  assert.equal(timed.length, 4);
  for (const st of timed) assert.equal(st.length, 45);
  for (const st of STAGES) {
    assert.equal(st.star1, 100);
    assert.equal(st.star2, 200);
    assert.equal(st.star3, 300);
  }
  const g = newGame({ seed: 1, stage: STAGES[0], gardener: gardenerById("brother") });
  for (const [score, want] of [[0, 0], [99, 0], [100, 1], [199, 1], [200, 2], [299, 2], [300, 3]]) {
    g.score = score;
    assert.equal(starsFor(g), want, `score ${score} -> ${want}★`);
  }
  assert.equal(endless.id, "endless");
  assert.equal(endless.length, Infinity);
  assert.equal(endless.maxEaten, 10);
  assert.equal(GARDENERS.length, 6);
  const starters = GARDENERS.filter((g) => !g.opens);
  const unlocks = GARDENERS.filter((g) => g.opens);
  assert.equal(starters.length, 2);
  assert.equal(starters.filter((g) => !g.nun).length, 1);
  assert.equal(starters.filter((g) => g.nun).length, 1);
  assert.equal(unlocks.length, 4);
  assert.equal(unlocks.filter((g) => !g.nun).length, 2);
  assert.equal(unlocks.filter((g) => g.nun).length, 2);

  const zero = () => 0;
  assert.equal(isOpen(0, zero), true);
  assert.equal(isOpen(1, zero), false);
  assert.equal(gardenerOpen(gardenerById("brother"), () => 0), true);
  assert.equal(gardenerOpen(gardenerById("sister"), () => 0), true);
  assert.equal(gardenerOpen(gardenerById("bugs"), (id) => (id === "garden" ? 2 : 0)), true);
});

test("pests spawn, shooing scores and builds combos, and hungry pests nibble crops", () => {
  const g = newGame({ seed: 3, stage: stageById("garden"), gardener: gardenerById("brother") });
  while (!g.pests.length) tick(g, 0.2);
  const p = g.pests[0];
  // Tapping the spot under a pest shoos the pest first without wasting or wrongly picking the crop
  const shooEv = tapSpot(g, p.spotId);
  assert.ok(shooEv.some((e) => e.type === "shoo" && e.pest.id === p.id));
  assert.equal(g.shooed, 1);
  assert.equal(g.score > 0, true);

  // Ignore next pest until it nibbles
  while (!g.pests.length) tick(g, 0.2);
  const p2 = g.pests[0];
  const eatEv = [];
  while (g.eaten === 0) eatEv.push(...tick(g, 0.2));
  assert.ok(eatEv.some((e) => e.type === "eat" && e.pest.id === p2.id));
  const sp = g.spots.find((s) => s.id === p2.spotId);
  assert.equal(sp.ripe, false);
  assert.equal(g.streak, 0);
});

test("orders fill when matching ripe produce is tapped, auto-deliver, decay to 0, then tick negative", () => {
  const g = newGame({ seed: 5, stage: stageById("orchard"), gardener: gardenerById("sister") });
  g.nextPestIn = 999; // isolate order logic
  const ord = g.orders[0];
  const initialRew = orderReward(ord);
  assert.ok(initialRew > 0);

  // Tapping an unordered crop counts as wrong-crop but leaves spot ripe
  const neededSet = new Set(ord.items.map((i) => i.crop));
  const unwanted = g.spots.find((s) => !g.orders.some((o) => o.items.some((it) => it.crop === s.crop)));
  if (unwanted) {
    const bad = tapSpot(g, unwanted.id);
    assert.ok(bad.some((e) => e.type === "wrong-crop"));
    assert.equal(unwanted.ripe, true);
  }

  // Complete ord item-by-item and confirm deliver event fires
  let delivered = null;
  for (const item of ord.items) {
    const sp = g.spots.find((s) => s.crop === item.crop && s.ripe);
    assert.ok(sp, `ripe ${item.crop}`);
    const evs = tapSpot(g, sp.id);
    assert.ok(evs.some((e) => e.type === "pick"));
    const d = evs.find((e) => e.type === "deliver");
    if (d) delivered = d;
  }
  assert.ok(delivered && g.delivered === 1);
  assert.ok(neededSet.size >= 1);

  // Verify next order spawns, decays down to 0, then ticks negative while waiting
  while (!g.orders.length) tick(g, 0.2);
  const slowOrder = g.orders[0];
  while (slowOrder.age <= slowOrder.fresh) tick(g, 0.5);
  assert.equal(orderReward(slowOrder), 0);
  g.score = 100;
  const lateEvs = tick(g, 4.2);
  assert.ok(orderReward(slowOrder) < 0);
  assert.ok(lateEvs.some((e) => e.type === "order-late"));
  assert.ok(g.score < 100);
});

test("night vigil: zero orders, no picking, rising critter spawns as dawn nears, ends cleanly at 45s", () => {
  const g = newGame({ seed: 7, stage: stageById("vigil"), gardener: gardenerById("sister") });
  assert.equal(g.orders.length, 0);
  const spotEv = tapSpot(g, g.spots[0].id);
  assert.ok(spotEv.some((e) => e.type === "vigil-safe"));
  const bonuses = [];
  let earlySpawns = 0, lateSpawns = 0;
  while (!g.over) {
    const evs = tick(g, 0.25);
    bonuses.push(...evs.filter((e) => e.type === "guard-bonus"));
    const spawns = evs.filter((e) => e.type === "pest-spawn").length;
    if (g.t < 22.5) earlySpawns += spawns;
    else lateSpawns += spawns;
    while (g.pests.length) tapPest(g, g.pests[0].id);
  }
  assert.equal(timeLeft(g), 0);
  assert.ok(bonuses.length >= 4);
  assert.ok(lateSpawns > earlySpawns, `expected late spawns (${lateSpawns}) > early spawns (${earlySpawns})`);
});

test("two-tap critters: raccoons and squirrels require two taps to shoo", () => {
  assert.equal(pestById("raccoon").taps, 2);
  assert.equal(pestById("squirrel").taps, 2);
  assert.equal(pestById("bug").taps, 1);
  assert.equal(pestById("bird").taps, 1);

  const g = newGame({ seed: 12, stage: stageById("vigil"), gardener: gardenerById("brother") });
  while (!g.pests.some((p) => p.type === "raccoon" || p.type === "squirrel")) {
    for (const p of [...g.pests]) tapPest(g, p.id);
    tick(g, 0.2);
  }
  const tough = g.pests.find((p) => p.type === "raccoon" || p.type === "squirrel");
  const scoreBefore = g.score;
  const hit1 = tapPest(g, tough.id);
  assert.equal(hit1[0]?.type, "shoo-hit");
  assert.equal(tough.hp, 1);
  assert.ok(g.pests.includes(tough), "still present after first tap");
  assert.equal(g.score, scoreBefore, "points awarded once fully shooed");

  const hit2 = tapPest(g, tough.id);
  assert.equal(hit2[0]?.type, "shoo");
  assert.ok(!g.pests.includes(tough), "removed on second tap");
  assert.ok(g.score > scoreBefore);
});

test("tree collision keeps gardener well outside tree trunks and targets clear", () => {
  assert.ok(TREE_COLLIDER_R >= 4.4);
  const trees = [-14, -6, 2, 10].map((x) => ({ x, z: -13, r: TREE_COLLIDER_R }));
  // Walk straight through tree at (-6, -13)
  let pos = { x: -12, z: -13 };
  const dest = { x: 0, z: -13 };
  for (let i = 0; i < 80; i++) {
    const res = stepWithCollisions(pos, dest, 0.5, [trees[1]]);
    pos = { x: res.x, z: res.z };
    const distTree = Math.hypot(pos.x - trees[1].x, pos.z - trees[1].z);
    assert.ok(distTree >= TREE_COLLIDER_R - 1e-6, `entered tree radius: ${distTree}`);
  }
  assert.ok(Math.hypot(pos.x - dest.x, pos.z - dest.z) < 0.6, "reached destination around tree");

  // Walk past multiple orchard trees from top-left herb h4 front to t4 front
  let p2 = { x: -19, z: -10.6 };
  const dest2 = clearTarget({ x: 10, z: -13 + TREE_COLLIDER_R + 0.4 }, trees, 0.3);
  for (let i = 0; i < 120; i++) {
    const res = stepWithCollisions(p2, dest2, 0.5, trees);
    p2 = { x: res.x, z: res.z };
    for (const c of trees) {
      assert.ok(Math.hypot(p2.x - c.x, p2.z - c.z) >= TREE_COLLIDER_R - 1e-6, "stays outside every tree");
    }
  }
  assert.ok(Math.hypot(p2.x - dest2.x, p2.z - dest2.z) < 0.8, "navigates around orchard trees cleanly");

  // Even targets initially placed near/inside tree overlap are projected clear
  const h4Clear = clearTarget({ x: -19, z: -10.6 }, trees, 0.3);
  for (const c of trees) assert.ok(Math.hypot(h4Clear.x - c.x, h4Clear.z - c.z) >= TREE_COLLIDER_R + 0.3 - 1e-6);
});

test("endless harvest: 30s wave escalation, eaten meter fills and ends stage cleanly", () => {
  const st = stageById("endless");
  const g = newGame({ seed: 11, stage: st, gardener: gardenerById("brother") });
  assert.equal(g.wave, 1);
  assert.equal(timeLeft(g), Infinity);
  const waves = [];
  for (let i = 0; i < 620 && !g.over; i++) {
    waves.push(...tick(g, 0.1).filter((e) => e.type === "wave"));
    if (i % 3 === 0 && g.pests.length) tapPest(g, g.pests[0].id);
  }
  assert.ok(!g.over && g.wave >= 3);
  assert.ok(waves.some((e) => e.wave === 2) && waves.some((e) => e.wave === 3));

  // Stop defending and let critters fill the eaten-produce meter
  let endEv = null;
  for (let i = 0; i < 600 && !g.over; i++) {
    const ev = tick(g, 0.2).find((e) => e.type === "end");
    if (ev) endEv = ev;
  }
  assert.equal(g.over, true);
  assert.equal(g.endReason, "eaten");
  assert.equal(g.eaten, st.maxEaten);
  assert.equal(endEv?.reason, "eaten");
});

test("all four unlockable gardeners apply their distinct abilities", () => {
  // Brother Bug-Shooer automatically shoos bugs
  const bugs = newGame({ seed: 2, stage: stageById("herbs"), gardener: gardenerById("bugs") });
  bugs.nextOrderIn = 999;
  for (let i = 0; i < 200 && bugs.autoShooed === 0; i++) tick(bugs, 0.1);
  assert.ok(bugs.autoShooed >= 1);

  // Sister Double Harvest fills 2 matching order slots in one tap
  const dbl = newGame({ seed: 9, stage: stageById("garden"), gardener: gardenerById("double") });
  dbl.nextPestIn = 999;
  dbl.orders = [{ id: 99, items: [{ crop: "carrot", done: false }, { crop: "carrot", done: false }], age: 0, fresh: 20, basePoints: 20, penalized: 0 }];
  const carrotSpot = dbl.spots.find((s) => s.crop === "carrot");
  const evs = tapSpot(dbl, carrotSpot.id);
  assert.ok(evs.some((e) => e.type === "pick" && e.count === 2));
  assert.ok(evs.some((e) => e.type === "deliver"));

  // Brother Patient extends order freshness past standard expiration
  const pat = newGame({ seed: 4, stage: stageById("herbs"), gardener: gardenerById("patient") });
  const base = newGame({ seed: 4, stage: stageById("herbs"), gardener: gardenerById("brother") });
  assert.ok(pat.orders[0].fresh > base.orders[0].fresh * 1.5);

  // Sister Green Thumb regrows faster and resists pests longer
  const grn = newGame({ seed: 4, stage: stageById("vigil"), gardener: gardenerById("green") });
  const b2 = newGame({ seed: 4, stage: stageById("vigil"), gardener: gardenerById("brother") });
  assert.ok(grn.spots[0].growTime < b2.spots[0].growTime);
});

test("pretend players: every stage (including Endless) terminates and separates idle (0★), steady (>=2★), and quick (3★)", () => {
  function play(stage, pause, pestFirst, gardener, seed) {
    const g = newGame({ seed, stage, gardener });
    let wait = 0.5;
    while (!g.over && g.t < 400) {
      tick(g, 0.1);
      wait -= 0.1;
      if (wait > 0) continue;
      wait = pause;
      if (g.pests.length && (pestFirst || g.pests[0].left < 2.2)) {
        const urgent = [...g.pests].sort((a, b) => a.left - b.left)[0];
        tapPest(g, urgent.id);
        continue;
      }
      if (!stage.vigil && g.orders.length) {
        const ord = [...g.orders].sort((a, b) => (b.age / b.fresh) - (a.age / a.fresh))[0];
        const need = new Set(ord.items.filter((x) => !x.done).map((x) => x.crop));
        const ripe = g.spots.find((s) => s.ripe && need.has(s.crop));
        if (ripe) { tapSpot(g, ripe.id); continue; }
      }
      if (g.pests.length) tapPest(g, g.pests[0].id);
    }
    return g;
  }

  const bro = gardenerById("brother");
  for (const st of STAGES) {
    const idle = play(st, 999, false, bro, 1);
    const steady = play(st, 1.5, false, bro, 2);
    const quick = play(st, 0.7, true, bro, 3);
    assert.equal(idle.over, true, `${st.id} idle ends`);
    assert.equal(steady.over, true, `${st.id} steady ends`);
    assert.equal(quick.over, true, `${st.id} quick ends`);
    assert.equal(starsFor(idle), 0, `${st.id} idle gets 0★ (got ${idle.score})`);
    assert.ok(starsFor(steady) >= 2, `${st.id} steady player gets >=2★ (got ${steady.score} vs ${st.star2})`);
    assert.equal(starsFor(quick), 3, `${st.id} quick player earns 3★ (got ${quick.score} vs ${st.star3})`);
  }

  const endStage = stageById("endless");
  for (const gd of [gardenerById("bugs"), gardenerById("green"), bro]) {
    const pause = gd === bro ? 0.25 : 0.45;
    const run = play(endStage, pause, true, gd, 4);
    assert.equal(run.over, true, `endless ${gd.id} (${pause}s) eventually fills eaten meter`);
  }
});

test("all 5 Angelio games use star-based stickers (3★ giant regardless of mistakes, 2★ mini)", () => {
  for (const game of ["candles", "usher", "porter", "match", "garden"]) {
    const src = fs.readFileSync(new URL(`../../${game}/public/js/app.js`, import.meta.url), "utf8");
    assert.match(src, /stickerBook\(\s*\{\s*byStars:\s*true\s*\}\s*\)/, `${game} stickerBook uses byStars`);
    assert.match(src, /showFinish\([\s\S]*?byStars:\s*true/, `${game} showFinish uses byStars`);
  }
});

test("app.js finish() scope, TDZ initialization order, picker wiring, 2-helper cap, and valid crops/pests", () => {
  assert.ok(CROPS.length >= 7 && PESTS.length >= 4);
  const src = fs.readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
  const finishPos = src.indexOf("function finish()");
  const handlePos = src.indexOf("function handle(");
  const asyncPos = src.indexOf("(async () => {");
  const declPos = src.indexOf("let last = performance.now(), lastOrderHtml");
  const syncEatenPos = src.indexOf("syncEaten();");
  const syncOrdersPos = src.indexOf("syncOrders();");
  assert.ok(finishPos > 0 && handlePos > finishPos && asyncPos > handlePos);
  assert.ok(declPos > asyncPos && syncEatenPos > declPos && syncOrdersPos > declPos);
  assert.ok(src.slice(finishPos, handlePos).includes("finish-pick"));

  const plotSrc = fs.readFileSync(new URL("../public/js/plot.js", import.meta.url), "utf8");
  assert.match(plotSrc, /MAX_COURIERS\s*=\s*2\b/);
  assert.match(plotSrc, /HELPER_POSTS\s*=/);
  assert.match(plotSrc, /nextCourier\s*=/);
  assert.ok(!plotSrc.includes("grandfather-idle"), "no mismatched grandfather idle fallback");
  assert.ok(!plotSrc.includes("grandmother-idle"), "no mismatched grandmother idle fallback");
  assert.match(plotSrc, /monk-idle/);
  assert.match(plotSrc, /nun-idle/);
  assert.match(plotSrc, /man-idle/);
  assert.match(plotSrc, /woman-idle/);
  assert.match(plotSrc, /TREE_COLLIDER_R/);
  assert.match(plotSrc, /treeColliders/);
  assert.match(plotSrc, /frustumCulled\s*=\s*false/);
  assert.ok(!plotSrc.includes("scene.remove(c.actor.g)"), "helpers stay persistent in scene");

  const cssSrc = fs.readFileSync(new URL("../public/css/app.css", import.meta.url), "utf8");
  assert.ok(!/@keyframes\s+bob\b/.test(cssSrc), "must not override base.css @keyframes bob for stickers");
});
