import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, MINE, GRADES, makeLevel, wordOf, spellWith, parse, focusIndexes, wrongSpellings, lookAlikes, parseMyWords, sameSound, BAD_WORDS, badFoil, ALL_WORDS, PER_LEVEL, seeded, LETTER_SOUNDS, CHUNK_SOUNDS, soundIdsFor, soundSpeak, QWERTY_ROWS, usesQwerty } from "../public/js/spelling.js";

test("words: brackets parse, magic e puts the e at the end, the tricky part is highlighted", () => {
  assert.equal(wordOf("r(ai)n"), "rain");
  assert.equal(wordOf("c(a_e)k"), "cake");
  assert.equal(spellWith("r(ai)n", "a_e"), "rane");
  assert.equal(spellWith("c(a_e)k", "ai"), "caik");
  assert.deepEqual(focusIndexes("c(a_e)k"), [1, 3]);
  assert.deepEqual(focusIndexes("lun(ch)"), [3, 4]);
  assert.deepEqual(parse("(sh)ip"), { pre: "", focus: "sh", post: "ip" });
});

test("every level is well formed: ids unique, grades known, enough words with pictures", () => {
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, LEVELS.length);
  for (const l of LEVELS) {
    assert.ok(GRADES.some((g) => g.n === l.grade), l.id);
    assert.ok(l.teach && l.say && l.title && l.emoji, l.id);
    if (l.kind === "pattern") {
      assert.ok(l.words.length >= 8, `${l.id}: at least 8 words`);
      for (const [spec, emoji] of l.words) {
        assert.ok(emoji, `${spec}: picture`);
        assert.ok(l.alt[parse(spec).focus], `${l.id}: ${spec} has other spellings for ${parse(spec).focus}`);
      }
      assert.equal(new Set(l.words.map(([s]) => wordOf(s))).size, l.words.length, `${l.id}: no repeats`);
    }
    if (l.kind === "rule") {
      assert.ok(l.words.length >= 8, `${l.id}: at least 8 words`);
      for (const [w, base, end, emoji, foils] of l.words) {
        assert.ok(emoji && base && end, w);
        assert.equal(foils.length, 2, `${w}: two wrong spellings`);
        assert.ok(!foils.includes(w) && new Set(foils).size === 2, `${w}: wrong spellings differ from it`);
      }
    }
  }
});

test("wrong spellings are never the word, never a real word that sounds the same, never a bad word, and always two", () => {
  for (const l of LEVELS.filter((x) => x.kind === "pattern")) for (const [spec] of l.words) for (let seed = 1; seed < 30; seed++) {
    const w = wordOf(spec);
    const wr = wrongSpellings(l, spec, seeded(seed));
    assert.equal(wr.length, 2, `${spec}: ${wr}`);
    for (const x of wr) {
      assert.notEqual(x, w);
      assert.ok(!sameSound(w, x), `${spec}: ${x} sounds the same`);
      assert.ok(!BAD_WORDS.has(x), `${spec}: ${x} is a bad word`);
    }
  }
  for (const l of LEVELS.filter((x) => x.kind === "rule")) for (const [w, , , , foils] of l.words) for (const f of foils) {
    assert.ok(!sameSound(w, f), `${w}: ${f}`);
    assert.ok(!BAD_WORDS.has(f), `${w}: ${f}`);
  }
  for (const w of ["because", "friend", "said", "church", "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "ox", "so", "to", "up", "us", "we"]) {
    const alts = lookAlikes(w, seeded(3));
    assert.ok(alts.length >= 2, `${w}: ${alts}`);
    for (const a of alts) assert.ok(!badFoil(w, a), `${w} -> ${a}`);
  }
});

test("level rules: bossy r has all five teams, ai in middle, ay at end", () => {
  const bossy = LEVELS.find((l) => l.id === "g2-bossy-r");
  const focuses = new Set(bossy.words.map(([s]) => parse(s).focus));
  for (const f of ["ar", "or", "er", "ir", "ur"]) assert.ok(focuses.has(f), `missing ${f}`);
  const aiay = LEVELS.find((l) => l.id === "g2-ai-ay");
  for (const [spec] of aiay.words) {
    const { pre, focus, post } = parse(spec);
    if (focus === "ai") assert.ok(pre && post, `${spec}: ai must be in the middle`);
    if (focus === "ay") assert.equal(post, "", `${spec}: ay must be at the end`);
  }
});

test("thousands of levels: 8 questions, the answer is always reachable, no duplicate choices", () => {
  for (const l of LEVELS) for (let seed = 1; seed < 300; seed++) {
    const qs = makeLevel(l, seed);
    assert.equal(qs.length, PER_LEVEL, l.id);
    if (l.kind === "abc") {
      assert.deepEqual(qs.map((q) => q.words.length), [3, 3, 4, 4, 3, 3, 4, 4]);
    }
    for (const q of qs) {
      assert.ok(q.prompt && q.say && !/undefined|NaN/.test(q.prompt + q.say), `${l.id}: ${q.prompt} / ${q.say}`);
      if (l.kind === "rule") assert.doesNotMatch(q.say, /plus (ed|es)\b/i, `${l.id}: ${q.say}`);
      if (q.choices) {
        assert.ok(q.choices.includes(q.answer), `${l.id}: ${q.answer} in ${q.choices}`);
        assert.equal(new Set(q.choices).size, q.choices.length, `${l.id}: ${q.choices}`);
        assert.ok(q.choices.length >= 2, `${l.id}: ${q.choices}`);
        for (const c of q.choices) {
          const full = q.type === "missing" ? q.pre + c + q.post : c;
          if (full !== q.word) {
            assert.ok(!BAD_WORDS.has(full), `${l.id}: bad choice ${full}`);
            assert.ok(!sameSound(q.word, full), `${l.id}: homophone ${q.word}/${full}`);
          }
        }
      }
      if (q.type === "missing") {
        for (const c of q.choices) assert.ok(!c.includes("_"), c);
        assert.equal(q.pre + q.answer + q.post, q.word);
      }
      if (q.type === "spell") {
        const left = [...q.tiles];
        for (const c of q.letters) { const i = left.indexOf(c); assert.ok(i >= 0, `${q.word}: tile ${c}`); left.splice(i, 1); }
        assert.ok(left.length >= 3 && q.tiles.length <= 14, `${q.word}: ${q.tiles}`);
      }
      if (q.type === "abc") {
        assert.ok(q.words.length >= 3);
        assert.notEqual(q.words.join(" "), q.answer, `${q.words}: already sorted`);
        const key = (w) => (q.second ? w[1] : w[0]);
        assert.equal(new Set(q.words.map(key)).size, q.words.length, `${q.words}: one way to order them`);
        if (q.second) assert.equal(new Set(q.words.map((w) => w[0])).size, 1, `${q.words}: same first letter`);
      }
    }
  }
});

test("ABC order uses real level words", () => {
  assert.ok(ALL_WORDS.length > 150);
  for (const w of ALL_WORDS) assert.match(w, /^[a-z]+$/);
});

test("My Words: the family's list, cleaned; questions only from it", () => {
  assert.deepEqual(parseMyWords("Said, friend\nbecause;  said  2go x"), ["said", "friend", "because", "go"]);
  assert.deepEqual(makeLevel(MINE, 1, []), []);
  for (let seed = 1; seed < 100; seed++) {
    const qs = makeLevel(MINE, seed, ["said", "friend", "church"]);
    assert.equal(qs.length, PER_LEVEL);
    for (const q of qs) {
      assert.ok(["said", "friend", "church"].includes(q.word));
      if (q.choices) { assert.ok(q.choices.includes(q.answer)); assert.equal(new Set(q.choices).size, q.choices.length); }
    }
  }
});

test("1st-grade phonetic sounds cover every letter and every 1st-grade missing choice", () => {
  for (const l of "abcdefghijklmnopqrstuvwxyz") {
    assert.ok(LETTER_SOUNDS[l], l);
    const s = soundSpeak(l);
    assert.match(s, /^\{\{[^}]+\}\}$/, `${l}: ${s}`);
  }
  assert.deepEqual(soundIdsFor("st", { end: false }), ["stuh"]);
  assert.deepEqual(soundIdsFor("st", { end: true }), ["sst"]);
  assert.deepEqual(soundIdsFor("sk", { end: true }), ["ssk"]);
  assert.ok(CHUNK_SOUNDS.sh === "shh");
  for (const l of LEVELS.filter((x) => x.grade === 3)) {
    for (let seed = 1; seed <= 50; seed++) {
      for (const q of makeLevel(l, seed).filter((x) => x.type === "missing")) {
        const end = q.post === "" && q.pre !== "";
        for (const c of q.choices) {
          assert.ok(soundIdsFor(c, { end }).length >= 1, `${l.id} ${q.word}: missing sound for ${c}`);
        }
      }
    }
  }
});

test("QWERTY layout has all 26 unique letters and activates for 3rd grade or toggle", () => {
  const flat = QWERTY_ROWS.flat();
  assert.equal(flat.length, 26);
  assert.equal(new Set(flat).size, 26);
  for (const l of "abcdefghijklmnopqrstuvwxyz") assert.ok(flat.includes(l), l);
  const g1 = LEVELS.find((l) => l.grade === 3);
  const g2 = LEVELS.find((l) => l.grade === 4);
  const g3 = LEVELS.find((l) => l.grade === 5);
  assert.equal(usesQwerty(g3, {}), true);
  assert.equal(usesQwerty(g3, { qwerty: false }), true);
  assert.equal(usesQwerty(g1, {}), false);
  assert.equal(usesQwerty(g2, {}), false);
  assert.equal(usesQwerty(MINE, {}), false);
  assert.equal(usesQwerty(g1, { qwerty: true }), true);
  assert.equal(usesQwerty(g2, { qwerty: true }), true);
  assert.equal(usesQwerty(MINE, { qwerty: true }), true);
});
