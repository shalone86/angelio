// The workshop's own checks that need no packages (the repo-wide npm test runs them; the workshop's big video
// libraries are installed only on the Mac).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { watchQuiz, watchLesson } from "../scripts/watch-lesson.mjs";
import { validateLibrary } from "../../hub/public/js/watch-content.js";

test("the .vox reader is the same as Angelio's (scripts/vox.mjs is a copy of hub/public/js/vox.js)", () => {
  const copy = fs.readFileSync(new URL("../scripts/vox.mjs", import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(copy, fs.readFileSync(new URL("../../hub/public/js/vox.js", import.meta.url), "utf8"));
});

test("quiz questions become Watch & Sing questions", () => {
  assert.deepEqual(watchQuiz({ type: "truefalse", question: "Lent is 40 days.", answer: true, why: "It is." }, "x"),
    { type: "choice", q: "Lent is 40 days.", choices: ["True", "False"], answer: 0, why: "It is." });
  const b = watchQuiz({ type: "blank", question: "It began in ____.", accept: ["Antioch"], wrong: ["Rome", "Paris"], why: "Acts 11:26" }, "x");
  assert.equal(b.answer, "Antioch");
  assert.deepEqual([...b.words].sort(), ["Antioch", "Paris", "Rome"]);
  assert.throws(() => watchQuiz({ type: "blank", question: "It began in ____.", accept: ["Antioch"], why: "y" }, "x"), /wrong words/);
  assert.throws(() => watchQuiz({ type: "choice", question: "Q", options: ["a"], answer: 3, why: "y" }, "x"), /answer/);
});

test("a whole lesson goes into the Watch & Sing library and passes its rules", () => {
  const point = (heading, quiz) => ({ kind: "point", name: heading, heading, quote: { lead: "The Catechism says:", text: "God is love.", cite: "Catechism 221", source: "ccc" }, explanation: "So we love too.", quiz });
  const info = {
    lesson: { title: "Who Is God?", replaces: "who-is-god", sources: [{ id: "ccc", label: "Catechism", url: "https://www.vatican.va/archive/ENG0015/__P17.HTM" }] },
    segments: [{ kind: "intro", text: "Hello!" }], points: [],
  };
  info.points = [point("God is love", [{ type: "choice", question: "God is…", options: ["love", "far"], answer: 0, why: "CCC 221" }])];
  info.segments.push(...info.points, { kind: "outro", text: "Bye!" });
  const w = watchLesson(info, { video: "media/studio/2026/11/x.mp4", poster: "media/studio/2026/11/x.png" });
  assert.equal(w.id, "who-is-god");
  assert.deepEqual(w.sources, [{ label: "Catechism 221", url: "https://www.vatican.va/archive/ENG0015/__P17.HTM" }]);
  assert.ok(w.transcript.includes("“God is love.” (Catechism 221)"));
  const lib = { courses: [{ id: "c", title: "C", items: [w.id] }], albums: [], songs: [], lessons: [w] };
  assert.deepEqual(validateLibrary(lib).errors, []);
});

import {withLook, LOOK_MARK} from '../video/voxel-draw.js';
test('a voxel picture\'s look swaps only his marker colors', () => {
  const art = {kind: 'voxel', fps: 4, size: [1, 1, 1], palette: [null, '#255359', '#FAD689', '#0b346e', '#ff77a8', '#24936e'], frames: []};
  const out = withLook(art, {hair: '#1b1410', skin: '#B97F55', chasuble: '#6b3fa0'});
  assert.deepEqual(out.palette, [null, '#1b1410', '#b97f55', '#0b346e', '#6b3fa0', '#24936e']); // eyes not picked: as painted
  assert.equal(withLook(art, undefined), art);
  assert.equal(withLook(art, {hair: 'red'}).palette[1], '#255359'); // only real colors
  assert.equal(LOOK_MARK.hair, '#255359');
  assert.equal(withLook({...art, palette: [null, '#ffcc66']}, {chasuble: '#2e5fa8'}).palette[1], '#2e5fa8'); // a Byzantine phelonion
});
