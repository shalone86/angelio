// The porters you can play (the owner's idea, Nov 2026): the first is the plain Brother Porter; three monks and three
// nuns open with stars on a stage, and each is good at something and not at something else. Pure data: porter.js takes
// the rules part (the skill fields below), gate.js the look (robe, model name), app.js the words and the picker. Your
// pick is saved on this device.
//   forgiving    the first wrong answer each minute costs nothing and isn't counted
//   comboEvery   right answers in a row for each step up of the combo (default 5)
//   patience     how long visitors wait (1 = usual)
//   stepGap      seconds of waiting after each visitor before the next steps up (default 0)
//   dog          a big dog chases animals off by itself (a little points), then barks: Send away waits a moment
//   glow         visitors who belong glow warmly
//   bell         a bell to ring once a round: everyone waiting gets their patience back, and new arrivals pause for a moment
//   noBump       everyone steps politely aside: outgoing brothers and visitors never bump at the gate
//   pointsScale  multiplier on points earned per answer (default 1)
export const PORTERS = [
  { id: "porter", name: "Brother Porter", icon: "🧔", robe: "#2b2830", model: "porter",
    blurb: "Keeps the gate, just like St. Benedict's porter.", say: "Brother Porter keeps the gate, just like St. Benedict's porter." },
  { id: "andre", name: "Brother André", icon: "💛", robe: "#7a5a3a", model: "porter-andre", forgiving: true, comboEvery: 7, opens: { stage: "sunday", stars: 2 },
    blurb: "So kind that the first mistake each minute is forgiven, but combos grow slowly.", say: "Brother André is so kind that the first mistake each minute is forgiven. But his combos grow slowly." },
  { id: "old", name: "Old Brother Porter", icon: "👴", robe: "#4a4a50", model: "porter-old", patience: 1.4, stepGap: 0.6, opens: { stage: "guests", stars: 2 },
    blurb: "Nobody minds waiting for him, so visitors wait much longer, though he calls the next one slowly.", say: "Nobody minds waiting for the old brother, so visitors wait much longer! But he is slow to call the next visitor." },
  { id: "dog", name: "Brother with the Dog", icon: "🐕", robe: "#2b2830", model: "porter-dog", dog: true, opens: { stage: "night", stars: 2 },
    blurb: "His big dog chases animals off by itself, then barks so loudly nobody can be sent away for a moment.", say: "Brother's big dog chases the animals off all by itself! But then it barks, and nobody can be sent away for a moment." },
  { id: "sister", name: "Sister Portress", icon: "🌟", robe: "#e8e4dc", model: "porter-sister", glow: true, patience: 0.8, opens: { stage: "sunday", stars: 3 },
    blurb: "Sees at once who belongs: they glow. But everyone is in more of a hurry.", say: "Sister Portress sees at once who belongs: they glow! But everyone is in more of a hurry." },
  { id: "bell", name: "Sister with the Bell", icon: "🔔", robe: "#2e5fa8", model: "porter-bell", bell: true, opens: { stage: "guests", stars: 3 },
    blurb: "Rings her bell once a round: everyone waiting is patient again.", say: "Sister rings her bell once a round, and everyone waiting is patient again. But just once!" },
  { id: "respected", name: "Respected Sister", icon: "🎖️", robe: "#6b3fa0", model: "porter-respected", noBump: true, pointsScale: 0.85, opens: { stage: "night", stars: 3 },
    blurb: "Everyone steps politely aside for her, so nobody bumps at the gate, though each answer earns a little less.", say: "Everyone steps politely aside for the respected sister, so nobody bumps at the gate! But each answer earns a little less." },
];
export const porterById = (id) => PORTERS.find((p) => p.id === id) ?? PORTERS[0];
/** Open when it's the first, or its stage has enough stars (`starsOf(stageId)`). */
export const porterOpen = (p, starsOf) => !p.opens || (starsOf(p.opens.stage) ?? 0) >= p.opens.stars;
