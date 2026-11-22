// Drawings made in the Studio's Drawings page (angelio.org/studio/draw/), the same pixel format as the Lesson
// Studio's sprites/<name>.json (sdcourses), so drawings move between them as they are:
//   {name, width, height, fps, palette: ['#RRGGBB', …], frames: [[row, …], …], layers?, kind?: 'comic', comic?, words?}
// Each row is a string, one character per pixel: '.' is see-through, otherwise the position in the palette
// (0–9, then a–z). 1 to 8 frames (a comic: up to 12 panels). Pure: used by the Worker and the tests.
//
// Voxel models (MagicaVoxel .vox files, made on his Mac) are kept beside them: the file in R2 at content/art/vox/<slug>.vox,
// and a note here (voxels: {slug: {saved, frames, size, fps}}; fps: how fast the frames play, frames a second). A checklist item is "made" when it has either.
// CHECKLISTS: what each game needs. His ticks are kept with the drawings (done: {slug: true}).

export const CODES = "0123456789abcdefghijklmnopqrstuvwxyz";
export const artSlug = (name) => String(name ?? "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Check one drawing; returns {slug, drawing} (cleaned) or throws an Error with a plain message. */
export function checkDrawing(s) {
  const slug = artSlug(s?.name);
  if (!slug) throw new Error("Give it a name");
  const { width: w, height: h } = s;
  if (s.kind === "sketch") throw new Error("Sketches stay in the Lesson Studio");
  if (![w, h].every((n) => Number.isInteger(n) && n >= 8 && n <= 64)) throw new Error("Size must be 8 to 64 pixels");
  const palette = (s.palette ?? []).slice(0, CODES.length);
  if (!palette.every((c) => /^#[0-9a-f]{6}$/i.test(c))) throw new Error("Bad color in the palette");
  const allowed = new RegExp(`^[.${CODES.slice(0, palette.length)}]{${w}}$`);
  const comic = s.kind === "comic";
  if (!Array.isArray(s.frames) || s.frames.length < 1 || s.frames.length > (comic ? 12 : 8)) throw new Error(comic ? "1 to 12 panels" : "1 to 8 frames");
  const okFrame = (fr) => Array.isArray(fr) && fr.length === h && fr.every((row) => typeof row === "string" && allowed.test(row));
  if (!s.frames.every(okFrame)) throw new Error("A frame doesn't match the size");
  const out = { name: String(s.name).trim().slice(0, 60), width: w, height: h, fps: Math.max(1, Math.min(12, Math.round(Number(s.fps) || 4))), palette, frames: s.frames };
  if (Array.isArray(s.layers) && s.layers.length > 1) {
    if (s.layers.length > 8) throw new Error("8 layers at most");
    out.layers = s.layers.map((l, i) => {
      if (!Array.isArray(l?.frames) || l.frames.length !== s.frames.length || !l.frames.every(okFrame)) throw new Error("A layer doesn't match the drawing");
      return { name: String(l.name || `Layer ${i + 1}`).slice(0, 30), ...(l.hidden ? { hidden: true } : {}), frames: l.frames };
    });
  }
  if (comic) {
    const pick = (v, list, d) => (list.includes(v) ? v : d);
    out.kind = "comic";
    out.comic = { paper: pick(s.comic?.paper, ["white", "black", "none"], "white"), gap: Math.max(0, Math.min(16, Math.round(Number(s.comic?.gap) || 0))), border: s.comic?.border !== false };
    out.words = s.frames.map((_, i) => (Array.isArray(s.words?.[i]) ? s.words[i] : []).slice(0, 20).map((t) => ({
      text: String(t?.text ?? "").slice(0, 400), x: Math.round(Number(t?.x) || 0), y: Math.round(Number(t?.y) || 0),
      font: pick(t?.font, ["pixel", "sans", "serif", "bold"], "pixel"), size: pick(t?.size, ["s", "m", "l"], "m"),
      bubble: pick(t?.bubble, ["none", "speech", "thought", "box"], "none"), tail: pick(t?.tail, ["left", "right"], "left"),
      wrap: Math.max(10, Math.min(64, Math.round(Number(t?.wrap) || 40))), dark: !!t?.dark })));
  }
  return { slug, drawing: out };
}

/** The stored document: {drawings: {slug: drawing}, voxels: {slug: {saved, frames, size}}, favorites: [slug], done: {slug: true}}. */
export function emptyArt(doc) {
  return { drawings: { ...(doc?.drawings ?? {}) }, voxels: { ...(doc?.voxels ?? {}) }, favorites: [...new Set(doc?.favorites ?? [])], done: { ...(doc?.done ?? {}) } };
}

const SEASON = "Color the parts that change with the season pink (#FF77A8, a darker pink for shade); the game swaps in the day's color.";

// What each game needs. size: [width, height] for a pixel drawing (voxel models can be any size).
const p = (slug, label, note) => ({ slug, label, size: [8, 8], ...(note ? { note } : {}) });
export const CHECKLISTS = [
  {
    id: "candle-rack-people", title: "Candle Rack: people", game: "Candle Rack",
    note: "Each round is the time before Mass or the Divine Liturgy: the priest and the server get the church ready while people come early to pray. Characters 8 × 8 × 8, facing front, one .vox per pose.",
    items: [
      p("priest-idle", "Priest, standing"), p("priest-walk-fast", "Priest, hurrying", "Getting things ready before Mass."),
      p("priest-walk-slow", "Priest, walking slowly", "Processing in when Mass begins (the end of the round)."),
      p("priest-bless", "Priest, blessing"),
      p("priest-mass-idle", "Priest in the chasuble, standing", "The chasuble pink, so it follows the season."),
      p("priest-mass-walk", "Priest in the chasuble, walking", "The entrance procession."),
      p("server-idle", "Altar server, standing"), p("server-walk", "Altar server, walking"),
      p("server-light", "Altar server, lighting", "Holding the long candle lighter: the upgrade that keeps a row lit."),
      p("server-candle-idle", "Altar server with candle, standing"), p("server-candle-walk", "Altar server with candle, walking"),
      p("server-cross-idle", "Altar server with cross, standing"), p("server-cross-walk", "Altar server with cross, walking"),
      p("man-walk", "Man, walking"), p("man-kneel", "Man, kneeling to pray"),
      p("woman-walk", "Woman, walking"), p("woman-kneel", "Woman, kneeling to pray"),
      p("child-walk", "Child, walking"), p("child-kneel", "Child, kneeling to pray"),
      p("child-girl-walk", "Child (girl), walking"), p("child-girl-kneel", "Child (girl), kneeling to pray"),
      p("grandfather-walk", "Grandfather, walking"), p("grandfather-idle", "Grandfather, standing to pray"),
      p("grandmother-walk", "Grandmother, walking"), p("grandmother-idle", "Grandmother, standing to pray"),
      p("east-priest-idle", "Eastern priest, standing"),
      p("east-priest-walk", "Eastern priest, walking"), p("east-priest-cense", "Eastern priest, censing"),
      p("east-priest-phelonion-idle", "Eastern priest in the phelonion, standing", "The phelonion pink, so it follows the season."),
      p("east-priest-phelonion-walk", "Eastern priest in the phelonion, walking", "The entrance procession."),
      p("east-server-idle", "Byzantine server, standing"), p("east-server-walk", "Byzantine server, walking"),
      p("east-server-light", "Byzantine server, lighting"),
      p("east-server-cross-idle", "Byzantine server with cross, standing"), p("east-server-cross-walk", "Byzantine server with cross, walking"),
      p("east-server-ripidion-idle", "Byzantine server with ripidion, standing"), p("east-server-ripidion-walk", "Byzantine server with ripidion, walking"),
    ],
  },
  {
    id: "candle-rack-roman", title: "Candle Rack: Roman church", game: "Candle Rack",
    note: "Start with the first six: that's enough to play.",
    items: [
      { slug: "church-roman-floor", label: "Floor tile", size: [16, 16], note: "Repeats across the whole floor, so make the edges meet." },
      { slug: "church-roman-wall", label: "Wall section", size: [32, 32], note: "Repeats side by side for the back wall." },
      { slug: "church-sanctuary-lamp", label: "Sanctuary lamp", size: [16, 16], note: "Red glass, hanging or on a stand. Both churches use it. Frames: the flame flickers." },
      { slug: "church-roman-altar", label: "Altar", size: [32, 16], note: "With its front cloth. " + SEASON },
      { slug: "church-roman-tabernacle", label: "Tabernacle", size: [16, 16], note: "With its veil. " + SEASON },
      { slug: "church-votive-rack", label: "Votive rack", size: [32, 16], note: "The stand only, with empty spots; each candle is its own drawing (next)." },
      { slug: "church-votive-candle", label: "Votive candle", size: [8, 8], note: "Frame 1 out, the other frames lit and flickering. Paint the glass pink: the game colors it for each prayer." },
      { slug: "church-window", label: "Window", size: [16, 32], note: "Stained glass. Both churches can use it." },
      { slug: "church-door", label: "Door", size: [16, 32], note: "Frame 1 shut, frame 2 open (the drafts come in)." },
      { slug: "church-pew", label: "Pew", size: [32, 16], note: "Seen from the front or the side, your pick." },
      { slug: "church-roman-crucifix", label: "Crucifix", size: [16, 32] },
      { slug: "church-roman-mary", label: "Mary statue", size: [16, 32], note: "The votive rack stands in front of her." },
      { slug: "church-roman-altar-rail", label: "Altar rail", size: [32, 16] },
      { slug: "church-roman-ambo", label: "Ambo", size: [16, 16], note: "With its cloth. " + SEASON },
    ],
  },
  {
    id: "candle-rack-byzantine", title: "Candle Rack: Byzantine church", game: "Candle Rack",
    note: "The floor, wall, window, door and sanctuary lamp can be the Roman ones; draw new ones only if you want them different.",
    items: [
      { slug: "church-byz-iconostasis-left", label: "Iconostasis, left", size: [32, 32], note: "Icons of Christ's side or the Theotokos' side." },
      { slug: "church-byz-royal-doors", label: "Royal Doors", size: [32, 32], note: "Frame 1 shut, frame 2 open." },
      { slug: "church-byz-iconostasis-right", label: "Iconostasis, right", size: [32, 32] },
      { slug: "church-byz-tetrapod", label: "Tetrapod", size: [16, 16], note: "With its cloth and an icon. " + SEASON },
      { slug: "church-byz-taper-stand", label: "Taper stand", size: [32, 16], note: "The tray of sand, empty; each taper is its own drawing (next)." },
      { slug: "church-byz-taper", label: "Beeswax taper", size: [8, 16], note: "Thin and tall. Frame 1 out, the other frames lit." },
      { slug: "church-byz-lampada", label: "Lampada", size: [8, 16], note: "Hanging oil lamp. Paint the glass pink: the game colors it for each prayer and season." },
    ],
  },
];

/** Every slug a checklist names (for the page). */
export const checklistSlugs = () => CHECKLISTS.flatMap((l) => l.items.map((i) => i.slug));
