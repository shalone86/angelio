// The stages: Roman and Byzantine churches, an ordinary Sunday and the great feasts. Each opens when the one before has
// two stars. Adoration at Night (endless, the chapel with four racks, no helpers) opens with two stars on Sunday Mass. Busier liturgies bring more people to pray; from the second stage on, the player carries a TAPER that lights
// `taper` candles before it has to be lit again at the big candle (the Paschal candle at Pascha). Pure data: game.js
// takes the rules part (taper, people, burn, dark, stars), church.js the look (rite, color), app.js the words.
//
// The stars are tuned with pretend players in test/game.test.js, stage by stage.

export const STAGES = [
  {
    id: "sunday", progress: "rack", name: "Sunday Mass", rite: "roman", icon: "⛪",
    blurb: "A Roman church before Sunday Mass.",
    say: "Mass starts soon. Light the glowing candles!",
    taper: 0, maxPeople: 2, peopleRate: 1, burn: 1, dark: false, star2: 30, star3: 450,
  },
  {
    id: "liturgy", name: "Divine Liturgy", rite: "byzantine", icon: "☦️",
    blurb: "A Byzantine church before the Divine Liturgy. Now you carry a taper!",
    say: "The Divine Liturgy starts soon. Your taper lights six candles, then light it again at the big candle.",
    taper: 6, maxPeople: 2, peopleRate: 1.15, burn: 1, dark: false, star2: 30, star3: 400,
  },
  {
    id: "christmas", name: "Christmas Midnight Mass", rite: "roman", color: "gold", icon: "⭐",
    blurb: "Midnight Mass at Christmas: the church is full!",
    say: "It's Christmas! Midnight Mass is almost here, and the church is filling up.",
    taper: 6, maxPeople: 3, peopleRate: 1.6, burn: 1.1, dark: false, star2: 30, star3: 340,
  },
  {
    id: "pascha", name: "Pascha", rite: "byzantine", color: "red", icon: "🌅",
    blurb: "Pascha: the church starts in the dark. Bring the light from the Paschal candle!",
    say: "Christ is risen! The church is dark. Light your taper at the Paschal candle and bring the light to every candle!",
    taper: 5, maxPeople: 4, peopleRate: 2, burn: 1.15, dark: true, star2: 30, star3: 325,
  },
  {
    id: "adoration", name: "Adoration at Night", rite: "roman", layout: "chapel", color: "white", icon: "🌙", opensAfter: "sunday",
    blurb: "Late at night in the adoration chapel: as long as you can! Nobody to help this time.",
    say: "It's late at night in the adoration chapel. Keep the candles burning near Jesus as long as you can!",
    endless: true, racks: 4, helpers: false, taper: 6, maxPeople: 3, peopleRate: 1, burn: 1, dark: false, star2: 12, star3: 500,
  },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];
/** A stage is open when it's the first, or the stage before it (or the one named in `opensAfter`) has at least two
 * stars (`starsOf(stage)`). */
export const isOpen = (i, starsOf) => i === 0 || (starsOf(STAGES[i].opensAfter ? stageById(STAGES[i].opensAfter) : STAGES[i - 1]) ?? 0) >= 2;
