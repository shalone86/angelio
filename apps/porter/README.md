# Monastery Porter

An Angelio game (angelio.org/porter/), **a demo** for now: keep the door of a monastery, like St. Benedict's porter
(Rule, chapter 66: he answers every knock "Thanks be to God"). His idea is in ROADMAP.md ("Monastery Porter"). The gate is
voxel (`public/js/gate.js`, three.js like Candle Rack and Mass Usher): a wall with a gate and a wooden door, the path
outside where visitors line up, the courtyard and a chapel inside, seen from above and behind you. His models come from
angelio.org; what he still has to make is on the Drawings page, checklists "Monastery Porter: people" and "Monastery Porter:
the gate". Until then his boy and girl stand in for the visitors (a robe painted on for the porter and Brother Francis, a goat
of boxes) and the gate is built from plain blocks. `vox.js`, `looks.js` and three.js are copies kept identical by
`test/copies.test.js`.

- A visitor walks up, knocks and says who they are (read aloud, with a picture over their head). Tap **👋 Welcome** (the
  door opens and they walk in to the chapel) or **🙋 Come back later** (kindly sent on their way: never "go away").
- Each stage has its own rule: **Sunday Mass** (welcome almost everyone; the goat, the peddler, the tourist, the child who
  wants to ring the bell and the traveler asking for a room are sent on), **Guest Day** (only people the brothers expect:
  an appointment, a delivery, someone who lives here), **The Great Silence** (only the brothers who live here, the repairman
  for the broken heater and people in trouble). Someone in trouble (hurt, lost and cold) always comes in. Each opens with
  two stars on the one before.
- The visitor at the door waits a while (the bar over them; an important guest, the visiting abbot or the repairman, is
  in a hurry) and goes home if you take too long. A right answer scores 10 (welcome) or 8 (sent on) and more if quick; a
  wrong one costs 8 and the gentle reason is read out ("A goat in the chapel would eat the flowers!"). Only wrong answers
  count as mistakes (no mistakes: a giant sticker).
- Rules: `public/js/porter.js` (pure, tested in `test/porter.test.js` with pretend porters that tune the stars); who comes:
  `public/js/visitors.js` (each visitor's words, answer per stage, kind reply and hint); stages: `public/js/stages.js`.

Next (his notes): the door as the tension (a draft blows in while it's open, weather), monks going out through the gate,
regulars with their own greeting, tapping a visitor to greet them first, more stages (Closed hours, Pascha), his porter, a
real gatehouse and door.
