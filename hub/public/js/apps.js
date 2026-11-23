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
    name: "Watch & Sing", path: "watch", subject: "faith", grades: "All ages", emoji: "🎵",
    blurb: "Catholic video lessons with little quizzes, and songs to sing along with.",
  },
  {
    name: "Candle Rack", path: "candles", subject: "games", grades: "All ages", emoji: "🕯️",
    blurb: "A game: get the church ready before Mass or the Divine Liturgy. Light the candles, keep the sanctuary lamp burning, and stay up late in the adoration chapel.",
  },
  {
    name: "Mass Usher", path: "usher", subject: "games", grades: "All ages", emoji: "🪑",
    blurb: "A game (an early demo): seat the families coming to Mass. Help people scoot down to make room, and keep each family together.",
  },
  {
    name: "Monastery Porter", path: "porter", subject: "games", grades: "All ages", emoji: "🚪",
    blurb: "A game (an early demo): keep the monastery door. Listen to who knocks, welcome them in, or kindly ask them to come back later.",
  },
  // Coming soon (see ROADMAP.md)
  { name: "Choir", subject: "games", grades: "All ages", emoji: "🎶", blurb: "Tap along with the music in the choir loft: the beat gets faster, then two lanes, then three." },
  { name: "Saints Match", subject: "games", grades: "All ages", emoji: "😇", blurb: "Memory cards with the saints: find the pairs, then match each saint to their sign." },
  { name: "Garden Givers", subject: "games", grades: "All ages", emoji: "🥕", blurb: "Plant, water and pick, and fill the food bank's basket for families who need it." },
  { name: "Spelling", subject: "language", grades: "Grades 1–3", emoji: "🔤", blurb: "Hear a word, build it letter by letter, and learn the spelling patterns." },
  { name: "Writing Skills", subject: "language", grades: "Grades 1–4", emoji: "📝", blurb: "From sentences to paragraphs: build, fix and grow your writing." },
  { name: "Catholic History", subject: "history", grades: "All ages", emoji: "⛪", blurb: "Saints, the early Church and the great moments, on drag-and-drop timelines." },
  { name: "World History", subject: "history", grades: "All ages", emoji: "🌍", blurb: "Timelines and maps you build yourself, to remember who, where and when." },
  { name: "U.S. History", subject: "history", grades: "All ages", emoji: "🗽", blurb: "Interactive maps and timelines from the first people to today." },
];
