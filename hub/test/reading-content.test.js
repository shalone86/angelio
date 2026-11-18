import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../apps/letters/public/js/phonics.js";
import { validateReading, checkPattern } from "../public/js/reading-content.js";

test("today's reading lessons pass the Studio's rules", () => {
  assert.deepEqual(validateReading({ patterns: P.PATTERNS }, P).errors, []);
});

test("the rules catch what would break a lesson", () => {
  const base = () => structuredClone(P.PATTERNS.find((p) => p.id === "k-ck"));
  const cases = [
    [(p) => { p.pictures[0] = ["d|u|ck", ""]; }, /needs its picture/],
    [(p) => { p.pictures[0] = ["d|u|k", "🦆"]; }, /doesn't use what the lesson teaches/],
    [(p) => { p.words.push(p.words[0]); }, /in the lesson twice/],
    [(p) => { p.sentences[0] = ["a duck.", "🦆"]; }, /capital letter/],
    [(p) => { p.sentences[1][1] = p.sentences[0][1]; }, /different picture/],
    [(p) => { p.level = 3; }, /Level 1 or Level 2/],
    [(p) => { p.teach = "<script>x</script>"; }, /bold/],
    [(p) => { p.pictures = p.pictures.slice(0, 3); }, /at least 6 picture words/],
    [(p) => { p.words[0] = "zz|qq"; }, /chunk “zz” has no sound/],
  ];
  for (const [breakIt, want] of cases) {
    const p = base(); breakIt(p);
    const { errors } = checkPattern(p, P);
    assert.ok(errors.some((e) => want.test(e)), `${want}: ${JSON.stringify(errors)}`);
  }
  assert.match(validateReading({ patterns: [P.PATTERNS[0], P.PATTERNS[0]] }, P).errors.join(" "), /Two lessons have the id/);
});
