import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES, stageById, isOpen } from "../public/js/stages.js";
import { CREW, crewById, crewOpen } from "../public/js/crew.js";
import {
  LANE_X, FRONT_Z, SPAWN_Z,
  newGame, tick, steerProcession, setTarget, setStick,
  starsFor, multiplierOf,
} from "../public/js/procession.js";

test("Procession catalog has 5 stages, 5 crew, and 2-star unlock rules", () => {
  assert.equal(STAGES.length, 5);
  assert.equal(CREW.length, 5);

  const stars0 = () => 0;
  assert.equal(isOpen(0, stars0), true);
  assert.equal(isOpen(1, stars0), false);
  assert.equal(isOpen(4, stars0), false);
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

test("procession lane steering dodges single-lane hazards without losing candles", () => {
  const g = newGame(stageById("town"));
  assert.equal(g.procLane, 1);
  assert.equal(g.candles, 6); // sacristan starts with +1 candle

  assert.equal(steerProcession(g, -1, true), true);
  assert.equal(g.procLane, 0);
  assert.equal(steerProcession(g, -1, true), false);

  g.obs = [{
    id: 99, kind: "car", cat: "crowd", x: LANE_X[1], z: FRONT_Z - 24, halfW: 8.2, halfZ: 8.5,
    need: 2.0, pts: 40, hz: true, slow: 1, boss: false, moveOut: 14, pr: 0, done: false, miss: false, dodged: false, vx: 0, targetX: null, tintIdx: 0,
  }];

  let dodgedEv = null;
  for (let i = 0; i < 60; i++) {
    const ev = tick(g, 0.05);
    dodgedEv ??= ev.find((e) => e.type === "dodged");
  }
  assert.ok(dodgedEv, "car passed safely without hitting left-steered procession");
  assert.equal(g.candles, 6);
  assert.equal(g.dodges, 1);

  steerProcession(g, 0, false);
  g.obs.push({
    id: 100, kind: "car", cat: "crowd", x: LANE_X[0], z: FRONT_Z - 24, halfW: 8.2, halfZ: 8.5,
    need: 2.0, pts: 40, hz: true, slow: 1, boss: false, moveOut: 14, pr: 0, done: false, miss: false, dodged: false, vx: 0, targetX: null, tintIdx: 0,
  });
  let hitEv = null;
  for (let i = 0; i < 60; i++) {
    const ev = tick(g, 0.05);
    hitEv ??= ev.find((e) => e.type === "stumble");
  }
  assert.ok(hitEv);
  assert.equal(g.candles, 5);
});

test("crew facing looks away (PI) when idle, walking ahead, or fixing, and faces screen (0) only when returning toward procession", () => {
  const g = newGame(stageById("town"));
  assert.ok(Math.abs(g.crew.dir - Math.PI) < 0.01, "starts facing away up the road");

  const starter = g.obs[0];
  setTarget(g, starter.x, starter.z, starter.id);
  tick(g, 0.05);
  assert.ok(Math.abs(Math.abs(g.crew.dir) - Math.PI) < 0.15, "faces away while running up to pothole");

  // Reaches right on top of the clicked item (distance === 0), stays facing away while riding/fixing, and finishes in one tap
  let fixedEv = null;
  let minStarterDist = Infinity;
  let postArrivalBadDir = 0;
  for (let i = 0; i < 60; i++) {
    const ev = tick(g, 0.05);
    fixedEv ??= ev.find((e) => e.type === "fixed");
    if (!starter.done) {
      const dist = Math.hypot(g.crew.x - starter.x, g.crew.z - starter.z);
      minStarterDist = Math.min(minStarterDist, dist);
      if (dist <= 0.1 && Math.abs(g.crew.dir - Math.PI) >= 0.01) postArrivalBadDir++;
    }
  }
  assert.ok(fixedEv);
  assert.ok(minStarterDist <= 0.01, `lands squarely on top of item (got minDist=${minStarterDist})`);
  assert.equal(postArrivalBadDir, 0, "keeps facing away (PI) while riding and fixing");
  assert.equal(g.score, 10);
  assert.ok(Math.abs(g.crew.dir - Math.PI) < 0.01, "faces away again once stopped");

  // Dog chase (obId: null) goes to clicked spot (scrolling forward in z) without sideways heat-seeking
  const dog = {
    id: 200, kind: "dog", cat: "crowd", x: -16, z: -20, halfW: 3.4, halfZ: 3.4,
    need: 1.5, pts: 30, hz: true, slow: 1, boss: false, moveOut: 14, pr: 0, done: false, miss: false, dodged: false, vx: 18, targetX: null, tintIdx: 0,
  };
  g.obs.push(dog);
  const clickedX = dog.x;
  setTarget(g, clickedX, dog.z, null);
  for (let i = 0; i < 30; i++) tick(g, 0.05);
  assert.ok(Math.abs(g.crew.x - clickedX) < 1.0 && Math.abs(dog.x - clickedX) > 4, "chases clicked dog spot without heat-seeking sideways");

  // Walk straight back toward the procession (+Z) -> faces toward camera (0)
  setTarget(g, g.crew.x, g.crew.z + 20, null);
  tick(g, 0.05);
  assert.ok(Math.abs(g.crew.dir) < 0.1, "faces camera only while walking back toward procession");

  setStick(g, 0, -1);
  tick(g, 0.05);
  assert.ok(Math.abs(Math.abs(g.crew.dir) - Math.PI) < 0.01);
});

test("unlockable crew passive perks work (Monsignor Church Bell auto-fix, Choir slowHymn, streak multipliers)", () => {
  const gMon = newGame(stageById("market"), { crewId: "monsignor" });
  assert.equal(gMon.candles, 5);
  let bellEv = null;
  for (let i = 0; i < 160; i++) {
    const ev = tick(gMon, 0.05);
    bellEv ??= ev.find((e) => e.type === "bell");
  }
  assert.ok(bellEv, "Monsignor rings Church Bell to clear hazard automatically");

  const gChoir = newGame(stageById("town"), { crewId: "choir" });
  tick(gChoir, 0.05);
  assert.ok(gChoir.speedNow < gChoir.speed);

  gChoir.streak = 25;
  assert.equal(multiplierOf(gChoir), 3);
  assert.ok(SPAWN_Z < 0 && FRONT_Z > 0);
});
