# Mass Usher

An Angelio game (angelio.org/usher/), **a demo** for now: seat the families arriving before Mass. The owner's notes are in
ROADMAP.md ("Mass Usher"). The church is voxel (`public/js/nave.js`, three.js like Candle Rack): the nave seen from the
back, seven rows of pews either side of the aisle. His models come from angelio.org; what he still has to make is on the
Drawings page, checklists "Mass Usher: people" and "Mass Usher: the church". Until then his boy and girl stand in for
everyone (grown-ups a little bigger), his altar server for the usher, and plain blocks for the church. Everyone gets
their own looks (`looks.js`, a copy of Candle Rack's); a family wears its color, with a patch of it on their backs so you
can tell families apart from behind; regulars wear quiet colors. `vox.js`, `looks.js` and three.js are copies kept
identical by `test/copies.test.js`.

- Tap a pew: you walk the family at the front of the line there. Swipe along the pew: the people sitting there scoot
  toward the wall or the aisle (someone with a 📌 likes their spot and won't move). Tap the pew again: as many of the
  family as fit sit down, in the longest run of empty seats. Anyone left over: tap another pew. Then back to the doors.
- Points: 10 a person seated together; a split family scores less, and less again the farther apart its parts are
  (rows apart, or across the aisle). Seated within 8 seconds of reaching the front of the line: +3 a person.
- Families come faster and bigger as Mass gets closer (two minutes). Stars are tuned with pretend ushers in
  `test/usher.test.js`.
- Rules: `public/js/usher.js` (pure, tested); screen: `public/js/app.js`.

Next (his notes): seating habits beyond "won't scoot" (edge sitters, middle sitters), late arrivals, packed Christmas
and Easter Masses, and his own usher, sitting people and church pieces.
