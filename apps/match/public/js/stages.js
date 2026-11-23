// Stages in Saints Match (apps/match): six 90-second stages plus the endless All Saints Rush.
// Pure data + progression rules: used by match.js, app.js and test/match.test.js.

export const STAGES = [
  {
    id: "apostles", name: "The Apostles", icon: "🔑", progress: "match-apostles",
    length: 90, open: true, star2: 170, star3: 700,
    blurb: "Start with Peter, Paul, and the Apostles! Quick peek, then match faces and their signs.",
    rule: "Wave 1 matches faces, then their special signs join in!",
  },
  {
    id: "early", name: "Early Church", icon: "🕊️", progress: "match-early",
    length: 90, after: "apostles", star2: 180, star3: 750,
    blurb: "Brave bishops and women of the early Church. Watch for Wind Swaps!",
    rule: "Match Early Church saints — and keep an eye out when the wind swirls two cards!",
  },
  {
    id: "eastern", name: "Eastern Church", icon: "☦️", progress: "match-eastern",
    length: 90, after: "early", star2: 195, star3: 800,
    blurb: "Saints of the Byzantine and Eastern Churches: Chrysostom, Nicholas, Olga, and friends.",
    rule: "Symbols mix in right from Wave 1, plus Golden Halo Feast Rush!",
  },
  {
    id: "western", name: "Western Church", icon: "🌿", progress: "match-western",
    length: 90, after: "eastern", star2: 205, star3: 850,
    blurb: "Francis, Clare, Benedict, Patrick, Joan, and Catherine. Build fast combos!",
    rule: "Saints and symbols from Wave 1, with brisk wind swaps!",
  },
  {
    id: "modern", name: "Modern Saints", icon: "🌹", progress: "match-modern",
    length: 90, after: "western", star2: 205, star3: 900,
    blurb: "Carlo, Thérèse, John Paul, Mother Teresa, Kolbe, and Bakhita.",
    rule: "Modern heroes! Spot the swapped cards for Sharp Eye points!",
  },
  {
    id: "patrons", name: "Patron Saints", icon: "🌟", progress: "match-patrons",
    length: 90, after: "modern", star2: 215, star3: 950,
    blurb: "Every pair matches a saint straight to their patron sign!",
    rule: "Every single pair is Saint to Sign — match fast for Feast Rush!",
  },
  {
    id: "rush", name: "All Saints Rush", icon: "🔥", progress: "match-rush",
    endless: true, startTime: 40, maxTime: 45, after: "apostles", star2: 500, star3: 1600,
    blurb: "Endless mode! Every match adds seconds as all 36 saints mix onto bigger boards.",
    rule: "Beat the clock! Every match adds seconds and boards grow to 8 pairs!",
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];

/** Open when the prerequisite stage (`after`, or previous stage) has 2+ stars. */
export function isOpen(index, starsOf) {
  const st = STAGES[index];
  if (!st || st.open) return true;
  const req = st.after ? stageById(st.after) : STAGES[index - 1];
  return (starsOf(req) ?? 0) >= 2;
}

/** Board configuration for a given stage + 1-based wave number. */
export function waveConfig(stage, wave) {
  if (stage.endless) {
    const pairs = wave === 1 ? 4 : wave <= 3 ? 6 : 8;
    const symbolPairs = wave === 1 ? 1 : wave <= 3 ? Math.min(6, wave * 2) : Math.min(8, 4 + (wave - 3));
    const swapEvery = wave === 1 ? 0 : wave <= 3 ? 9.5 - wave : Math.max(4.8, 7 - (wave - 4) * 0.5);
    return { pairs, symbolPairs, golden: true, swapEvery };
  }
  switch (stage.id) {
    case "apostles":
      return {
        pairs: wave === 1 ? 4 : 6,
        symbolPairs: wave <= 2 ? 0 : Math.min(6, (wave - 2) * 2),
        golden: wave >= 2,
        swapEvery: wave <= 2 ? 0 : wave === 3 ? 11 : 9,
      };
    case "early":
      return {
        pairs: 6,
        symbolPairs: wave === 1 ? 0 : Math.min(6, wave * 3 - 3),
        golden: true,
        swapEvery: wave === 1 ? 0 : wave === 2 ? 10 : 8.5,
      };
    case "eastern":
      return {
        pairs: 6,
        symbolPairs: Math.min(6, wave * 2),
        golden: true,
        swapEvery: wave === 1 ? 10 : wave === 2 ? 8.5 : 7.5,
      };
    case "western":
      return {
        pairs: 6,
        symbolPairs: wave === 1 ? 3 : 6,
        golden: true,
        swapEvery: wave === 1 ? 9 : 7,
      };
    case "modern":
      return {
        pairs: 6,
        symbolPairs: wave === 1 ? 3 : 6,
        golden: true,
        swapEvery: wave === 1 ? 8.5 : 6.5,
      };
    case "patrons":
    default:
      return {
        pairs: 6,
        symbolPairs: 6,
        golden: true,
        swapEvery: wave === 1 ? 8 : 6,
      };
  }
}
