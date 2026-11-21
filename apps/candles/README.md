# Candle Rack

An Angelio game (angelio.org/candles/): the time before Mass or the Divine Liturgy, getting the church ready. Tap a
candle to light it, tap one that flickers "just in time", swipe along a row to light several, keep the sanctuary lamp
burning (tap it when it's low). The candles that can be lit glow. People come and kneel in front of a rack, in the way
of the candles behind them, and leave after a while; tap the priest or the altar server and he walks over (down the
aisle, never through a rack) and kindly sends them to a pew. The door creaks before a draft blows out a row. A round is
90 seconds; at Mass the bells ring, every candle still burning counts, and the procession walks up the aisle.

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
