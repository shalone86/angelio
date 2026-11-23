// The stages of the monastery door. Each opens with two stars on the one before (the endless one, on Sunday Mass).
// Pure data: porter.js takes the rules (rules, length, every, maxQueue, patience, mix, stars), gate.js the look (night),
// app.js the words (name, say, rule, bell). `rules` says whose list of answers is used (the feast day uses Sunday's).
// `mix` is how often a visitor is someone who belongs ("in"), a special guest ("greet") or someone to send on ("away").
// The stars are tuned with pretend porters in test/porter.test.js.
export const STAGES = [
  {
    id: "sunday", progress: "porter", name: "Sunday Mass", icon: "⛪", night: false, rules: "sunday",
    blurb: "Mass is soon! Open the door for those who belong, greet the special guests, and send on everyone else, goats and all.",
    say: "It's Sunday, and Mass is soon! Open the door for people who belong. Greet special guests with Welcome. And kindly send on everyone else!",
    rule: "Open the door for people who belong. Tap Welcome for special guests. Send on everyone else, even animals.",
    bell: "Ding, dong! Mass is starting. Thank you, kind porter!",
    length: 100, every: [4.2, 2.3], maxQueue: 4, patience: 9, mix: { in: 0.42, greet: 0.2, away: 0.38 }, star2: 250, star3: 1000,
  },
  {
    id: "guests", name: "Guest Day", icon: "📜", night: false, rules: "guests",
    blurb: "Today only people the brothers are expecting come in, and the important guests need a proper greeting.",
    say: "It's Guest Day! Only people the brothers are expecting come in: an appointment, a delivery, or someone who lives here. Greet the special guests. And anyone in trouble always comes in.",
    rule: "Only expected guests come in. Greet the special guests. Anyone in trouble always comes in.",
    bell: "The day is done. The brothers thank you for keeping the door!",
    length: 100, every: [4.0, 2.3], maxQueue: 4, patience: 9, mix: { in: 0.38, greet: 0.22, away: 0.4 }, star2: 250, star3: 1000,
  },
  {
    id: "night", name: "The Great Silence", icon: "🌙", night: true, rules: "night",
    blurb: "Late at night the brothers sleep. Only the ones who live here, people in trouble and a late bishop come in. Shh!",
    say: "Shh. It's the Great Silence, and the brothers are sleeping. Only people who live here, and people in trouble, may come in. Greet any special guest. Everyone else, please come back in the morning.",
    rule: "Only people who live here and people in trouble come in. Greet special guests. Everyone else, come back in the morning.",
    bell: "The sun is coming up, and the Great Silence is over. Good morning, kind porter!",
    length: 100, every: [4.0, 2.3], maxQueue: 4, patience: 9, mix: { in: 0.3, greet: 0.12, away: 0.58 }, star2: 250, star3: 1000,
  },
  {
    id: "feast", name: "Feast Day Crowd", icon: "🎉", night: false, rules: "sunday", endless: true, opensAfter: "sunday",
    blurb: "A big feast day, and the whole village is coming! They keep coming faster and faster, more every minute. How long can you keep the door?",
    say: "It's a feast day, and everyone is coming to the monastery! They'll come faster and faster. If too many people are waiting, the day is over. Keep the door as long as you can!",
    rule: "Keep the door as long as you can! If too many people are waiting, the day is over.",
    bell: "The line at the gate got too long. What a busy feast day! Time to rest.",
    length: Infinity, every: [4.2, 4.2], perMinute: 0.65, floor: 0.45, maxQueue: 99, maxLine: 6, patience: 9, mix: { in: 0.42, greet: 0.2, away: 0.38 }, star2: 600, star3: 4000,
  },
];
export const stageById = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];
/** A stage is open when it's the first, or the one before it (or `opensAfter`) has at least two stars (`starsOf(stage)`). */
export const isOpen = (i, starsOf) => i === 0 || (starsOf(STAGES[i].opensAfter ? stageById(STAGES[i].opensAfter) : STAGES[i - 1]) ?? 0) >= 2;
