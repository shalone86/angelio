import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeSentence, analyzeWordList, montessoriSvg } from "../public/js/grammar.js";

test("Copy word mode keeps each word independent in lists of any length", () => {
  const list = analyzeWordList("Cat, brave\nQUICKLY softly ran friendly");
  assert.deepEqual(list.map((word) => word.raw), ["Cat", "brave", "QUICKLY", "softly", "ran", "friendly"]);
  assert.deepEqual(list.map((word) => word.pos), ["noun", "adjective", "adverb", "adverb", "verb", "adjective"]);
  assert.equal(analyzeWordList("quickly")[0].pos, list[2].pos);
  assert.match(montessoriSvg(list[2].pos), /msym-adverb/);
});

test("Copy word mode avoids guessing symbols for ambiguous or unfamiliar words", () => {
  const [well, look, teacher, unknown] = analyzeWordList("Well! look teacher zorbly");
  assert.equal(well.pos, "");
  assert.deepEqual(well.possible, ["adverb", "adjective", "noun", "verb", "interjection"]);
  assert.equal(well.trailingPunct, true);
  assert.equal(look.pos, "");
  assert.ok(look.possible.includes("verb"));
  assert.equal(teacher.pos, "noun");
  assert.equal(unknown.pos, "");
  assert.deepEqual(unknown.possible, []);
  assert.deepEqual(analyzeWordList(" , \n "), []);
});

test("Copy sentence mode retains the existing sentence analysis", () => {
  assert.deepEqual(analyzeSentence("The friendly cat ran quickly.").map((word) => word.pos),
    ["article", "adjective", "noun", "verb", "adverb"]);
});
