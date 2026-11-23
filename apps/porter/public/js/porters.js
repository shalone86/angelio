// The porters you can play (the owner's idea, Nov 2026): the first is the plain Brother Porter; three monks and three
// nuns open with stars on a stage, and each is good at something and not at something else. Pure data: porter.js takes
// the rules part (the skill fields below), gate.js the look (robe, model name), app.js the words and the picker. Your
// pick is saved on this device.
//   forgiving   the first wrong answer each minute costs nothing and isn't counted
//   comboEvery  right answers in a row for each step up of the combo (default 5)
//   freeOpen    seconds the door can be open before the draft costs points (default 2)
//   grace       seconds before someone walks in through an open door (default 0.8)
//   arrive      seconds for the next visitor to step up to the door (default 0.5)
//   dog         a big dog chases animals off by itself (a little points), then barks: Send away waits a moment
//   glow        special guests glow
//   patience    how long visitors wait (1 = usual)
//   bell        a bell to ring once a round: everyone waiting gets their patience back, and no one new comes for a moment
//   respected   everyone knows her: a special guest who just walks in through the open door is fine (a greeting is worth less)
export const PORTERS = [
  { id: "porter", name: "Brother Porter", icon: "🧔", robe: "#2b2830", model: "porter",
    blurb: "Keeps the door, just like St. Benedict's porter.", say: "Brother Porter keeps the door, just like St. Benedict's porter." },
  { id: "andre", name: "Brother André", icon: "💛", robe: "#7a5a3a", model: "porter-andre", forgiving: true, comboEvery: 7, opens: { stage: "sunday", stars: 2 },
    blurb: "So kind that the first mistake each minute is forgiven, but combos grow slowly.", say: "Brother André is so kind that the first mistake each minute is forgiven. But his combos grow slowly." },
  { id: "old", name: "Old Brother Porter", icon: "👴", robe: "#4a4a50", model: "porter-old", freeOpen: 5, grace: 1.3, arrive: 1.2, opens: { stage: "guests", stars: 2 },
    blurb: "Knows the old door well: it can stay open longer, but visitors take longer to step up.", say: "The old porter knows the door well. It can stay open longer, and people take their time walking in. But he's slow to call the next visitor." },
  { id: "dog", name: "Brother with the Dog", icon: "🐕", robe: "#2b2830", model: "porter-dog", dog: true, opens: { stage: "night", stars: 2 },
    blurb: "His big dog chases animals off by itself, then barks so loudly nobody can be sent away for a moment.", say: "Brother's big dog chases the animals off all by itself! But then it barks, and nobody can be sent away for a moment." },
  { id: "sister", name: "Sister Portress", icon: "🌟", robe: "#e8e4dc", model: "porter-sister", glow: true, patience: 0.8, opens: { stage: "sunday", stars: 3 },
    blurb: "Sees at once who is special: they glow. But everyone is in more of a hurry.", say: "Sister Portress sees at once who is special: they glow! But everyone is in more of a hurry." },
  { id: "bell", name: "Sister with the Bell", icon: "🔔", robe: "#2e5fa8", model: "porter-bell", bell: true, opens: { stage: "guests", stars: 3 },
    blurb: "Rings her bell once a round: everyone waiting is patient again.", say: "Sister rings her bell once a round, and everyone waiting is patient again. But just once!" },
  { id: "respected", name: "Respected Sister", icon: "🎖️", robe: "#6b3fa0", model: "porter-respected", respected: true, opens: { stage: "night", stars: 3 },
    blurb: "Everyone knows her, so special guests are happy just to be let in. But greetings are worth less.", say: "Everyone knows the respected sister, so special guests are happy just to be let in. But a greeting from her is worth less." },
];
export const porterById = (id) => PORTERS.find((p) => p.id === id) ?? PORTERS[0];
/** Open when it's the first, or its stage has enough stars (`starsOf(stageId)`). */
export const porterOpen = (p, starsOf) => !p.opens || (starsOf(p.opens.stage) ?? 0) >= p.opens.stars;
