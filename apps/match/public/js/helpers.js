// Unlockable Patron Helpers in Saints Match: the Altar Server starter plus 3 male & 3 female saints
// unlocked with 2 stars on each stage. Every patron brings a signature strength and trade-off.
// Pure data: used by match.js, app.js and test/match.test.js.

export const HELPERS = [
  {
    id: "starter", name: "Altar Server", icon: "🕯️", saintId: null, sex: "m",
    blurb: "Balanced and steady: 2-second peek, standard combos up to ×5.",
    say: "Altar Server keeps the table neat and steady!",
  },
  {
    id: "anthony", name: "St. Anthony", icon: "🔍", saintId: "anthony", sex: "m",
    opens: { stage: "apostles", stars: 2 },
    hint: true, pointsScale: 0.9,
    blurb: "Spot one lost pair once every board, though each match earns a little less.",
    say: "St. Anthony helps you spot a lost pair on every board! But each match earns a little less.",
  },
  {
    id: "lucy", name: "St. Lucy", icon: "🌟", saintId: "lucy", sex: "f",
    opens: { stage: "early", stars: 2 },
    peekBonus: 1.4, rushDuration: 8.0, swapScale: 0.8,
    blurb: "Extra-long starting peek and longer Feast Rush light, though wind swaps blow sooner.",
    say: "St. Lucy shines extra light on the board! Longer peek and Feast Rush, though the wind blows sooner.",
  },
  {
    id: "chrysostom", name: "St. John Chrysostom", icon: "🐝", saintId: "chrysostom", sex: "m",
    opens: { stage: "eastern", stars: 2 },
    symbolBonus: 60, peekBonus: -0.5,
    blurb: "Bonus points on every Saint-and-Sign match, with a shorter starting peek.",
    say: "St. John Chrysostom loves smart Saint-and-Sign matches! Extra points, with a shorter peek.",
  },
  {
    id: "clare", name: "St. Clare", icon: "☀️", saintId: "clare", sex: "f",
    opens: { stage: "western", stars: 2 },
    forgivePerWave: 1, maxMult: 4,
    blurb: "The first miss on every board never breaks your combo, up to ×4.",
    say: "St. Clare keeps your combo glowing past the first slip on every board! Max combo is four times.",
  },
  {
    id: "carlo", name: "St. Carlo Acutis", icon: "💻", saintId: "carlo", sex: "m",
    opens: { stage: "modern", stars: 2 },
    comboStep: 1, maxMult: 6, comboWindow: 3.3, peekBonus: -0.9, rushTimeBonus: 0.25,
    blurb: "Lightning combos straight to ×6 and extra Rush seconds, with a quick peek!",
    say: "St. Carlo Acutis builds lightning combos all the way to six times! Fast peek and brisk combo timer.",
  },
  {
    id: "cecilia", name: "St. Cecilia", icon: "🎵", saintId: "cecilia", sex: "f",
    opens: { stage: "patrons", stars: 2 },
    comboWindow: 6.5, noSwap: true,
    blurb: "Calm rhythm keeps wind swaps away and stretches your combo bar longer!",
    say: "St. Cecilia brings calm music: no wind swaps, and your combo timer lasts much longer!",
  },
];

export const helperById = (id) => HELPERS.find((h) => h.id === id) ?? HELPERS[0];

/** Open when starter or requisite stage reaches required stars (`starsOfId(stageId)`). */
export const helperOpen = (h, starsOfId) => !h.opens || (starsOfId(h.opens.stage) ?? 0) >= h.opens.stars;
