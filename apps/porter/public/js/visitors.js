// Who comes knocking at the monastery door. Each visitor says who they are (read aloud, with a picture above their head),
// and what the porter should do depends on the stage: `answers` is "in" (welcome them) or "later" (kindly send them on)
// for each stage they appear in. A visitor missing from a stage doesn't come to it. `vip` ones are in a hurry.
// `later` is what the porter says when sending them on (kind: "Come back later", never "go away"); `why` is the gentle
// hint when the answer was wrong. kind: which of his people models to use ("goat" is a stand-in drawn from boxes);
// `robe` colors a monk. Pure data, tested in test/porter.test.js.

export const VISITORS = [
  { id: "family", emoji: "🙏", kind: "woman", line: "Good morning! We came to pray with the brothers.", answers: { sunday: "in", guests: "later", night: "later" },
    later: "Please come back for prayers in the morning!", why: { sunday: "Families who come to pray before Mass are always welcome.", guests: "On Guest Day, only people with an appointment come in.", night: "It's the Great Silence: the brothers are sleeping." } },
  { id: "bread", emoji: "🍞", kind: "grandmother", line: "I brought the bread you ordered!", answers: { sunday: "in", guests: "in", night: "later" },
    later: "Thank you! Please bring it in the morning, when the brothers are awake.", why: { sunday: "The bread is for the brothers: welcome her!", guests: "She brought what the brothers ordered, so they expect her.", night: "It's the Great Silence. Bread can wait until morning." } },
  { id: "slip", emoji: "📜", kind: "man", line: "I have an appointment with Father Abbot. Here is my slip!", answers: { sunday: "in", guests: "in", night: "later" },
    later: "Please come back tomorrow for your appointment.", why: { sunday: "People with an appointment are always welcome.", guests: "He has an appointment slip: the brothers expect him.", night: "It's the Great Silence. Appointments are in the daytime." } },
  { id: "repair", emoji: "🧰", kind: "man", line: "I'm here to fix the roof. Here is my tool bag!", answers: { sunday: "in", guests: "in", night: "later" },
    later: "Please come back in the morning, and thank you for helping us!", why: { sunday: "The roof needs fixing: welcome him!", guests: "The brothers asked him to fix the roof, so they expect him.", night: "It's the Great Silence. The roof can wait for morning." } },
  { id: "abbot", emoji: "🎩", kind: "grandfather", vip: true, line: "I'm the visiting abbot. The brothers are expecting me!", answers: { sunday: "in", guests: "in" },
    later: "", why: { sunday: "A visiting abbot is an important guest.", guests: "A visiting abbot is an important guest." } },
  { id: "monk", emoji: "🥕", kind: "man", robe: "#5a4030", line: "Peace! I'm Brother Francis, coming back from the garden. I live here.", answers: { sunday: "in", guests: "in", night: "in" },
    later: "", why: { sunday: "Brother Francis lives here!", guests: "Brother Francis lives here!", night: "Brother Francis lives here!" } },
  { id: "hurt", emoji: "🤕", kind: "man", line: "Please help! I fell and I'm hurt!", answers: { sunday: "in", guests: "in", night: "in" },
    later: "", why: { sunday: "Someone who is hurt always comes in.", guests: "Someone who is hurt always comes in.", night: "Someone who is hurt always comes in, even in the Great Silence." } },
  { id: "cold", emoji: "🥶", kind: "child", line: "I'm lost, and I'm so cold. Can I come in?", answers: { sunday: "in", guests: "in", night: "in" },
    later: "", why: { sunday: "A lost, cold child always comes in.", guests: "A lost, cold child always comes in.", night: "A lost, cold child always comes in, even at night." } },
  { id: "neighbor", emoji: "🙂", kind: "woman", line: "Good day! I was just passing by and wanted to say hello.", answers: { sunday: "in", guests: "later", night: "later" },
    later: "How kind! Please come back and say hello another time.", why: { sunday: "A neighbor coming by before Mass is welcome.", guests: "On Guest Day, only people with an appointment come in.", night: "It's the Great Silence: the brothers are sleeping." } },
  { id: "delivery", emoji: "🕯️", kind: "man", line: "Candle delivery for the chapel!", answers: { sunday: "in", guests: "in", night: "later" },
    later: "Thank you! Please bring the candles in the morning.", why: { sunday: "The chapel needs its candles: welcome him!", guests: "The brothers ordered the candles, so they expect him.", night: "It's the Great Silence. Candles can wait for morning." } },
  { id: "heater", emoji: "🔧", kind: "man", vip: true, line: "The heater is broken, and it's freezing! I'm the repairman. Hurry!", answers: { night: "in" },
    later: "", why: { night: "The brothers asked for the repairman: the heater is broken." } },
  { id: "peddler", emoji: "🏺", kind: "man", line: "Buy my pots! Very good pots, very cheap!", answers: { sunday: "later", guests: "later", night: "later" },
    later: "No, thank you! Please try the village market.", why: { sunday: "He's selling pots, not coming to pray.", guests: "He has no appointment.", night: "It's the middle of the night!" } },
  { id: "goat", emoji: "🐐", kind: "goat", line: "Meh-eh-eh! Meh-eh-eh!", answers: { sunday: "later", guests: "later", night: "later" },
    later: "Oh dear, a goat! Let's walk you back to your farmer.", why: { sunday: "A goat in the chapel would eat the flowers!", guests: "A goat in the chapel would eat the flowers!", night: "A goat in the dark would bump into everything!" } },
  { id: "tourist", emoji: "🗺️", kind: "woman", line: "Excuse me! Where is the train station?", answers: { sunday: "later", guests: "later", night: "later" },
    later: "Down the hill, past the bakery. Have a good trip!", why: { sunday: "She only wants directions.", guests: "She only wants directions.", night: "She only wants directions." } },
  { id: "bell", emoji: "🔔", kind: "child", line: "Can I ring your big bell? Ding dong, ding dong!", answers: { sunday: "later", guests: "later", night: "later" },
    later: "Not today! The bell rings at prayer time. Come and listen!", why: { sunday: "The bell is rung by the brothers.", guests: "The bell is rung by the brothers.", night: "The big bell would wake everyone!" } },
  { id: "room", emoji: "🎒", kind: "man", line: "Hi! Do you have a free room for tonight?", answers: { sunday: "later", guests: "later", night: "later" },
    later: "The guesthouse by the road has a bed for you. Peace!", why: { sunday: "Travelers sleep at the guesthouse.", guests: "Travelers sleep at the guesthouse.", night: "Travelers sleep at the guesthouse." } },
];
export const visitorById = (id) => VISITORS.find((v) => v.id === id);
