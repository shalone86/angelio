import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSheet, vamps, loopOf, syllables, plainWords, transposeChord, keyName, guitarShape, chordBox, readMidi, quantize, melodyAbc, barLength, isChord } from "../public/js/leadsheet.js";

const OLD = `The Eucharist Song
Written by Shalone Cason
To the tune of “Baa Baa Black Sheep”
This work has been dedicated to the public domain via CC0, 2024

INTRO
C G F Dm/C

VERSE 1
C
Je-sus had a spe-cial meal,
     G
Last Sup-per was its name.

CHORUS
    G         F
The Eucharist is our source

VERSE 2
[C]The bread and [G]wine we receive

CHORUS
OUTRO
C G F Dm/C`;

test("an old sheet: header lines, sections, chords above words and [inline], repeats", () => {
  const s = parseSheet(OLD);
  assert.deepEqual(s.meta, { title: "The Eucharist Song", words: "Shalone Cason", tune: "Baa Baa Black Sheep", license: "CC0" });
  assert.deepEqual(s.sections.map((x) => x.name), ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Outro"]);
  assert.equal(s.sections[4].repeat, true);
  assert.deepEqual(s.sections[0].lines[0], { type: "chords", chords: ["C", "G", "F", "Dm/C"] });
  const sup = s.sections[1].lines[1];
  assert.equal(sup.text, "Last Sup-per was its name.");
  assert.equal(sup.text.slice(sup.chords[0].at, sup.chords[0].at + 3), "Sup");
  const ch = s.sections[2].lines[0];
  assert.deepEqual(ch.chords.map((c) => [c.chord, ch.text.slice(c.at, c.at + 3)]), [["G", "Euc"], ["F", "is "]]);
  const v2 = s.sections[3].lines[0];
  assert.equal(v2.text, "The bread and wine we receive");
  assert.deepEqual(v2.chords, [{ at: 0, chord: "C" }, { at: 14, chord: "G" }]);
});

test("vamps: one loop per kind of section; intro and outro share theirs; Loop: wins", () => {
  const v = vamps(parseSheet(OLD));
  assert.deepEqual(v.map((x) => [x.names.join("+"), x.loop.join(" ")]), [["intro+outro", "C G F Dm/C"], ["verse", "C G"], ["chorus", "G F"]]);
  assert.deepEqual(loopOf(parseSheet("VERSE\nLoop: C Am F G\n[C]a [D]b").sections[0]).join(" "), "C Am F G");
  assert.deepEqual(loopOf(parseSheet("VERSE\n[C]a [G]b [C]c [G]d").sections[0]).join(" "), "C G");
  assert.deepEqual(loopOf(parseSheet("VERSE\n[C]a [G]b [F]c [Dm]d [C]e").sections[0]).join(" "), "C G F Dm");
});

test("syllables for the melody; the sheet shows plain words", () => {
  assert.deepEqual(syllables("Je-sus had _ a").map((s) => s.text), ["Je", "sus", "had", "_", "a"]);
  assert.equal(plainWords("Je-sus had _ spe-cial faith--filled meal"), "Jesus had special faith‑filled meal");
});

test("chords: transpose with the new key's spelling; key names", () => {
  assert.ok(["C", "Dm/C", "F#m7", "Bbmaj7", "Gsus4", "C#dim", "Eb6", "A7(b9)"].every(isChord));
  assert.ok(!isChord("The") && !isChord("Hello"));
  assert.equal(transposeChord("Dm/C", 2, "C"), "Em/D");
  assert.equal(transposeChord("G", 3, "C"), "Bb");
  assert.equal(transposeChord("C", 1, "G"), "Db"); // G up 1 is A♭: flats
  assert.equal(transposeChord("B", 2, "G"), "C#"); // G up 2 is A: sharps
  assert.equal(keyName("C", 3), "Eb");
  assert.equal(keyName("Am", 2), "Bm");
  assert.equal(keyName("G", -5), "D");
});

test("a guitar box for every root, major, minor and 7th", () => {
  for (const root of ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]) for (const q of ["", "m", "7", "m7", "maj7"]) {
    const f = guitarShape(root + q);
    assert.ok(f && f.length === 6, root + q);
    const played = f.filter((x) => x > 0);
    assert.ok(!played.length || Math.max(...played) - Math.min(...played) <= 4, `${root + q}: fits in 5 frets`);
    assert.match(chordBox(root + q), /<svg/);
  }
  assert.deepEqual(guitarShape("Dm/C"), guitarShape("Dm"));
});

// A tiny MIDI file: 96 ticks a beat, 3/4, one track named "Melody".
function midi(notes, { ppq = 96, meter = [3, 4], tempo = 90 } = {}) {
  const ev = [];
  const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
  const raw = [[0, [0xff, 0x03, 6, ..."Melody"].map((x) => (typeof x === "string" ? x.charCodeAt(0) : x))],
    [0, [0xff, 0x58, 4, meter[0], Math.log2(meter[1]), 24, 8]], [0, [0xff, 0x51, 3, ...[60000000 / tempo].flatMap((u) => [(u >> 16) & 255, (u >> 8) & 255, u & 255])]]];
  for (const [p, s, l] of notes) { raw.push([s, [0x90, p, 90]]); raw.push([s + l, [0x80, p, 0]]); }
  raw.sort((a, b) => a[0] - b[0]);
  let last = 0;
  for (const [t, bytes] of raw) { ev.push(...vlq(t - last), ...bytes); last = t; }
  ev.push(0, 0xff, 0x2f, 0);
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  return new Uint8Array([..."MThd"].map((c) => c.charCodeAt(0)).concat(u32(6), [0, 0, 0, 1, ppq >> 8, ppq & 255], [..."MTrk"].map((c) => c.charCodeAt(0)), u32(ev.length), ev));
}

test("MIDI: notes, meter and tempo come back; played-in timing rounds to 16ths, starting at its first bar", () => {
  const m = readMidi(midi([[60, 96 * 3 + 5, 90], [64, 96 * 4 - 3, 100], [67, 96 * 5, 190]]));
  assert.equal(m.tracks.length, 1);
  assert.equal(m.tracks[0].name, "Melody");
  assert.deepEqual(m.meter, [3, 4]);
  assert.equal(m.tempo, 90);
  // starts in bar 2 (3/4: 12 sixteenths a bar) → moved to the start
  assert.deepEqual(quantize(m.tracks[0].notes, m.ppq, m.meter), [[60, 0, 4], [64, 4, 4], [67, 8, 8]]);
});

test("melody → notation: every bar adds up, words under notes, chords on their syllables, ties across bars", () => {
  const sec = parseSheet("VERSE\nC        G\nJe-sus had a spe-cial meal").sections[0];
  const mel = [[60, 0, 4], [60, 4, 4], [67, 8, 4], [67, 12, 4], [69, 16, 4], [70, 20, 8], [67, 28, 8]]; // last note crosses the bar
  const { abc, notes, syllables: n } = melodyAbc(mel, sec.lines, { key: "C", meter: [4, 4] });
  assert.equal(notes, 7); assert.equal(n, 7);
  const music = abc.split("\n").filter((l) => /^[^A-Z]|^"|^[A-G_^=z]/.test(l) && !/^[A-Z]:/.test(l) && !l.startsWith("w:"));
  for (const bar of music.join(" ").split(/\|\]?/).map((b) => b.trim()).filter(Boolean)) {
    const len = [...bar.matchAll(/[_^=]?[A-Ga-gz][,']*(\d+)/g)].reduce((a, m) => a + Number(m[1]), 0);
    assert.equal(len, barLength([4, 4]), `bar "${bar}" adds up to ${len}`);
  }
  assert.match(abc, /"C"C4/);
  assert.match(abc, /C4 "G"G4/); // G sits over "had" (the 3rd note)
  assert.match(abc, /\^A8/); // the black key, written with its sharp
  assert.match(abc, /G4- \| G4/); // tied over the bar
  assert.match(abc, /w: Je-sus had a spe-cial meal \*/); // the tied part gets no word
});
