// The apps on the hub. `path` = where it lives (angelio.org/<path>/); no path = coming soon.
// Keep in step with APPS in worker/index.js and the service bindings in wrangler.jsonc (npm test checks).

export const SUBJECTS = [
  { id: "math", title: "Math", emoji: "🔢", color: "#ff8a00" },
  { id: "language", title: "Reading & Writing", emoji: "📖", color: "#14a37f" },
  { id: "faith", title: "Watch & Sing", emoji: "🎵", color: "#ff7a59" },
  { id: "history", title: "History", emoji: "🗺️", color: "#7c5cff" },
  // the games have their own page (angelio.org/games/); the home page has a banner to it, not tiles
  { id: "games", title: "Games", emoji: "🎮", color: "#e0453f", page: "/games/" },
];

export const APP_LIST = [
  {
    name: "PreK Math", path: "snap", subject: "math", grades: "PreK", emoji: "🧲",
    blurb: "PreK math: counting and snapping blocks, shapes, colors and sorting, patterns, and more or fewer.",
  },
  {
    name: "Regroup!", path: "regroup", subject: "math", grades: "Grades 1–3", emoji: "🔁",
    blurb: "Adding and taking away with trading: 10 ones make 1 ten. Watch the blocks move!",
  },
  {
    name: "Doubles", path: "doubles", subject: "math", grades: "Grades 1–3", emoji: "🪞",
    blurb: "Doubles and halves, then equal groups, arrays, multiplication and division.",
  },
  {
    name: "Grammar!", path: "grammar", subject: "language", grades: "Grades 1–3", emoji: "✏️",
    blurb: "Capitals, spaces, end marks, commas, and the parts of speech with Montessori symbols.",
  },
  {
    name: "Articulate", path: "articulate", subject: "language", grades: "All ages", emoji: "🗣️",
    blurb: "Speech practice: say the word, hear it back, and see which sounds came through.",
  },
  {
    name: "Fraction Feast", path: "fractions", subject: "math", grades: "Grades 1–3", emoji: "🥧",
    blurb: "Fair shares, halves to eighths, the number line, equal fractions and comparing.",
  },
  {
    name: "Letter Lane", path: "letters", subject: "language", grades: "PreK–K", emoji: "🔤",
    blurb: "All 26 letters and their sounds, rhymes and beats, then short vowels, blending and building words, and little sentences.",
  },
  {
    name: "Read Aloud", path: "read", subject: "language", grades: "Grades 1–3", emoji: "📖",
    blurb: "Blends, endings, long vowels, bossy r, prefixes and more: sound out, spell, and read sentences that grow with each grade.",
  },
  {
    name: "Spelling", path: "spell", subject: "language", grades: "Grades 1–3", emoji: "🐝",
    blurb: "Hear a word and spell it: short vowels to magic e, vowel teams, the rules for endings, ABC order, and this week's words from school.",
  },
  {
    name: "Writing Skills", path: "write", subject: "language", grades: "Grades 1–4", emoji: "📝",
    blurb: "Build, fix, and type sentences on the keyboard, write friendly letters, organize paragraphs, and summarize.",
  },
  {
    name: "Watch & Sing", path: "watch", subject: "faith", grades: "All ages", emoji: "🎵",
    blurb: "Catholic video lessons with little quizzes, and songs to sing along with.",
  },
  {
    name: "Candle Rack", path: "candles", subject: "games", grades: "All ages", emoji: "🕯️",
    blurb: "Keep church candles burning before Mass",
    say: "Candle Rack. Light the candles before Mass, keep the sanctuary lamp burning, and watch over the adoration chapel at night.",
  },
  {
    name: "Mass Usher", path: "usher", subject: "games", grades: "All ages", emoji: "🪑",
    blurb: "Seat families together before Mass",
    say: "Mass Usher. Welcome families at the doors, help people scoot down the pews, and seat every family together.",
  },
  {
    name: "Monastery Porter", path: "porter", subject: "games", grades: "All ages", emoji: "🚪",
    blurb: "Welcome guests at the monastery gate",
    say: "Monastery Porter. Listen to who knocks at the monastery door, welcome guests in, or kindly send others on their way.",
  },
  {
    name: "Saints Match", path: "match", subject: "games", grades: "All ages", emoji: "😇",
    blurb: "Pair Catholic saints with their signs",
    say: "Saints Match. Flip cards fast to pair Catholic saints and their symbols, build combos, and beat All Saints Rush.",
  },
  {
    name: "Garden Givers", path: "garden", subject: "games", grades: "All ages", emoji: "🥕",
    blurb: "Guard crops & pack Food Bank baskets",
    say: "Garden Givers. Shoo critters off the monastery garden and orchard, pick ripe produce, and deliver baskets to the food bank.",
  },
  // Coming soon (see ROADMAP.md)
  {
    name: "Choir", subject: "games", grades: "All ages", emoji: "🎶",
    blurb: "Tap along in the choir loft",
    say: "Choir. Coming soon: tap along with the music in the choir loft as the beat gets faster.",
  },
  { name: "Catholic History", subject: "history", grades: "All ages", emoji: "⛪", blurb: "Saints, the early Church and the great moments, on drag-and-drop timelines." },
];
