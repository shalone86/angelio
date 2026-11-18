import { test } from "node:test";
import assert from "node:assert/strict";
import { PREK_LEVELS, TOPICS, makePrekLevel, SHAPES, COLORS } from "../public/js/prek.js";

const key = (c) => `${c.shape}/${c.color}/${c.scale ?? 1}`;

test("every level: five questions, each with one right answer that's really right", () => {
  for (const level of PREK_LEVELS) {
    assert.ok(TOPICS.some((t) => t.id === level.topic), level.id);
    for (let seed = 1; seed < 400; seed++) {
      const qs = makePrekLevel(level, seed);
      assert.equal(qs.length, 5, level.id);
      for (const q of qs) {
        assert.ok(q.say && q.prompt && !/undefined|NaN/.test(q.say + q.prompt), `${level.id}: ${q.say}`);
        for (const c of [...(q.choices ?? []), ...(q.items ?? []), ...(q.seq ?? [])]) {
          assert.ok(SHAPES[c.shape], `${level.id}: shape ${c.shape}`); assert.ok(COLORS[c.color], `${level.id}: color ${c.color}`);
        }
        if (q.type === "find-shape" || q.type === "world-shape") {
          assert.equal(q.choices.filter((c) => c.shape === q.target).length, 1, `${level.id}: one ${q.target}`);
          assert.equal(q.choices[q.answer].shape, q.target);
          assert.equal(new Set(q.choices.map((c) => c.shape)).size, q.choices.length);
        }
        if (q.type === "find-color") { assert.equal(q.choices.filter((c) => c.color === q.target).length, 1); assert.equal(q.choices[q.answer].color, q.target); }
        if (q.type === "sort") {
          const field = q.by;
          for (const it of q.items) assert.equal(q.baskets.filter((b) => b[field] === it[field]).length, 1, `${level.id}: every item has one basket`);
          assert.notEqual(q.baskets[0][field], q.baskets[1][field]);
          assert.ok(q.baskets.every((b) => q.items.some((it) => it[field] === b[field])), "both baskets get something");
        }
        if (q.type === "odd") {
          const k = q.items.map(key), oddKey = k[q.answer];
          assert.equal(k.filter((x) => x === oddKey).length, 1, `${level.id}: one odd one`);
          assert.equal(new Set(k.filter((_, i) => i !== q.answer)).size, 1, "the other three are alike");
        }
        if (q.type === "pattern") {
          assert.ok(q.seq.length >= 5);
          const ch = q.choices.map(key);
          assert.equal(new Set(ch).size, 3, `${level.id}: three different choices`);
          // the right choice continues the repeating unit
          const unit = q.kind.length, next = q.seq[q.seq.length - unit];
          assert.equal(key(q.choices[q.answer]), key(next), `${level.id} ${q.kind}: continues the pattern`);
        }
        if (q.type === "compare") {
          if (q.ask === "same") { assert.equal(q.groups[0], q.groups[1]); assert.equal(q.answer, "same"); }
          else {
            assert.notEqual(q.groups[0], q.groups[1]);
            const want = q.ask === "more" ? Math.max(...q.groups) : Math.min(...q.groups);
            assert.equal(q.groups[q.answer], want);
            assert.ok(Math.max(...q.groups) <= 7 && Math.min(...q.groups) >= 1);
          }
        }
        if (q.type === "size") {
          assert.equal(new Set(q.sizes).size, q.sizes.length);
          const want = /bigger|longer|taller/.test(q.word) ? Math.max(...q.sizes) : Math.min(...q.sizes);
          assert.equal(q.sizes[q.answer], want);
        }
      }
    }
  }
});

test("level ids are unique and every topic has levels", () => {
  assert.equal(new Set(PREK_LEVELS.map((l) => l.id)).size, PREK_LEVELS.length);
  for (const t of TOPICS.filter((t) => t.id !== "numbers")) assert.ok(PREK_LEVELS.filter((l) => l.topic === t.id).length >= 3, t.id);
});
