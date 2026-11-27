import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GRADES, LEVELS, PER_LEVEL, levelById, makeLevel, starsFor,
  nextGuidedKey, checkTypedSentence, checkFreeWrite, isTypeable,
} from "../public/js/writing.js";

test("levels: 29 unique levels across Grades 1–4, each with >= 8 complete items", () => {
  assert.equal(LEVELS.length, 29);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  for (const l of LEVELS) {
    assert.ok(GRADES.some((g) => g.n === l.grade), l.id);
    assert.ok(l.title && l.emoji && l.teach && l.say && l.example, l.id);
    assert.ok(l.items.length >= 8, `${l.id}: at least 8 items`);
    assert.equal(levelById(l.id), l);
    for (const it of l.items) {
      assert.ok(it.prompt && it.say && it.hint && it.why, `${l.id}: missing prompt/say/hint/why`);
      assert.ok(!/undefined|NaN/.test(it.prompt + it.say + it.hint + it.why), `${l.id}: bad text`);
    }
  }
});

test("hundreds of generated rounds: exact item count, reachable answers, never pre-sorted", () => {
  for (const l of LEVELS) {
    for (let seed = 1; seed <= 200; seed++) {
      const qs = makeLevel(l, seed);
      assert.equal(qs.length, PER_LEVEL, l.id);
      assert.equal(new Set(qs.map((q) => q.say + "|" + (q.answer ?? q.sample ?? ""))).size, PER_LEVEL, `${l.id}: unique round items`);
      for (const q of qs) {
        assert.ok(["choose", "build", "order", "tap-sentence", "type-word", "type-sentence", "write-free"].includes(q.type), `${l.id}: unknown type ${q.type}`);
        if (q.type === "choose") {
          assert.ok(q.choices.length >= 2 && q.choices.length <= 3, `${l.id}: choice count`);
          assert.equal(new Set(q.choices).size, q.choices.length, `${l.id}: duplicate choices ${q.choices}`);
          assert.ok(q.choices.includes(q.answer), `${l.id}: missing answer ${q.answer}`);
        }
        if (q.type === "build") {
          assert.ok(q.words.length >= 4 && q.words.length <= 6, `${l.id}: ${q.words}`);
          assert.match(q.words[0], /^[A-Z]/, `${l.id}: first word capitalized`);
          assert.match(q.words.at(-1), /[.!?]$/, `${l.id}: last word punctuated`);
          assert.notEqual(q.tiles.join(" "), q.answer, `${l.id}: pre-sorted tiles`);
          assert.deepEqual([...q.tiles].sort(), [...q.words].sort());
        }
        if (q.type === "order") {
          assert.equal(q.steps.length, q.labels.length, `${l.id}: ${q.title}`);
          assert.notEqual(q.items.join("|"), q.steps.join("|"), `${l.id}: pre-sorted steps`);
          assert.deepEqual([...q.items].sort(), [...q.steps].sort());
          for (const s of q.steps) assert.match(s, /^[A-Z0-9]/, `${l.id}: step starts cleanly: ${s}`);
        }
        if (q.type === "tap-sentence") {
          assert.equal(q.sentences.length, 4, `${l.id}: 4 sentences`);
          assert.ok(q.oddIndex >= 0 && q.oddIndex < 4, `${l.id}: oddIndex`);
          for (const s of q.sentences) assert.match(s, /^[A-Z].*[.!?]$/, `${l.id}: ${s}`);
        }
        if (q.type === "type-word") {
          assert.match(q.answer, /^[a-z]{2,7}$/, `${l.id}: lowercase short word ${q.answer}`);
          assert.ok(q.text.includes("___"), `${l.id}: missing ___ blank`);
        }
        if (q.type === "type-sentence") {
          const list = q.accept?.length ? q.accept : [q.answer];
          assert.ok(list.includes(q.answer), `${l.id}: answer not in accept list`);
          for (const a of list) {
            assert.match(a, /^[A-Z].*[.?!]$/, `${l.id}: malformed answer: ${a}`);
            assert.ok(isTypeable(a), `${l.id}: untypeable char in ${a}`);
            assert.equal(checkTypedSentence(a, q).ok, true, `${l.id}: failed own answer: ${a}`);
          }
          if (q.prefill != null) {
            assert.ok(isTypeable(q.prefill), `${l.id}: untypeable prefill ${q.prefill}`);
            assert.equal(checkTypedSentence(q.prefill, q).ok, false, `${l.id}: prefill already passes!`);
          }
        }
        if (q.type === "write-free") {
          assert.ok(q.sample, `${l.id}: missing sample`);
          assert.equal(checkFreeWrite(q.sample, q).ok, true, `${l.id}: sample failed checklist: ${q.sample}`);
          assert.equal(checkFreeWrite("", q).ok, false, `${l.id}: empty accepted`);
          assert.equal(checkFreeWrite("zzzz qqqq xxxx rrrr tttt.", q).ok, false, `${l.id}: gibberish accepted`);
          assert.equal(checkFreeWrite(q.sample[0].toLowerCase() + q.sample.slice(1), q).ok, false, `${l.id}: lowercase accepted`);
          assert.equal(checkFreeWrite(q.sample.replace(/[.!?]+$/, ""), q).ok, false, `${l.id}: unpunctuated accepted`);
          for (const copy of q.rules?.notCopyOf ?? []) {
            assert.equal(checkFreeWrite(copy, q).ok, false, `${l.id}: verbatim copy accepted: ${copy}`);
          }
        }
      }
    }
  }
});

test("keyboard guide and sentence diagnostics catch exact mistake classes", () => {
  assert.equal(nextGuidedKey("", "The dog ran.", false), "shift");
  assert.equal(nextGuidedKey("", "The dog ran.", true), "t");
  assert.equal(nextGuidedKey("T", "The dog ran.", false), "h");
  assert.equal(nextGuidedKey("The", "The dog ran.", false), " ");
  assert.equal(nextGuidedKey("The z", "The dog ran.", false), "back");
  assert.equal(nextGuidedKey("The dog ran.", "The dog ran.", false), "check");

  const item = { answer: "We can't play today.", hint: "Check capitals and apostrophes." };
  assert.equal(checkTypedSentence("  We   can't  play today. ", item).ok, true);
  assert.equal(checkTypedSentence("We can't play today .", item).kind, "space");
  assert.equal(checkTypedSentence("we can't play today.", item).kind, "caps");
  assert.equal(checkTypedSentence("We can't play today", item).kind, "end");
  assert.equal(checkTypedSentence("We cant play today.", item).kind, "punct");
  assert.equal(checkTypedSentence("we can't play today", item).kind, "caps-end");
  assert.equal(checkTypedSentence("We can't plqy today.", item).kind, "spelling");

  const vivid = levelById("g4-write-vivid").items[0];
  assert.equal(checkFreeWrite("The boy was really cold out there.", vivid).ok, false);
  assert.equal(checkFreeWrite("Snowflakes stung Sam's nose while mittens warmed his frosty fingers!", vivid).ok, true);
  assert.equal(checkFreeWrite("Frostbite crept up his fingers while snow swirled silently around the gate.", vivid).ok, true);

  const summary = levelById("g4-edit-summarize").items[4];
  assert.equal(checkFreeWrite("Shade trees cool sidewalks and soak up rain in cities.", summary).ok, true);
  assert.equal(checkFreeWrite("Trees are green and pretty in parks everywhere.", summary).ok, false);
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
