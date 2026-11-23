# Monastery Porter

An Angelio game (angelio.org/porter/), **a demo** for now: keep the gate of a monastery, like St. Benedict's porter
(Rule, chapter 66: he answers every knock "Thanks be to God"). His idea is in ROADMAP.md ("Monastery Porter"). The gate is
voxel (`public/js/gate.js`, three.js like Candle Rack and Mass Usher): a wall with a gate and an automatic wooden door,
the path outside where visitors line up, the courtyard and a chapel inside, seen from above and behind you. His models come
from angelio.org; what he still has to make is on the Drawings page, checklists "Monastery Porter: people" and "Monastery Porter:
the gate". Until then his boy and girl stand in for the visitors (a robe painted on for the porter and monks, a goat
of boxes) and the gate is built from plain blocks. `vox.js`, `looks.js` and three.js are copies kept identical by
`test/copies.test.js`.

- **One quick move per person.** A visitor walks up, knocks and says who they are (read aloud, with a picture over their
  head). The door opens and closes by itself as people pass through — no door button to manage, and no "hold to bow":
  - **👋 Welcome** (swipe up, tap the gate, or tap the **Welcome** button): welcomes people who belong into the courtyard
    and chapel. Important guests (the bishop, the visiting abbot, the mayor, Mother Abbess, "Glory to Jesus Christ!" →
    "Glory forever!") earn bonus points and give their special greeting with one quick welcome.
  - **🙋 Send away** (swipe sideways, or tap the **Send away** button): kindly pushes the others gently off the path
    (animals, peddlers, jugglers, tourists — never "go away").
  - Nothing waits for the voice: the next visitor's line cuts the last one off, and a fast player just keeps going.
    Keys: W / ↑ / Space / Enter welcome, S / ← / → send away, B bell.
- **Brothers walking out (the timing part).** Brothers leave through the gate to go to the garden, the bakery or the bell
  tower (`OUTGOING` in `visitors.js`), more often as each stage or minute ramps up. While a brother is crossing the gate,
  wait for him to get through before welcoming the next visitor in (you can still send away people who don't belong).
  Welcoming someone in too soon makes them bump elbows — a funny little stumble that breaks your combo without costing
  points. Rhythm: answer, answer, wait for the brother, answer.
- **Every mistake is obvious** (screen only, the rules don't change): a wrong answer shakes the button that would have been
  right (gold ring); someone who doesn't belong let in gets a red door and a big ✗; an outgoing brother lights up an
  amber cue and puts a warm ring around **Welcome** while crossing.
- Right answers in a row build a combo (×2 after 5, up to ×5); a wrong answer costs 8 and breaks it, and the gentle reason is
  read out ("A goat in the chapel would eat the flowers!"). Only wrong answers count as mistakes (no mistakes: a giant sticker).
  A visitor made to wait too long gives up; important guests and the repairman are in a hurry (visitors who belong pause
  their patience timer while a brother is crossing the gate).
- Stages, each opening with two stars on the one before: **Sunday Mass** (the people who belong and special guests come in;
  peddlers, jugglers, a pizza delivery, a clown, ten kinds of animals and so on are sent on), **Guest Day** (only the
  expected and special guests come in), **The Great Silence** (only the brothers who live there, the repairman, people in
  trouble, and a late bishop come in), and the endless **Feast Day Crowd** (opens with two stars on Sunday Mass): every
  minute the gaps between visitors and outgoing brothers shrink (`perMinute` / `outPerMinute`) and walking speeds ramp up,
  and the day ends when six are waiting at the gate (a 🚪 meter shows it). Someone in trouble always comes in.
- **Porters** (`public/js/porters.js`, picked on the home page, saved on the device): Brother Porter, then three monks and three
  nuns, each good at something and not at something else. **Brother André** (two stars on Sunday Mass): the first mistake each
  minute is forgiven, but combos grow slower. **Old Brother Porter** (two stars on Guest Day): visitors wait much longer for
  him (`patience: 1.4`), though he is slow to call the next visitor (`stepGap`). **Brother with the Dog** (two stars on the
  Great Silence): his dog chases animals off by itself (a few points, no combo), then barks and Send away waits 1.5 s.
  **Sister Portress** (three stars on Sunday Mass): visitors who belong glow warmly, but everyone is in more of a hurry.
  **Sister with the Bell** (three stars on Guest Day): a 🔔 button, once a round, gives everyone waiting their patience back and
  holds off new visitors and outgoing brothers for 5 s. **Respected Sister** (three stars on the Great Silence): everyone steps
  politely aside for her so nobody bumps at the gate (`noBump`), though each answer earns a little less. Models:
  `porter-andre-walk`… on the Drawings page ("Monastery Porter: the porters").
- **People walk around each other** (`public/js/steer.js`, a copy of `hub/public/js/steer.js`, tested in `hub/test/steer.test.js`):
  each person heads for their goal, steers around anyone in front (keeping right when head-on), slows if someone is right in the
  way, and is never stuck (after a moment of no progress they ignore the others). Visitors line up on the left of the path;
  people sent away get nudged off to the left or right; brothers walk out through the gate using the same steering so two-way
  traffic flows smoothly. Mass Usher and Candle Rack use the same file for their people.
- His animals (`goat-walk`, `sheep-walk`, `cow`, `pig`, `dog`, `cat`, `chicken`, `duck`, `rabbit`, `horse`, each `-idle` and
  `-walk`) are on the Drawings page ("Monastery Porter: animals"); any visitor can also have a character of their own,
  named after them (`bishop-walk`; "Monastery Porter: special visitors"). More animals: add one to `ANIMALS` and `VISITORS` in
  `public/js/visitors.js` and a stand-in to `CRITTERS` in `gate.js`.
- Rules: `public/js/porter.js` (pure, tested in `test/porter.test.js` with pretend porters, some of whom slip, that tune the
  stars); who comes: `public/js/visitors.js` (each visitor's words, answer per stage, greeting, kind reply and hint); stages:
  `public/js/stages.js`.

Next (his notes): weather, more stages (Closed hours, Pascha), his porter, a real gatehouse and door.
