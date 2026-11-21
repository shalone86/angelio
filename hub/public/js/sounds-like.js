// Did the child say the word? Compares what Whisper heard with the word wanted by how they SOUND, not by spelling:
// numbers become words ("10" is "ten"), spellings are simplified (ck/c/q → k, ph → f, doubled letters once), and
//   - a short word (4 letters or fewer) keeps its vowels, so "bit" is never accepted for "bot" (short vowels are what early readers practice);
//   - a longer word compares its consonants and may be one sound off ("pick Nick" is "picnic", "kit 10" is "kitten").
// Tested on Mom's and Dad's recordings (hub/test/sounds-like.test.js; the numbers are in ROADMAP.md, Backburner).

const NUM = { 0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
  11: "eleven", 12: "twelve", 20: "twenty", 100: "hundred" };
const words = (s) => String(s).toLowerCase().replace(/\d+/g, (n) => ` ${NUM[n] ?? n} `);
const letters = (s) => words(s).replace(/[^a-z]/g, "");
const simple = (t) => t.replace(/ph/g, "f").replace(/wh/g, "w").replace(/ck/g, "k").replace(/c/g, "k").replace(/q/g, "k").replace(/x/g, "ks");

/** The consonants of a word (and its first letter), the way it sounds: "picnic" → "pknk". */
export function skeleton(s) {
  let t = simple(letters(s).replace(/^one/, "won")).replace(/([bdgkptsfvz])h/g, "$1").replace(/([aeiou])[wh]/g, "$1"); // row, oh: silent w, h
  return (t[0] ?? "") + t.slice(1).replace(/[aeiouy]/g, "").replace(/(.)\1+/g, "$1");
}
const spelled = (s) => simple(letters(s).replace(/^one$/, "won")).replace(/(.)\1+/g, "$1");

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** True when `heard` (what Whisper wrote) sounds like `want` (the word on the screen). */
export function soundsLike(heard, want) {
  const w = skeleton(want);
  if (!w) return false;
  if (letters(want).length <= 4) return spelled(heard) === spelled(want); // short words: vowels count
  const h = skeleton(heard);
  return h === w || lev(h, w) <= 1;
}
