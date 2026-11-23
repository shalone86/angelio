# Monastery Porter

An Angelio game (angelio.org/porter/), **a demo** for now: keep the door of a monastery, like St. Benedict's porter
(Rule, chapter 66: he answers every knock "Thanks be to God"). His idea is in ROADMAP.md ("Monastery Porter"). The gate is
voxel (`public/js/gate.js`, three.js like Candle Rack and Mass Usher): a wall with a gate and a wooden door, the path
outside where visitors line up, the courtyard and a chapel inside, seen from above and behind you. His models come from
angelio.org; what he still has to make is on the Drawings page, checklists "Monastery Porter: people" and "Monastery Porter:
the gate". Until then his boy and girl stand in for the visitors (a robe painted on for the porter and Brother Francis, a goat
of boxes) and the gate is built from plain blocks. `vox.js`, `looks.js` and three.js are copies kept identical by
`test/copies.test.js`.

- A visitor walks up, knocks and says who they are (read aloud, with a picture over their head). Three buttons:
  **🚪 Door** opens (or closes) the door: while it's open, whoever is at it walks in by themselves a moment after
  arriving, so a line of people who belong streams in with no taps; but an open door costs points after 2 seconds (a
  draft: the lanterns flicker and "−2 🍃" pops up), and an animal or a special guest who walks in that way is a mistake.
  **👋 Welcome** is a proper greeting for special guests (the bishop, the visiting abbot, the mayor, Mother Abbess,
  "Glory to Jesus Christ!" → "Glory forever!"): the big points. **🙋 Send away** kindly sends the others on their way
  (never "go away"). Nothing waits for the voice: the next visitor's line cuts the last one off, and a fast player just
  keeps going. Keys: space/D door, W welcome, S send away.
- Right answers in a row build a combo (×2 after 5, up to ×5); a wrong answer costs 8 and breaks it, and the gentle reason is
  read out ("A goat in the chapel would eat the flowers!"). Only wrong answers count as mistakes (no mistakes: a giant sticker).
  A visitor made to wait too long gives up; the abbot and the repairman are in a hurry.
- Stages, each opening with two stars on the one before: **Sunday Mass** (the people who belong come in; special guests are
  greeted; peddlers, jugglers, a pizza delivery, a clown, ten kinds of animals and so on are sent on), **Guest Day** (only
  the expected come in), **The Great Silence** (only the brothers who live there, the repairman and people in trouble; a late
  bishop is greeted), and the endless **Feast Day Crowd** (opens with two stars on Sunday Mass): they come faster and
  faster, and the day ends when six are waiting at the gate (a 🚪 meter shows it). Someone in trouble always comes in.
- His animals (`goat-walk`, `sheep-walk`, `cow`, `pig`, `dog`, `cat`, `chicken`, `duck`, `rabbit`, `horse`, each `-idle` and
  `-walk`) are on the Drawings page ("Monastery Porter: animals"); any visitor can also have a character of their own,
  named after them (`bishop-walk`; "Monastery Porter: special visitors"). More animals: add one to `ANIMALS` and `VISITORS` in
  `public/js/visitors.js` and a stand-in to `CRITTERS` in `gate.js`.
- Rules: `public/js/porter.js` (pure, tested in `test/porter.test.js` with pretend porters, some of whom slip, that tune the
  stars); who comes: `public/js/visitors.js` (each visitor's words, answer per stage, greeting, kind reply and hint); stages:
  `public/js/stages.js`.

Next (his notes): weather, monks going out through the gate, more stages (Closed hours, Pascha), his porter, a real gatehouse and
door.
