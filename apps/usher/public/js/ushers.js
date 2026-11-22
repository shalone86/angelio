// The ushers you can play (the owner's idea, Nov 2026): each opens with two stars on a church, and each is good at
// something and not at something else. Pure data: usher.js takes the rules part (noScoot, autoScoot, moveStayers),
// nave.js the look and walking speed, app.js the words. Your pick is saved on this device.
export const USHERS = [
  { id: "usher", name: "Usher", icon: "🙂", speed: 1,
    blurb: "Walks families to their pew and asks people to scoot over.", say: "The usher walks families to their pew and asks people to scoot over." },
  { id: "young", name: "Young Usher", icon: "🧒", speed: 1.5, noScoot: true, opensAfter: "sunday",
    blurb: "Walks super fast, but is too shy to ask anyone to scoot.", say: "The young usher walks super fast, but is too shy to ask anyone to scoot over. Find pews with room!" },
  { id: "experienced", name: "Experienced Usher", icon: "👴", speed: 0.7, autoScoot: true, opensAfter: "liturgy",
    blurb: "Gets people to scoot as soon as you get there, but walks slowly.", say: "The experienced usher gets people to scoot over as soon as you get to the pew, but walks slowly." },
  { id: "respected", name: "Respected Usher", icon: "🎖️", speed: 1, moveStayers: true, opensAfter: "christmas",
    blurb: "Everyone listens to them, even people who like their spot.", say: "Everyone listens to the respected usher. Even people who like their spot will scoot over!" },
];
export const usherById = (id) => USHERS.find((u) => u.id === id) ?? USHERS[0];
/** Open when it's the first, or the church it names has at least two stars (`starsOf(stageId)`). */
export const usherOpen = (u, starsOf) => !u.opensAfter || (starsOf(u.opensAfter) ?? 0) >= 2;
