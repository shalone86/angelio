# Mass Usher

An Angelio game (angelio.org/usher/), **a demo** for now: seat the families arriving before Mass. The owner's notes are in
ROADMAP.md ("Mass Usher"). The church is voxel (`public/js/nave.js`, three.js like Candle Rack): the nave seen from the
back, five rows of pews either side of the aisle. His models come from angelio.org; what he still has to make is on the
Drawings page, checklists "Mass Usher: people" and "Mass Usher: the church". Until then his boy and girl stand in for
everyone (grown-ups a little bigger), his altar server for the usher, and plain blocks for the church. Everyone gets
their own looks (`looks.js`, a copy of Candle Rack's); a family wears its color, with a patch of it on their backs so you
can tell families apart from behind; regulars wear quiet colors. `vox.js`, `looks.js` and three.js are copies kept
identical by `test/copies.test.js`.

- Tap a pew, or the big round button by its wall end (the buttons make a clean tap easy on a phone; they show no
  numbers, since counting the empty seats is the game). You walk the family at the front of the line there and the
  button turns green ("Sit!"). Swipe anywhere: the people in that pew scoot toward the wall or the aisle (a swipe never
  picks another pew; someone with a 📌 likes their spot and won't move). Tap the pew or "Sit!" again: as many of the
  family as fit sit down, in the longest run of empty seats. Anyone left over: tap another pew. Then back to the doors.
  People walk up the aisle and in along the space in front of the seats, never through the pews (and out the same way).
- Stages (`public/js/stages.js`, like Candle Rack's): Sunday Mass, Divine Liturgy (Byzantine church), Christmas
  Midnight Mass, Pascha; each opens with two stars on the one before. Nobody is up front while you seat people; when
  the clock reaches Mass the priest and servers come up the aisle from the doors (Byzantine: the priest comes out of
  the royal doors and censes down the aisle and back). Adoration at Night (endless, opens after Sunday Mass): a dark
  church, the priest kneeling before the monstrance at the center of the altar; people come, pray a while and go
  home (their seats free up), it gets busier (a family every 6 seconds at first, faster and bigger as the night goes on), and the night ends when
  six are waiting at the doors (the 🚪 meter by the line fills up).
- Standing room at the back: five places each side (🧍 buttons, an orange color), 4 points a person instead of 10. When
  every seat and standing place is taken, the round ends right away and Mass (or the Liturgy) begins, time left or not.
- Ushers (`public/js/ushers.js`, picked on the home page, saved on the device): the Usher; the Young Usher (two stars on
  Sunday Mass) walks 1.5× as fast but can't make anyone scoot; the Experienced Usher (two stars on the Divine Liturgy)
  gets people to scoot the most useful way as soon as he reaches the pew (`autoScoot`) but walks at 0.7×; the Respected
  Usher (two stars on Christmas) moves even people with a 📌. Stand-ins until his usher-young / usher-old /
  usher-respected models (Drawings page, "Mass Usher: people").
- The servers' candles glow and the censing priest's incense rises (both from Candle Rack). The Drawings page can
  download the game's pew as a .vox (Mass Usher: the church → Pew) to try his sitting people in it.
- Points: 10 a person seated together; a split family scores less, and less again the farther apart its parts are
  (rows apart, or across the aisle). Seated within 8 seconds of reaching the front of the line: +3 a person.
- Families come faster and bigger as Mass gets closer (two minutes). Each stage has its own stars. Stars are tuned with pretend ushers in
  `test/usher.test.js`.
- Rules: `public/js/usher.js` (pure, tested); screen: `public/js/app.js`.

Next (his notes): seating habits beyond "won't scoot" (edge sitters, middle sitters), late arrivals, and his own usher, sitting people and church pieces.
