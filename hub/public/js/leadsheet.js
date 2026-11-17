// Lead sheets: the words with chords, the vamp (each section's chord loop), guitar chord boxes, and the melody
// on a staff, from a MIDI file or a MIDI keyboard. Pure functions plus renderSheet() for the page; the staff is
// drawn by abcjs (public/vendor/abcjs-6.7.2, MIT), which renderSheet expects as window.ABCJS.
//
// A sheet is saved as JSON (worker: /api/leadsheet):
//   { title, words, tune, license, key: "C", meter: "4/4", tempo: 100,
//     text: "VERSE 1\nC\nJesus had a special meal, ...",    ← what she types or pastes
//     melodies: { "Verse 1": [[midiPitch, start, length], ...] } }  ← in 16th notes from the section's first bar
//
// The text: section names on their own line (VERSE 1, Chorus, [Bridge], Intro:), then lines of words.
// Chords go on the line above the words (lined up over the syllable), or inside the words: [G]The Eu[F]charist.
// A line of only chords is played, not sung (an intro). "Loop: C G F Dm/C" sets a section's vamp by hand.
// A section name with no lines repeats the earlier one ("CHORUS" again). For the melody, a hyphen splits a word
// into the syllables that get their own notes (spe-cial) and _ holds a syllable for one more note.

// ───────── chords ─────────
const CHORD = /^([A-G])([#b♯♭]?)((?:maj|min|m|dim|aug|sus|add|M|\+|°|ø|\d|b|#|\(|\))*)(?:\/([A-G])([#b♯♭]?))?$/;
export const isChord = (t) => CHORD.test(t);
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (a) => (a === "#" || a === "♯" ? 1 : a === "b" || a === "♭" ? -1 : 0);
/** "Dm/C" → { root: 2, quality: "m", bass: 0 } */
export function parseChord(name) {
  const m = CHORD.exec(name);
  if (!m) return null;
  return { root: (PC[m[1]] + acc(m[2]) + 12) % 12, quality: m[3], bass: m[4] ? (PC[m[4]] + acc(m[5]) + 12) % 12 : null };
}
// Keys that are written with flats (F, Bb, Eb… and their relative minors).
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);
export function keyName(key, semis) {
  const m = /^([A-G][#b]?)(m?)$/.exec(key ?? "C") ?? [, "C", ""];
  const pc = (PC[m[1][0]] + acc(m[1][1]) + semis + 120) % 12;
  const flat = FLAT_NAMES[pc] + m[2], sharp = SHARP_NAMES[pc] + m[2];
  if (FLAT_KEYS.has(flat)) return flat;
  return { "D#": "Eb", "G#": "Ab", "A#": "Bb", "D#m": "Ebm" }[sharp] ?? sharp; // the usual spellings
}
const usesFlats = (key) => FLAT_KEYS.has(key) || /^[A-G]b/.test(key);
/** Move a chord by semitones, spelled for the new key. */
export function transposeChord(name, semis, key = "C") {
  const c = parseChord(name);
  if (!c || !semis) return name;
  const names = usesFlats(keyName(key, semis)) ? FLAT_NAMES : SHARP_NAMES;
  return names[(c.root + semis + 120) % 12] + c.quality + (c.bass != null ? "/" + names[(c.bass + semis + 120) % 12] : "");
}
/** Each chord root has its own color (C red, D purple, E orange, F green, G blue, A pink, B teal). */
const ROOT_COLORS = ["#e8443a", "#e8443a", "#9b51e0", "#9b51e0", "#f2994a", "#27ae60", "#27ae60", "#2f80ed", "#2f80ed", "#d63384", "#d63384", "#00a3a3"];
export function chordColor(name) {
  const m = CHORD.exec(name);
  return m ? ROOT_COLORS[PC[m[1]]] : "#555";
}

// ───────── guitar chord boxes ─────────
// Strings low E → high e; -1 = don't play, 0 = open. Open shapes first, then a barre shape for anything else.
const OPEN = {
  C: [-1, 3, 2, 0, 1, 0], C7: [-1, 3, 2, 3, 1, 0], Cmaj7: [-1, 3, 2, 0, 0, 0], Cadd9: [-1, 3, 2, 0, 3, 0],
  D: [-1, -1, 0, 2, 3, 2], Dm: [-1, -1, 0, 2, 3, 1], D7: [-1, -1, 0, 2, 1, 2], Dm7: [-1, -1, 0, 2, 1, 1], Dmaj7: [-1, -1, 0, 2, 2, 2], Dsus4: [-1, -1, 0, 2, 3, 3], Dsus2: [-1, -1, 0, 2, 3, 0],
  E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0], E7: [0, 2, 0, 1, 0, 0], Em7: [0, 2, 0, 0, 0, 0], Esus4: [0, 2, 2, 2, 0, 0],
  F: [-1, -1, 3, 2, 1, 1], Fmaj7: [-1, -1, 3, 2, 1, 0],
  G: [3, 2, 0, 0, 0, 3], G7: [3, 2, 0, 0, 0, 1], Gsus4: [3, 3, 0, 0, 1, 3],
  A: [-1, 0, 2, 2, 2, 0], Am: [-1, 0, 2, 2, 1, 0], A7: [-1, 0, 2, 0, 2, 0], Am7: [-1, 0, 2, 0, 1, 0], Amaj7: [-1, 0, 2, 1, 2, 0], Asus4: [-1, 0, 2, 2, 3, 0], Asus2: [-1, 0, 2, 2, 0, 0],
  B7: [-1, 2, 1, 2, 0, 2],
};
const E_SHAPE = { "": [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], 7: [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], maj7: [0, 2, 1, 1, 0, 0], sus4: [0, 2, 2, 2, 0, 0] };
const A_SHAPE = { "": [-1, 0, 2, 2, 2, 0], m: [-1, 0, 2, 2, 1, 0], 7: [-1, 0, 2, 0, 2, 0], m7: [-1, 0, 2, 0, 1, 0], maj7: [-1, 0, 2, 1, 2, 0], sus4: [-1, 0, 2, 2, 3, 0], sus2: [-1, 0, 2, 2, 0, 0] };
/** Frets for a chord (slash chords use their top chord), or null if we have no shape. */
export function guitarShape(name) {
  const c = parseChord(name);
  if (!c) return null;
  const q = { min: "m", M: "maj", "": "" }[c.quality] ?? c.quality.replace(/^min/, "m");
  for (const n of [SHARP_NAMES[c.root], FLAT_NAMES[c.root]]) if (OPEN[n + q]) return OPEN[n + q];
  const options = [];
  if (E_SHAPE[q]) options.push({ fret: (c.root - 4 + 12) % 12 || 12, shape: E_SHAPE[q] });
  if (A_SHAPE[q]) options.push({ fret: (c.root - 9 + 12) % 12 || 12, shape: A_SHAPE[q] });
  if (!options.length) return null;
  const best = options.sort((a, b) => a.fret - b.fret)[0];
  return best.shape.map((f) => (f < 0 ? -1 : f + best.fret));
}
export function chordBox(name) {
  const frets = guitarShape(name);
  if (!frets) return "";
  const played = frets.filter((f) => f > 0), low = Math.min(...played), high = Math.max(...played);
  const base = high > 4 ? low : 1; // up the neck: number the first fret shown
  const x = (s) => 12 + s * 12, y = (fr) => 22 + fr * 14;
  let g = `<svg class="ls-box" width="84" height="96" viewBox="0 0 84 96" role="img" aria-label="${esc(name)} chord">`;
  for (let s = 0; s < 6; s++) g += `<line x1="${x(s)}" y1="${y(0)}" x2="${x(s)}" y2="${y(4)}" stroke="currentColor"/>`;
  for (let fr = 0; fr <= 4; fr++) g += `<line x1="${x(0)}" y1="${y(fr)}" x2="${x(5)}" y2="${y(fr)}" stroke="currentColor" stroke-width="${fr === 0 && base === 1 ? 3 : 1}"/>`;
  if (base > 1) g += `<text x="${x(5) + 6}" y="${y(1) - 3}" font-size="10" fill="currentColor">${base}fr</text>`;
  frets.forEach((f, s) => {
    if (f < 0) g += `<text x="${x(s)}" y="16" font-size="11" text-anchor="middle" fill="currentColor">×</text>`;
    else if (f === 0) g += `<circle cx="${x(s)}" cy="12" r="3.5" fill="none" stroke="currentColor"/>`;
    else g += `<circle cx="${x(s)}" cy="${y(f - base + 1) - 7}" r="5" fill="currentColor"/>`;
  });
  return g + "</svg>";
}

// ───────── the words ─────────
const SECTION = /^\s*\[?\s*((?:intro|verse|chorus|refrain|bridge|pre-?chorus|outro|tag|coda|interlude|ending|instrumental)\b[^\]:]*?)\s*\]?\s*:?\s*$/i;
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
const tokensOf = (line) => [...line.matchAll(/\S+/g)].map((m) => ({ t: m[0], at: m.index }));
const isChordLine = (line) => { const t = tokensOf(line); return t.length > 0 && t.every(({ t }) => isChord(t) || /^(\||\/|-|x\d+|\(x\d+\)|%)$/i.test(t)); };
/** Words without the melody marks: "spe-cial" → "special", "_" gone, "--" → "-". */
export const plainWords = (s) => s.replace(/--/g, "‑").replace(/(\p{L})-(?=\p{L})/gu, "$1").replace(/(^|\s)_+(?=\s|$)/g, "$1").replace(/\s{2,}/g, " ").trim();

/**
 * Text → { meta, sections: [{ name, kind, repeat, loop, lines: [{ type: "words", text, chords: [{ at, chord }] } | { type: "chords", chords }] }] }
 * meta comes from header lines at the top of a pasted sheet (title, "Written by…", "To the tune of…", "…CC0").
 */
export function parseSheet(text) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const meta = {}, sections = [];
  let cur = null;
  const ensure = () => (cur ??= (sections.push({ name: "Song", kind: "song", lines: [] }), sections.at(-1)));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\t/g, "    ");
    if (!line.trim()) continue;
    const head = SECTION.exec(line);
    if (head) { cur = { name: titleCase(head[1].trim()), kind: head[1].trim().toLowerCase().replace(/[\s\d]+$/, "").replace(/^pre-?chorus$/, "pre-chorus"), lines: [] }; sections.push(cur); continue; }
    const loop = /^\s*loop\s*:\s*(.+)$/i.exec(line);
    if (loop) { ensure().loop = loop[1].split(/[\s,·|]+/).filter(isChord); continue; }
    if (!sections.length && !isChordLine(line)) { // header lines before the first section
      const l = line.trim();
      if (/written by|words by|lyrics by|music by|^by\s/i.test(l)) { meta.words = l.replace(/^.*?\bby\s+/i, ""); continue; }
      if (/tune of/i.test(l)) { meta.tune = (/[“"]([^”"]+)[”"]/.exec(l)?.[1] ?? l.replace(/^.*tune of\s*/i, "")).trim(); continue; }
      if (/cc0|public domain|©|copyright|creative commons/i.test(l)) { meta.license = /cc0|public domain/i.test(l) ? "CC0" : l; continue; }
      if (!meta.title && !/\[[A-G]/.test(l)) { meta.title = l; continue; }
    }
    if (isChordLine(line)) {
      const next = lines[i + 1];
      const chords = tokensOf(line).filter(({ t }) => isChord(t));
      if (next != null && next.trim() && !SECTION.test(next) && !isChordLine(next) && !/^\s*loop\s*:/i.test(next)) {
        const words = next.replace(/\t/g, "    ");
        const lead = words.length - words.trimStart().length;
        ensure().lines.push({ type: "words", text: words.trim(), chords: chords.map(({ t, at }) => ({ at: Math.max(0, Math.min(at - lead, words.trim().length)), chord: t })) });
        i++;
      } else ensure().lines.push({ type: "chords", chords: chords.map(({ t }) => t) });
      continue;
    }
    // words, maybe with [G]inline chords
    let out = "", chords = [];
    for (const part of line.trim().split(/(\[[^\]]+\])/)) {
      const m = /^\[([^\]]+)\]$/.exec(part);
      if (m && isChord(m[1].trim())) chords.push({ at: out.length, chord: m[1].trim() });
      else out += part;
    }
    ensure().lines.push({ type: "words", text: out, chords });
  }
  // A section name seen before, with no lines: "play that one again".
  const seen = new Map();
  for (const s of sections) {
    if (!s.lines.length && seen.has(s.name.toLowerCase())) s.repeat = true;
    else if (!seen.has(s.name.toLowerCase())) seen.set(s.name.toLowerCase(), s);
  }
  return { meta, sections };
}

/** The chords of a section in order (a chord held over several lines counts once). */
function chordsOf(section) {
  const out = [];
  for (const l of section.lines) for (const c of l.type === "chords" ? l.chords : l.chords.map((x) => x.chord)) if (out.at(-1) !== c) out.push(c);
  return out;
}
/** A section's vamp: "Loop:" if given, else its chords, shortened to the part that repeats. */
export function loopOf(section) {
  if (section.loop?.length) return section.loop;
  let ch = chordsOf(section);
  for (let n = 1; n <= ch.length / 2; n++) if (ch.length % n === 0 && ch.every((c, i) => c === ch[i % n])) { ch = ch.slice(0, n); break; }
  if (ch.length > 2 && ch.at(-1) === ch[0]) ch = ch.slice(0, -1); // C G F Dm C: the last C starts the loop again
  return ch;
}
/** One vamp per kind of section (Verses, Chorus, Bridge…), from the first section of that kind with chords. */
export function vamps(sheet) {
  const out = [];
  for (const s of sheet.sections) {
    if (s.repeat || out.some((v) => v.kind === s.kind)) continue;
    const loop = loopOf(s);
    if (!loop.length) continue;
    const same = out.find((v) => v.loop.join(" ") === loop.join(" "));
    if (same) { same.names.push(s.kind); continue; }
    out.push({ kind: s.kind, names: [s.kind], loop });
  }
  return out;
}

/** The syllables of some words, for the melody: [{ text, end (last of its word), at (character), hold }] */
export function syllables(text) {
  const out = [];
  for (const m of String(text).matchAll(/\S+/g)) {
    const w = m[0];
    if (/^_+$/.test(w)) { for (let k = 0; k < w.length; k++) out.push({ hold: true, text: "_" }); continue; }
    const safe = w.replace(/--/g, "‑");
    const parts = safe.split(/(?<=\p{L})-(?=\p{L})/u);
    let at = m.index;
    parts.forEach((p, k) => { out.push({ text: p, end: k === parts.length - 1, at }); at += p.length + 1; });
  }
  return out;
}
/** Which syllable a chord sits over: the one it's above, or the next one if it's above a space. */
function syllableAt(sylls, at) {
  let best = 0;
  for (let i = 0; i < sylls.length; i++) { if (sylls[i].hold) continue; if (sylls[i].at <= at) best = i; else break; }
  const s = sylls[best];
  if (s && at >= s.at + s.text.length + (s.end ? 0 : 1)) { const nx = sylls.findIndex((x, i) => i > best && !x.hold); if (nx > 0) return nx; }
  return best;
}

// ───────── MIDI ─────────
/** A Standard MIDI File → { ppq, tracks: [{ name, notes: [[pitch, startTick, lengthTicks]] }], meter: [n, d], tempo, key } */
export function readMidi(bytes) {
  const d = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let p = 0;
  const u32 = () => (d[p++] << 24 | d[p++] << 16 | d[p++] << 8 | d[p++]) >>> 0, u16 = () => (d[p++] << 8) | d[p++];
  const vlq = () => { let v = 0, b; do { b = d[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  const str = (n) => String.fromCharCode(...d.slice(p, p + n));
  if (str(4) !== "MThd") throw new Error("That isn't a MIDI file.");
  p += 4; const hlen = u32(); const start = p; u16(); const ntr = u16(); const div = u16(); p = start + hlen;
  if (div & 0x8000) throw new Error("This MIDI file counts time in frames; export it from Logic with bars and beats.");
  const out = { ppq: div, tracks: [], meter: null, tempo: null, key: null };
  for (let t = 0; t < ntr && p < d.length; t++) {
    while (p < d.length && str(4) !== "MTrk") { p += 4; p += u32(); }
    p += 4; const len = u32(), end = p + len;
    let tick = 0, status = 0, name = "";
    const on = new Map(), notes = [];
    while (p < end) {
      tick += vlq();
      let b = d[p];
      if (b & 0x80) { status = b; p++; } else b = status;
      const type = status & 0xf0;
      if (status === 0xff) {
        const mt = d[p++], ml = vlq(), data = d.slice(p, p + ml); p += ml;
        if (mt === 0x03 && !name) name = String.fromCharCode(...data).trim();
        if (mt === 0x51 && !out.tempo) out.tempo = Math.round(60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]));
        if (mt === 0x58 && !out.meter) out.meter = [data[0], 2 ** data[1]];
        if (mt === 0x59 && !out.key) { const sf = (data[0] << 24) >> 24, minor = data[1] === 1; out.key = keyFromSig(sf, minor); }
        if (mt === 0x2f) break;
      } else if (status === 0xf0 || status === 0xf7) { p += vlq(); }
      else if (type === 0x90 || type === 0x80) {
        const pitch = d[p++], vel = d[p++];
        if (type === 0x90 && vel > 0) { if (!on.has(pitch)) on.set(pitch, tick); }
        else if (on.has(pitch)) { const s = on.get(pitch); on.delete(pitch); if (tick > s) notes.push([pitch, s, tick - s]); }
      } else if (type === 0xc0 || type === 0xd0) p += 1;
      else p += 2;
    }
    p = end;
    if (notes.length) out.tracks.push({ name: name || `Track ${out.tracks.length + 1}`, notes: notes.sort((a, b) => a[1] - b[1]) });
  }
  return out;
}
function keyFromSig(sf, minor) {
  const major = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"][sf + 7];
  if (!minor) return major;
  return keyName(major, -3).replace(/m?$/, "m");
}
/**
 * Notes in ticks → the melody in 16th notes, starting at the first bar that has a note. One note at a time
 * (if two overlap, the higher one is the melody), each rounded to the nearest 16th.
 */
export function quantize(notes, ppq, meter = [4, 4]) {
  const six = ppq / 4, bar = barLength(meter);
  let ns = notes.map(([p, s, l]) => [p, Math.round(s / six), Math.max(1, Math.round(l / six))]);
  ns.sort((a, b) => a[1] - b[1] || b[0] - a[0]);
  ns = ns.filter((n, i) => i === 0 || n[1] !== ns[i - 1][1]); // same start: keep the highest
  for (let i = 0; i < ns.length - 1; i++) ns[i][2] = Math.max(1, Math.min(ns[i][2], ns[i + 1][1] - ns[i][1]));
  const first = ns.length ? Math.floor(ns[0][1] / bar) * bar : 0;
  return ns.map(([p, s, l]) => [p, s - first, l]);
}
export const barLength = ([n, d] = [4, 4]) => (n * 16) / d;

// ───────── melody → ABC (for abcjs) ─────────
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const SIG_ORDER_SHARP = ["F", "C", "G", "D", "A", "E", "B"], SIG_ORDER_FLAT = ["B", "E", "A", "D", "G", "C", "F"];
const SIG_COUNT = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 };
function keySignature(key) {
  const major = /m$/.test(key) ? keyName(key.slice(0, -1), 3) : key;
  const n = SIG_COUNT[major] ?? 0, sig = {};
  (n >= 0 ? SIG_ORDER_SHARP : SIG_ORDER_FLAT).slice(0, Math.abs(n)).forEach((l) => { sig[l] = n >= 0 ? 1 : -1; });
  return sig;
}
/** A MIDI pitch → letter, accidental (−1, 0, 1), octave; spelled with flats in flat keys. */
function spell(pitch, flats) {
  const pc = pitch % 12, oct = Math.floor(pitch / 12) - 1;
  const name = (flats ? FLAT_NAMES : SHARP_NAMES)[pc];
  return { letter: name[0], acc: acc(name[1]), oct };
}
const abcPitch = (letter, oct) => (oct >= 5 ? letter.toLowerCase() + "'".repeat(oct - 5) : letter + ",".repeat(Math.max(0, 4 - oct)));
const PIECES = [16, 12, 8, 6, 4, 3, 2, 1];
const split = (n) => { const out = []; while (n > 0) { const p = PIECES.find((x) => x <= n); out.push(p); n -= p; } return out; };

/**
 * One section's melody as ABC: chords above the notes they start on, the words under the notes, 4 bars to a line.
 * sectionLines: the section's word lines (from parseSheet). Returns { abc, notes: n, syllables: n, lines: [{ notes, syllables }] }.
 */
export function melodyAbc(melody, sectionLines, { key = "C", meter = [4, 4], tempo = 0, barsPerLine = 4 } = {}) {
  const wordsLines = sectionLines.filter((l) => l.type === "words");
  const sylls = [], chordAt = new Map();
  for (const l of wordsLines) {
    const s = syllables(l.text), base = sylls.length;
    for (const c of l.chords) if (s.length) chordAt.set(base + syllableAt(s, c.at), c.chord);
    sylls.push(...s);
  }
  // A chord on a held syllable (_) or past the words still goes on that note.
  const flats = usesFlats(key), sig = keySignature(key), bar = barLength(meter);
  const notes = [...melody].sort((a, b) => a[1] - b[1]);
  const end = notes.length ? Math.ceil((notes.at(-1)[1] + notes.at(-1)[2]) / bar) * bar : bar;
  const music = [[]], words = [[]];
  let t = 0, ni = 0, state = {};
  const newBar = () => { state = {}; };
  const put = (tok, len, opts = {}) => {
    // fill `len` sixteenths from t, splitting at bar lines (tied for notes)
    let left = len, first = true;
    while (left > 0) {
      const room = bar - (t % bar), n = Math.min(left, room);
      const parts = split(n);
      parts.forEach((pn, k) => {
        const isFirst = first && k === 0, last = left - n === 0 && k === parts.length - 1;
        const head = isFirst && opts.chord ? `"${opts.chord.replace(/"/g, "")}"` : "";
        music.at(-1).push(head + tok(isFirst) + pn + (opts.note && !last ? "-" : ""));
        if (opts.note) words.at(-1).push(isFirst ? opts.word : "*");
      });
      first = false; left -= n; t += n;
      if (t % bar === 0) {
        music.at(-1).push("|"); newBar();
        if ((t / bar) % barsPerLine === 0 && t < end) { music.push([]); words.push([]); }
      }
    }
  };
  for (const [pitch, start, len] of notes) {
    if (start > t) put(() => "z", start - t);
    if (start < t) continue; // overlapping note (shouldn't happen after quantize)
    const sp = spell(pitch, flats), id = sp.letter + sp.oct;
    const keyAcc = sig[sp.letter] ?? 0, cur = id in state ? state[id] : keyAcc;
    const accTxt = sp.acc === cur ? "" : sp.acc === 1 ? "^" : sp.acc === -1 ? "_" : "=";
    const syl = sylls[ni];
    let word = "*";
    if (syl) word = syl.hold ? "_" : syl.text.replace(/[\s*_|-]/g, "") + (syl.end ? "" : "-");
    const chord = chordAt.get(ni);
    put((isFirst) => (isFirst ? accTxt : "") + abcPitch(sp.letter, sp.oct), len, { note: true, word, chord });
    state[id] = sp.acc;
    ni++;
  }
  if (t % bar) put(() => "z", bar - (t % bar));
  const head = [`X:1`, `M:${meter[0]}/${meter[1]}`, `L:1/16`, ...(tempo ? [`Q:1/4=${tempo}`] : []), `K:${key}`];
  const body = music.map((m, i) => {
    const line = m.join(" ").replace(/\|\s*$/, i === music.length - 1 ? "|]" : "|");
    const w = words[i].filter(Boolean);
    return `${line}\nw: ${w.join(" ").replace(/- /g, "-") || "*"}`;
  });
  return { abc: [...head, ...body].join("\n") + "\n", notes: notes.length, syllables: sylls.length };
}

// ───────── the page ─────────
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const label = (kind) => ({ verse: "Verses", chorus: "Chorus", bridge: "Bridge", intro: "Intro", outro: "Outro", "pre-chorus": "Pre-chorus", refrain: "Refrain", song: "The song" }[kind] ?? titleCase(kind));
const meterOf = (m) => (/^(\d+)\/(\d+)$/.exec(m ?? "") ? m.split("/").map(Number) : [4, 4]);

/** Words of one line with colored chord tags over the syllables (a tag sits just before its syllable). */
function wordsHtml(line, semis, key) {
  if (line.type === "chords") return `<div class="ls-line ls-only-chords">${line.chords.map((c) => tag(transposeChord(c, semis, key))).join(" ")}</div>`;
  const raw = line.text, marks = [...line.chords].sort((a, b) => a.at - b.at);
  const strip = (frag, nextCh) => frag.replace(/--/g, "\u2011").replace(/(\p{L})-(?=\p{L})/gu, "$1").replace(/(^|\s)_+(?=\s|$)/g, "$1")
    .replace(/(\p{L})-$/u, (m, l) => (/\p{L}/u.test(nextCh ?? "") ? l : m));
  let html = "", prev = 0;
  for (const m of marks) {
    html += esc(strip(raw.slice(prev, m.at), raw[m.at]));
    const c = transposeChord(m.chord, semis, key);
    html += `<span class="ls-ch" style="--c:${chordColor(c)}" data-c="${esc(c)}"></span>`;
    prev = m.at;
  }
  html += esc(strip(raw.slice(prev)));
  return `<div class="ls-line${marks.length ? " has-chords" : ""}">${html.replace(/\s{2,}/g, " ")}</div>`;
}
const tag = (c) => `<span class="ls-tag" style="--c:${chordColor(c)}">${esc(c)}</span>`;

/**
 * Draw a sheet into `el`. opts: { transpose, chordsOverWords }. Needs window.ABCJS for the melody staves.
 * Returns { problems: ["Verse 1: 11 notes, 12 syllables"] } so the editor can say what doesn't line up.
 */
export function renderSheet(el, data, { transpose = 0, chordsOverWords = true } = {}) {
  const sheet = parseSheet(data.text);
  const key = data.key || "C", shownKey = keyName(key, transpose), meter = meterOf(data.meter);
  const T = (c) => transposeChord(c, transpose, key);
  const problems = [];
  const vs = vamps(sheet);
  // Chords for the boxes: each shape once (Dm/C is played like Dm, so it shares Dm's box when both are used).
  const all = [...new Set(sheet.sections.flatMap((s) => s.lines.flatMap((l) => (l.type === "chords" ? l.chords : l.chords.map((c) => c.chord)))).concat(vs.flatMap((v) => v.loop)).map(T))];
  const shapes = new Set(), used = [];
  for (const c of [...all.filter((c) => !c.includes("/")), ...all.filter((c) => c.includes("/"))]) {
    const k = JSON.stringify(guitarShape(c)) + (guitarShape(c) ? "" : c);
    if (!shapes.has(k)) { shapes.add(k); used.push(c); }
  }
  const byline = [data.words && `Words by ${esc(data.words)}`, data.tune && `Tune: “${esc(data.tune)}”`, `Key of ${esc(shownKey)}`, data.license === "CC0" ? "Free to share (CC0)" : esc(data.license ?? "")].filter(Boolean).join(" · ");
  const beats = meter[0] === 6 && meter[1] === 8 ? 2 : meter[0];
  const tiles = vs.map((v) => `
    <div class="ls-vamp"><div class="ls-lab">${esc(v.names.map(label).join(" & "))}: play this loop</div>
      <div class="ls-tiles">${v.loop.map((c) => `<div class="ls-tile" style="--c:${chordColor(T(c))}">${esc(T(c))}<div class="ls-beats">${"<i></i>".repeat(beats)}</div></div>`).join("")}<span class="ls-rep" aria-label="repeat">↻</span></div></div>`).join("");
  let firstChorus = true;
  const sections = sheet.sections.map((s) => {
    const isChorus = /chorus|refrain/.test(s.kind);
    if (s.repeat) return `<div class="ls-sec ls-again"><span class="ls-pill">${esc(s.name)}</span>${isChorus ? "<span class=\"ls-muted\">sing the chorus again</span>" : ""}</div>`;
    const body = s.lines.map((l) => (chordsOverWords || l.type === "chords" ? wordsHtml(l, transpose, key) : `<div class="ls-line">${esc(plainWords(l.text))}</div>`)).join("");
    const box = isChorus && firstChorus; if (isChorus) firstChorus = false;
    return `<div class="ls-sec${box ? " ls-chorus" : ""}"><span class="ls-pill">${esc(s.name)}${box ? " <small>after every verse</small>" : ""}</span>${body}</div>`;
  }).join("");
  const tunes = Object.entries(data.melodies ?? {}).filter(([, m]) => m?.length).map(([name], i) => `<div class="ls-tune"><div class="ls-lab">How the tune goes: ${esc(name)}</div><div class="ls-staff" data-i="${i}"></div></div>`).join("");
  el.innerHTML = `
    <article class="ls-sheet">
      <h1 class="ls-title">${esc(data.title || sheet.meta.title || "Untitled song")}</h1>
      <p class="ls-by">${byline}</p>
      ${tiles}
      <div class="ls-song">${sections}</div>
      ${used.length ? `<div class="ls-lab">Guitar chords</div><div class="ls-boxes">${used.map((c) => `<div class="ls-boxed" style="--c:${chordColor(c)}"><b>${esc(c)}</b>${chordBox(c) || '<span class="ls-muted">—</span>'}</div>`).join("")}</div>` : ""}
      ${tunes}
    </article>`;
  // the staves
  Object.entries(data.melodies ?? {}).filter(([, m]) => m?.length).forEach(([name, melody], i) => {
    const sec = sheet.sections.find((s) => s.name === name && !s.repeat) ?? sheet.sections.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const barsPerLine = (el.clientWidth || 800) >= 700 ? 3 : 2; // room for the words under the notes
    const { abc, notes, syllables: n } = melodyAbc(melody, sec?.lines ?? [], { key, meter, tempo: data.tempo, barsPerLine });
    if (sec && notes !== n) problems.push(`${name}: ${notes} notes, ${n} syllables${notes > n ? " (add hyphens to split words, or _ to hold a word)" : " (some words have no note)"}`);
    const box = el.querySelector(`.ls-staff[data-i="${i}"]`);
    if (typeof window !== "undefined" && window.ABCJS && box) {
      window.ABCJS.renderAbc(box, abc, { responsive: "resize", add_classes: true, visualTranspose: transpose, paddingtop: 0, paddingbottom: 4,
        format: { gchordfont: "Nunito 16 bold", vocalfont: "Nunito 15", tempofont: "Nunito 12" } });
      box.querySelectorAll(".abcjs-chord").forEach((t) => { t.style.fill = chordColor(t.textContent.trim()); });
    }
  });
  return { problems, abc: null };
}
