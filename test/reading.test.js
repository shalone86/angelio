import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGES, makeStage, LETTERS, GROUPS, ALL_LETTERS, RHYMES, BEATS, CVC, rhymes, PER_STAGE } from "../public/js/reading.js";

test("every letter has a sound and picture words that really start with it", () => {
  for (const l of ALL_LETTERS) {
    assert.ok(LETTERS[l]?.sound, l);
    assert.ok(LETTERS[l].words.length >= 2, `${l}: at least two pictures`);
    for (const [w] of LETTERS[l].words) assert.equal(w[0], l, `${w} starts with ${l}`);
  }
  assert.equal(new Set(ALL_LETTERS).size, ALL_LETTERS.length);
});

test("word lists: three-letter words use only letters we teach; beats add up; rhyme pairs rhyme", () => {
  for (const [w] of CVC) { assert.equal(w.length, 3, w); for (const l of w) assert.ok(ALL_LETTERS.includes(l), `${w}: ${l}`); assert.ok("aeiou".includes(w[1]), `${w}: short vowel in the middle`); }
  for (const [w, , parts] of BEATS) assert.equal(parts.join(""), w, `${w}: beats spell the word`);
  for (const [[a], [b]] of RHYMES) assert.notEqual(a, b);
});

test("thousands of questions: the answer is always a choice, no repeats in a choice list, c and k never together", () => {
  for (const s of STAGES) for (let seed = 1; seed < 400; seed++) {
    const qs = makeStage(s, seed);
    assert.equal(qs.length, PER_STAGE, s.id);
    if (s.type === "letters") assert.equal(new Set(qs.slice(0, 4).map((q) => q.letter)).size, 4, `${s.id}: four different letters`);
    for (const q of qs) {
      assert.ok(q.prompt && q.say && !/undefined|NaN/.test(q.say + q.prompt), `${s.id}: ${q.prompt}`);
      if (q.choices) {
        const vals = q.choices.map((c) => (typeof c === "string" ? c : c.word));
        assert.ok(vals.includes(q.answer), `${s.id}: ${q.answer} in ${vals}`);
        assert.equal(new Set(vals).size, vals.length, `${s.id}: duplicate choice ${vals}`);
        if (typeof q.choices[0] === "string") assert.ok(!(vals.includes("c") && vals.includes("k")), `${s.id}: c and k together`);
      }
      if (q.type === "rhyme") for (const c of q.choices) if (c.word !== q.answer) assert.ok(!rhymes(c.word, q.word), `${q.word}/${c.word}`);
      if (q.type === "letters-picture") assert.equal(q.choices.filter((c) => c.word[0] === q.letter || (q.letter === "c" && c.word[0] === "k") || (q.letter === "k" && c.word[0] === "c")).length, 1, `${q.prompt}: one right picture`);
      if (q.type === "build") for (const l of q.letters) assert.ok(q.tiles.includes(l), `${q.word}: tile ${l}`);
    }
  }
});
