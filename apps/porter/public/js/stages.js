// The stages of the monastery door. Each opens with two stars on the one before. Pure data: porter.js takes the rules
// (length, every, maxQueue, patience, inShare, stars), gate.js the look (night), app.js the words (name, say, rule).
// The stars are tuned with pretend porters in test/porter.test.js.
export const STAGES = [
  {
    id: "sunday", progress: "porter", name: "Sunday Mass", icon: "⛪", night: false,
    blurb: "Almost everyone is welcome before Mass. Only send away the goat, the peddler and the other helpers who are lost.",
    say: "It's Sunday, and Mass is soon! Welcome almost everyone. Only send people on if they just want something else.",
    rule: "Welcome almost everyone. Send on people who aren't coming to pray.",
    bell: "Ding, dong! Mass is starting. Thank you, kind porter!", length: 100, every: [7, 4], maxQueue: 4, patience: 13, inShare: 0.67, star2: 100, star3: 185,
  },
  {
    id: "guests", name: "Guest Day", icon: "📜", night: false,
    blurb: "Today only people the brothers are expecting come in: an appointment, a delivery, or someone who lives here.",
    say: "It's Guest Day! Only people the brothers are expecting come in. Listen for an appointment, a delivery, or someone who lives here. And anyone in trouble always comes in.",
    rule: "Only expected guests come in. Anyone in trouble always comes in.",
    bell: "The day is done. The brothers thank you for keeping the door!", length: 100, every: [6.5, 3.8], maxQueue: 4, patience: 12, inShare: 0.55, star2: 100, star3: 185,
  },
  {
    id: "night", name: "The Great Silence", icon: "🌙", night: true,
    blurb: "Late at night the brothers sleep. Only the ones who live here and people in trouble come in. Shh!",
    say: "Shh. It's the Great Silence, and the brothers are sleeping. Only people who live here, and people in trouble, may come in. Everyone else, please come back in the morning.",
    rule: "Only people who live here and people in trouble come in. Everyone else, come back in the morning.",
    bell: "The sun is coming up, and the Great Silence is over. Good morning, kind porter!", length: 100, every: [6.5, 3.8], maxQueue: 4, patience: 12, inShare: 0.4, star2: 100, star3: 185,
  },
];
export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];
/** A stage is open when it's the first, or the one before has at least two stars (`starsOf(stage)`). */
export const isOpen = (i, starsOf) => i === 0 || (starsOf(STAGES[i - 1]) ?? 0) >= 2;
