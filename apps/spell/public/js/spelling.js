// Spelling, grades 1 to 3: the spelling patterns in the same order as Read Aloud (short vowels, -ck, sh ch th,
// blends, endings, magic e, vowel teams, bossy r…), then the rules for adding endings (drop the e, double the
// last letter, y to i, f to ves), silent letters, ABC order, and the family's own weekly words ("My Words").
// Pure data and question making (no DOM); tested in test/spelling.test.js.
//
// A word is written with its tricky part in brackets: "r(ai)n". The tricky part is what the level teaches; the
// other ways to spell that sound (ALT) make the wrong choices: "rayn", "rane". "x_e" is a magic-e spelling:
// "c(a_e)k" is cake (the a in the middle, the e at the end).

// ───────── words ─────────

/** "c(a_e)k" → { pre: "c", focus: "a_e", post: "k" } */
export function parse(spec) {
  const m = /^([a-z]*)\(([a-z_]+)\)([a-z]*)$/.exec(spec);
  if (!m) throw new Error(`bad word: ${spec}`);
  return { pre: m[1], focus: m[2], post: m[3] };
}
/** The word with its tricky part spelled another way: ("r(ai)n", "a_e") → "rane". */
export function spellWith(spec, option) {
  const { pre, post } = parse(spec);
  return option.includes("_") ? pre + option[0] + post + option.slice(2) : pre + option + post;
}
export const wordOf = (spec) => spellWith(spec, parse(spec).focus);
/** Which letters are the tricky part (for highlighting): indexes into the word. */
export function focusIndexes(spec) {
  const { pre, focus, post } = parse(spec);
  if (focus.includes("_")) return [pre.length, pre.length + 1 + post.length];
  return Array.from({ length: focus.length }, (_, i) => pre.length + i);
}
/** Letter names to say a spelling out loud: "ai" → "A, I". */
export const letterNames = (s) => [...s.replace(/_/g, "")].map((l) => l.toUpperCase()).join(", ");

// Real words that sound the same: a spelling in one group must never be used as a wrong choice for
// another word in the same group (a child who spells "sale" for a sail isn't wrong about the sound).
export const HOMOPHONE_GROUPS = [
  ["be", "bee"], ["feet", "feat"], ["beat", "beet"], ["beach", "beech"], ["week", "weak"], ["tea", "tee"],
  ["peak", "peek"], ["heal", "heel"], ["steal", "steel"], ["flea", "flee"], ["read", "reed"], ["meat", "meet"],
  ["see", "sea"], ["peace", "piece"], ["rain", "rein", "reign"], ["sail", "sale"], ["tail", "tale"],
  ["mail", "male"], ["pail", "pale"], ["pain", "pane"], ["plain", "plane"], ["main", "mane"], ["maid", "made"],
  ["wait", "weight"], ["waste", "waist"], ["vain", "vein", "vane"], ["brake", "break"], ["stake", "steak"],
  ["wade", "weighed"], ["pray", "prey"], ["hay", "hey"], ["great", "grate"], ["ate", "eight"],
  ["road", "rode", "rowed"], ["rose", "rows"], ["groan", "grown"], ["loan", "lone"], ["moan", "mown"],
  ["throne", "thrown"], ["toe", "tow"], ["bow", "bough"], ["doe", "dough"], ["so", "sew", "sow"],
  ["hole", "whole"], ["bowl", "boll"], ["coat", "cote"], ["no", "know"], ["night", "knight"], ["light", "lite"],
  ["right", "write", "rite"], ["high", "hi"], ["by", "buy", "bye"], ["knot", "not"], ["knit", "nit"],
  ["new", "knew"], ["wrap", "rap"], ["ring", "wring"], ["rest", "wrest"], ["sun", "son"], ["one", "won"],
  ["to", "too", "two"], ["there", "their"], ["here", "hear"], ["pair", "pear"], ["bare", "bear"],
  ["dear", "deer"], ["wear", "where"], ["flour", "flower"], ["hour", "our"], ["for", "four"],
  ["cent", "scent", "sent"], ["cell", "sell"], ["fur", "fir"], ["blue", "blew"], ["wood", "would"],
  ["red", "read"], ["led", "lead"], ["threw", "through"], ["weather", "whether"],
];
const HOMO_MAP = new Map();
for (const group of HOMOPHONE_GROUPS) {
  for (const w of group) {
    if (!HOMO_MAP.has(w)) HOMO_MAP.set(w, new Set());
    for (const other of group) if (other !== w) HOMO_MAP.get(w).add(other);
  }
}
export const sameSound = (a, b) => a !== b && Boolean(HOMO_MAP.get(a)?.has(b));

export const BAD_WORDS = new Set([
  "fag", "fagg", "fux", "fuk", "fuc", "fuck", "kock", "cock", "cok", "dik", "dick", "tit", "tits", "ass",
  "arse", "cum", "kum", "sex", "sux", "suk", "suks", "suck", "shit", "shat", "shite", "crap", "damn", "hell",
  "piss", "slut", "hoe", "ho", "pimp", "cunt", "kunt", "twat", "porn", "rape", "boob", "wank", "prick", "wench",
  "bich", "bitch", "bastard", "whore", "niga", "nig", "kike", "spic", "chink", "dyke", "tard", "dildo", "jiz",
  "jizz", "anus", "poop", "turd", "fart", "butt", "puss", "pussy", "balls", "boner", "penis", "vagina", "nazi",
]);
export const badFoil = (word, foil) => !foil || foil === word || foil.length < 2 || sameSound(word, foil) || BAD_WORDS.has(foil);

// The levels. kind: "pattern" (a spelling pattern: pick the spelling, fill the missing part, spell it),
// "rule" (add an ending: base + ending = ?), "abc" (ABC order), "mine" (the family's words, set on the grown-ups page).
// alt: for each tricky part, the other ways to spell it (the first two make the wrong choices).
// words: [spec, emoji]; rule words: [word, base, ending, emoji, [two wrong spellings]].
const SHORT = { a: ["i", "o", "u"], i: ["a", "o", "u"], o: ["a", "u", "i"], u: ["a", "o", "i"], e: ["a", "o", "u"] };

export const LEVELS = [
  // ── 1st grade · Level 1: short vowels and letter teams ──
  {
    id: "g1-short-ai", grade: 3, level: 1, kind: "pattern", title: "Short a and i", emoji: "🐱", alt: SHORT,
    teach: "Listen for the sound in the middle: <b>a</b> says ah (c<b>a</b>t), <b>i</b> says ih (p<b>i</b>g).",
    say: "Listen for the sound in the middle of the word. A says {{ah}}, like cat. I says {{ih}}, like pig. Say the word slowly, then spell each sound!",
    words: [["c(a)t", "🐱"], ["h(a)t", "🎩"], ["b(a)t", "🦇"], ["m(a)p", "🗺️"], ["p(a)n", "🍳"], ["v(a)n", "🚐"], ["j(a)m", "🍯"], ["b(a)g", "👜"],
      ["p(i)g", "🐷"], ["p(i)n", "📌"], ["f(i)n", "🦈"], ["l(i)p", "👄"], ["s(i)x", "6️⃣"], ["k(i)d", "🧒"]],
  },
  {
    id: "g1-short-oue", grade: 3, level: 1, kind: "pattern", title: "Short o, u and e", emoji: "🐶", alt: SHORT,
    teach: "<b>o</b> says aw (d<b>o</b>g), <b>u</b> says uh (s<b>u</b>n), <b>e</b> says eh (b<b>e</b>d).",
    say: "O says {{aw}}, like dog. U says {{uh}}, like sun. E says {{eh}}, like bed. Say the word slowly and listen for the middle sound.",
    words: [["d(o)g", "🐶"], ["f(o)x", "🦊"], ["b(o)x", "📦"], ["p(o)t", "🍲"], ["m(o)p", "🧹"], ["s(u)n", "☀️"], ["b(u)s", "🚌"], ["b(u)g", "🐛"],
      ["c(u)p", "🥤"], ["n(u)t", "🥜"], ["b(e)d", "🛏️"], ["h(e)n", "🐔"], ["t(e)n", "🔟"], ["w(e)b", "🕸️"], ["j(e)t", "✈️"], ["n(e)t", "🥅"]],
  },
  {
    id: "g1-ck-ll", grade: 3, level: 1, kind: "pattern", title: "ck, ll, ss, ff", emoji: "🦆",
    alt: { ck: ["k", "c"], ll: ["l", "le"], ss: ["s", "se"], ff: ["f", "fe"] },
    teach: "After a short vowel, the end of a little word doubles up: du<b>ck</b>, be<b>ll</b>, dre<b>ss</b>, cli<b>ff</b>.",
    say: "After a short vowel, the last sound of a little word gets two letters. {{kuh}} is spelled c, k: duck. L, l: bell. S, s: dress. F, f: cliff.",
    words: [["du(ck)", "🦆"], ["so(ck)", "🧦"], ["ro(ck)", "🪨"], ["lo(ck)", "🔒"], ["tru(ck)", "🚚"], ["be(ll)", "🔔"], ["hi(ll)", "⛰️"], ["do(ll)", "🪆"],
      ["dre(ss)", "👗"], ["ki(ss)", "💋"], ["gra(ss)", "🌱"], ["cli(ff)", "🏔️"]],
  },
  {
    id: "g1-sh-ch-th", grade: 3, level: 1, kind: "pattern", title: "sh, ch, th", emoji: "🐟",
    alt: { sh: ["ch", "s"], ch: ["sh", "c"], th: ["f", "t"] },
    teach: "Two letters, one sound: <b>sh</b> (fi<b>sh</b>), <b>ch</b> (<b>ch</b>ick), <b>th</b> (ba<b>th</b>).",
    say: "Two letters can make one sound. S, h says {{shh}}, like fish. C, h says {{chuh}}, like chick. T, h says {{thuh}}, like bath.",
    words: [["(sh)ip", "🚢"], ["(sh)ell", "🐚"], ["fi(sh)", "🐟"], ["di(sh)", "🍽️"], ["(ch)ick", "🐤"], ["(ch)ip", "🍟"], ["lun(ch)", "🍱"], ["ba(th)", "🛁"],
      ["mo(th)", "🦋"], ["ma(th)", "➗"]],
  },
  // ── 1st grade · Level 2: blends and endings ──
  {
    id: "g1-blends-start", grade: 3, level: 2, kind: "pattern", title: "Blends at the start", emoji: "🐸",
    alt: { fr: ["fl", "f"], fl: ["fr", "l"], dr: ["tr", "d"], cr: ["cl", "c"], sl: ["sn", "s"], st: ["sp", "s"], pl: ["bl", "p"], sw: ["sl", "s"], cl: ["cr", "kl"], tr: ["dr", "t"], br: ["bl", "b"] },
    teach: "In a <b>blend</b> you hear both sounds, so you write both letters: <b>fr</b>og, <b>st</b>op, <b>cl</b>ock.",
    say: "In a blend you hear two sounds, quickly, so you write two letters. {{fruh}}, frog. {{stuh}}, stop. Don't forget the second letter!",
    words: [["(fr)og", "🐸"], ["(fl)ag", "🚩"], ["(dr)um", "🥁"], ["(cr)ab", "🦀"], ["(sl)ed", "🛷"], ["(st)op", "🛑"], ["(pl)ug", "🔌"], ["(sw)im", "🏊"],
      ["(cl)ock", "🕰️"], ["(tr)uck", "🚚"], ["(br)ick", "🧱"]],
  },
  {
    id: "g1-blends-end", grade: 3, level: 2, kind: "pattern", title: "Blends at the end", emoji: "⛺",
    alt: { nd: ["n", "nt"], ft: ["f", "t"], lk: ["l", "k"], nt: ["n", "nd"], mp: ["m", "p"], st: ["s", "ts"], sk: ["s", "ks"] },
    teach: "Blends come at the end too. Say it slowly to hear both sounds: ha<b>nd</b>, te<b>nt</b>, la<b>mp</b>.",
    say: "Blends come at the end of words too. Say it slowly and you'll hear both sounds. {{nnd}}, hand. {{nnt}}, tent. {{mmp}}, lamp.",
    words: [["ha(nd)", "✋"], ["gi(ft)", "🎁"], ["mi(lk)", "🥛"], ["te(nt)", "⛺"], ["la(mp)", "🪔"], ["ne(st)", "🪺"], ["ma(sk)", "🎭"], ["po(nd)", "🦆"],
      ["ra(ft)", "🛶"], ["ca(mp)", "🏕️"]],
  },
  {
    id: "g1-s-es", grade: 3, level: 2, kind: "pattern", title: "Adding -s or -es", emoji: "📦",
    alt: { s: ["es", "z"], es: ["s", "is"] },
    teach: "More than one? Add <b>s</b>: cat<b>s</b>. After s, x, sh or ch, add <b>es</b>: box<b>es</b>, dish<b>es</b>.",
    say: "To spell more than one, add an s: cats, dogs. But after s, x, s h, or c h, add e, s, because you hear an extra beat: boxes, dishes, lunches.",
    words: [["cat(s)", "🐱🐱"], ["dog(s)", "🐶🐶"], ["pig(s)", "🐷🐷"], ["cup(s)", "🥤🥤"], ["hen(s)", "🐔🐔"], ["bug(s)", "🐛🐛"], ["box(es)", "📦📦"], ["fox(es)", "🦊🦊"],
      ["dish(es)", "🍽️🍽️"], ["bus(es)", "🚌🚌"], ["lunch(es)", "🍱🍱"], ["brush(es)", "🪥🪥"]],
  },
  {
    id: "g1-ing-ed", grade: 3, level: 2, kind: "pattern", title: "Adding -ing and -ed", emoji: "🎣",
    alt: { ing: ["in", "eng"], ed: ["t", "d"] },
    teach: "<b>-ing</b> is happening now: fish<b>ing</b>. <b>-ed</b> already happened, and it's spelled e d even when it sounds like t: kick<b>ed</b>.",
    say: "I, n, g means it's happening now: fishing. E, d means it already happened. It can sound like {{tuh}} or {{duh}}, but it's always spelled e, d: kicked, rained.",
    words: [["fish(ing)", "🎣"], ["sing(ing)", "🎤"], ["read(ing)", "📖"], ["jump(ing)", "🦘"], ["sleep(ing)", "😴"], ["rain(ed)", "🌧️"], ["kick(ed)", "⚽"], ["wash(ed)", "🧼"],
      ["clean(ed)", "🧹"], ["cook(ed)", "🍳"]],
  },
  // ── 2nd grade · Level 1: long vowels ──
  {
    id: "g2-magic-e", grade: 4, level: 1, kind: "pattern", title: "Magic e", emoji: "🪄", missing: false,
    alt: { a_e: ["ai", "a"], i_e: ["igh", "i"], o_e: ["oa", "o"], u_e: ["oo", "u"] },
    teach: "A quiet <b>e</b> at the end makes the vowel say its name: c<b>a</b>k<b>e</b>, k<b>i</b>t<b>e</b>, b<b>o</b>n<b>e</b>, c<b>u</b>b<b>e</b>.",
    say: "When you hear a vowel say its name, like {{ay}} in cake, it's often spelled with a magic e at the end. Cake: c, a, k, e. Kite: k, i, t, e. The e is quiet, but don't forget it!",
    words: [["c(a_e)k", "🎂"], ["k(i_e)t", "🪁"], ["b(o_e)n", "🦴"], ["r(o_e)s", "🌹"], ["f(i_e)v", "5️⃣"], ["sn(a_e)k", "🐍"], ["h(o_e)m", "🏠"], ["c(u_e)b", "🧊"],
      ["sk(a_e)t", "⛸️"], ["gr(a_e)p", "🍇"], ["sm(i_e)l", "😊"]],
  },
  {
    id: "g2-ai-ay", grade: 4, level: 1, kind: "pattern", title: "ai and ay", emoji: "🐌",
    alt: { ai: ["ay", "a_e"], ay: ["ai", "a_e"] },
    teach: "The ay sound has two teams: <b>ai</b> in the middle (r<b>ai</b>n), <b>ay</b> at the end (pl<b>ay</b>).",
    say: "The {{ay}} sound has two vowel teams. A, i goes in the middle of a word: rain, snail. A, y goes at the end: play, pray.",
    words: [["r(ai)n", "🌧️"], ["sn(ai)l", "🐌"], ["tr(ai)n", "🚂"], ["n(ai)l", "💅"], ["br(ai)n", "🧠"], ["ch(ai)n", "⛓️"], ["pl(ay)", "🛝"], ["pr(ay)", "🙏"],
      ["h(ay)", "🌾"], ["cl(ay)", "🏺"], ["d(ay)", "🌞"]],
  },
  {
    id: "g2-ee-ea", grade: 4, level: 1, kind: "pattern", title: "ee and ea", emoji: "🐝",
    alt: { ee: ["ea", "e", "ie"], ea: ["ee", "e", "ie"] },
    teach: "The ee sound is often <b>ee</b> (b<b>ee</b>) or <b>ea</b> (l<b>ea</b>f). Look closely and remember which one!",
    say: "The {{ee}} sound has two teams that sound the same: e, e, like bee, and e, a, like leaf. You have to remember which one a word uses, so look closely!",
    words: [["b(ee)", "🐝"], ["tr(ee)", "🌳"], ["sh(ee)p", "🐑"], ["f(ee)t", "🦶"], ["t(ee)th", "🦷"], ["wh(ee)l", "🛞"], ["l(ea)f", "🍃"], ["p(ea)ch", "🍑"],
      ["s(ea)l", "🦭"], ["(ea)gle", "🦅"]],
  },
  {
    id: "g2-oa-ow", grade: 4, level: 1, kind: "pattern", title: "oa and ow", emoji: "⛵",
    alt: { oa: ["ow", "o_e"], ow: ["oa", "o_e"] },
    teach: "The oh sound: <b>oa</b> in the middle (b<b>oa</b>t), <b>ow</b> at the end (sn<b>ow</b>).",
    say: "The {{oh}} sound has teams too. O, a goes in the middle: boat, goat. O, w goes at the end: snow, crow.",
    words: [["b(oa)t", "⛵"], ["g(oa)t", "🐐"], ["s(oa)p", "🧼"], ["fl(oa)t", "🛟"], ["l(oa)f", "🍞"], ["sn(ow)", "❄️"], ["cr(ow)", "🐦‍⬛"], ["bl(ow)", "🌬️"],
      ["gl(ow)", "✨"], ["gr(ow)", "🌱"]],
  },
  // ── 2nd grade · Level 2: more vowel teams ──
  {
    id: "g2-igh-y", grade: 4, level: 2, kind: "pattern", title: "igh and y", emoji: "🌙",
    alt: { igh: ["y", "ie"], y: ["igh", "ie"] },
    teach: "The eye sound: <b>igh</b> in the middle (n<b>igh</b>t), <b>y</b> at the end of a short word (fl<b>y</b>).",
    say: "The {{eye}} sound can be i, g, h, in the middle of a word: night, light. At the end of a short word, it's often just y: fly, sky.",
    words: [["n(igh)t", "🌙"], ["l(igh)t", "💡"], ["fl(igh)t", "✈️"], ["br(igh)t", "🔆"], ["fl(y)", "🪰"], ["sk(y)", "🌌"], ["cr(y)", "😢"], ["sp(y)", "🕵️"], ["fr(y)", "🍳"]],
  },
  {
    id: "g2-y-ee", grade: 4, level: 2, kind: "pattern", title: "y at the end says ee", emoji: "🐶",
    alt: { y: ["ee", "ie"] },
    teach: "At the end of a longer word, the ee sound is usually <b>y</b>: bab<b>y</b>, pupp<b>y</b>, cand<b>y</b>.",
    say: "At the end of a longer word, the {{ee}} sound is usually spelled with a y. Baby. Puppy. Candy.",
    words: [["bab(y)", "👶"], ["pupp(y)", "🐶"], ["bunn(y)", "🐰"], ["cand(y)", "🍬"], ["pon(y)", "🐴"], ["kitt(y)", "🐱"], ["penn(y)", "🪙"], ["happ(y)", "😀"], ["dais(y)", "🌼"]],
  },
  {
    id: "g2-bossy-r", grade: 4, level: 2, kind: "pattern", title: "ar, or, er, ir, ur", emoji: "⭐",
    alt: { ar: ["or", "er"], or: ["ar", "er"], er: ["ir", "ur"], ir: ["ur", "er"], ur: ["ir", "er"] },
    teach: "Bossy <b>r</b>: <b>ar</b> (st<b>ar</b>), <b>or</b> (c<b>or</b>n). Three teams say er: <b>er, ir, ur</b> (b<b>ir</b>d, t<b>ur</b>tle).",
    say: "When r comes after a vowel, it bosses it. {{ar}}: star. {{or}}: corn. And {{er}} can be e, r, or i, r, or u, r: bird, turtle. Look closely and remember!",
    words: [["c(ar)", "🚗"], ["st(ar)", "⭐"], ["sh(ar)k", "🦈"], ["c(or)n", "🌽"], ["f(or)k", "🍴"], ["st(or)m", "⛈️"], ["f(er)n", "🌿"], ["spid(er)", "🕷️"],
      ["tig(er)", "🐯"], ["b(ir)d", "🐦"], ["g(ir)l", "👧"], ["sh(ir)t", "👕"], ["t(ur)tle", "🐢"], ["n(ur)se", "🧑‍⚕️"], ["p(ur)se", "👛"]],
  },
  {
    id: "g2-oi-ou", grade: 4, level: 2, kind: "pattern", title: "oi, oy, ou, ow", emoji: "🐮",
    alt: { oi: ["oy", "o"], oy: ["oi", "o"], ou: ["ow", "o"], ow: ["ou", "o"] },
    teach: "<b>oi</b> in the middle (c<b>oi</b>n), <b>oy</b> at the end (b<b>oy</b>). <b>ou</b> and <b>ow</b> both say ow (h<b>ou</b>se, c<b>ow</b>).",
    say: "The {{oy}} sound: o, i in the middle, like coin. O, y at the end, like boy. The {{ow}} sound can be o, u, like house, or o, w, like cow.",
    words: [["c(oi)n", "🪙"], ["(oi)l", "🛢️"], ["s(oi)l", "🪴"], ["b(oy)", "👦"], ["t(oy)", "🧸"], ["cl(ou)d", "☁️"], ["h(ou)se", "🏠"], ["m(ou)se", "🐭"],
      ["c(ow)", "🐮"], ["(ow)l", "🦉"], ["cr(ow)n", "👑"], ["cl(ow)n", "🤡"]],
  },
  {
    id: "g2-tch-dge", grade: 4, level: 2, kind: "pattern", title: "tch and dge", emoji: "🌉",
    alt: { tch: ["ch", "sh"], dge: ["ge", "j"] },
    teach: "Right after a short vowel, ch is spelled <b>tch</b> (ca<b>tch</b>) and j is spelled <b>dge</b> (bri<b>dge</b>).",
    say: "Right after a short vowel, the {{chuh}} sound is spelled t, c, h: catch, patch. And the {{juh}} sound is spelled d, g, e: bridge, badge.",
    words: [["ca(tch)", "⚾"], ["pa(tch)", "🩹"], ["ske(tch)", "✏️"], ["wa(tch)", "⌚"], ["sti(tch)", "🪡"], ["bri(dge)", "🌉"], ["ba(dge)", "📛"],
      ["ju(dge)", "🧑‍⚖️"], ["fu(dge)", "🍫"]],
  },
  // ── 3rd grade · Level 1: rules for adding endings ──
  {
    id: "g3-drop-e", grade: 5, level: 1, kind: "rule", title: "Drop the e", emoji: "🚲",
    teach: "When a word ends in a quiet <b>e</b>, drop the e before adding <b>-ing</b> or <b>-ed</b>: ride → rid<b>ing</b>.",
    say: "When a word ends with a quiet e, drop the e before you add i, n, g or e, d. Ride, riding. Smile, smiled.",
    words: [["riding", "ride", "ing", "🚲", ["rideing", "ridding"]], ["baking", "bake", "ing", "🍪", ["bakeing", "bakking"]], ["smiling", "smile", "ing", "😊", ["smileing", "smilling"]],
      ["dancing", "dance", "ing", "💃", ["danceing", "danseing"]], ["skating", "skate", "ing", "⛸️", ["skateing", "skatting"]], ["hiking", "hike", "ing", "🥾", ["hikeing", "hikking"]],
      ["waving", "wave", "ing", "👋", ["waveing", "wavving"]], ["sliding", "slide", "ing", "🛝", ["slideing", "slidding"]], ["smiled", "smile", "ed", "🙂", ["smileed", "smilled"]],
      ["baked", "bake", "ed", "🥧", ["bakeed", "bakt"]]],
  },
  {
    id: "g3-double", grade: 5, level: 1, kind: "rule", title: "Double the last letter", emoji: "🏃",
    teach: "Short vowel + one last letter? <b>Double</b> it before -ing or -ed: run → ru<b>nn</b>ing, hop → ho<b>pp</b>ing.",
    say: "When a short word has a short vowel and ends with one consonant, double that last letter before you add i, n, g or e, d. Run, running. Stop, stopped.",
    words: [["running", "run", "ing", "🏃", ["runing", "runeing"]], ["hopping", "hop", "ing", "🐇", ["hoping", "hopeing"]], ["swimming", "swim", "ing", "🏊", ["swiming", "swimeing"]],
      ["sitting", "sit", "ing", "🪑", ["siting", "siteing"]], ["digging", "dig", "ing", "⛏️", ["diging", "digeing"]], ["clapping", "clap", "ing", "👏", ["claping", "clapeing"]],
      ["shopping", "shop", "ing", "🛒", ["shoping", "shopeing"]], ["hugging", "hug", "ing", "🤗", ["huging", "hugeing"]], ["stopped", "stop", "ed", "🛑", ["stoped", "stopt"]],
      ["hugged", "hug", "ed", "🫂", ["huged", "hugd"]]],
  },
  {
    id: "g3-y-to-i", grade: 5, level: 1, kind: "rule", title: "Change y to i", emoji: "🍓",
    teach: "Consonant + <b>y</b>? Change the y to <b>i</b> before -es or -ed: bab<b>y</b> → bab<b>ies</b>, cr<b>y</b> → cr<b>ied</b>. A vowel + y keeps the y: toy<b>s</b>.",
    say: "When a word ends with a consonant and then y, change the y to i before you add e, s, or e, d. Baby, babies. Cry, cried. But a vowel and then y keeps its y: toy, toys.",
    words: [["babies", "baby", "es", "👶👶", ["babys", "babyes"]], ["puppies", "puppy", "es", "🐶🐶", ["puppys", "puppyes"]], ["berries", "berry", "es", "🍓🍓", ["berrys", "berryes"]],
      ["bunnies", "bunny", "es", "🐰🐰", ["bunnys", "bunnyes"]], ["flies", "fly", "es", "🪰🪰", ["flys", "flyes"]], ["cried", "cry", "ed", "😢", ["cryed", "cryd"]],
      ["fried", "fry", "ed", "🍳", ["fryed", "fryd"]], ["toys", "toy", "s", "🧸🧸", ["toies", "toyes"]], ["keys", "key", "s", "🔑🔑", ["keies", "kees"]], ["played", "play", "ed", "🛝", ["plaied", "playd"]]],
  },
  {
    id: "g3-f-ves", grade: 5, level: 1, kind: "rule", title: "f to ves", emoji: "🍂",
    teach: "Many words that end in <b>f</b> or <b>fe</b> change to <b>ves</b> for more than one: lea<b>f</b> → lea<b>ves</b>, kni<b>fe</b> → kni<b>ves</b>.",
    say: "Lots of words that end in f, or f, e, change to v, e, s when there's more than one. Leaf, leaves. Wolf, wolves. Knife, knives.",
    words: [["leaves", "leaf", "s", "🍂", ["leafs", "leafes"]], ["wolves", "wolf", "s", "🐺🐺", ["wolfs", "wolfes"]], ["knives", "knife", "s", "🔪🔪", ["knifes", "knifs"]],
      ["shelves", "shelf", "s", "📚", ["shelfs", "shelfes"]], ["loaves", "loaf", "s", "🍞🍞", ["loafs", "loafes"]], ["elves", "elf", "s", "🧝🧝", ["elfs", "elfes"]],
      ["scarves", "scarf", "s", "🧣🧣", ["scarfs", "scarfes"]], ["halves", "half", "s", "🌓", ["halfs", "halfes"]]],
  },
  // ── 3rd grade · Level 2: tricky spellings and ABC order ──
  {
    id: "g3-silent", grade: 5, level: 2, kind: "pattern", title: "Silent letters: kn, wr, mb", emoji: "🤫",
    alt: { kn: ["n", "k"], wr: ["r", "rw"], mb: ["m", "b"] },
    teach: "Some letters are quiet but still written: <b>k</b>nee, <b>w</b>rench, thum<b>b</b>.",
    say: "Some letters are silent: you don't hear them, but you still write them. The k in knee. The w in wrench. The b in thumb.",
    words: [["(kn)ife", "🔪"], ["(kn)ee", "🦵"], ["(kn)eel", "🧎"], ["(wr)ench", "🔧"], ["(wr)ist", "⌚"], ["(wr)eath", "🎄"], ["thu(mb)", "👍"], ["cli(mb)", "🧗"],
      ["co(mb)", "🪮"], ["la(mb)", "🐑"], ["cru(mb)", "🍪"]],
  },
  {
    id: "g3-endings", grade: 5, level: 2, kind: "pattern", title: "-tion, -ture, -le", emoji: "🕯️",
    alt: { tion: ["shun", "sion"], ture: ["cher", "chur"], le: ["el", "ul"] },
    teach: "Endings with their own spelling: shun is <b>tion</b> (sta<b>tion</b>), cher is <b>ture</b> (pic<b>ture</b>), ul is <b>le</b> (cand<b>le</b>).",
    say: "Some endings have their own spelling. {{shun}} is spelled t, i, o, n: station. {{cher}} is t, u, r, e: picture. And {{ul}} at the end is l, e: candle.",
    words: [["sta(tion)", "🚉"], ["lo(tion)", "🧴"], ["pic(ture)", "🖼️"], ["na(ture)", "🌳"], ["cand(le)", "🕯️"], ["app(le)", "🍎"], ["turt(le)", "🐢"], ["puzz(le)", "🧩"],
      ["bott(le)", "🍼"], ["tab(le)", "🍽️"]],
  },
  {
    id: "g3-abc", grade: 5, level: 2, kind: "abc", title: "ABC order", emoji: "🔤",
    teach: "Put words in <b>ABC order</b> by their first letter. Same first letter? Look at the <b>second</b> letter: <b>ca</b>t, <b>cl</b>ock, <b>cr</b>ab.",
    say: "To put words in A B C order, look at the first letter of each word. If two words start with the same letter, look at the second letter instead. Cat, clock, crab!",
  },
];

/** The family's own words (the grown-ups page): a level of its own, shown first. */
export const MINE = { id: "my-words", grade: 0, level: 0, kind: "mine", title: "My Words", emoji: "✏️",
  teach: "These are <b>your</b> spelling words! Listen to each word, then spell it.",
  say: "These are your very own spelling words. Listen to each word, then spell it, letter by letter!" };

export const GRADES = [
  { n: 3, title: "1st Grade", emoji: "🦉", blurb: "Short vowels, ck ll ss ff, sh ch th, blends, and adding -s, -es, -ing and -ed.",
    levels: ["Short vowels and letter teams", "Blends and endings"] },
  { n: 4, title: "2nd Grade", emoji: "🦅", blurb: "Magic e, ai/ay, ee/ea, oa/ow, igh and y, bossy r, oi/oy and ou/ow, tch and dge.",
    levels: ["Long vowels", "More vowel teams"] },
  { n: 5, title: "3rd Grade", emoji: "🦁", blurb: "The rules for endings (drop the e, double it, y to i, f to ves), silent letters, -tion -ture -le, and ABC order.",
    levels: ["Adding endings", "Tricky spellings and ABC order"] },
];

export const levelById = (id) => (id === MINE.id ? MINE : LEVELS.find((l) => l.id === id));
export const PER_LEVEL = 8;

/** The family's words from the grown-ups page: letters only, lowercase, no repeats. */
export function parseMyWords(text) {
  return [...new Set(String(text ?? "").toLowerCase().split(/[\s,;]+/).map((w) => w.replace(/[^a-z]/g, "")).filter((w) => w.length >= 2 && w.length <= 12))];
}

// ───────── random ─────────
export function seeded(seed) {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (a, rand) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (rand, a) => a[Math.floor(rand() * a.length)];
const ABC = "abcdefghijklmnopqrstuvwxyz";
const VOWELS = "aeiou";

// ───────── wrong spellings ─────────

/** Look-alike misspellings of any word (for the family's words, and to top up a level's own): never the word itself.
 * Most natural first: a vowel swapped, a double letter made single (or doubled), a quiet e, then two letters swapped. */
export function lookAlikes(word, rand = Math.random) {
  const out = new Set();
  const w = [...word];
  // swap one vowel for another
  const vi = w.map((c, i) => (VOWELS.includes(c) ? i : -1)).filter((i) => i >= 0);
  const swaps = shuffle(vi, rand).map((i) => word.slice(0, i) + pick(rand, [...VOWELS].filter((v) => v !== w[i])) + word.slice(i + 1));
  if (swaps.length) out.add(swaps[0]);
  // a double letter made single, or a single last consonant doubled
  const dbl = w.findIndex((c, i) => i > 0 && c === w[i - 1]);
  if (dbl > 0) out.add(word.slice(0, dbl) + word.slice(dbl + 1));
  else if (!VOWELS.includes(w.at(-1))) out.add(word + w.at(-1));
  // a quiet e added or dropped at the end
  out.add(word.endsWith("e") ? word.slice(0, -1) : word + "e");
  // two letters in the middle swapped
  if (w.length >= 4) { const i = 1 + Math.floor(rand() * (w.length - 3)); out.add(word.slice(0, i) + w[i + 1] + w[i] + word.slice(i + 2)); }
  swaps.slice(1).forEach((x) => out.add(x)); // more vowel swaps, for short words
  if ([...out].filter((x) => !badFoil(word, x)).length < 2) {
    for (const i of shuffle(vi, rand)) {
      for (const v of shuffle([...VOWELS].filter((c) => c !== w[i]), rand)) out.add(word.slice(0, i) + v + word.slice(i + 1));
    }
    if (word.includes("y")) for (const rep of ["i", "ie", "ee"]) out.add(word.replace("y", rep));
    out.add(word + w.at(-1));
  }
  return [...out].filter((x) => !badFoil(word, x));
}

/** Two wrong spellings of a level word: the other ways to spell its tricky part first. */
export function wrongSpellings(level, spec, rand) {
  const word = wordOf(spec);
  const alts = (level.alt?.[parse(spec).focus] ?? []).map((o) => spellWith(spec, o));
  const out = [];
  for (const x of [...alts, ...lookAlikes(word, rand)]) if (!badFoil(word, x) && !out.includes(x)) out.push(x);
  return out.slice(0, 2);
}

// ───────── questions ─────────
// Every question: { type, word, prompt (on screen), say (spoken), answer, ... }
//  pick:    hear the word (and see its picture), pick the right spelling of three
//  missing: the word with its tricky part missing; pick the part
//  spell:   build the word from letter tiles (its letters plus a few look-alikes)
//  abc:     tap the words in ABC order
//  rule:    base + ending = ?  (pick), then spell the new word

function pickQ(word, emoji, wrong, rand, extra = {}) {
  return { type: "pick", word, emoji, prompt: "Which one is spelled right?", say: `Which one spells ${word}? ${word}.`,
    answer: word, choices: shuffle([word, ...wrong], rand), ...extra };
}
function missingQ(level, spec, emoji, rand) {
  const { pre, focus, post } = parse(spec);
  const w = wordOf(spec);
  const others = (level.alt[focus] ?? []).filter((o) => !o.includes("_") && !badFoil(w, spellWith(spec, o)));
  return { type: "missing", word: w, spec, emoji, pre, post, prompt: "What's missing?", say: `${w}. Which letters are missing from ${w}?`,
    answer: focus, choices: shuffle([focus, ...others.slice(0, 2)], rand) };
}
/** Letter tiles: the word's letters plus look-alikes (the other ways to spell the tricky part, then any letters). */
export function spellQ(word, emoji, rand, { extra = 3, tempt = "", spec = null } = {}) {
  const extras = [];
  const mine = new Set(word);
  for (const c of [...tempt]) if (/[a-z]/.test(c) && !mine.has(c) && !extras.includes(c)) extras.push(c);
  for (const c of shuffle([...ABC], rand)) { if (extras.length >= extra) break; if (!mine.has(c) && !extras.includes(c) && c !== "q" && c !== "x") extras.push(c); }
  return { type: "spell", word, emoji, spec, prompt: "Spell it!", say: `Spell ${word}. ${word}.`, answer: word, letters: [...word],
    tiles: shuffle([...word, ...extras.slice(0, extra)], rand) };
}
function abcQ(pool, k, rand, usedFirst = new Set()) {
  // Questions 1–4: three or four words with different first letters. 5–8: the same first letter, look at the second.
  let words;
  if (k >= 4) {
    const need = k >= 6 ? 4 : 3;
    const byFirst = {};
    for (const w of pool) (byFirst[w[0]] ??= []).push(w);
    const ok = Object.values(byFirst)
      .map((ws) => { const seen = new Map(); for (const w of shuffle(ws, rand)) if (!seen.has(w[1])) seen.set(w[1], w); return [...seen.values()]; })
      .filter((ws) => ws.length >= need);
    const fresh = ok.filter((ws) => !usedFirst.has(ws[0][0]));
    words = shuffle(pick(rand, fresh.length ? fresh : ok), rand).slice(0, need);
    usedFirst.add(words[0][0]);
  } else {
    const seen = new Map();
    for (const w of shuffle(pool, rand)) if (!seen.has(w[0])) seen.set(w[0], w);
    words = [...seen.values()].slice(0, k >= 2 ? 4 : 3);
  }
  const sorted = [...words].sort().join(" ");
  for (let t = 0; t < 10 && words.join(" ") === sorted; t++) words = shuffle(words, rand);
  if (words.join(" ") === sorted) [words[0], words[1]] = [words[1], words[0]];
  if (k >= 4) {
    return { type: "abc", second: true, words, prompt: "ABC order: look at the 2nd letter!", say: `These all start with ${words[0][0].toUpperCase()}. Look at the second letter, and tap them in A B C order.`,
      answer: sorted };
  }
  return { type: "abc", second: false, words, prompt: "Tap them in ABC order", say: "Tap the words in A B C order. Which one comes first?", answer: sorted };
}

const sayEnd = (e) => ({ ing: "I, N, G", ed: "E, D", es: "E, S", s: "S" }[e] ?? e);

/** All the words in the levels (for ABC order). */
export const ALL_WORDS = [...new Set(LEVELS.flatMap((l) => (l.words ?? []).map((w) => (l.kind === "rule" ? w[0] : wordOf(w[0])))))].sort();

export function makeLevel(level, seed = Date.now(), myWords = []) {
  const rand = seeded(seed);
  const extra = level.grade >= 5 ? 4 : 3;
  if (level.kind === "abc") {
    const usedFirst = new Set();
    return Array.from({ length: PER_LEVEL }, (_, k) => abcQ(ALL_WORDS, k, rand, usedFirst));
  }
  if (level.kind === "mine") {
    if (!myWords.length) return [];
    const order = shuffle(myWords, rand);
    const ws = Array.from({ length: PER_LEVEL }, (_, k) => order[k % order.length]);
    return ws.map((w, k) => (k < 3 ? pickQ(w, "", lookAlikes(w, rand).slice(0, 2), rand) : spellQ(w, "", rand, { extra })));
  }
  if (level.kind === "rule") {
    const ws = shuffle(level.words, rand);
    const out = ws.slice(0, 4).map(([w, base, end, emoji, foils]) => pickQ(w, emoji, foils, rand,
      { type: "rule", base, end, prompt: `${base} + ${end} = ?`, say: `${base}, plus ${sayEnd(end)}. How do you spell ${w}?` }));
    for (const [w, base, end, emoji, foils] of ws.slice(4, 8)) out.push({ ...spellQ(w, emoji, rand, { extra, tempt: foils.join("") }), base, end, say: `Spell ${w}. ${base}, plus ${sayEnd(end)}: ${w}.` });
    return out;
  }
  // a spelling pattern: 2 pick, 2 missing (or 2 more pick), 4 spell; easy to hard
  const ws = shuffle(level.words, rand);
  const out = [];
  ws.slice(0, 2).forEach(([spec, emoji]) => out.push(pickQ(wordOf(spec), emoji, wrongSpellings(level, spec, rand), rand, { spec })));
  ws.slice(2, 4).forEach(([spec, emoji]) => {
    const m = level.missing === false ? null : missingQ(level, spec, emoji, rand);
    out.push(m && m.choices.length >= 2 ? m : pickQ(wordOf(spec), emoji, wrongSpellings(level, spec, rand), rand, { spec }));
  });
  ws.slice(4, 8).forEach(([spec, emoji]) => {
    const tempt = (level.alt?.[parse(spec).focus] ?? []).join("");
    out.push(spellQ(wordOf(spec), emoji, rand, { extra, tempt, spec }));
  });
  return out;
}

// 3 stars only with no mistakes (matches the giant sticker); any mistake: mini sticker.
export const starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1);

// ───────── phonetic sounds & QWERTY helpers ─────────

/** Recorded Mom/Dad clip IDs for individual letters and 1st-grade spelling chunks. */
export const LETTER_SOUNDS = {
  a: "ah", b: "buh", c: "kuh", d: "duh", e: "eh", f: "fff", g: "guh", h: "huh", i: "ih",
  j: "juh", k: "kuh", l: "lll", m: "mmm", n: "nnn", o: "aw", p: "puh", q: "kwuh", r: "rrr",
  s: "sss", t: "tuh", u: "uh", v: "vvv", w: "wuh", x: "ks", y: "yuh", z: "zzz",
};

export const CHUNK_SOUNDS = {
  ck: "kuh", ll: "lll", ss: "sss", ff: "fff", le: "ul", se: "sss", fe: "fff",
  sh: "shh", ch: "chuh", th: "thuh",
  fr: "fruh", fl: "fluh", dr: "druh", cr: "kruh", sl: "sluh", sn: "snuh", st: "stuh", sp: "spuh",
  pl: "pluh", pr: ["puh", "rrr"], sw: "swuh", cl: "kluh", kl: "kluh", tr: "truh", br: "bruh", bl: "bluh",
  nd: "nnd", ft: "fft", lk: "llk", nt: "nnt", mp: "mmp", sk: "skuh", ks: "ks", ts: ["tuh", "sss"],
  es: "iz", is: "iz", ing: "ing", in: "in", eng: ["eh", "nnn", "guh"], ed: ["tuh", "duh"],
};

/** Clip IDs to play for a chunk (single letter, digraph, blend, or ending). */
export function soundIdsFor(chunk, { end = false } = {}) {
  if (end && chunk === "st") return ["sst"];
  if (end && chunk === "sk") return ["ssk"];
  const hit = CHUNK_SOUNDS[chunk] ?? LETTER_SOUNDS[chunk];
  return hit ? (Array.isArray(hit) ? hit : [hit]) : [];
}

/** Marked speech string for Mom/Dad clips: e.g. "sh" → "{{shh}}". */
export const soundSpeak = (chunk, opts) => soundIdsFor(chunk, opts).map((s) => `{{${s}}}`).join(", ");

export const QWERTY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

/** 3rd grade always uses the full QWERTY keyboard; other grades use it when turned on in Grown-ups. */
export const usesQwerty = (level, settings = {}) => Boolean(level?.grade >= 5 || settings?.qwerty);
