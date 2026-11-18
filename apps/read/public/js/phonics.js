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
  sh: "shh", ch: "chuh", th: "thuh", wh: "wuh", ck: "kuh", ink: "ink", unk: "unk", ong: "ong", ll: "lll", ss: "sss", ff: "fff",
  ee: "ee", ea: "ee", ai: "ay", ay: "ay", oa: "oh", igh: "eye", ar: "ar", or: "or", er: "er", ir: "er", ur: "er",
  oi: "oy", oy: "oy", ou: "ow", ow: "ow", tch: "chuh", dge: "juh", kn: "nnn", wr: "rrr", mb: "mmm",
  tion: "shun", ture: "cher", le: "ul", qu: "kwuh",
  oo: "oo", ew: "oo", ue: "oo", au: "aw", aw: "aw", es: "iz", ly: "lee", ing: "ing",
  j: "juh", v: "vvv", w: "wuh", x: "ks", y: "yuh", z: "zzz",
  // blends: both sounds, quickly, as one chunk
  st: "stuh", sp: "spuh", sk: "skuh", sw: "swuh", sm: "smuh", gl: "gluh", bl: "bluh", br: "bruh", fr: "fruh", fl: "fluh", dr: "druh", cr: "kruh", sl: "sluh", sn: "snuh", tr: "truh", gr: "gruh", cl: "kluh", pl: "pluh",
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

// Each pattern: grade (2 = K, 3 = 1st, 4 = 2nd, 5 = 3rd) and level (1 or 2), the chunks it teaches, how to say them,
// picture words [chunks, emoji], more words to read, and sentences [text, emoji].
export const PATTERNS = [
  // ── Kindergarten: Level 1 ──
  {
    id: "k-short-a", grade: 2, level: 1, title: "Short a", emoji: "🐱", focus: ["a"],
    teach: "The letter <b>a</b> says <b>ah</b>, like in c<b>a</b>t. Sound out each word: c · a · t!",
    say: "The letter a says {{ah}}, like apple, and cat. Let's sound out words with {{ah}} in the middle!",
    pictures: [["c|a|t", "🐱"], ["h|a|t", "🎩"], ["b|a|t", "🦇"], ["m|a|p", "🗺️"], ["p|a|n", "🍳"], ["v|a|n", "🚐"], ["j|a|m", "🍯"], ["b|a|g", "👜"]],
    words: ["r|a|n", "s|a|t", "m|a|d", "c|a|p", "t|a|g", "d|a|d", "f|a|n", "t|a|p", "h|a|m", "n|a|p"],
    sentences: [["The cat sat.", "🐱"], ["Dad has a hat.", "🎩"], ["A bat ran.", "🦇"], ["Pam has a map.", "🗺️"], ["The van is tan.", "🚐"], ["Jam in a pan.", "🍳"]],
  },
  {
    id: "k-short-i", grade: 2, level: 1, title: "Short i", emoji: "🐷", focus: ["i"],
    teach: "The letter <b>i</b> says <b>ih</b>, like in p<b>i</b>g. Sound out each word: p · i · g!",
    say: "The letter i says {{ih}}, like insect, and pig. Let's sound out words with {{ih}} in the middle!",
    pictures: [["p|i|g", "🐷"], ["p|i|n", "📌"], ["f|i|n", "🦈"], ["l|i|p", "👄"], ["s|i|x", "6️⃣"], ["k|i|d", "🧒"], ["h|i|ll", "⛰️"]],
    words: ["b|i|g", "s|i|t", "h|i|t", "d|i|g", "w|i|n", "t|i|p", "r|i|p", "h|i|m", "l|i|d", "f|i|x"],
    sentences: [["The pig is big.", "🐷"], ["The kid can dig.", "🧒"], ["I see a fin.", "🦈"], ["Pin it.", "📌"], ["I am six.", "6️⃣"], ["Sit on the hill.", "⛰️"]],
  },
  {
    id: "k-short-o", grade: 2, level: 1, title: "Short o", emoji: "🦊", focus: ["o"],
    teach: "The letter <b>o</b> says <b>aw</b>, like in d<b>o</b>g. Sound out each word: d · o · g!",
    say: "The letter o says {{aw}}, like octopus, and dog. Let's sound out words with {{aw}} in the middle!",
    pictures: [["d|o|g", "🐶"], ["l|o|g", "🪵"], ["p|o|t", "🍲"], ["b|o|x", "📦"], ["f|o|x", "🦊"], ["m|o|p", "🧹"], ["o|x", "🐂"]],
    words: ["h|o|p", "n|o|t", "g|o|t", "d|o|t", "r|o|d", "c|o|t", "j|o|b", "l|o|t", "p|o|p", "n|o|d"],
    sentences: [["The dog got hot.", "🐶"], ["The fox can hop.", "🦊"], ["Mom has a mop.", "🧹"], ["The pot is hot.", "🍲"], ["Pop the box.", "📦"], ["The ox is big.", "🐂"]],
  },
  // ── Kindergarten: Level 2 ──
  {
    id: "k-short-u", grade: 2, level: 2, title: "Short u", emoji: "☀️", focus: ["u"],
    teach: "The letter <b>u</b> says <b>uh</b>, like in s<b>u</b>n. Sound out each word: s · u · n!",
    say: "The letter u says {{uh}}, like umbrella, and sun. Let's sound out words with {{uh}} in the middle!",
    pictures: [["s|u|n", "☀️"], ["b|u|s", "🚌"], ["b|u|g", "🐛"], ["c|u|p", "🥤"], ["n|u|t", "🥜"], ["t|u|b", "🛁"], ["p|u|p", "🐶"]],
    words: ["r|u|n", "f|u|n", "c|u|t", "h|u|g", "b|u|t", "r|u|b", "s|u|m", "h|u|t", "d|u|g", "m|u|d"],
    sentences: [["The sun is up.", "☀️"], ["Run to the bus.", "🚌"], ["A bug dug.", "🐛"], ["Hug the pup.", "🐶"], ["I cut a nut.", "🥜"], ["Rub in the tub.", "🛁"]],
  },
  {
    id: "k-short-e", grade: 2, level: 2, title: "Short e", emoji: "🐔", focus: ["e"],
    teach: "The letter <b>e</b> says <b>eh</b>, like in b<b>e</b>d. Sound out each word: b · e · d!",
    say: "The letter e says {{eh}}, like egg, and bed. Let's sound out words with {{eh}} in the middle!",
    pictures: [["b|e|d", "🛏️"], ["h|e|n", "🐔"], ["t|e|n", "🔟"], ["p|e|n", "🖊️"], ["l|e|g", "🦵"], ["n|e|t", "🥅"], ["w|e|b", "🕸️"], ["j|e|t", "✈️"]],
    words: ["r|e|d", "w|e|t", "g|e|t", "l|e|t", "m|e|n", "p|e|t", "s|e|t", "y|e|s", "d|e|n", "b|e|g"],
    sentences: [["The bed is red.", "🛏️"], ["A hen got wet.", "🐔"], ["I have ten.", "🔟"], ["Get the net!", "🥅"], ["See the web.", "🕸️"], ["The jet is fast.", "✈️"]],
  },
  {
    id: "k-ck", grade: 2, level: 2, title: "ck at the end", emoji: "🦆", focus: ["ck"],
    teach: "<b>ck</b> says <b>k</b> at the end of a word, right after a short vowel: du<b>ck</b>, so<b>ck</b>, ro<b>ck</b>.",
    say: "C and k together make one sound, {{kuh}}, at the end of a word. Duck. Sock. Rock. Two letters, one sound!",
    pictures: [["d|u|ck", "🦆"], ["s|o|ck", "🧦"], ["r|o|ck", "🪨"], ["l|o|ck", "🔒"], ["c|l|o|ck", "🕰️"], ["t|r|u|ck", "🚚"], ["ch|i|ck", "🐤"]],
    words: ["b|a|ck", "p|i|ck", "l|u|ck", "n|e|ck", "k|i|ck", "p|a|ck", "s|i|ck", "t|i|ck", "d|e|ck", "r|a|ck"],
    sentences: [["The duck can quack.", "🦆"], ["My sock is red.", "🧦"], ["Sit on a rock.", "🪨"], ["Lock it.", "🔒"], ["Tick tock!", "🕰️"], ["A big truck.", "🚚"]],
  },
  {
    id: "k-sh-ch-th", grade: 2, level: 2, title: "sh, ch, th", emoji: "🐚", focus: ["sh", "ch", "th"],
    teach: "Two letters can make <b>one sound</b>: <b>sh</b> says shh, <b>ch</b> says ch, <b>th</b> says th.",
    say: "Sometimes two letters work together to make one sound. S, h says {{shh}}, like ship. C, h says {{chuh}}, like chick. T, h says {{thuh}}, like bath.",
    pictures: [["sh|i|p", "🚢"], ["sh|e|ll", "🐚"], ["f|i|sh", "🐟"], ["d|i|sh", "🍽️"], ["ch|i|ck", "🐤"], ["ch|i|p", "🍟"], ["b|a|th", "🛁"], ["l|u|n|ch", "🍱"]],
    words: ["sh|o|p", "sh|u|t", "c|a|sh", "ch|i|n", "m|u|ch", "r|i|ch", "th|i|n", "m|a|th", "w|i|th", "th|e|m"],
    sentences: [["A red ship.", "🚢"], ["I see a fish.", "🐟"], ["The chick is wet.", "🐤"], ["A hot bath.", "🛁"], ["Chips on a dish.", "🍟"], ["A big shell.", "🐚"]],
  },
  {
    id: "k-compound", grade: 2, level: 2, title: "Two Words in One", emoji: "🌅", focus: [], syllables: true, wordParts: true,
    teach: "A <b>compound word</b> is two little words stuck together: <b>sun · set</b> is sunset, <b>bath · tub</b> is bathtub.",
    say: "Sometimes two little words stick together to make one big word! Sun, set: sunset. Bath, tub: bathtub. Read each little word, then put them together!",
    pictures: [["sun|set", "🌅"], ["bath|tub", "🛁"], ["hot|dog", "🌭"], ["back|pack", "🎒"], ["lap|top", "💻"], ["cup|cake", "🧁"], ["pop|corn", "🍿"], ["pan|cake", "🥞"]],
    words: ["cat|nap", "sun|hat", "in|to", "up|on", "bed|bug", "sand|box", "mud|pit", "lip|stick", "hill|top", "pig|pen"],
    sentences: [["I see a sunset.", "🌅"], ["Get in the bathtub.", "🛁"], ["A hotdog for Dad.", "🌭"], ["Pack my backpack.", "🎒"], ["Mom has a laptop.", "💻"], ["I ate a pancake.", "🥞"]],
  },
  {
    id: "k-plural-s", grade: 2, level: 2, title: "Adding -s", emoji: "🐱", focus: ["s"],
    teach: "Add <b>s</b> to mean <b>more than one</b>: one cat, two cat<b>s</b>. And add <b>s</b> for what someone does: he run<b>s</b>, it hop<b>s</b>.",
    say: "Add an s to the end of a word when there is more than one! One cat, two cats. One dog, two dogs. We also add s for what one person does: he runs, she sits.",
    pictures: [["c|a|t|s", "🐱🐱"], ["d|o|g|s:zzz", "🐶🐶"], ["p|i|g|s:zzz", "🐷🐷"], ["h|e|n|s:zzz", "🐔🐔"], ["c|u|p|s", "🥤🥤"], ["b|u|g|s:zzz", "🐛🐛"], ["b|a|t|s", "🦇🦇"], ["p|e|n|s:zzz", "🖊️🖊️"]],
    words: ["r|u|n|s:zzz", "h|o|p|s", "s|i|t|s", "d|i|g|s:zzz", "n|a|p|s", "h|u|g|s:zzz", "g|e|t|s", "m|a|p|s", "f|a|n|s:zzz", "l|e|g|s:zzz"],
    sentences: [["Two cats nap.", "🐱🐱"], ["The dog runs.", "🐶"], ["Ten red cups.", "🥤🥤"], ["The hen sits.", "🐔"], ["Six big bugs.", "🐛🐛"], ["The fox hops.", "🦊"]],
  },
  {
    id: "k-sentences", grade: 2, level: 2, title: "Read Little Sentences", emoji: "📖", focus: [],
    teach: "Sound out each word, then read the whole sentence. A few words, like <b>the</b> and <b>a</b>, we just know by heart.",
    say: "Sound out each word, then put the words together and read the whole sentence. Some little words, like the, and a, we just know by heart!",
    pictures: [["c|a|t", "🐱"], ["p|i|g", "🐷"], ["d|o|g", "🐶"], ["s|u|n", "☀️"], ["b|u|s", "🚌"], ["h|e|n", "🐔"], ["b|e|d", "🛏️"], ["b|u|g", "🐛"]],
    words: ["h|a|t", "r|a|n", "s|a|t", "m|a|p", "p|e|n", "t|e|n", "h|o|t", "c|u|p", "f|i|n", "l|o|g"],
    sentences: [["The cat sat.", "🐱"], ["A pig dug.", "🐷"], ["The dog ran.", "🐶"], ["The sun is hot.", "☀️"], ["The hen sat.", "🐔"], ["A big bus.", "🚌"], ["A bug hid.", "🐛"], ["The bed is red.", "🛏️"]],
  },
  // ── 1st grade: Level 1 ──
  {
    id: "g1-blends-start", grade: 3, level: 1, title: "Blends at the Start", emoji: "🐸", focus: ["fr", "fl", "dr", "cr", "sl", "sn", "tr", "gr", "cl", "pl", "st", "sp", "sk", "sw", "sm", "gl", "bl", "br"],
    teach: "In a <b>blend</b>, two letters stick together into one chunk. You hear <b>both</b> sounds, quickly: <b>fr</b>og, <b>fl</b>ag, <b>st</b>op.",
    say: "In a blend, two letters stick together into one chunk, and you hear both sounds, quickly. {{fff}}, {{rrr}}, {{fruh}}, like frog. {{fff}}, {{lll}}, {{fluh}}, like flag. {{sss}}, {{tuh}}, {{stuh}}, like stop!",
    pictures: [["fr|o|g", "🐸"], ["fl|a|g", "🚩"], ["dr|u|m", "🥁"], ["cr|a|b", "🦀"], ["sl|e|d", "🛷"], ["st|o|p", "🛑"], ["pl|u|g", "🔌"], ["br|i|ck", "🧱"], ["sw|i|m", "🏊"]],
    words: ["sn|a|p", "tr|i|p", "gr|i|n", "cl|a|p", "pl|a|n", "sp|i|n", "sk|i|p", "sm|e|ll", "gl|a|d", "bl|o|ck"],
    sentences: [["The frog sat on a log.", "🐸"], ["A crab is on the sand.", "🦀"], ["Dad has a red flag.", "🚩"], ["We sled down the hill.", "🛷"], ["I can hit the drum.", "🥁"], ["We swim in the pool.", "🏊"]],
  },
  {
    id: "g1-blends-end", grade: 3, level: 1, title: "Blends at the End", emoji: "⛺", focus: ["nd", "ft", "lk", "nt", "mp", "st", "sk"],
    teach: "Blends come at the <b>end</b> of words too. Hear both sounds: ha<b>nd</b>, gi<b>ft</b>, te<b>nt</b>, ju<b>mp</b>.",
    say: "Blends can come at the end of a word too, and you still hear both sounds. {{nnd}}, like hand. {{nnt}}, like tent. {{mmp}}, like jump. Say every sound!",
    pictures: [["h|a|nd", "✋"], ["g|i|ft", "🎁"], ["m|i|lk", "🥛"], ["t|e|nt", "⛺"], ["l|a|mp", "🪔"], ["n|e|st:sst", "🪺"], ["m|a|sk:ssk", "🎭"]],
    words: ["b|e|nd", "j|u|mp", "s|e|nd", "h|u|nt", "c|a|mp", "s|i|lk", "s|o|ft", "l|e|ft", "f|a|st:sst", "j|u|st:sst"],
    sentences: [["The milk is in a cup.", "🥛"], ["I got a gift from Mom.", "🎁"], ["We camp in a big tent.", "⛺"], ["Clap your hands and jump.", "✋"], ["A bird is in the nest.", "🪺"], ["Turn on the lamp.", "🪔"], ["Put on a funny mask.", "🎭"]],
  },
  // ── 1st grade: Level 2 ──
  {
    id: "g1-two-syllables", grade: 3, level: 2, title: "Two-Part Words", emoji: "🐰", focus: [], syllables: true, wordParts: true,
    teach: "Long words come in <b>parts</b> (syllables). Read one part, then the next: <b>rab · bit</b>, <b>muf · fin</b>.",
    say: "Long words come in parts. Read one part, then the next, then put them together: rab, bit, rabbit! Muf, fin, muffin!",
    pictures: [["rab|bit", "🐰"], ["pic|nic", "🧺"], ["kit|ten", "🐈"], ["muf|fin", "🧁"], ["mit|ten", "🧤"], ["nap|kin", "🧻"], ["cac|tus", "🌵"], ["rock|et", "🚀"]],
    words: ["in|sect", "mag|net", "bas|ket", "gob|lin", "prob|lem", "tab|let", "den|tist", "con|test", "up|set", "ten|nis"],
    sentences: [["We had a picnic at the park.", "🧺"], ["The kitten can nap on my lap.", "🐈"], ["I ate a muffin for lunch.", "🧁"], ["Put on your mittens, it is cold.", "🧤"], ["A cactus has lots of spikes.", "🌵"], ["The rocket went up so fast.", "🚀"]],
  },
  {
    id: "g1-ing-er", grade: 3, level: 2, title: "Endings: -ing, -er", emoji: "🎤", focus: ["ing", "er"], syllables: true, wordParts: true,
    teach: "Add <b>-ing</b> for what is happening now: jump<b>ing</b>. Add <b>-er</b> for a person who does it: farm<b>er</b>, teach<b>er</b>.",
    say: "Some words get an ending. I, n, g says {{ing}}: jump, jumping! E, r says {{er}}: farm, farmer, a person who farms. Read the word, then the ending.",
    pictures: [["jump|ing", "🦘"], ["sing|ing", "🎤"], ["read|ing", "📖"], ["fish|ing", "🎣"], ["sleep|ing", "😴"], ["farm|er", "🧑‍🌾"], ["paint|er", "🧑‍🎨"], ["teach|er", "🧑‍🏫"]],
    words: ["play|ing", "eat|ing", "help|ing", "rest|ing", "look|ing", "help|er", "play|er", "read|er", "long|er", "fast|er"],
    sentences: [["The kangaroo is jumping high.", "🦘"], ["I like singing with my mom.", "🎤"], ["Dad is fishing at the lake.", "🎣"], ["The farmer has a red barn.", "🧑‍🌾"], ["Our teacher reads us a book.", "🧑‍🏫"], ["The baby is sleeping now.", "😴"]],
  },
  {
    id: "g1-ed", grade: 3, level: 2, title: "Ending: -ed", emoji: "🌱", focus: ["ed"], syllables: true, wordParts: true,
    teach: "<b>-ed</b> means it already happened. It can sound like <b>t</b> (jump<b>ed</b>), <b>d</b> (play<b>ed</b>), or <b>id</b> (plant<b>ed</b>).",
    say: "E, d at the end means it already happened. It can sound three ways! {{tuh}}, like jumped. {{duh}}, like played. And {{id}}, like planted.",
    pictures: [["rain|ed:duh", "🌧️"], ["plant|ed:id", "🌱"], ["paint|ed:id", "🎨"], ["melt|ed:id", "🫠"], ["kick|ed:tuh", "⚽"], ["jump|ed:tuh", "🐸"], ["mail|ed:duh", "📬"]],
    words: ["help|ed:tuh", "land|ed:id", "fill|ed:duh", "rest|ed:id", "wish|ed:tuh", "hand|ed:id", "yell|ed:duh", "pick|ed:tuh", "want|ed:id", "call|ed:duh"],
    sentences: [["It rained all day long.", "🌧️"], ["We planted seeds in the yard.", "🌱"], ["My snowman melted in the sun.", "🫠"], ["She kicked the ball so far.", "⚽"], ["I painted a big red bird.", "🎨"], ["The frog jumped into the pond.", "🐸"]],
  },
  {
    id: "g1-es-ly", grade: 3, level: 2, title: "Endings: -es, -ly", emoji: "🐢", focus: ["es", "ly"], syllables: true, wordParts: true,
    teach: "Add <b>-es</b> for more than one after s, x, sh or ch: box<b>es</b>, dish<b>es</b>. Add <b>-ly</b> for <i>how</i>: slow<b>ly</b>, loud<b>ly</b>.",
    say: "E, s says {{iz}}, for more than one: box, boxes. Dish, dishes. L, y says {{lee}}, and tells how something happens: slow, slowly. Loud, loudly.",
    pictures: [["box|es", "📦📦"], ["fox|es", "🦊🦊"], ["dish|es", "🍽️🍽️"], ["bus|es", "🚌🚌"], ["lunch|es", "🍱🍱"], ["brush|es", "🪥🪥"], ["slow|ly", "🐢"], ["loud|ly", "📢"]],
    words: ["wish|es", "glass|es", "kiss|es", "inch|es", "sad|ly", "quick|ly", "soft|ly", "kind|ly", "glad|ly", "neat|ly"],
    sentences: [["Mom washed all the dishes.", "🍽️🍽️"], ["The turtle walked slowly home.", "🐢"], ["Two foxes ran into the woods.", "🦊🦊"], ["We put the toys in boxes.", "📦📦"], ["The dog barked loudly at night.", "📢"], ["The buses are big and yellow.", "🚌🚌"]],
  },
  // ── 2nd grade: Level 1 ──
  {
    id: "g1-magic-e", grade: 4, level: 1, title: "Magic e", emoji: "🪄", focus: ["a", "i", "o", "u", "e"], magic: true,
    teach: "A <b>magic e</b> at the end is quiet, but it makes the vowel <b>say its name</b>: c<b>a</b>k<b>e</b>, k<b>i</b>t<b>e</b>, b<b>o</b>n<b>e</b>.",
    say: "When a word ends in e, the e is quiet, but it's magic! It makes the vowel say its name. Cake: the a says {{ay}}. Kite: the i says {{eye}}. Bone: the o says {{oh}}.",
    pictures: [["c|a:ay|k|e:", "🎂"], ["k|i:eye|t|e:", "🪁"], ["b|o:oh|n|e:", "🦴"], ["r|o:oh|s:z|e:", "🌹"], ["f|i:eye|v|e:", "5️⃣"], ["s|n|a:ay|k|e:", "🐍"], ["p|l|a:ay|t|e:", "🍽️"], ["h|o:oh|m|e:", "🏠"], ["c|u:yoo|b|e:", "🧊"]],
    words: ["m|a:ay|d|e:", "t|i:eye|m|e:", "h|o:oh|p|e:", "c|u:yoo|t|e:", "l|i:eye|k|e:", "g|a:ay|t|e:", "n|o:oh|t|e:", "r|i:eye|d|e:", "t|u:oo|b|e:", "s|a:ay|m|e:"],
    sentences: [["I ate a big slice of cake today.", "🎂"], ["The dog dug a hole to hide its bone.", "🦴"], ["A long snake slid under the green grass.", "🐍"], ["I gave Mom a red rose for her birthday.", "🌹"], ["My kite went up high in the blue sky.", "🪁"], ["We rode our bikes home after the game.", "🏠"]],
  },
  {
    id: "g2-ai-ee", grade: 4, level: 1, title: "ai, ay, ee, ea", emoji: "🐌", focus: ["ai", "ay", "ee", "ea"],
    teach: "<b>Vowel teams</b>: two vowels, one sound. <b>ai</b> and <b>ay</b> say ay (r<b>ai</b>n, d<b>ay</b>). <b>ee</b> and <b>ea</b> say ee (b<b>ee</b>, l<b>ea</b>f).",
    say: "Vowel teams are two vowels that make one sound. A, i and a, y both say {{ay}}, like rain, and day. E, e and e, a both say {{ee}}, like bee, and leaf. When two vowels go walking, the first one does the talking!",
    pictures: [["r|ai|n", "🌧️"], ["s|n|ai|l", "🐌"], ["t|r|ai|n", "🚂"], ["b|ee", "🐝"], ["t|r|ee", "🌳"], ["sh|ee|p", "🐑"], ["f|ee|t", "🦶"], ["l|ea|f", "🍃"], ["p|ea|ch", "🍑"], ["s|ea|l", "🦭"]],
    words: ["w|ai|t", "p|ai|n|t", "d|ay", "p|l|ay", "s|t|ay", "s|ee|d", "g|r|ee|n", "w|ee|k", "b|ea|ch", "r|ea|d"],
    sentences: [["The train went down the track in the rain.", "🚂"], ["A little snail sat on a green leaf.", "🐌"], ["Three sheep ate grass under the big tree.", "🐑"], ["We ate a sweet peach at the beach today.", "🍑"], ["The busy bee flew from tree to tree.", "🐝"], ["A seal lay in the sun on the warm sand.", "🦭"]],
  },
  {
    id: "g2-oa-ow-igh", grade: 4, level: 1, title: "oa, ow, igh", emoji: "🌙", focus: ["oa", "ow", "igh"],
    teach: "<b>oa</b> and <b>ow</b> say oh (b<b>oa</b>t, sn<b>ow</b>). <b>igh</b> says eye (n<b>igh</b>t). The g and h are quiet!",
    say: "O, a says {{oh}}, like boat. O, w can say {{oh}} too, like snow. And i, g, h together say {{eye}}, like night, and light. The g and the h are quiet.",
    pictures: [["b|oa|t", "⛵"], ["g|oa|t", "🐐"], ["s|oa|p", "🧼"], ["c|oa|t", "🧥"], ["s|n|ow:oh", "❄️"], ["b|ow:oh", "🎀"], ["b|ow:oh|l", "🥣"], ["n|igh|t", "🌙"], ["l|igh|t", "💡"], ["f|l|igh|t", "✈️"]],
    words: ["r|oa|d", "t|oa|s|t", "g|r|ow:oh", "s|l|ow:oh", "s|h|ow:oh", "r|igh|t", "h|igh", "b|r|igh|t", "f|igh|t", "m|igh|t"],
    sentences: [["The goat ate a coat on the boat.", "🐐"], ["At night, the light of the moon is bright.", "🌙"], ["We made a snowman in the cold white snow.", "⛄"], ["Wash your hands with soap and warm water.", "🧼"], ["A plane took flight high up in the sky.", "✈️"], ["Mom tied a pink bow on the gift.", "🎀"]],
  },
  {
    id: "g2-y", grade: 4, level: 1, title: "y says ee or eye", emoji: "🐶", focus: ["y"],
    teach: "At the end of a word, <b>y</b> is a vowel! In long words it says <b>ee</b> (happ<b>y</b>, pupp<b>y</b>). In short words it says <b>eye</b> (fl<b>y</b>, sk<b>y</b>).",
    say: "When y comes at the end of a word, it acts like a vowel. In longer words it says {{ee}}, like happy, and puppy. In short words it says {{eye}}, like fly, and sky!",
    pictures: [["b|a:ay|b|y:ee", "👶"], ["p|u|pp:puh|y:ee", "🐶"], ["b|u|nn:nnn|y:ee", "🐰"], ["c|a|n|d|y:ee", "🍬"], ["p|o:oh|n|y:ee", "🐴"], ["f|l|y:eye", "🪰"], ["c|r|y:eye", "😢"], ["s|p|y:eye", "🕵️"]],
    words: ["h|a|pp:puh|y:ee", "s|u|nn:nnn|y:ee", "f|u|nn:nnn|y:ee", "l|a:ay|d|y:ee", "c|i|t|y:ee", "s|k|y:eye", "m|y:eye", "b|y:eye", "d|r|y:eye", "sh|y:eye"],
    sentences: [["The baby smiled at the happy puppy.", "👶"], ["A fly buzzed up into the blue sky.", "🪰"], ["My bunny likes to eat a lot of carrots.", "🐰"], ["I had candy at the party with my friends.", "🍬"], ["The pony ran across the sunny green field.", "🐴"], ["Why did the little baby start to cry?", "😢"]],
  },
  // ── 2nd grade: Level 2 ──
  {
    id: "g2-r-vowels", grade: 4, level: 2, title: "ar, or, er, ir, ur", emoji: "⭐", focus: ["ar", "or", "er", "ir", "ur"],
    teach: "An <b>r</b> after a vowel changes its sound: <b>ar</b> (st<b>ar</b>), <b>or</b> (c<b>or</b>n), and <b>er, ir, ur</b> all say er (b<b>ir</b>d, t<b>ur</b>tle).",
    say: "When r comes after a vowel, it bosses the vowel and changes its sound. A, r says {{ar}}, like star. O, r says {{or}}, like corn. And e, r, i, r, and u, r all say {{er}}, like her, bird, and turtle.",
    pictures: [["c|ar", "🚗"], ["s|t|ar", "⭐"], ["sh|ar|k", "🦈"], ["c|or|n", "🌽"], ["f|or|k", "🍴"], ["h|or|s|e:", "🐴"], ["b|ir|d", "🐦"], ["g|ir|l", "👧"], ["sh|ir|t", "👕"], ["p|ur|s|e:", "👛"]],
    words: ["f|ar|m", "d|ar|k", "p|ar|k", "s|t|or|m", "sh|or|t", "h|er", "f|ir|s|t", "t|ur|n", "h|ur|t", "f|er|n"],
    sentences: [["A shark swam far out in the dark sea.", "🦈"], ["The girl in the red shirt fed the bird.", "🐦"], ["We ate corn with a fork at the farm.", "🌽"], ["Look at that bright star in the dark sky.", "⭐"], ["The horse ran across the park in the storm.", "🐴"], ["We drove to the market in our little car.", "🚗"]],
  },
  {
    id: "g2-oi-ou", grade: 4, level: 2, title: "oi, oy, ou, ow", emoji: "🐮", focus: ["oi", "oy", "ou", "ow"],
    teach: "<b>oi</b> and <b>oy</b> say oy (c<b>oi</b>n, b<b>oy</b>). <b>ou</b> and <b>ow</b> say ow, like when you're hurt (h<b>ou</b>se, c<b>ow</b>).",
    say: "O, i and o, y both say {{oy}}, like coin, and boy. O, u and o, w can both say {{ow}}, like when you bump your knee! House. Cow.",
    pictures: [["c|oi|n", "🪙"], ["b|oy", "👦"], ["t|oy", "🧸"], ["c|l|ou|d", "☁️"], ["h|ou|s|e:", "🏠"], ["m|ou|s|e:", "🐭"], ["c|ow", "🐮"], ["ow|l", "🦉"], ["c|r|ow|n", "👑"], ["c|l|ow|n", "🤡"]],
    words: ["s|oi|l", "j|oi|n", "j|oy", "t|oy|s", "ou|t", "l|ou|d", "r|ou|n|d", "d|ow|n", "t|ow|n", "h|ow"],
    sentences: [["The boy found a shiny coin on the ground.", "🪙"], ["A brown cow stood by the little house.", "🐮"], ["An owl hoots at night from the oak tree.", "🦉"], ["The clown has a big red crown on his head.", "🤡"], ["My toy mouse is round and soft and gray.", "🐭"], ["A dark cloud came, and then it began to rain.", "☁️"]],
  },
  {
    id: "g2-soft-cg", grade: 4, level: 2, title: "Soft c and g", emoji: "🦒", focus: ["c", "g"], soft: true,
    teach: "Before <b>e</b>, <b>i</b> or <b>y</b>, <b>c</b> says <b>s</b> (<b>c</b>ity, i<b>c</b>e) and <b>g</b> often says <b>j</b> (<b>g</b>em, pa<b>g</b>e).",
    say: "C and g have a soft sound too! When e, i, or y comes after them, c says {{sss}}, like city, and ice. And g says {{juh}}, like gem, and giraffe.",
    pictures: [["c:sss|i|t|y:ee", "🏙️"], ["i:eye|c:sss|e:", "🧊"], ["m|i:eye|c:sss|e:", "🐭"], ["f|a:ay|c:sss|e:", "😀"], ["g:juh|e|m", "💎"], ["g:juh|i|r|a|ff|e:", "🦒"], ["p|a:ay|g:juh|e:", "📄"], ["r|i:eye|c:sss|e:", "🍚"]],
    words: ["r|a:ay|c:sss|e:", "n|i:eye|c:sss|e:", "d|a|n|c:sss|e:", "p|e|n|c:sss|i|l", "c:sss|e|ll", "c:sss|e|n|t", "a:ay|g:juh|e:", "s|t|a:ay|g:juh|e:", "h|u:yoo|g:juh|e:", "l|ar|g:juh|e:"],
    sentences: [["We rode the bus into the big city.", "🏙️"], ["The giraffe has a long neck and a big face.", "🦒"], ["Ice is cold and nice on a hot day.", "🧊"], ["Three little mice ran into the kitchen.", "🐭"], ["Turn the page and read the next part.", "📄"], ["She found a shiny gem in the cave.", "💎"]],
  },
  {
    id: "g3-silent", grade: 4, level: 2, title: "Silent Letters: kn, wr, mb", emoji: "🤫", focus: ["kn", "wr", "mb"],
    teach: "Some letters are <b>silent</b>! In <b>kn</b> the k is quiet (<b>kn</b>ot), in <b>wr</b> the w is quiet (<b>wr</b>ite), and in <b>mb</b> the b is quiet (la<b>mb</b>).",
    say: "Some letters are silent, they don't make any sound! In k, n, the k is quiet: knot, knit. In w, r, the w is quiet: write. And in m, b, the b is quiet: lamb, thumb.",
    pictures: [["kn|o|t", "🪢"], ["kn|i:eye|f|e:", "🔪"], ["kn|i|t", "🧶"], ["wr|i:eye|t|e:", "✍️"], ["wr|e|n|ch", "🔧"], ["l|a|mb", "🐑"], ["th|u|mb", "👍"]],
    words: ["kn|o|ck", "kn|ee", "kn|ow:oh", "wr|a|p", "wr|ong", "wr|i|s|t", "c|l|i|mb", "c|r|u|mb", "b|o|mb", "kn|igh|t"],
    sentences: [
      ["Grandma likes to knit warm hats for all of us.", "🧶"],
      ["I hurt my thumb when I used the wrench.", "🔧"],
      ["The little lamb followed Mary all the way to school.", "🐑"],
      ["Please write your name at the top of the page.", "✍️"],
      ["Tie the rope in a tight knot before we climb.", "🪢"],
      ["I scraped my knee when I fell off my bike.", "🦵"],
    ],
  },
  {
    id: "g2-tch-dge", grade: 4, level: 2, title: "tch and dge", emoji: "🌉", focus: ["tch", "dge"],
    teach: "Three letters, one sound! <b>tch</b> says ch (wa<b>tch</b>), and <b>dge</b> says j (bri<b>dge</b>), after a short vowel.",
    say: "Here are three letters that make just one sound! T, c, h says {{chuh}}, like watch, and catch. D, g, e says {{juh}}, like bridge, and badge. They come right after a short vowel.",
    pictures: [["w|a:aw|tch", "⌚"], ["c|a|tch", "⚾"], ["p|a|tch", "🩹"], ["b|r|i|dge", "🌉"], ["b|a|dge", "📛"], ["j|u|dge", "🧑‍⚖️"]],
    words: ["m|a|tch", "i|tch", "f|e|tch", "d|i|tch", "s|k|e|tch", "e|dge", "l|e|dge", "f|u|dge", "h|e|dge", "n|u|dge"],
    sentences: [["Dad will catch the ball with his big mitt.", "⚾"], ["We walked across the old stone bridge.", "🌉"], ["The judge sat at a tall desk in the court.", "🧑‍⚖️"], ["My new watch has a red band and a bell.", "⌚"], ["Mom sewed a patch on my torn jeans.", "🩹"], ["The scout got a shiny new badge today.", "📛"]],
  },
  // ── 3rd grade: Level 1 ──
  {
    id: "g3-syllables", grade: 5, level: 1, title: "Big Words in Chunks", emoji: "🧩", focus: [], syllables: true,
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
    id: "g3-oo-ew", grade: 5, level: 1, title: "oo, ew, ue, au, aw", emoji: "🌙", focus: ["oo", "ew", "ue", "au", "aw"],
    teach: "<b>oo</b>, <b>ew</b> and <b>ue</b> all say <b>oo</b> (m<b>oo</b>n, st<b>ew</b>, bl<b>ue</b>). <b>au</b> and <b>aw</b> say <b>aw</b> (h<b>au</b>l, s<b>aw</b>).",
    say: "Here are more vowel teams. O, o, and e, w, and u, e all say {{oo}}, like moon, stew, and blue. A, u and a, w both say {{aw}}, like haul, and saw.",
    pictures: [["m|oo|n", "🌙"], ["s|p|oo|n", "🥄"], ["b|oo|t", "👢"], ["s|t|ew", "🍲"], ["s|c|r|ew", "🔩"], ["b|l|ue", "🔵"], ["s|aw", "🪚"], ["p|aw", "🐾"], ["s|t|r|aw", "🥤"]],
    words: ["f|oo|d", "r|oo|m", "c|oo|l", "n|ew", "f|ew", "d|r|ew", "t|r|ue", "c|l|ue", "h|au|l", "l|aw|n", "d|aw|n", "y|aw|n"],
    sentences: [
      ["The moon was full and bright last night. We could see it from our room.", "🌙"],
      ["My dog has a muddy paw. He left prints all over the new rug.", "🐾"],
      ["Grandpa made a big pot of stew. We ate it with a spoon.", "🍲"],
      ["I like to sip my juice through a straw. It is cool and sweet.", "🥤"],
      ["Dad used a saw to cut the board. Then he put in a screw.", "🪚"],
      ["I put on my boots and my blue coat. Then I went out to play in the snow.", "👢"],
    ],
  },
  {
    id: "g3-prefixes", grade: 5, level: 1, title: "Beginnings: un-, re-, dis-, pre-", emoji: "🔓", focus: ["un", "re", "dis", "pre"], syllables: true, wordParts: true, start: true,
    teach: "A <b>prefix</b> at the start changes a word: <b>un</b>- means not (<b>un</b>lock), <b>re</b>- means again (<b>re</b>play), <b>dis</b>- means not (<b>dis</b>like), <b>pre</b>- means before.",
    say: "A prefix is a word part at the start that changes the meaning. U, n means not: unlock, unhappy. R, e means again: replay. D, i, s means not: dislike. P, r, e means before: preschool.",
    pictures: [["un|lock", "🔓"], ["un|pack", "🧳"], ["un|tie", "👟"], ["re:ree|cy:sy|cle:kul", "♻️"], ["re:ree|play", "🔁"], ["dis|like", "👎"], ["un|hap|py:pee", "😞"]],
    words: ["un|do", "un|fair", "un|safe", "un|kind", "re:ree|do", "re:ree|read", "re:ree|turn", "dis|a:uh|gree", "pre:pree|school", "re:ree|write"],
    sentences: [
      ["I had to unpack my bag after the trip. My socks were all mixed up!", "🧳"],
      ["Please recycle your cans and bottles. We put them in the blue bin.", "♻️"],
      ["The game ended much too fast. Let's replay it one more time!", "🔁"],
      ["My shoe came untied on the way to school. I sat down to tie it.", "👟"],
      ["I felt unhappy when it rained on my birthday. Then Mom made me a cake.", "😞"],
      ["Dad had to unlock the door with his key. The lock was stuck again.", "🔓"],
    ],
  },
  // ── 3rd grade: Level 2 ──
  {
    id: "g3-endings", grade: 5, level: 2, title: "Endings: -tion, -ture, -le", emoji: "🕯️", focus: ["tion", "ture", "le"], syllables: true,
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
  {
    id: "g3-suffixes", grade: 5, level: 2, title: "Endings: -ful, -less, -ness", emoji: "🎨", focus: ["ful", "less", "ness"], syllables: true, wordParts: true,
    teach: "<b>-ful</b> means full of (play<b>ful</b>), <b>-less</b> means without (fear<b>less</b>), and <b>-ness</b> makes a thing (kind<b>ness</b>).",
    say: "These endings change a word's meaning. F, u, l means full of: playful, thankful. L, e, s, s means without: fearless. N, e, s, s turns a word into a thing: kind, kindness.",
    pictures: [["col:kul|or:er|ful", "🎨"], ["play|ful", "🐶"], ["thank|ful", "🙏"], ["joy|ful", "😄"], ["fear|less", "🦁"], ["spot|less", "✨"], ["dark|ness", "🌑"], ["kind|ness", "💝"], ["sad|ness", "😢"]],
    words: ["help|ful", "care|ful", "hope|ful", "use:yooz|ful", "help|less", "care|less", "good|ness", "soft|ness", "sick|ness", "end|less"],
    sentences: [
      ["Our puppy is so playful. He chases his tail all day long.", "🐶"],
      ["We are thankful for our food. We say a prayer before we eat.", "🙏"],
      ["The lion was fearless. He walked right up to the big gate.", "🦁"],
      ["After the storm the sky was full of darkness. Then the stars came out.", "🌑"],
      ["Be kind to your little sister. A little kindness goes a long way.", "💝"],
      ["My painting is so colorful. It has every color of the rainbow.", "🎨"],
    ],
  },
];
export const patternById = (id) => PATTERNS.find((p) => p.id === id);

// ───────── questions ─────────
const pick = (rand, a) => a[Math.floor(rand() * a.length)];
const shuffle = (a, rand) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/**
 * Eight questions, easy to hard: two "sound it out", two "find the word you hear", two "spell it"
 * (build the word from chunk tiles), then reading: Kindergarten reads two sentences and finds the
 * picture; from 1st grade on, one of those is "pick the sentence" (three sentences one word apart).
 */
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
  const findSpecs = shuffle(pattern.words, rand).slice(0, 2);
  for (const spec of findSpecs) {
    const wrong = shuffle(pool.filter((s) => wordOf(s) !== wordOf(spec)), rand).slice(0, 2);
    const w = wordOf(spec);
    out.push({ type: "find-word", spec, word: w, prompt: "Find the word you hear", say: `Find the word: ${w}.`,
      answer: w, choices: shuffle([spec, ...wrong], rand).map((s) => ({ word: wordOf(s), chunks: chunks(s, pattern.syllables) })) });
  }
  // Spell it: a picture word not used above, built from its chunks plus a few look-alike chunks.
  const used = new Set([...pics.slice(0, 2).map(([s]) => s), ...findSpecs]);
  const spellPool = shuffle(pattern.pictures.filter(([s]) => !used.has(s)), rand);
  for (const [spec, emoji] of spellPool.slice(0, 2)) out.push(spellQuestion(pattern, spec, emoji, rand));
  const sents = shuffle(pattern.sentences, rand);
  const picks = pattern.grade >= 3 ? sents.map((x) => pickSentence(pattern, x, rand)).find(Boolean) : null;
  const reads = sents.filter(([t]) => t !== picks?.answer).slice(0, picks ? 1 : 2);
  for (const [text, emoji] of reads) {
    const wrong = shuffle(pattern.sentences.filter(([t, e]) => t !== text && e !== emoji).map(([, e]) => e), rand);
    const others = [...new Set(wrong)].slice(0, 2);
    out.push({ type: "read-sentence", text, emoji, prompt: "Read it, then find the picture", say: "Read the sentence. Tap a word if you need help. Then find the picture that matches!",
      answer: emoji, choices: shuffle([emoji, ...others], rand).map((e) => ({ word: e, emoji: e })) });
  }
  if (picks) out.push(picks);
  return out;
}

/** Build a word: its chunks in order, mixed with 2 (K) or 3 look-alike chunks from the same lesson. */
export function spellQuestion(pattern, spec, emoji, rand) {
  const ch = chunks(spec, pattern.syllables);
  const mine = new Set(ch.map((c) => c.t));
  const near = [...new Set([...pattern.pictures.map(([s]) => s), ...pattern.words].flatMap((s) => chunks(s, pattern.syllables).map((c) => c.t)))]
    .filter((t) => !mine.has(t));
  // Prefer look-alikes the same length as the word's own chunks (sh vs ch, -ing vs -er).
  const lens = new Set(ch.map((c) => c.t.length));
  const ranked = [...shuffle(near.filter((t) => lens.has(t.length)), rand), ...shuffle(near.filter((t) => !lens.has(t.length)), rand)];
  const extra = ranked.slice(0, pattern.grade <= 2 ? 2 : 3);
  const w = wordOf(spec);
  return { type: "build-chunks", spec, word: w, emoji, chunks: ch, prompt: "Spell it!", say: `Spell ${w}. Tap the chunks in order: ${w}.`,
    answer: w, tiles: shuffle([...ch.map((c) => c.t), ...extra], rand) };
}

/**
 * Pick the sentence: the picture of one sentence and three sentences of the lesson to read (each has its own
 * picture, so exactly one goes with it). Reading all three, not just the first word, finds it.
 */
export function pickSentence(pattern, [text, emoji], rand) {
  const others = shuffle(pattern.sentences.filter(([t, e]) => t !== text && e !== emoji), rand).slice(0, 2).map(([t]) => t);
  if (others.length < 2) return null;
  return { type: "pick-sentence", text, emoji, prompt: "Which sentence goes with the picture?", say: "Look at the picture. Read each sentence. Which one goes with the picture?",
    answer: text, choices: shuffle([text, ...others], rand).map((t) => ({ word: t })) };
}

/** Highlight a pattern inside a word for display: which chunk indexes are part of the pattern. */
export function focusIndexes(pattern, ch) {
  if (pattern.soft) return ch.map((c, i) => ((c.t === "c" && c.s === "sss") || (c.t === "g" && c.s === "juh") ? i : -1)).filter((i) => i >= 0);
  if (pattern.start) return pattern.focus.includes(ch[0]?.t) ? [0] : [];
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
  if (pattern.soft) return /[cg][eiy]/.test(w);
  if (pattern.start) return pattern.focus.some((f) => w.startsWith(f) && w.length > f.length + 2);
  if (pattern.magic) return /[aeiou][^aeiou]e$/.test(w) && !/ee$/.test(w);
  const multi = pattern.focus.filter((f) => !f.includes("|"));
  if (multi.length) return multi.some((f) => (pattern.syllables ? w.endsWith(f) : w.includes(f)));
  const blends = pattern.focus.filter((f) => f.includes("|")).map((f) => f.replace("|", ""));
  return blends.some((b) => w.includes(b));
}
