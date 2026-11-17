// Phonics from Kindergarten to 3rd grade, in the "break the word into its sound chunks" style:
// digraphs (sh, ch, th), blends, magic e, vowel teams (ai, ee, oa, igh), r-controlled vowels
// (ar, or, er/ir/ur), oi/oy and ou/ow, trigraphs (tch, dge), syllables, silent letters, and
// endings (-tion, -ture, -le). Each pattern is taught alone, in words, and in sentences.
//
// Words are written as chunks: "sh|i|p". A chunk can carry its own sound after a colon:
// "c|a:ay|k|e:" means a says "ay" and e is silent (shown faded). Pure data, tested in test/phonics.test.js.

import { LETTERS } from "./letter-sounds.js";

/** How each chunk is said (spelled so the voice says it well). Single letters fall back to LETTERS. */
export const CHUNK_SOUNDS = {
  sh: "shh", ch: "chuh", th: "thuh", wh: "wuh", ck: "kuh", ing: "ing", ink: "ink", unk: "unk", ll: "lll", ss: "sss", ff: "fff",
  ee: "ee", ea: "ee", ai: "ay", ay: "ay", oa: "oh", igh: "eye", ar: "ar", or: "or", er: "er", ir: "er", ur: "er",
  oi: "oy", oy: "oy", ou: "ow", ow: "ow", tch: "chuh", dge: "juh", kn: "nnn", wr: "rrr", mb: "mmm",
  tion: "shun", ture: "cher", le: "ul", qu: "kwuh",
  j: "juh", v: "vvv", w: "wuh", x: "ks", y: "yuh", z: "zzz",
  // blends: both sounds, quickly, as one chunk
  st: "stuh", fr: "fruh", fl: "fluh", dr: "druh", cr: "kruh", sl: "sluh", sn: "snuh", tr: "truh", gr: "gruh", cl: "kluh", pl: "pluh",
  nd: "nnd", ft: "fft", lk: "llk", nt: "nnt", mp: "mmp",
};

/** "c|a:ay|k|e:" → [{ t: "c", s: "kuh" }, { t: "a", s: "ay" }, { t: "k", s: "kuh" }, { t: "e", s: "", silent: true }] */
export function chunks(spec, syllables = false) {
  return spec.split("|").map((part) => {
    const [t, own] = part.split(":");
    if (own === "") return { t, s: "", silent: true };
    const s = own ?? (syllables ? CHUNK_SOUNDS[t] ?? t : CHUNK_SOUNDS[t] ?? LETTERS[t]?.sound ?? t);
    return { t, s };
  });
}
export const wordOf = (spec) => spec.split("|").map((p) => p.split(":")[0]).join("");

// Each pattern: grade (2 = K, 3 = 1st, 4 = 2nd, 5 = 3rd), the chunks it teaches, how to say them,
// picture words [chunks, emoji], more words to read, and sentences [text, emoji].
export const PATTERNS = [
  // ── Kindergarten ──
  {
    id: "k-sentences", grade: 2, title: "Read Little Sentences", emoji: "📖", focus: [],
    teach: "Sound out each word, then read the whole sentence. A few words, like <b>the</b> and <b>a</b>, we just know by heart.",
    say: "Sound out each word, then put the words together and read the whole sentence. Some little words, like the, and a, we just know by heart!",
    pictures: [["c|a|t", "🐱"], ["p|i|g", "🐷"], ["d|o|g", "🐶"], ["s|u|n", "☀️"], ["b|u|s", "🚌"], ["h|e|n", "🐔"], ["b|e|d", "🛏️"], ["b|u|g", "🐛"]],
    words: ["h|a|t", "r|a|n", "s|a|t", "m|a|p", "p|e|n", "t|e|n", "h|o|t", "c|u|p", "f|i|n", "l|o|g"],
    sentences: [["The cat sat.", "🐱"], ["A pig dug.", "🐷"], ["The dog ran.", "🐶"], ["The sun is hot.", "☀️"], ["The hen sat.", "🐔"], ["A big bus.", "🚌"], ["A bug hid.", "🐛"], ["The bed is red.", "🛏️"]],
  },
  {
    id: "k-sh-ch-th", grade: 2, title: "sh, ch, th", emoji: "🐚", focus: ["sh", "ch", "th"],
    teach: "Two letters can make <b>one sound</b>: <b>sh</b> says shh, <b>ch</b> says ch, <b>th</b> says th.",
    say: "Sometimes two letters work together to make one sound. S, h says {{shh}}, like ship. C, h says {{chuh}}, like chick. T, h says {{thuh}}, like bath.",
    pictures: [["sh|i|p", "🚢"], ["sh|e|ll", "🐚"], ["f|i|sh", "🐟"], ["d|i|sh", "🍽️"], ["ch|i|ck", "🐤"], ["ch|i|p", "🍟"], ["b|a|th", "🛁"], ["l|u|n|ch", "🍱"]],
    words: ["sh|o|p", "sh|u|t", "c|a|sh", "ch|i|n", "m|u|ch", "r|i|ch", "th|i|n", "m|a|th", "w|i|th", "th|e|m"],
    sentences: [["A red ship.", "🚢"], ["I see a fish.", "🐟"], ["The chick is wet.", "🐤"], ["A hot bath.", "🛁"], ["Chips on a dish.", "🍟"], ["A big shell.", "🐚"]],
  },
  // ── 1st grade ──
  {
    id: "g1-ck-ing", grade: 3, title: "ck and -ing", emoji: "🦆", focus: ["ck", "ing", "unk"],
    teach: "<b>ck</b> says k at the end of a word: du<b>ck</b>. <b>ing</b> says ing: r<b>ing</b>, k<b>ing</b>.",
    say: "C, k together say {{kuh}}, at the end of a word, like duck. And i, n, g says {{ing}}, like ring, and king!",
    pictures: [["d|u|ck", "🦆"], ["s|o|ck", "🧦"], ["r|o|ck", "🪨"], ["c|l|o|ck", "🕰️"], ["t|r|u|ck", "🚚"], ["r|ing", "💍"], ["k|ing", "🤴"], ["s|k|unk", "🦨"]],
    words: ["b|a|ck", "p|i|ck", "l|u|ck", "n|e|ck", "s|ing", "w|ing", "th|ing", "d|u|ck|s", "j|unk", "s|t|i|ck"],
    sentences: [["The duck can swim fast.", "🦆"], ["A king has a big ring.", "🤴"], ["My sock is on the rug.", "🧦"], ["The truck is stuck in the mud.", "🚚"], ["Tick tock goes the clock.", "🕰️"], ["A skunk sat on a rock.", "🦨"]],
  },
  {
    id: "g1-blends", grade: 3, title: "Blends: fr, fl, st, nd…", emoji: "🐸", focus: ["fr", "fl", "dr", "cr", "sl", "sn", "tr", "gr", "cl", "pl", "st", "nd", "ft", "lk", "nt", "mp"],
    teach: "In a <b>blend</b>, two letters stick together into one chunk. You hear <b>both</b> sounds, quickly: <b>fr</b>og, <b>fl</b>ag, ha<b>nd</b>.",
    say: "In a blend, two letters stick together into one chunk, and you hear both sounds, quickly. {{fff}}, {{rrr}}, {{fruh}}, like frog. {{fff}}, {{lll}}, {{fluh}}, like flag. At the end too: hand!",
    pictures: [["fr|o|g", "🐸"], ["fl|a|g", "🚩"], ["dr|u|m", "🥁"], ["cr|a|b", "🦀"], ["sl|e|d", "🛷"], ["h|a|nd", "✋"], ["g|i|ft", "🎁"], ["m|i|lk", "🥛"], ["t|e|nt", "⛺"]],
    words: ["st|o|p", "sn|a|p", "tr|i|p", "gr|i|n", "cl|a|p", "pl|a|n", "b|e|nd", "j|u|mp", "l|a|mp", "f|a|st:sst"],
    sentences: [["The frog sat on a log.", "🐸"], ["A crab is on the sand.", "🦀"], ["Dad has a red flag.", "🚩"], ["We sled down the hill.", "🛷"], ["I can hit the drum.", "🥁"], ["The milk is in a cup.", "🥛"]],
  },
  {
    id: "g1-magic-e", grade: 3, title: "Magic e", emoji: "🪄", focus: ["a", "i", "o", "u", "e"], magic: true,
    teach: "A <b>magic e</b> at the end is quiet, but it makes the vowel <b>say its name</b>: c<b>a</b>k<b>e</b>, k<b>i</b>t<b>e</b>, b<b>o</b>n<b>e</b>.",
    say: "When a word ends in e, the e is quiet, but it's magic! It makes the vowel say its name. Cake: the a says {{ay}}. Kite: the i says {{eye}}. Bone: the o says {{oh}}.",
    pictures: [["c|a:ay|k|e:", "🎂"], ["k|i:eye|t|e:", "🪁"], ["b|o:oh|n|e:", "🦴"], ["r|o:oh|s:z|e:", "🌹"], ["f|i:eye|v|e:", "5️⃣"], ["s|n|a:ay|k|e:", "🐍"], ["p|l|a:ay|t|e:", "🍽️"], ["h|o:oh|m|e:", "🏠"], ["c|u:yoo|b|e:", "🧊"]],
    words: ["m|a:ay|d|e:", "t|i:eye|m|e:", "h|o:oh|p|e:", "c|u:yoo|t|e:", "l|i:eye|k|e:", "g|a:ay|t|e:", "n|o:oh|t|e:", "r|i:eye|d|e:", "t|u:oo|b|e:", "s|a:ay|m|e:"],
    sentences: [["I ate a big cake.", "🎂"], ["The dog has a bone.", "🦴"], ["A snake is in the grass.", "🐍"], ["I like the red rose.", "🌹"], ["My kite is up so high.", "🪁"], ["We went home for lunch.", "🏠"]],
  },
  // ── 2nd grade ──
  {
    id: "g2-ai-ee", grade: 4, title: "ai, ay, ee, ea", emoji: "🐌", focus: ["ai", "ay", "ee", "ea"],
    teach: "<b>Vowel teams</b>: two vowels, one sound. <b>ai</b> and <b>ay</b> say ay (r<b>ai</b>n, d<b>ay</b>). <b>ee</b> and <b>ea</b> say ee (b<b>ee</b>, l<b>ea</b>f).",
    say: "Vowel teams are two vowels that make one sound. A, i and a, y both say {{ay}}, like rain, and day. E, e and e, a both say {{ee}}, like bee, and leaf. When two vowels go walking, the first one does the talking!",
    pictures: [["r|ai|n", "🌧️"], ["s|n|ai|l", "🐌"], ["t|r|ai|n", "🚂"], ["b|ee", "🐝"], ["t|r|ee", "🌳"], ["sh|ee|p", "🐑"], ["f|ee|t", "🦶"], ["l|ea|f", "🍃"], ["p|ea|ch", "🍑"], ["s|ea|l", "🦭"]],
    words: ["w|ai|t", "p|ai|n|t", "d|ay", "p|l|ay", "s|t|ay", "s|ee|d", "g|r|ee|n", "w|ee|k", "b|ea|ch", "r|ea|d"],
    sentences: [["The train went down the track in the rain.", "🚂"], ["A little snail sat on a green leaf.", "🐌"], ["Three sheep ate grass under the big tree.", "🐑"], ["We ate a sweet peach at the beach today.", "🍑"], ["The busy bee flew from tree to tree.", "🐝"], ["A seal lay in the sun on the warm sand.", "🦭"]],
  },
  {
    id: "g2-oa-ow-igh", grade: 4, title: "oa, ow, igh", emoji: "🌙", focus: ["oa", "ow", "igh"],
    teach: "<b>oa</b> and <b>ow</b> say oh (b<b>oa</b>t, sn<b>ow</b>). <b>igh</b> says eye (n<b>igh</b>t). The g and h are quiet!",
    say: "O, a says {{oh}}, like boat. O, w can say {{oh}} too, like snow. And i, g, h together say {{eye}}, like night, and light. The g and the h are quiet.",
    pictures: [["b|oa|t", "⛵"], ["g|oa|t", "🐐"], ["s|oa|p", "🧼"], ["c|oa|t", "🧥"], ["s|n|ow:oh", "❄️"], ["b|ow:oh", "🎀"], ["b|ow:oh|l", "🥣"], ["n|igh|t", "🌙"], ["l|igh|t", "💡"], ["f|l|igh|t", "✈️"]],
    words: ["r|oa|d", "t|oa|s|t", "g|r|ow:oh", "s|l|ow:oh", "s|h|ow:oh", "r|igh|t", "h|igh", "b|r|igh|t", "f|igh|t", "m|igh|t"],
    sentences: [["The goat ate a coat on the boat.", "🐐"], ["At night, the light of the moon is bright.", "🌙"], ["We made a snowman in the cold white snow.", "⛄"], ["Wash your hands with soap and warm water.", "🧼"], ["A plane took flight high up in the sky.", "✈️"], ["Mom tied a pink bow on the gift.", "🎀"]],
  },
  {
    id: "g2-r-vowels", grade: 4, title: "ar, or, er, ir, ur", emoji: "⭐", focus: ["ar", "or", "er", "ir", "ur"],
    teach: "An <b>r</b> after a vowel changes its sound: <b>ar</b> (st<b>ar</b>), <b>or</b> (c<b>or</b>n), and <b>er, ir, ur</b> all say er (b<b>ir</b>d, t<b>ur</b>tle).",
    say: "When r comes after a vowel, it bosses the vowel and changes its sound. A, r says {{ar}}, like star. O, r says {{or}}, like corn. And e, r, i, r, and u, r all say {{er}}, like her, bird, and turtle.",
    pictures: [["c|ar", "🚗"], ["s|t|ar", "⭐"], ["sh|ar|k", "🦈"], ["c|or|n", "🌽"], ["f|or|k", "🍴"], ["h|or|s|e:", "🐴"], ["b|ir|d", "🐦"], ["g|ir|l", "👧"], ["sh|ir|t", "👕"], ["p|ur|s|e:", "👛"]],
    words: ["f|ar|m", "d|ar|k", "p|ar|k", "s|t|or|m", "sh|or|t", "h|er", "f|ir|s|t", "t|ur|n", "h|ur|t", "f|er|n"],
    sentences: [["A shark swam far out in the dark sea.", "🦈"], ["The girl in the red shirt fed the bird.", "🐦"], ["We ate corn with a fork at the farm.", "🌽"], ["Look at that bright star in the dark sky.", "⭐"], ["The horse ran across the park in the storm.", "🐴"], ["We drove to the market in our little car.", "🚗"]],
  },
  {
    id: "g2-oi-ou", grade: 4, title: "oi, oy, ou, ow", emoji: "🐮", focus: ["oi", "oy", "ou", "ow"],
    teach: "<b>oi</b> and <b>oy</b> say oy (c<b>oi</b>n, b<b>oy</b>). <b>ou</b> and <b>ow</b> say ow, like when you're hurt (h<b>ou</b>se, c<b>ow</b>).",
    say: "O, i and o, y both say {{oy}}, like coin, and boy. O, u and o, w can both say {{ow}}, like when you bump your knee! House. Cow.",
    pictures: [["c|oi|n", "🪙"], ["b|oy", "👦"], ["t|oy", "🧸"], ["c|l|ou|d", "☁️"], ["h|ou|s|e:", "🏠"], ["m|ou|s|e:", "🐭"], ["c|ow", "🐮"], ["ow|l", "🦉"], ["c|r|ow|n", "👑"], ["c|l|ow|n", "🤡"]],
    words: ["s|oi|l", "j|oi|n", "j|oy", "t|oy|s", "ou|t", "l|ou|d", "r|ou|n|d", "d|ow|n", "t|ow|n", "h|ow"],
    sentences: [["The boy found a shiny coin on the ground.", "🪙"], ["A brown cow stood by the little house.", "🐮"], ["An owl hoots at night from the oak tree.", "🦉"], ["The clown has a big red crown on his head.", "🤡"], ["My toy mouse is round and soft and gray.", "🐭"], ["A dark cloud came, and then it began to rain.", "☁️"]],
  },
  {
    id: "g2-tch-dge", grade: 4, title: "tch and dge", emoji: "🌉", focus: ["tch", "dge"],
    teach: "Three letters, one sound! <b>tch</b> says ch (wa<b>tch</b>), and <b>dge</b> says j (bri<b>dge</b>), after a short vowel.",
    say: "Here are three letters that make just one sound! T, c, h says {{chuh}}, like watch, and catch. D, g, e says {{juh}}, like bridge, and badge. They come right after a short vowel.",
    pictures: [["w|a:aw|tch", "⌚"], ["c|a|tch", "⚾"], ["p|a|tch", "🩹"], ["b|r|i|dge", "🌉"], ["b|a|dge", "📛"], ["j|u|dge", "🧑‍⚖️"]],
    words: ["m|a|tch", "i|tch", "f|e|tch", "d|i|tch", "s|k|e|tch", "e|dge", "l|e|dge", "f|u|dge", "h|e|dge", "n|u|dge"],
    sentences: [["Dad will catch the ball with his big mitt.", "⚾"], ["We walked across the old stone bridge.", "🌉"], ["The judge sat at a tall desk in the court.", "🧑‍⚖️"], ["My new watch has a red band and a bell.", "⌚"], ["Mom sewed a patch on my torn jeans.", "🩹"], ["The scout got a shiny new badge today.", "📛"]],
  },
  // ── 3rd grade ──
  {
    id: "g3-syllables", grade: 5, title: "Big Words in Chunks", emoji: "🧩", focus: [], syllables: true,
    teach: "Break a big word into <b>chunks</b> (syllables), read each chunk, then put them together: <b>rab · bit</b>, <b>pump · kin</b>.",
    say: "Big words are easy if you break them into chunks. Each chunk has one vowel sound. Read each chunk, then put them together: {{rab}}, {{bit}}, rabbit! {{pump}}, {{kin}}, pumpkin!",
    pictures: [["rab|bit", "🐰"], ["pic|nic", "🧺"], ["rain|bow", "🌈"], ["pump|kin", "🎃"], ["cup|cake", "🧁"], ["ro:roh|bot", "🤖"], ["drag|on", "🐉"], ["pop|corn", "🍿"], ["rock|et", "🚀"], ["sun|flow|er", "🌻"]],
    words: ["nap|kin", "kit|ten", "sun|set", "bas|ket", "hun|dred", "mag|net", "in|sect", "fan|tas|tic", "won|der|ful", "ad|ven|ture"],
    sentences: [
      ["Our family had a picnic by the lake. We ate cupcakes and popcorn on a blanket.", "🧺"],
      ["A rocket blasted off into space. It zoomed past the moon and the stars.", "🚀"],
      ["The farmer grew a giant pumpkin. It was too big to fit in his truck!", "🎃"],
      ["After the storm, a rainbow filled the sky. We counted all of its colors.", "🌈"],
      ["The little rabbit hopped into the garden. She nibbled a carrot and took a nap.", "🐰"],
      ["My robot can walk and talk. It even helps me clean my room!", "🤖"],
    ],
  },
  {
    id: "g3-silent", grade: 5, title: "Silent Letters: kn, wr, mb", emoji: "🤫", focus: ["kn", "wr", "mb"],
    teach: "Some letters are <b>silent</b>! In <b>kn</b> the k is quiet (<b>kn</b>ot), in <b>wr</b> the w is quiet (<b>wr</b>ite), and in <b>mb</b> the b is quiet (la<b>mb</b>).",
    say: "Some letters are silent, they don't make any sound! In k, n, the k is quiet: knot, knit. In w, r, the w is quiet: write. And in m, b, the b is quiet: lamb, thumb.",
    pictures: [["kn|o|t", "🪢"], ["kn|i:eye|f|e:", "🔪"], ["kn|i|t", "🧶"], ["wr|i:eye|t|e:", "✍️"], ["wr|e|n|ch", "🔧"], ["l|a|mb", "🐑"], ["th|u|mb", "👍"]],
    words: ["kn|o|ck", "kn|ee", "kn|ow:oh", "wr|a|p", "wr|ong", "wr|i|s|t", "c|l|i|mb", "c|r|u|mb", "b|o|mb", "kn|igh|t"],
    sentences: [
      ["Grandma likes to knit warm hats. She knits one for each of us.", "🧶"],
      ["I hurt my thumb with a wrench. Dad put a bandage on it.", "🔧"],
      ["The little lamb followed Mary to school. The children laughed and played.", "🐑"],
      ["Please write your name at the top. Then write the date under it.", "✍️"],
      ["Tie the rope in a tight knot. Then we can climb the tree.", "🪢"],
    ],
  },
  {
    id: "g3-endings", grade: 5, title: "Endings: -tion, -ture, -le", emoji: "🕯️", focus: ["tion", "ture", "le"], syllables: true,
    teach: "Some endings have their own sound: <b>tion</b> says shun (sta<b>tion</b>), <b>ture</b> says cher (pic<b>ture</b>), and <b>le</b> says ul (can<b>dle</b>).",
    say: "Some word endings have their very own sound. T, i, o, n says {{shun}}, like station. T, u, r, e says {{cher}}, like picture. And l, e at the end says {{ul}}, like candle, and turtle.",
    pictures: [["lo:loh|tion", "🧴"], ["sta:stay|tion", "🚉"], ["pic|ture", "🖼️"], ["can|dle:dul", "🕯️"], ["tur|tle:tul", "🐢"], ["ap|ple:pul", "🍎"], ["bot|tle:tul", "🍼"], ["puz|zle:zul", "🧩"]],
    words: ["ac|tion", "na:nay|tion", "mo:moh|tion", "fu:fyoo|ture", "na:nay|ture", "crea:cree|ture", "lit|tle:tul", "ta:tay|ble:bul", "sim|ple:pul", "gig|gle:gul"],
    sentences: [
      ["We lit a candle at church on Sunday. Its little flame was warm and bright.", "🕯️"],
      ["My sister drew a picture of a turtle. She hung it on the kitchen wall.", "🖼️"],
      ["The train pulled into the station. We grabbed our bags and hopped on.", "🚉"],
      ["I finished a giant puzzle with my brother. It had five hundred pieces!", "🧩"],
      ["Mom packed an apple and a bottle of water. We were ready for our hike.", "🍎"],
    ],
  },
];
export const patternById = (id) => PATTERNS.find((p) => p.id === id);

// ───────── questions ─────────
const pick = (rand, a) => a[Math.floor(rand() * a.length)];
const shuffle = (a, rand) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Six questions: two "sound it out", two "find the word", two "read the sentence". */
export function makePhonics(pattern, rand) {
  const out = [];
  const pics = shuffle(pattern.pictures, rand);
  for (const [spec, emoji] of pics.slice(0, 2)) {
    const wrong = shuffle(pattern.pictures.filter(([s]) => s !== spec), rand).slice(0, 2);
    out.push({ type: "sound-out", spec, word: wordOf(spec), emoji, chunks: chunks(spec, pattern.syllables),
      prompt: "Sound it out!", say: "Tap each chunk to hear it. Then sound it out, and find the picture!",
      answer: wordOf(spec), choices: shuffle([[spec, emoji], ...wrong], rand).map(([s, e]) => ({ word: wordOf(s), emoji: e })) });
  }
  const pool = [...pattern.words, ...pattern.pictures.map(([s]) => s)];
  for (const spec of shuffle(pattern.words, rand).slice(0, 2)) {
    const wrong = shuffle(pool.filter((s) => wordOf(s) !== wordOf(spec)), rand).slice(0, 2);
    const w = wordOf(spec);
    out.push({ type: "find-word", spec, word: w, prompt: "Find the word you hear", say: `Find the word: ${w}.`,
      answer: w, choices: shuffle([spec, ...wrong], rand).map((s) => ({ word: wordOf(s), chunks: chunks(s, pattern.syllables) })) });
  }
  const sents = shuffle(pattern.sentences, rand);
  for (const [text, emoji] of sents.slice(0, 2)) {
    const wrong = shuffle(pattern.sentences.filter(([t, e]) => t !== text && e !== emoji).map(([, e]) => e), rand);
    const picks = [...new Set(wrong)].slice(0, 2);
    out.push({ type: "read-sentence", text, emoji, prompt: "Read it, then find the picture", say: "Read the sentence. Tap a word if you need help. Then find the picture that matches!",
      answer: emoji, choices: shuffle([emoji, ...picks], rand).map((e) => ({ word: e, emoji: e })) });
  }
  return out;
}

/** Highlight a pattern inside a word for display: which chunk indexes are part of the pattern. */
export function focusIndexes(pattern, ch) {
  if (pattern.magic) return ch.map((c, i) => (c.s && ["ay", "eye", "oh", "yoo", "oo"].includes(c.s) && "aiou".includes(c.t)) || c.silent ? i : -1).filter((i) => i >= 0);
  if (!pattern.focus.length) return [];
  const multi = pattern.focus.filter((f) => !f.includes("|"));
  const blends = pattern.focus.filter((f) => f.includes("|")).map((f) => f.split("|"));
  const out = new Set();
  ch.forEach((c, i) => { if (multi.includes(c.t) || (pattern.syllables && multi.some((f) => c.t.endsWith(f)))) out.add(i); });
  blends.forEach(([a, b]) => ch.forEach((c, i) => { if (c.t === a && ch[i + 1]?.t === b) { out.add(i); out.add(i + 1); } }));
  return [...out];
}

/** Words in a sentence that show the pattern (for highlighting), e.g. "night" for igh. */
export function patternWord(pattern, word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return false;
  if (pattern.magic) return /[aeiou][^aeiou]e$/.test(w) && !/ee$/.test(w);
  const multi = pattern.focus.filter((f) => !f.includes("|"));
  if (multi.length) return multi.some((f) => (pattern.syllables ? w.endsWith(f) : w.includes(f)));
  const blends = pattern.focus.filter((f) => f.includes("|")).map((f) => f.replace("|", ""));
  return blends.some((b) => w.includes(b));
}
