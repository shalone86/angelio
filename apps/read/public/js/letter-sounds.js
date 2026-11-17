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
  j: { sound: "juh", words: [["juice", "🧃"], ["jeans", "👖"], ["jellyfish", "🪼"], ["jar", "🫙"]] },
  v: { sound: "vvv", words: [["van", "🚐"], ["violin", "🎻"], ["volcano", "🌋"], ["vase", "🏺"]] },
  w: { sound: "wuh", words: [["worm", "🪱"], ["web", "🕸️"], ["watermelon", "🍉"], ["wolf", "🐺"]] },
  // x says "ks" at the END of words (fox, box): no picture starts with it, so questions ask about the end.
  x: { sound: "ks", ends: true, words: [["fox", "🦊"], ["box", "📦"], ["ox", "🐂"], ["six", "6️⃣"]] },
  y: { sound: "yuh", words: [["yo-yo", "🪀"], ["yarn", "🧶"], ["yawn", "🥱"]] },
  z: { sound: "zzz", words: [["zebra", "🦓"], ["zero", "0️⃣"], ["zipper", "🤐"]] },
  // q always comes with u: "kwuh".
  q: { sound: "kwuh", words: [["queen", "👸"], ["question", "❓"], ["quilt", "🛏️"]] },
};
export const keyword = (l) => LETTERS[l].words[0];
/** "sss, like sun" — how a letter's sound is said aloud, always with its picture word. */
export const soundSay = (l) => `${snd(LETTERS[l].sound)}, like ${keyword(l)[0]}`;
/** Mark a sound in spoken text, so a grown-up's recording of it plays (see clips.js). */
export const snd = (s) => (s ? `{{${s}}}` : s);

