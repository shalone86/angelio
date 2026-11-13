import { test } from "node:test";
import assert from "node:assert/strict";
import { PATTERNS, chunks, wordOf, makePhonics, focusIndexes, patternWord } from "../public/js/phonics.js";
import { seeded } from "../public/js/reading.js";

const words = (t) => t.split(/\s+/).length;
const LIMITS = { 2: [2, 4], 3: [4, 7], 4: [7, 11], 5: [12, 30] }; // K, 1st, 2nd, 3rd (3rd: two sentences)

test("every pattern: enough pictures, words and sentences; chunks spell the word and every chunk has a sound", () => {
  const ids = new Set();
  for (const p of PATTERNS) {
    assert.ok(!ids.has(p.id), p.id); ids.add(p.id);
    assert.ok(p.pictures.length >= 6, `${p.id}: pictures`);
    assert.ok(p.words.length >= 8, `${p.id}: words`);
    assert.ok(p.sentences.length >= 5, `${p.id}: sentences`);
    assert.ok(p.teach && p.say, `${p.id}: how it works`);
    for (const spec of [...p.pictures.map(([s]) => s), ...p.words]) {
      const ch = chunks(spec, p.syllables);
      assert.equal(ch.map((c) => c.t).join(""), wordOf(spec), spec);
      for (const c of ch) assert.ok(c.silent || (c.s && !/undefined/.test(c.s)), `${spec}: chunk ${c.t} has no sound`);
      if (p.focus.length || p.magic) assert.ok(focusIndexes(p, ch).length > 0 || p.id === "g1-blends", `${p.id}: ${spec} shows the pattern`);
    }
    const all = [...p.pictures.map(([s]) => wordOf(s)), ...p.words.map(wordOf)];
    assert.equal(new Set(all).size, all.length, `${p.id}: repeated word`);
    for (const [t, e] of p.sentences) {
      const [lo, hi] = LIMITS[p.grade];
      assert.ok(words(t) >= lo && words(t) <= hi, `${p.id}: "${t}" has ${words(t)} words, want ${lo}–${hi}`);
      assert.match(t, /^[A-Z].*[.!?]$/, t);
      if (p.grade === 5) assert.ok(t.split(/[.!?]\s/).length >= 2, `${p.id}: 3rd grade reads two sentences: ${t}`);
      if (p.focus.length || p.magic) assert.ok(t.split(/\s+/).some((w) => patternWord(p, w)), `${p.id}: "${t}" uses the pattern`);
      assert.ok(e, t);
    }
    assert.equal(new Set(p.sentences.map(([, e]) => e)).size, p.sentences.length, `${p.id}: each sentence's picture is different`);
  }
});

test("blends show the pattern in every picture word", () => {
  const p = PATTERNS.find((x) => x.id === "g1-blends");
  for (const [spec] of p.pictures) assert.ok(focusIndexes(p, chunks(spec)).length >= 2, spec);
});

test("questions: the answer is always a choice, no duplicate choices", () => {
  for (const p of PATTERNS) for (let seed = 1; seed < 300; seed++) {
    const qs = makePhonics(p, seeded(seed));
    assert.equal(qs.length, 6);
    for (const q of qs) {
      const vals = q.choices.map((c) => c.word);
      assert.ok(vals.includes(q.answer), `${p.id}: ${q.answer} in ${vals}`);
      assert.equal(new Set(vals).size, vals.length, `${p.id}: ${vals}`);
      assert.equal(vals.length, 3, `${p.id}: three choices`);
    }
  }
});
