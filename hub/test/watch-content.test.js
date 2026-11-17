import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateLibrary, derivePeople, newId, prepareForSave } from "../public/js/watch-content.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../../apps/watch/public/data/library.json", import.meta.url), "utf8"));
const copy = () => structuredClone(LIB);

test("today's Watch & Sing library passes; people rebuilt from credits match", () => {
  assert.deepEqual(validateLibrary(LIB), { errors: [], warnings: [] });
  const ids = (ps) => ps.map((p) => `${p.id}:${[...p.songs].sort()}`).sort();
  assert.deepEqual(ids(derivePeople(LIB)), ids(LIB.people));
});

test("broken entries are caught before saving", () => {
  const cases = [
    [(l) => { l.lessons[1].id = l.lessons[0].id; }, /Two lessons have the id/],
    [(l) => { l.songs[0].title = " "; }, /has no title/],
    [(l) => { l.courses[0].items.push("no-such-lesson"); }, /doesn't exist: “no-such-lesson”/],
    [(l) => { l.lessons[0].video = "javascript:alert(1)"; }, /video address/],
    [(l) => { l.lessons.find((x) => x.quiz?.length).quiz[0] = { type: "choice", q: "Pick", choices: ["a", "b"], answer: 5 }; }, /pick which answer is right/],
    [(l) => { l.lessons.find((x) => x.quiz?.length).quiz[0] = { type: "blank", q: "No blank here", words: ["a", "b"], answer: "a" }; }, /put ____/],
    [(l) => { l.lessons.find((x) => x.quiz?.length).quiz[0] = { type: "blank", q: "A ____.", words: ["a", "b"], answer: "c" }; }, /one of the word tiles/],
    [(l) => { l.lessons.find((x) => x.quiz?.length).quiz[0] = { type: "match", q: "Match", pairs: [["a", "b"]] }; }, /two pairs/],
    [(l) => { l.songs[0].downloads.push({ kind: "🎧", label: "x", url: "" }); }, /has no file/],
    [(l) => { delete l.albums; }, /no albums list/],
  ];
  for (const [breakIt, want] of cases) {
    const l = copy(); breakIt(l);
    const { errors } = validateLibrary(l);
    assert.ok(errors.some((e) => want.test(e)), `${want}: got ${JSON.stringify(errors)}`);
  }
});

test("new ids never clash; a save rebuilds people", () => {
  assert.equal(newId("What is Lent?", LIB.lessons), "what-is-lent-2");
  assert.equal(newId("A Brand New Song!", LIB.songs), "a-brand-new-song");
  const l = copy();
  l.songs[0].credits = { written: ["Shalone Cason", "Jane Newname"] };
  const saved = prepareForSave(l);
  assert.ok(saved.people.find((p) => p.id === "jane-newname").songs.includes(l.songs[0].id));
  assert.equal(validateLibrary(saved).errors.length, 0);
});
