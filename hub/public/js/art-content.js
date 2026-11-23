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
      p("man-beard-walk", "Bearded man, walking", "Gives men a mix of bearded and clean-shaven. Paint the beard in your hair color (#255359) so it matches his hair."),
      p("man-beard-kneel", "Bearded man, kneeling to pray"),
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
  {
    id: "mass-usher-people", title: "Mass Usher: people", game: "Mass Usher",
    note: "You're the usher, seating families before Mass. The walking poses are Candle Rack's (man-walk, man-beard-walk for bearded men, woman-walk, child-walk, child-girl-walk, grandfather-walk, grandmother-walk): make those once for both games. Sitting faces the altar (away from you): the back of the head matters most. Hair, skin, eyes, shirt, dress, belt and shoes in your marker colors (the game picks each person's own, and gives a family the same shirt or dress color). Until a pose is made, the game uses the boy and girl as stand-ins.",
    items: [
      p("usher-idle", "Usher, standing at the doors", "That's you: a jacket, maybe a name badge."),
      p("usher-walk", "Usher, walking", "Leading a family up the aisle."),
      p("usher-point", "Usher, pointing to a pew", "\"Right this way!\" when you reach the pew."),
      p("usher-young-idle", "Young usher, standing", "Unlocked with two stars on Sunday Mass: walks fast, too shy to ask anyone to scoot. Until made: the boy. Also usher-young-walk."),
      p("usher-young-walk", "Young usher, walking"),
      p("usher-old-idle", "Experienced usher, standing", "Unlocked with two stars on the Divine Liturgy: people scoot as soon as he gets there, but he walks slowly. Until made: the grandfather. Also usher-old-walk."),
      p("usher-old-walk", "Experienced usher, walking"),
      p("usher-respected-idle", "Respected usher, standing", "Unlocked with two stars on Christmas: even people who like their spot scoot for them. Until made: the man. Also usher-respected-walk."),
      p("usher-respected-walk", "Respected usher, walking"),
      p("man-sit", "Man, sitting in a pew"), p("woman-sit", "Woman, sitting in a pew"),
      p("child-sit", "Child (boy), sitting in a pew"), p("child-girl-sit", "Child (girl), sitting in a pew"),
      p("grandfather-sit", "Grandfather, sitting in a pew"), p("grandmother-sit", "Grandmother, sitting in a pew"),
      p("baby-held", "A parent holding a baby, walking", "Families with a baby (counts as one seat)."),
      p("baby-held-sit", "A parent holding a baby, sitting"),
      p("person-stay-sit", "Someone who won't scoot, sitting", "Arms crossed, a big hat or a purse on the pew: they like their spot."),
    ],
  },
  {
    id: "mass-usher-church", title: "Mass Usher: the church", game: "Mass Usher",
    note: "A nave seen from the back: rows of pews on each side of the aisle, the altar far away, the front doors close to you. The altar can be Candle Rack's.",
    items: [
      { slug: "usher-pew", label: "Pew", size: [40, 16], download: "pew", note: "Five seats long, seen from behind (the backrest toward you). The game lines up five rows on each side. Download the game's own pew to open in MagicaVoxel and try your sitting people in it (each seat is 5 voxels wide; a sitting person sits at height 1)." },
      { slug: "usher-pew-end", label: "Pew end", size: [8, 16], note: "The carved end by the aisle (optional: the plain pew works alone)." },
      { slug: "usher-front-doors", label: "Front doors", size: [32, 32], note: "Double doors to the narthex. Frame 1 shut, frame 2 open (a family comes in)." },
      { slug: "usher-holy-water", label: "Holy water font", size: [8, 16], note: "By the doors." },
      { slug: "usher-aisle-runner", label: "Aisle carpet", size: [8, 16], note: "Repeats up the aisle." },
      { slug: "usher-hymnal", label: "Hymnal", size: [8, 8], note: "In the pew racks; a nice touch." },
      p("priest-kneel", "Priest, kneeling", "Adoration at Night: he kneels before the monstrance at the center of the altar (from behind). Until then he stands."),
      p("monstrance", "Monstrance", "On the altar for Adoration at Night (Candle Rack's chapel can use it too)."),
    ],
  },
  {
    id: "monastery-porter-people", title: "Monastery Porter: people", game: "Monastery Porter",
    note: "You're the porter, keeping the monastery gate. Visitors come up the path and knock. Monk, Nun and Bishop cover almost everyone: paint Monk and Nun in marker colors (shirt/dress = habit, belt = rope, and for Nun hair = veil) and the game recolors them for every brother, sister, Mother Abbess, the visiting abbot, and all seven porters! Regular visitors are your usual people (man, man-beard for bearded men, woman, grandfather, grandmother, child, child-girl).",
    items: [
      p("monk-idle", "Monk, standing", "Hooded habit in marker colors (shirt/dress = habit, belt = rope): covers Brother Francis, Brother Thomas, outgoing brothers, the visiting abbot, and all monk porters."),
      p("monk-walk", "Monk, walking"),
      p("nun-idle", "Nun, standing", "Habit, wimple and veil in marker colors (shirt/dress = habit, hair = veil): covers Mother Abbess and all three nun porters."),
      p("nun-walk", "Nun, walking"),
      p("bishop-idle", "The bishop, standing", "Purple robe/cassock, pectoral cross, and mitre (hat)."),
      p("bishop-walk", "The bishop, walking"),
      p("porter-idle", "Porter, standing", "Optional once Monk is made: watching the gate from inside."),
      p("porter-walk", "Porter, walking"),
    ],
  },
  {
    id: "monastery-porter-porters", title: "Monastery Porter: the porters", game: "Monastery Porter",
    note: "Optional bespoke poses for the three monks and three nuns you can play as, each opening with stars (Brother André, Old Brother Porter, Brother with the Dog; Sister Portress, Sister with the Bell, Respected Sister). Once Monk and Nun are made, the game recolors those for all six automatically! Only draw these if you want custom props (dog leash, hand bell, cross on a chain). Brother with the Dog also needs dog-idle and dog-walk on the animals list.",
    items: [
      p("porter-andre-idle", "Brother André, standing", "The kind porter saint (St. André Bessette): a brown habit, a gentle face."), p("porter-andre-walk", "Brother André, walking"),
      p("porter-old-idle", "Old Brother Porter, standing", "White hair and a beard, a little stooped."), p("porter-old-walk", "Old Brother Porter, walking"),
      p("porter-dog-idle", "Brother with the Dog, standing", "A black habit, holding the dog's leash."), p("porter-dog-walk", "Brother with the Dog, walking"),
      p("porter-sister-idle", "Sister Portress, standing", "A white habit and veil."), p("porter-sister-walk", "Sister Portress, walking"),
      p("porter-bell-idle", "Sister with the Bell, standing", "A blue habit, with a hand bell."), p("porter-bell-walk", "Sister with the Bell, walking"),
      p("porter-respected-idle", "Respected Sister, standing", "A purple veil, a cross on a chain."), p("porter-respected-walk", "Respected Sister, walking"),
    ],
  },
  {
    id: "monastery-porter-animals", title: "Monastery Porter: animals", game: "Monastery Porter",
    note: "The animals that wander up to the monastery gate (all of them get sent kindly on their way). Each one stands and walks, facing the front like your people. Make them any size you like: a cow can be bigger than a person, a cat smaller. Until you draw one, the game uses a little animal of colored boxes. Tell me if you want more animals!",
    items: [
      p("goat-idle", "Goat, standing", "horns and a little beard. Faces the front."), p("goat-walk", "Goat, walking"),
      p("sheep-idle", "Sheep, standing", "a woolly coat. Faces the front."), p("sheep-walk", "Sheep, walking"),
      p("cow-idle", "Cow, standing", "big, with spots; the biggest of them. Faces the front."), p("cow-walk", "Cow, walking"),
      p("pig-idle", "Pig, standing", "a curly tail and a snout. Faces the front."), p("pig-walk", "Pig, walking"),
      p("dog-idle", "Dog, standing", "a wagging tail. Faces the front."), p("dog-walk", "Dog, walking"),
      p("cat-idle", "Cat, standing", "pointy ears; the smallest. Faces the front."), p("cat-walk", "Cat, walking"),
      p("chicken-idle", "Chicken, standing", "a comb on its head. Faces the front."), p("chicken-walk", "Chicken, walking"),
      p("duck-idle", "Duck, standing", "a flat beak. Faces the front."), p("duck-walk", "Duck, walking"),
      p("rabbit-idle", "Rabbit, standing", "long ears. Faces the front."), p("rabbit-walk", "Rabbit, walking"),
      p("horse-idle", "Horse, standing", "tall, with a mane; too big for the door. Faces the front."), p("horse-walk", "Horse, walking"),
    ],
  },
  {
    id: "monastery-porter-special", title: "Monastery Porter: special visitors", game: "Monastery Porter",
    note: "Optional extras: any visitor can have a character of their own (name the files after them, like mayor-idle / mayor-walk). Abbot and Mother Abbess already use Monk and Nun until you make custom ones.",
    items: [
      p("abbot-idle", "The visiting abbot, standing"), p("abbot-walk", "The visiting abbot, walking"),
      p("mayor-idle", "The mayor, standing", "A sash across the chest."), p("mayor-walk", "The mayor, walking"),
      p("mother-idle", "Mother Abbess, standing", "A habit and a veil."), p("mother-walk", "Mother Abbess, walking"),
      p("peddler-idle", "The peddler, standing", "Pots hanging all over him."), p("peddler-walk", "The peddler, walking"),
      p("clown-idle", "The clown, standing"), p("clown-walk", "The clown, walking"),
    ],
  },
  {
    id: "monastery-porter-gate", title: "Monastery Porter: the gate", game: "Monastery Porter",
    note: "The gate in the wall, seen from above and from inside, with the path outside and the courtyard inside. The game builds all of this from stone-colored blocks until you make your own.",
    items: [
      { slug: "porter-gatehouse", label: "Gatehouse", size: [24, 16], note: "Two gateposts and a lintel with a cross on top, 12 voxels wide for the door; people are 8 tall." },
      { slug: "porter-door", label: "Wooden door", size: [12, 10], note: "Two leaves that swing open toward you (frame 1 shut, frame 2 open)." },
      { slug: "porter-lantern", label: "Lantern", size: [8, 8], note: "On each gatepost; it glows." },
      { slug: "porter-wall", label: "Wall piece", size: [16, 8], note: "A piece of the monastery wall that repeats." },
      { slug: "porter-well", label: "Well", size: [10, 8], note: "In the courtyard." },
      { slug: "porter-chapel", label: "Chapel", size: [30, 24], note: "Where welcomed visitors go: a small stone chapel with a door facing the gate." },
    ],
  },
  {
    id: "saints-match-apostles", title: "Saints Match: the Apostles", game: "Saints Match",
    note: "Standing front-facing saint cards (idle only — no walk poses needed!). Until each saint is drawn, the game puts a halo behind recolored voxel people.",
    items: [
      p("saint-peter-idle", "St. Peter", "Yellow and blue cloak, white hair/beard, holding golden keys."),
      p("saint-paul-idle", "St. Paul", "Red cloak, dark beard, holding a small sword and book."),
      p("saint-andrew-idle", "St. Andrew", "Blue fisherman robe, X-shaped cross."),
      p("saint-john-idle", "St. John", "Youthful face, green tunic, red cloak, holding a scroll."),
      p("saint-james-idle", "St. James", "Brown pilgrim cloak/hat with a white scallop shell."),
      p("saint-thomas-idle", "St. Thomas", "Purple tunic, holding a carpenter's L-square."),
    ],
  },
  {
    id: "saints-match-early", title: "Saints Match: Early Church", game: "Saints Match",
    note: "Early Church saints (3 men, 3 women), idle only, facing front.",
    items: [
      p("saint-augustine-idle", "St. Augustine", "Bishop's hat (mitre), holding a bright flaming red heart."),
      p("saint-clement-idle", "St. Clement", "White and gold papal bishop robes with an anchor."),
      p("saint-ignatius-idle", "St. Ignatius of Antioch", "Red Eastern bishop vestments."),
      p("saint-perpetua-idle", "St. Perpetua", "Purple and gold North African tunic and veil."),
      p("saint-agnes-idle", "St. Agnes", "Young girl in a white tunic holding a tiny white lamb."),
      p("saint-helena-idle", "St. Helena", "Gold crown, royal purple dress, tall cross."),
    ],
  },
  {
    id: "saints-match-eastern", title: "Saints Match: Eastern Church", game: "Saints Match",
    note: "Eastern / Byzantine Catholic saints (3 men, 3 women), idle only.",
    items: [
      p("saint-chrysostom-idle", "St. John Chrysostom", "Gold Byzantine bishop phelonion and beard."),
      p("saint-nicholas-idle", "St. Nicholas", "Red bishop vestments, white beard, three gift bags."),
      p("saint-vladimir-idle", "St. Vladimir", "Royal fur-trimmed cap, blue cloak, beard."),
      p("saint-olga-idle", "St. Olga of Kyiv", "Royal veil and embroidered blue mantle."),
      p("saint-macrina-idle", "St. Macrina", "Dark monastic habit and veil, holding a Gospel book."),
      p("saint-paraskevi-idle", "St. Paraskevi", "Bright red shawl over white tunic, holding a lamp."),
    ],
  },
  {
    id: "saints-match-western", title: "Saints Match: Western Church", game: "Saints Match",
    note: "Western Church saints (3 men, 3 women), idle only.",
    items: [
      p("saint-francis-idle", "St. Francis of Assisi", "Brown habit with white cord and a little bluebird."),
      p("saint-benedict-idle", "St. Benedict", "Black habit, white beard, little rule book."),
      p("saint-patrick-idle", "St. Patrick", "Green bishop robes and mitre with a shamrock."),
      p("saint-clare-idle", "St. Clare", "Brown habit, dark veil, holding a golden monstrance."),
      p("saint-joan-idle", "St. Joan of Arc", "Silver armor tunic and short brown hair."),
      p("saint-catherine-idle", "St. Catherine of Siena", "White Dominican habit with black veil and cloak."),
    ],
  },
  {
    id: "saints-match-modern", title: "Saints Match: Modern Saints", game: "Saints Match",
    note: "Modern saints (3 men, 3 women), idle only.",
    items: [
      p("saint-john-paul-ii-idle", "St. John Paul II", "White papal cassock and skullcap, smiling elder."),
      p("saint-kolbe-idle", "St. Maximilian Kolbe", "Black Franciscan habit and round glasses."),
      p("saint-carlo-idle", "St. Carlo Acutis", "Red polo shirt, blue jeans, dark curly hair, backpack."),
      p("saint-therese-idle", "St. Thérèse of Lisieux", "Brown Carmelite habit, white cloak, pink roses."),
      p("saint-teresa-calcutta-idle", "St. Teresa of Calcutta", "White sari trimmed with blue stripes."),
      p("saint-bakhita-idle", "St. Josephine Bakhita", "Dark Canossian habit, warm smile."),
    ],
  },
  {
    id: "saints-match-patrons", title: "Saints Match: Patron Saints", game: "Saints Match",
    note: "Patron saints (3 men, 3 women), idle only.",
    items: [
      p("saint-george-idle", "St. George", "White knight tunic with red cross."),
      p("saint-lawrence-idle", "St. Lawrence", "Red deacon dalmatic tunic."),
      p("saint-anthony-idle", "St. Anthony of Padua", "Brown habit with white lily or book."),
      p("saint-cecilia-idle", "St. Cecilia", "Rose and gold gown with a little harp."),
      p("saint-lucy-idle", "St. Lucy", "White dress, red sash, bright candle wreath crown."),
      p("saint-kateri-idle", "St. Kateri Tekakwitha", "Warm tan deerskin dress with green sash and small cross."),
    ],
  },
];

/** Every slug a checklist names (for the page). */
export const checklistSlugs = () => CHECKLISTS.flatMap((l) => l.items.map((i) => i.slug));
