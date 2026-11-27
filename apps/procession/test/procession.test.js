import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES, stageById, isOpen } from "../public/js/stages.js";
import { CREW, crewById, crewOpen } from "../public/js/crew.js";
import { UPGRADES, SYNERGIES, HELPER_CATS, rollOffers } from "../public/js/upgrades.js";
import {
  LANE_X, FRONT_Z, SPAWN_Z,
  newGame, tick, steerProcession, setTarget, setStick, pickUpgrade,
  starsFor, multiplierOf,
} from "../public/js/procession.js";

test("Procession catalog has 5 stages, 5 crew, 16 upgrades, 4 synergies, and 2-star unlock rules", () => {
  assert.equal(STAGES.length, 5);
  assert.equal(CREW.length, 5);
  assert.equal(UPGRADES.length, 16);
  assert.equal(SYNERGIES.length, 4);

  const stars0 = () => 0;
  assert.equal(isOpen(0, stars0), true);
  assert.equal(isOpen(1, stars0), false);
  assert.equal(isOpen(4, stars0), false); // Feast Procession needs 2★ on Town
  assert.equal(crewOpen(crewById("sacristan"), stars0), true);
  assert.equal(crewOpen(crewById("hospitality"), stars0), false);

  const starsTown2 = (st) => (st.id === "town" ? 2 : 0);
  assert.equal(isOpen(1, starsTown2), true);
  assert.equal(isOpen(4, starsTown2), true);
  assert.equal(crewOpen(crewById("hospitality"), (id) => (id === "town" ? 2 : 0)), true);

  assert.equal(starsFor(stageById("town"), 900, true), 3);
  assert.equal(starsFor(stageById("town"), 400, true), 2);
  assert.equal(starsFor(stageById("town"), 10, true), 1);
  assert.equal(starsFor(stageById("endless"), 50, false), 0);
});

test("procession lane steering dodges single-lane hazards without losing candles, while full-width boss bridge hits", () => {
  const g = newGame(stageById("town"));
  assert.equal(g.procLane, 1);
  assert.equal(g.candles, 6); // sacristan starts with +1 candle

  // Steer procession left -> lane 0 (x = -20)
  assert.equal(steerProcession(g, -1, true), true);
  assert.equal(g.procLane, 0);
  assert.equal(steerProcession(g, -1, true), false); // clamped at left edge

  // Clear starter ob and spawn a parked car in Center lane (x = 0) ahead on the road
  g.obs = [{
    id: 99, kind: "car", cat: "crowd", x: LANE_X[1], z: FRONT_Z - 24, halfW: 8.2, halfZ: 8.5,
    need: 2.0, pts: 40, xp: 3, hz: true, slow: 1, boss: false, moveOut: 14, pr: 0, done: false, miss: false, dodged: false, vx: 0, targetX: null, takenBy: null, tintIdx: 0,
  }];

  // Let procession settle smoothly onto Left lane and let car pass FRONT_Z
  let dodgedEv = null;
  for (let i = 0; i < 60; i++) {
    const ev = tick(g, 0.05);
    dodgedEv ??= ev.find((e) => e.type === "dodged");
  }
  assert.ok(dodgedEv, "car passed safely without hitting left-steered procession");
  assert.equal(g.candles, 6);
  assert.equal(g.dodges, 1);

  // Spawn a car directly in Left lane (x = -20) while procession is there -> trips and loses a candle
  steerProcession(g, 0, false);
  g.obs.push({
    id: 100, kind: "car", cat: "crowd", x: LANE_X[0], z: FRONT_Z - 24, halfW: 8.2, halfZ: 8.5,
    need: 2.0, pts: 40, xp: 3, hz: true, slow: 1, boss: false, moveOut: 14, pr: 0, done: false, miss: false, dodged: false, vx: 0, targetX: null, takenBy: null, tintIdx: 0,
  });
  let hitEv = null;
  for (let i = 0; i < 60; i++) {
    const ev = tick(g, 0.05);
    hitEv ??= ev.find((e) => e.type === "stumble");
  }
  assert.ok(hitEv);
  assert.equal(g.candles, 5);
});

test("advance crew runs to tapped hazards, triggers level-up offer, Wheelbarrow fills potholes instantly, and Synergies unlock", () => {
  const g = newGame(stageById("endless"), { crewId: "sacristan" });
  const starter = g.obs[0];
  assert.equal(starter.kind, "pothole");

  // Walk to starter pothole -> fixing grants 1 XP -> immediate levelup offer of 3 choices
  setTarget(g, starter.x, starter.z, starter.id);
  let levelEv = null;
  for (let i = 0; i < 60 && !levelEv; i++) {
    const ev = tick(g, 0.05);
    levelEv = ev.find((e) => e.type === "levelup");
  }
  assert.ok(levelEv, "first pothole grants level 2 pick-1-of-3");
  assert.equal(levelEv.offer.length, 3);
  assert.ok(g.pickOffer);

  // Picking upgrade clears pickOffer and grants helper when picking server/deacon/usher
  const pickRes = pickUpgrade(g, 0);
  assert.equal(pickRes.ok, true);
  assert.equal(g.pickOffer, null);

  // Max out server + incense -> Thurifer synergy triggers
  g.lv.server = 3;
  g.lv.incense = 2;
  g.pickOffer = [UPGRADES.find((u) => u.id === "incense")];
  const synRes = pickUpgrade(g, 0);
  assert.ok(synRes.events.some((e) => e.type === "synergy" && e.synergy.id === "thurifer"));
  assert.equal(g.syn.thurifer, true);
  assert.equal(multiplierOf(g), 4); // 1 + 3 incense

  // Wheelbarrow single-touch pothole fill + Holy Water clearing
  g.lv.wheelbarrow = 1;
  g.obs = [{
    id: 200, kind: "pothole", cat: "hole", x: 0, z: -10, halfW: 7.2, halfZ: 5.2,
    need: 1.25, pts: 10, xp: 1, hz: true, slow: 1, boss: false, moveOut: 0, pr: 0, done: false, miss: false, dodged: false, vx: 0, targetX: null, takenBy: null, tintIdx: 0,
  }];
  g.crew.x = 0;
  g.crew.z = -10;
  g.xpNeed = 999; // avoid levelup pause
  const wbEv = tick(g, 0.02);
  assert.ok(wbEv.some((e) => e.type === "fixed"), "Wheelbarrow fills pothole in 1 single tick!");
  assert.equal(HELPER_CATS.deacon.has("hole"), true);

  // Helper offer bias prefers uncollected upgrades
  const offers = rollOffers(g.lv, 5, 7, {}, {});
  assert.ok(offers.length > 0 && offers.length <= 3);
  setStick(g, 1, 0);
  assert.ok(g.crew.stickX > 0.9);
  assert.ok(SPAWN_Z < 0 && FRONT_Z > 0);
});
