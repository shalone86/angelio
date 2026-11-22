// Mass Usher's stages (like Candle Rack's): Roman and Byzantine churches, an ordinary Sunday and the great feasts (more
// people come, and bigger families), and Adoration at Night (endless). Each opens with two stars on the one before
// (Adoration: on Sunday Mass). Pure data: usher.js takes the rules part, nave.js the look, app.js the words.
// regulars: how full the pews are to start · every: seconds between arrivals, start → near Mass · biggest: the largest
// family, start → near Mass · stayFor (endless): how long people stay before they go home · maxLine (endless): the night
// is over when this many families are waiting at the doors. Stars tuned with pretend ushers in test/usher.test.js.

export const STAGES = [
  {
    id: "sunday", progress: "usher", name: "Sunday Mass", rite: "roman", icon: "⛪",
    blurb: "An ordinary Sunday: families come in before Mass.",
    say: "Families are coming to Mass! Tap the button by a pew to walk the first family there.",
    regulars: 0.3, every: [10, 5], biggest: [3, 6], star2: 150, star3: 370,
  },
  {
    id: "liturgy", name: "Divine Liturgy", rite: "byzantine", icon: "☦️",
    blurb: "A Byzantine church before the Divine Liturgy.",
    say: "The Divine Liturgy starts soon! Families are coming in.",
    regulars: 0.34, every: [9, 4.6], biggest: [3, 6], star2: 140, star3: 320,
  },
  {
    id: "christmas", name: "Christmas Midnight Mass", rite: "roman", icon: "⭐",
    blurb: "Christmas! The church is packed: you'll have to split some families.",
    say: "It's Christmas! Midnight Mass is almost here, and the church is filling up fast.",
    regulars: 0.42, every: [7, 3.6], biggest: [4, 7], star2: 140, star3: 260,
  },
  {
    id: "pascha", name: "Pascha", rite: "byzantine", icon: "🌅",
    blurb: "Pascha: the busiest night of the year!",
    say: "Christ is risen! It's Pascha, and everyone is coming!",
    regulars: 0.46, every: [6.5, 3.2], biggest: [4, 7], star2: 100, star3: 240,
  },
  {
    id: "adoration", name: "Adoration at Night", rite: "roman", icon: "🌙", opensAfter: "sunday", endless: true,
    blurb: "Late at night in the chapel: people come and go. As long as you can!",
    say: "It's late at night, and Jesus is on the altar for adoration. People come to pray and go home again. Seat them as long as you can!",
    regulars: 0.2, every: [11, 4], biggest: [2, 4], stayFor: [25, 50], maxLine: 6, star2: 100, star3: 1500,
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];
/** Open when it's the first, or the stage before it (or `opensAfter`) has at least two stars (`starsOf(stage)`). */
export const isOpen = (i, starsOf) => i === 0 || (starsOf(STAGES[i].opensAfter ? stageById(STAGES[i].opensAfter) : STAGES[i - 1]) ?? 0) >= 2;
