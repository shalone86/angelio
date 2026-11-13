// Letters, their sounds and picture words (used by reading.js and phonics.js).

/**
 * Each letter: the sound to say (spelled so a voice says it well), and picture words that start
 * with that sound. The first word is the letter's "keyword" (s: sun).
 */
export const LETTERS = {
  s: { sound: "sss", words: [["sun", "☀️"], ["sock", "🧦"], ["snake", "🐍"], ["seal", "🦭"]] },
  a: { sound: "ah", words: [["apple", "🍎"], ["ant", "🐜"], ["alligator", "🐊"]] },
  t: { sound: "tuh", words: [["tiger", "🐯"], ["tent", "⛺"], ["tooth", "🦷"], ["turtle", "🐢"]] },
  p: { sound: "puh", words: [["pig", "🐷"], ["pizza", "🍕"], ["pear", "🍐"], ["penguin", "🐧"]] },
  i: { sound: "ih", words: [["iguana", "🦎"], ["insect", "🐞"]] },
  n: { sound: "nnn", words: [["nose", "👃"], ["nut", "🥜"], ["nine", "9️⃣"]] },
  m: { sound: "mmm", words: [["moon", "🌙"], ["mouse", "🐭"], ["monkey", "🐵"], ["milk", "🥛"]] },
  d: { sound: "duh", words: [["dog", "🐶"], ["duck", "🦆"], ["drum", "🥁"], ["donut", "🍩"]] },
  g: { sound: "guh", words: [["goat", "🐐"], ["gift", "🎁"], ["grapes", "🍇"], ["gorilla", "🦍"]] },
  o: { sound: "aw", words: [["octopus", "🐙"], ["otter", "🦦"], ["ox", "🐂"]] },
  c: { sound: "kuh", words: [["cat", "🐱"], ["cake", "🎂"], ["car", "🚗"], ["cow", "🐮"]] },
  k: { sound: "kuh", words: [["kite", "🪁"], ["key", "🔑"], ["koala", "🐨"], ["king", "🤴"]] },
  e: { sound: "eh", words: [["egg", "🥚"], ["elephant", "🐘"], ["elf", "🧝"]] },
  u: { sound: "uh", words: [["umbrella", "☂️"], ["up", "⬆️"]] },
  r: { sound: "rrr", words: [["rabbit", "🐰"], ["rainbow", "🌈"], ["ring", "💍"], ["robot", "🤖"]] },
  h: { sound: "huh", words: [["hat", "🎩"], ["horse", "🐴"], ["house", "🏠"], ["heart", "❤️"]] },
  b: { sound: "buh", words: [["bus", "🚌"], ["bee", "🐝"], ["banana", "🍌"], ["bear", "🐻"]] },
  f: { sound: "fff", words: [["fish", "🐟"], ["fox", "🦊"], ["frog", "🐸"], ["feather", "🪶"]] },
  l: { sound: "lll", words: [["lion", "🦁"], ["leaf", "🍃"], ["lemon", "🍋"], ["lamb", "🐑"]] },
};
export const keyword = (l) => LETTERS[l].words[0];
/** "sss, like sun" — how a letter's sound is said aloud, always with its picture word. */
export const soundSay = (l) => `${LETTERS[l].sound}, like ${keyword(l)[0]}`;

