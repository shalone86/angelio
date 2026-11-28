import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GRADES, LEVELS, PER_LEVEL, levelById, makeLevel, starsFor, stepPos, checkMirrorGrid } from "../public/js/maps.js";
import { shapeSvg, linesSvg, angleSvg, compassSvg, coordPlaneSvg, volumeSvg, pathOverlaySvg } from "../public/js/maps-svg.js";
import { DEMO_IDS } from "../public/js/watch.js";

test("levels: 23 unique levels across Grades K–5, clean metadata & Watch How coverage", () => {
  assert.equal(LEVELS.length, 23);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  for (const l of LEVELS) {
    assert.ok(GRADES.some((g) => g.n === l.grade), l.id);
    assert.ok(l.title && l.emoji && l.teach && l.say && l.example, l.id);
    assert.equal(levelById(l.id), l);
    assert.equal(typeof l.gen, "function", l.id);
    assert.ok(DEMO_IDS.includes(l.id), `missing animated Watch How demo for ${l.id}`);
    if (l.id.endsWith("-intro")) {
      assert.ok(Array.isArray(l.introCards) && l.introCards.length >= 4, `${l.id}: introCards`);
    }
  }
});

test("200 seeded rounds per level: exact count, unambiguous answers, wording & SVG invariants", () => {
  for (const l of LEVELS) {
    for (let seed = 1; seed <= 200; seed++) {
      const qs = makeLevel(l, seed);
      assert.equal(qs.length, PER_LEVEL, `${l.id} seed=${seed}`);

      if (l.id === "g2-mirror-grid") {
        assert.equal(new Set(qs.map((q) => q.say)).size, PER_LEVEL, `g2-mirror-grid varied voice lines seed=${seed}`);
      }

      for (const q of qs) {
        assert.ok(q.prompt && q.say && q.hint && q.why, `${l.id}: missing prompt/say/hint/why`);
        assert.ok(!/undefined|NaN/.test(q.prompt + q.say + q.hint + q.why), `${l.id}: bad string`);

        if (l.id === "k1-position" && q.type === "tap-cell") {
          assert.ok(!/^Find the (?!picture)/i.test(q.say), `k1-position confusing Find the anchor phrasing: ${q.say}`);
        }
        if (l.id === "k1-symmetry-yesno") {
          assert.deepEqual(q.choices, ["Match ✓", "No match ✗"]);
          assert.match(q.why, /symmetry/i);
        }
        if (l.id === "g2-compass" && q.type === "choose") {
          assert.ok(q.prompt.includes(" is ___ of the "), `g2-compass unclear phrasing: ${q.prompt}`);
        }
        if (l.id === "g2-map-key" && q.pathLine) {
          assert.deepEqual(q.anchor, q.pathLine[0], "g2-map-key path questions must mark starting square anchor");
          const overlay = pathOverlaySvg({ rows: q.rows, cols: q.cols, pathLine: q.pathLine });
          assert.ok(overlay.includes("<polyline"), "pathOverlaySvg renders polyline");
          const ptsMatch = /points="([^"]+)"/.exec(overlay)?.[1] ?? "";
          const ptsList = ptsMatch.trim().split(/\s+/);
          const [r0, c0] = q.pathLine[0];
          const startCenter = `${c0 * 100 + 50},${r0 * 100 + 50}`;
          assert.ok(!ptsList.includes(startCenter), `dashed line must NOT include starting square center (${startCenter})`);
          const [x0, y0] = ptsList[0].split(",").map(Number);
          assert.ok(
            x0 < c0 * 100 || x0 > (c0 + 1) * 100 || y0 < r0 * 100 || y0 > (r0 + 1) * 100,
            `dashed line start (${x0},${y0}) must lie outside start square [${c0 * 100}..${(c0 + 1) * 100}, ${r0 * 100}..${(r0 + 1) * 100}]`,
          );
        }

        if (q.type === "choose") {
          assert.ok(q.choices.length >= 2 && q.choices.length <= 4, `${l.id}: choice count`);
          assert.equal(new Set(q.choices).size, q.choices.length, `${l.id}: duplicate choices ${q.choices}`);
          assert.ok(q.choices.includes(q.answer), `${l.id}: answer missing ${q.answer}`);
          if (q.shape) {
            const svg = shapeSvg(q.shape, { showDecor: q.showDecor, fold: q.fold, showSym: Boolean(q.revealSymAfter) });
            assert.ok(svg.includes("<svg"), `${l.id}: shapeSvg`);
          }
          if (q.lineKind) assert.ok(linesSvg(q.lineKind).includes("<svg"), `${l.id}: linesSvg`);
          if (q.angle) {
            if (!q.angle.protractor && !q.angle.split) {
              assert.ok(q.angle.deg === 90 || q.angle.deg <= 65 || q.angle.deg >= 115, `${l.id}: borderline angle ${q.angle.deg}`);
            }
            if (q.angle.split) {
              const miss = q.angle.split.total - q.angle.split.known;
              assert.equal(q.answer, `${miss}°`);
            }
            assert.ok(angleSvg(q.angle).includes("<svg"), `${l.id}: angleSvg`);
          }
          if (q.coordRead) {
            const [cx, cy] = q.coordRead.point;
            assert.notEqual(cx, cy, `${l.id}: x must not equal y`);
            assert.ok(q.choices.includes(`(${cy}, ${cx})`), `${l.id}: swap distractor missing`);
            assert.ok(coordPlaneSvg({ points: [{ x: cx, y: cy, label: q.coordRead.label }] }).includes("<svg"));
          }
          if (q.volume) {
            const h = q.volume.heights;
            assert.ok(volumeSvg(h, { dims: q.volume.dims }).includes("<svg"));
            if (!q.volume.dims) {
              // Strictly monotonic columns toward front-bottom-right so no cubes are hidden
              for (let r = 0; r < h.length; r++) {
                for (let c = 0; c < h[r].length; c++) {
                  if (r + 1 < h.length) assert.ok(h[r][c] >= h[r + 1][c], `${l.id}: hidden cube row`);
                  if (c + 1 < h[r].length) assert.ok(h[r][c] >= h[r][c + 1], `${l.id}: hidden cube col`);
                }
              }
            }
          }
        } else if (q.type === "intro-match") {
          assert.ok(q.askType === "visual" || q.askType === "name");
          assert.equal(q.choices.length, 3, `${l.id}: 3 choices`);
          assert.equal(new Set(q.choices).size, 3, `${l.id}: duplicate choices`);
          assert.ok(q.choices.includes(q.answer), `${l.id}: answer missing`);
          for (const c of q.choices) {
            const spec = q.choiceSpecs[c];
            assert.ok(spec, `${l.id}: missing choiceSpec ${c}`);
            if (spec.shape) assert.ok(shapeSvg(spec.shape, { showDecor: Boolean(spec.showDecor) }).includes("<svg"));
            if (spec.lineKind) assert.ok(linesSvg(spec.lineKind).includes("<svg"));
            if (spec.angle) assert.ok(angleSvg(spec.angle).includes("<svg"));
          }
        } else if (q.type === "tap-cell") {
          assert.ok(q.target[0] >= 0 && q.target[0] < q.rows);
          assert.ok(q.target[1] >= 0 && q.target[1] < q.cols);
        } else if (q.type === "walk-grid") {
          assert.ok(q.start[0] >= 0 && q.start[0] < q.rows && q.start[1] >= 0 && q.start[1] < q.cols);
          assert.ok(q.target[0] >= 0 && q.target[0] < q.rows && q.target[1] >= 0 && q.target[1] < q.cols);
          assert.ok(q.start[0] !== q.target[0] || q.start[1] !== q.target[1]);
        } else if (q.type === "mirror-grid") {
          assert.ok(q.leftCells.length >= 3);
          for (const [r, c] of q.leftCells) {
            assert.ok(r >= 0 && r < q.rows && c >= 0 && c < q.cols / 2);
          }
          const exactRight = q.leftCells.map(([r, c]) => `${r},${q.cols - 1 - c}`);
          assert.equal(checkMirrorGrid(exactRight, q.leftCells, q.cols).ok, true);
        } else if (q.type === "plot-point") {
          assert.ok(q.target[0] >= 0 && q.target[0] <= 6 && q.target[1] >= 0 && q.target[1] <= 6);
        } else if (q.type === "build-volume") {
          assert.equal(q.l * q.w, q.perLayer);
          assert.equal(q.perLayer * q.targetLayers, q.targetVolume);
          assert.ok(q.targetLayers >= 2 && q.targetLayers <= 4);
        } else {
          assert.fail(`Unknown question type: ${q.type}`);
        }
      }
    }
  }
  assert.ok(compassSvg().includes("<svg"));
});

test("stepPos and checkMirrorGrid helpers behave cleanly", () => {
  assert.deepEqual(stepPos([0, 0], "up", 4, 4), [0, 0]);
  assert.deepEqual(stepPos([0, 0], "right", 4, 4), [0, 1]);
  assert.deepEqual(stepPos([2, 2], "N", 5, 5), [1, 2]);
  assert.deepEqual(stepPos([2, 2], "W", 5, 5), [2, 1]);

  const left = [[0, 2], [1, 0]];
  const badCheck = checkMirrorGrid(["0,3", "0,5"], left, 6);
  assert.equal(badCheck.ok, false);
  assert.deepEqual(badCheck.keep, ["0,3"]);
  assert.deepEqual(badCheck.wrong, ["0,5"]);
  assert.deepEqual(badCheck.missing, ["1,5"]);
});

test("sw.js ASSETS all exist on disk and starsFor behaves cleanly", () => {
  const sw = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  const block = /const ASSETS = \[([^\]]+)\]/s.exec(sw)?.[1] ?? "";
  const list = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(list.length >= 20, "ASSETS list populated");
  const pub = new URL("../public/", import.meta.url).pathname;
  for (const rel of list) {
    const target = rel === "./" ? "index.html" : rel;
    assert.ok(fs.existsSync(path.join(pub, target)), `missing sw asset: ${rel}`);
  }
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(1), 2);
  assert.equal(starsFor(3), 2);
  assert.equal(starsFor(4), 1);
});
