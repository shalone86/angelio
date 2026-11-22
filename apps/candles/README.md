# Candle Rack

An Angelio game (angelio.org/candles/): the time before Mass or the Divine Liturgy, getting the church ready. Tap a
candle to light it, tap one that flickers "just in time", swipe along a row to light several, keep the sanctuary lamp
burning (tap it when it's low). The candles that can be lit glow. People come and kneel in front of a rack to pray, in
the way of the candles behind them, and leave on their own; tap the priest or the altar server and he goes round behind
that rack (never through it) and lights those candles for you. A combo meter (like a fighting game's hit counter) shows
the count, the multiplier and a bar running out. The door creaks before a draft blows out a row. A round is
90 seconds; at Mass the bells ring, every candle still burning counts, and the procession walks up the aisle.

**Stages** (`public/js/stages.js`), each opened by two stars on the one before: Sunday Mass (a Roman church), the Divine
Liturgy (a Byzantine church: an iconostasis whose royal doors open at the end, tapers in sand trays), Christmas Midnight
Mass (busier, gold) and Pascha (it starts dark and brightens as the candles are lit; busiest). From the second stage on
the player carries a **taper** that lights 5–6 candles before it must be lit again at the big candle. Busier feasts bring
more people to pray, up to two at a rack side by side. The Byzantine church uses his `east-…` models where they exist.
The tips of whatever a server holds (the lighter, a candle) glow.

**Adoration at Night** (endless; opens with two stars on Sunday Mass): late at night in the adoration chapel, the
monstrance glowing on the altar, two racks in front and one on each side turned toward it (32 candles), people still come
to pray but nobody helps. No clock to Mass: candles start burning slower than on a Sunday and burn faster and faster all
night (`FASTER` in game.js), more of them for four minutes; the night ends the moment too many are out at once (10 at
first, 45% of those in use later: `outLimit`), a warning three before. A 🕯️ meter under the top bar shows the candles
that are out. Tuned in the tests: a slow little one keeps watch about a minute, a quick tapper two or three. The clock counts how long
you kept watch. **Censer smoke**: a priest's censing pose (his #ccffff censer voxel) puffs incense that rises and fades.

**Where everyone stands** (SPOTS in `public/js/church.js`: where the priest and server wait, the big candle, the lamp,
where everyone ends up at the start of Mass) can be moved on the Studio's Candle Rack page (angelio.org/studio/candles/),
which draws this same church; it's saved online and the game reads it at `/api/candles/layout`.

Easy to play, hard to master (the Angelio ROADMAP.md, "Games for Angelio"): anyone can light candles; a high score
takes focus (lights within two seconds of each other make a combo that multiplies the points, just-in-time and chains are worth more, more candles burn faster as
Mass gets closer). Two stars for any child who keeps lighting, three take real focus, and the best score is the
open-ended chase. The levels are tuned with pretend players in `test/game.test.js`.

- `public/js/game.js`: the rules (pure, tested): candles, the lamp, drafts, people, scoring, difficulty.
- `public/js/season.js`: the Church year from the date (tested): the season's color goes on the altar cloth, the
  tabernacle veil, and every part of his models painted pink (#FF77A8), like the priest's chasuble.
- `public/js/church.js`: the church on screen (three.js r128, `public/vendor/`, pinned). The priest waits by the sacristy;
  the altar server walks behind a rack to light a candle that went out (his `server-light` pose); when the bells ring,
  the cross, two candles and the priest in his chasuble process up the aisle. His MagicaVoxel models come
  from angelio.org (`/api/art`, the Studio's Drawings page) and are used as soon as they exist; plain stand-in boxes
  hold the place of anything not made yet (the room, altar, racks, candles, people). The checklist of pieces is on the
  Drawings page.
- `public/js/vox.js`: a copy of `hub/public/js/vox.js` (a test keeps them the same).
- `public/js/app.js`: the screens: home, "How it works", the round, the finish.

Still to come (see ROADMAP.md): pick-one-of-three upgrades between rounds (longer wicks, glass covers, an altar
server, a bigger rack), the Byzantine church to choose, Church-year events (the Advent wreath, Candlemas, the Easter
Vigil), and "today's game" (the same round for everyone that day).

## Art (his decisions, Nov 2026)

The game is a demo until the rest of the art and the music are in. Then:
- **Random looks** (done, `public/js/looks.js`): what makes a character unique is the model, not its colors. His
  marker colors, used for nothing else: hair **#255359**, eyes **#0066ff** (or #0b346e), skin **#cccc99** (or #fad689),
  random for everyone (grandparents get gray or white hair); shirt **#ffcc99**, dress **#ff9966**, belt **#ff9999**,
  shoes **#ffcccc**, random for the people who come to pray. Only priests' vestments follow the season: the Roman
  chasuble **#ff77a8** (`seasonOf`) and the Byzantine phelonion **#ffcc66** (`byzantineSeasonOf`: no rose; his parish's
  colors, confirmed). Altar servers' robes never change.
- Made: the boy (`child-`) and girl (`child-girl-`) kneel and walk; the Byzantine priest in his cassock and phelonion
  (`east-priest-idle/-walk`, `east-priest-phelonion-idle/-walk`, `east-priest-cense`). Still to make: `man-`, `woman-`,
  `grandparent-` × `kneel`, `walk`; `east-server-candle-walk`, `east-server-candle-idle`.
- Music.
