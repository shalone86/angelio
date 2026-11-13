// The apps on the hub. `path` = where it lives (angelio.org/<path>/); no path = coming soon.
// Keep in step with APPS in worker/index.js and the service bindings in wrangler.jsonc (npm test checks).

export const SUBJECTS = [
  { id: "math", title: "Math", emoji: "🔢" },
  { id: "language", title: "Reading & Writing", emoji: "📖" },
  { id: "history", title: "History", emoji: "🗺️" },
];

export const APP_LIST = [
  {
    name: "Snap & Split", path: "snap", subject: "math", grades: "PreK", emoji: "🧲",
    blurb: "Count, snap blocks together and split them apart, up to 10.",
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
    blurb: "Letters and their sounds, first sounds, rhymes, beats, and blending your very first words.",
  },
  // Coming soon (see ROADMAP.md)
  { name: "Reading Aloud", subject: "language", grades: "Grades 1–2", emoji: "🔤", blurb: "Read words and sentences out loud, with a friendly listener that checks each word." },
  { name: "Writing Skills", subject: "language", grades: "Grades 1–4", emoji: "📝", blurb: "From sentences to paragraphs: build, fix and grow your writing." },
  { name: "Catholic History", subject: "history", grades: "All ages", emoji: "⛪", blurb: "Saints, the early Church and the great moments, on drag-and-drop timelines." },
  { name: "World History", subject: "history", grades: "All ages", emoji: "🌍", blurb: "Timelines and maps you build yourself, to remember who, where and when." },
  { name: "U.S. History", subject: "history", grades: "All ages", emoji: "🗽", blurb: "Interactive maps and timelines from the first people to today." },
];
