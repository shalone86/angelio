import { test } from "node:test";
import assert from "node:assert/strict";
import { stepAgents, RADIUS } from "../public/js/steer.js";

const agent = (id, x, z, gx, gz, speed = 14, extra = {}) => ({ id, x, z, goal: gx == null ? null : { x: gx, z: gz }, speed, ...extra });
// run until everyone with a goal has arrived (or `max` seconds), returning the closest any two came and when it ended
function run(agents, max = 20, dt = 0.05) {
  let min = Infinity, t = 0;
  for (; t < max; t += dt) {
    stepAgents(agents, dt);
    for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) min = Math.min(min, Math.hypot(agents[i].x - agents[j].x, agents[i].z - agents[j].z));
    if (agents.every((a) => !a.goal)) break;
  }
  return { min, t };
}

test("two people walking straight at each other go past with room to spare", () => {
  const a = agent(1, 0, -20, 0, 20), b = agent(2, 0, 20, 0, -20);
  const { min, t } = run([a, b]);
  assert.ok(!a.goal && !b.goal, "both arrived");
  assert.ok(min > RADIUS * 1.5, `they stayed ${min.toFixed(2)} apart`);
  assert.ok(t < 6, `and got there in ${t.toFixed(1)} s`);
});

test("someone walks around a person standing in the way", () => {
  const stander = agent(9, 0, 0, null, null, 0, { fixed: true }), a = agent(1, 0, -25, 0, 25);
  const { min } = run([stander, a]);
  assert.ok(!a.goal, "arrived");
  assert.ok(min > RADIUS * 1.4, `passed ${min.toFixed(2)} away`);
});

test("a crowd crossing both ways on a path all gets through, without walking through each other much", () => {
  const crowd = [];
  for (let i = 0; i < 6; i++) crowd.push(agent(i, -3 + (i % 3) * 3, -30 - i * 4, -3 + (i % 3) * 3, 30 + i * 3.5, 14 + i));
  for (let i = 0; i < 6; i++) crowd.push(agent(10 + i, 3 - (i % 3) * 3, 30 + i * 4, 3 - (i % 3) * 3, -30 - i * 3.5, 14 + i));
  const { min, t } = run(crowd, 30);
  assert.ok(crowd.every((a) => !a.goal), "everyone arrived");
  assert.ok(min > RADIUS * 0.7, `the closest two came ${min.toFixed(2)} apart`);
  assert.ok(t < 15, `in ${t.toFixed(1)} s`);
});

test("people standing in a line are walked around; people leaving use the other side", () => {
  const line = [0, 1, 2, 3].map((i) => agent(50 + i, ((i * 7) % 3) - 1, -17 - i * 7, null, null, 0, { fixed: true }));
  const leaver = agent(1, 0, -10, 3.8, -75, 18);                  // sent away: walks to the right side of the path, then down it
  const { min } = run([...line, leaver], 20);
  assert.ok(leaver.goal === null && leaver.z < -70 || !leaver.goal, "got away");
  assert.ok(min > RADIUS * 1.3, `${min.toFixed(2)} from the closest person in line`);
});

test("nobody is ever stuck: someone boxed in by people standing still still gets where they're going", () => {
  const wall = [-3, 0, 3].map((x, i) => agent(20 + i, x, 0, null, null, 0, { fixed: true, r: 2.5 }));
  const a = agent(1, 0, -10, 0, 10);
  const { t } = run([...wall, a], 20);
  assert.ok(!a.goal, "arrived");
  assert.ok(t < 12, `after ${t.toFixed(1)} s`);
});

test("a person with no goal stays put, and arriving snaps to the goal", () => {
  const s = agent(1, 5, 5, null, null, 0), w = agent(2, 0, 0, 0, 10);
  let got = [];
  for (let i = 0; i < 20 && !got.includes(w); i++) got = stepAgents([s, w], 0.2);
  assert.deepEqual([s.x, s.z], [5, 5]);
  assert.ok(got.includes(w) && w.z === 10 && w.goal === null);
});

test("someone who ignores the others walks straight, and the others still walk around them", () => {
  const server = agent(1, 0, -20, 0, 20, 10, { ignore: true }), p = agent(2, 0, 20, 0, -20, 10);
  const { min } = run([server, p]);
  assert.ok(!server.goal && !p.goal);
  assert.ok(Math.abs(server.x) < 0.01 || server.x === 0, "he went straight");
  assert.ok(min > RADIUS * 1.2, `and the other went around (${min.toFixed(2)} apart)`);
});
