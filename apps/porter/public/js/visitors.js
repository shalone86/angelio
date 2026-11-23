// Who comes knocking at the monastery door. Each visitor says who they are (read aloud, with a picture over their head),
// and what the porter should do depends on the stage: `answers` is
//   "in"    one of the people who belong (or someone in trouble): open the door and they walk in,
//   "greet" a special guest who hopes for a proper greeting (a bishop, the mayor, "Glory to Jesus Christ!"): tap Welcome,
//   "away"  not coming to pray today (a peddler, a goat): kindly send them on their way, never "go away".
// A visitor missing from a stage doesn't come to it. `vip` ones are in a hurry. `reply` is what the porter says when
// greeting them, `later` what he says when sending them on, `why` the gentle hint when the answer was wrong (one for the
// stage, else `default`, else a plain one). kind: which of his people models to use, or an animal (animals.js in gate.js
// draws a stand-in of boxes until he draws it); `robe` colors a monk. Pure data, tested in test/porter.test.js.

const S = (sunday, guests = sunday, night = guests) => ({ sunday, guests, night }); // answers for the three days
const ALL = (a) => S(a);

export const ANIMALS = ["goat", "sheep", "cow", "pig", "dog", "cat", "chicken", "duck", "rabbit", "horse"];

export const VISITORS = [
  // ── the people who belong: open the door ──
  { id: "family", emoji: "👨‍👩‍👧", kind: "woman", line: "Good morning! We came to pray with the brothers.", answers: S("in", "away", "away"),
    later: "Please come back for prayers in the morning!", why: { guests: "On Guest Day, only people with an appointment come in.", night: "It's the Great Silence: the brothers are sleeping." } },
  { id: "bread", emoji: "🍞", kind: "grandmother", line: "I brought the bread you ordered!", answers: S("in", "in", "away"),
    later: "Thank you! Please bring it in the morning, when the brothers are awake.", why: { night: "It's the Great Silence. Bread can wait until morning." } },
  { id: "slip", emoji: "📜", kind: "man", line: "I have an appointment with Father Abbot. Here is my slip!", answers: S("in", "in", "away"),
    later: "Please come back tomorrow for your appointment.", why: { night: "It's the Great Silence. Appointments are in the daytime." } },
  { id: "repair", emoji: "🧰", kind: "man", line: "I'm here to fix the roof. Here is my tool bag!", answers: S("in", "in", "away"),
    later: "Please come back in the morning, and thank you for helping us!", why: { night: "It's the Great Silence. The roof can wait for morning." } },
  { id: "monk", emoji: "🥕", kind: "man", robe: "#5a4030", line: "Peace! I'm Brother Francis, coming back from the garden. I live here.", answers: ALL("in"), why: { default: "Brother Francis lives here!" } },
  { id: "monk2", emoji: "📚", kind: "grandfather", robe: "#2b2830", line: "Peace be with you! I'm Brother Thomas, back from the library. I live here.", answers: ALL("in"), why: { default: "Brother Thomas lives here!" } },
  { id: "hurt", emoji: "🤕", kind: "man", line: "Please help! I fell and I'm hurt!", answers: ALL("in"), why: { default: "Someone who is hurt always comes in, even in the Great Silence." } },
  { id: "cold", emoji: "🥶", kind: "child", line: "I'm lost, and I'm so cold. Can I come in?", answers: ALL("in"), why: { default: "A lost, cold child always comes in, even at night." } },
  { id: "neighbor", emoji: "🙂", kind: "woman", line: "Good day! I was just passing by and wanted to say hello.", answers: S("in", "away", "away"),
    later: "How kind! Please come back and say hello another time.", why: { guests: "On Guest Day, only people with an appointment come in.", night: "It's the Great Silence: the brothers are sleeping." } },
  { id: "delivery", emoji: "🕯️", kind: "man", line: "Candle delivery for the chapel!", answers: S("in", "in", "away"),
    later: "Thank you! Please bring the candles in the morning.", why: { night: "It's the Great Silence. Candles can wait for morning." } },
  { id: "choir", emoji: "🎶", kind: "child-girl", line: "We're the children's choir! We came to sing at Mass!", answers: S("in", "away", "away"),
    later: "How lovely! Please come back on Sunday to sing.", why: { guests: "The choir sings on Sunday, not on Guest Day.", night: "The choir sings in the daytime." } },
  { id: "flowers", emoji: "💐", kind: "grandmother", line: "I brought flowers for the altar!", answers: S("in", "in", "away"),
    later: "How beautiful! Please bring them in the morning.", why: { night: "It's the Great Silence. Flowers can wait for morning." } },
  { id: "heater", emoji: "🔧", kind: "man", vip: true, line: "The heater is broken, and it's freezing! I'm the repairman. Hurry!", answers: { night: "in" }, why: { default: "The brothers asked for the repairman: the heater is broken." } },

  // ── special guests who hope for a proper greeting: tap Welcome ──
  { id: "bishop", who: "The bishop", emoji: "✝️", kind: "grandfather", vip: true, line: "I am the bishop. I'm visiting the brothers today.", answers: ALL("greet"),
    reply: "Welcome, Your Excellency! Thanks be to God for your visit!", why: { default: "A bishop deserves a proper greeting. Tap Welcome!" } },
  { id: "abbot", who: "The visiting abbot", emoji: "🎩", kind: "grandfather", vip: true, line: "I'm the visiting abbot. The brothers are expecting me!", answers: S("greet", "greet", null),
    reply: "Peace, Father Abbot! Welcome, welcome!", why: { default: "A visiting abbot deserves a proper greeting. Tap Welcome!" } },
  { id: "mayor", who: "The mayor", emoji: "🎖️", kind: "man", line: "I'm the mayor. I came to thank the brothers.", answers: S("greet", "greet", null),
    reply: "Welcome, Mr. Mayor! The brothers are honored.", why: { default: "The mayor deserves a proper greeting. Tap Welcome!" } },
  { id: "mother", who: "Mother Abbess", emoji: "🕊️", kind: "grandmother", line: "I'm Mother Abbess, from the sisters' convent. Peace to you!", answers: S("greet", "greet", null),
    reply: "Welcome, Mother! Peace to you and the sisters!", why: { default: "Mother Abbess deserves a proper greeting. Tap Welcome!" } },
  { id: "glory", who: "Someone who says Glory to Jesus Christ", emoji: "🙏", kind: "man", line: "Glory to Jesus Christ!", answers: ALL("greet"),
    reply: "Glory forever!", why: { default: "When someone says \"Glory to Jesus Christ!\", we answer \"Glory forever!\" Tap Welcome!" } },
  { id: "praised", who: "Someone who says Praised be Jesus Christ", emoji: "🙌", kind: "woman", line: "Praised be Jesus Christ!", answers: ALL("greet"),
    reply: "Now and forever. Amen!", why: { default: "When someone says \"Praised be Jesus Christ!\", we answer \"Now and forever. Amen!\" Tap Welcome!" } },

  // ── people who aren't coming to pray today: kindly send them on ──
  { id: "peddler", emoji: "🏺", kind: "man", line: "Buy my pots! Very good pots, very cheap!", answers: ALL("away"), later: "No, thank you! Please try the village market.", why: { default: "He's selling pots, not coming to pray." } },
  { id: "tourist", emoji: "🗺️", kind: "woman", line: "Excuse me! Where is the train station?", answers: ALL("away"), later: "Down the hill, past the bakery. Have a good trip!", why: { default: "She only wants directions." } },
  { id: "bell", emoji: "🔔", kind: "child", line: "Can I ring your big bell? Ding dong, ding dong!", answers: ALL("away"), later: "Not today! The bell rings at prayer time. Come and listen!", why: { default: "The bell is rung by the brothers." } },
  { id: "room", emoji: "🎒", kind: "man", line: "Hi! Do you have a free room for tonight?", answers: ALL("away"), later: "The guesthouse by the road has a bed for you. Peace!", why: { default: "Travelers sleep at the guesthouse." } },
  { id: "pizza", emoji: "🍕", kind: "man", line: "Pizza delivery! Extra cheese for Brother Tom!", answers: ALL("away"), later: "We don't have a Brother Tom, and we didn't order pizza! Try the next street.", why: { default: "Nobody here ordered a pizza." } },
  { id: "juggler", emoji: "🤹", kind: "woman", line: "Want to see me juggle? Ta-da!", answers: ALL("away"), later: "Wow! Please juggle for the village instead.", why: { default: "Jugglers belong at the fair, not at prayers." } },
  { id: "jogger", emoji: "🏃", kind: "man", line: "Which way to the park? I'm on a run!", answers: ALL("away"), later: "Left at the oak tree, then straight on. Run well!", why: { default: "He only needs directions." } },
  { id: "vacuum", emoji: "🧹", kind: "man", line: "Vacuum cleaners! Best price in the country!", answers: ALL("away"), later: "No, thank you! We have brooms.", why: { default: "He's selling vacuum cleaners." } },
  { id: "ball", emoji: "⚽", kind: "child", line: "My ball flew over your wall! Can I get it?", answers: ALL("away"), later: "We'll toss it back over the wall. Wait right there!", why: { default: "The brothers will toss the ball back." } },
  { id: "clown", emoji: "🤡", kind: "man", line: "I'm here for the birthday party! Honk, honk!", answers: ALL("away"), later: "Oh! There's no party here. Maybe try the next street?", why: { default: "He has the wrong address." } },
  { id: "photo", emoji: "📸", kind: "woman", line: "Can I take pictures of all the brothers?", answers: ALL("away"), later: "Please ask Father Abbot first, and come back another day.", why: { default: "Visitors ask the Abbot before taking pictures." } },

  // ── animals (he draws them: goat-walk, sheep-walk…): never allowed in ──
  { id: "goat", emoji: "🐐", kind: "goat", line: "Meh-eh-eh! Meh-eh-eh!", answers: ALL("away"), later: "Oh dear, a goat! Let's walk you back to your farmer.", why: { default: "A goat in the chapel would eat the flowers!" } },
  { id: "sheep", emoji: "🐑", kind: "sheep", line: "Baa! Baa! Baa!", answers: ALL("away"), later: "A little lost sheep! Let's help you find your shepherd.", why: { default: "A sheep would nibble the prayer books!" } },
  { id: "cow", emoji: "🐄", kind: "cow", line: "Moooooo!", answers: ALL("away"), later: "A cow! Off you go, back to the meadow.", why: { default: "A cow is much too big for the chapel!" } },
  { id: "pig", emoji: "🐖", kind: "pig", line: "Oink! Oink! Oink!", answers: ALL("away"), later: "Oh, a muddy pig! Back to the farm with you.", why: { default: "A muddy pig would leave footprints everywhere!" } },
  { id: "dog", emoji: "🐕", kind: "dog", line: "Woof! Woof!", answers: ALL("away"), later: "Good dog! Let's find your owner.", why: { default: "A dog would bark during prayers!" } },
  { id: "cat", emoji: "🐈", kind: "cat", line: "Meow! Meow!", answers: ALL("away"), later: "What a nice kitty! Off you go, home.", why: { default: "A cat would climb the candle stands!" } },
  { id: "chicken", emoji: "🐔", kind: "chicken", line: "Cluck, cluck, bawk, bawk!", answers: ALL("away"), later: "Shoo, little chicken! Back to the farm.", why: { default: "A chicken would flap all through the chapel!" } },
  { id: "duck", emoji: "🦆", kind: "duck", line: "Quack! Quack! Quack!", answers: ALL("away"), later: "A duck! The pond is down the hill.", why: { default: "A duck belongs at the pond!" } },
  { id: "rabbit", emoji: "🐇", kind: "rabbit", line: "Squeak! Sniff, sniff!", answers: ALL("away"), later: "A bunny! Hop along home.", why: { default: "A bunny would hop all over the altar steps!" } },
  { id: "horse", emoji: "🐴", kind: "horse", line: "Neigh! Neigh-hay-hay!", answers: ALL("away"), later: "A horse! Let's find the stable.", why: { default: "A horse is much too big for the door!" } },
];
for (const v of VISITORS) for (const k of Object.keys(v.answers)) if (v.answers[k] == null) delete v.answers[k]; // (S(…, null) = "doesn't come that day")
export const visitorById = (id) => VISITORS.find((v) => v.id === id);
export const isAnimal = (kind) => ANIMALS.includes(kind);

/** The gentle reason shown after a wrong answer (the stage's own, else the visitor's, else a plain one). */
export function hintFor(v, rules) {
  const a = v.answers[rules];
  return v.why?.[rules] ?? v.why?.default ?? (a === "in" ? "They belong here: open the door!" : a === "greet" ? "A special guest deserves a proper greeting. Tap Welcome!" : "They're not coming to pray today.");
}

/** Different words for letting someone in (said now and then, not every time). */
export const WELCOMES = ["Come in, come in! Peace to you!", "God bless you! Welcome!", "Right this way, friend!", "The brothers are glad you're here!", "Peace be with you!", "Welcome, welcome! Mind the step!",
  "Thanks be to God! Come on in!", "What a blessing to see you!", "Please, come in out of the cold!", "Welcome to our home!", "Pax tecum! Come in!", "So nice of you to come!"];
