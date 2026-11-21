# Candle Rack

An Angelio game (angelio.org/candles/): the time before Mass or the Divine Liturgy, getting the church ready. Tap a
candle to light it, tap one that flickers "just in time", swipe along a row to light several, keep the sanctuary lamp
burning (tap it when it's low), and light a candle in the color each person asks for. The door creaks before a draft
blows out a row. When the clock reaches Mass, the bells ring and the priest walks up the aisle.

Easy to play, hard to master (the Angelio ROADMAP.md, "Games for Angelio"): anyone can light candles; a high score
takes focus (the streak multiplies the points, just-in-time and chains are worth more, more candles burn faster as
Mass gets closer). Two stars for any child who keeps lighting, three take real focus, and the best score is the
open-ended chase. The levels are tuned with pretend players in `test/game.test.js`.

- `public/js/game.js`: the rules (pure, tested): candles, the lamp, drafts, people, scoring, difficulty.
- `public/js/season.js`: the Church year from the date (tested): the season's color goes on the altar cloth, the
  tabernacle veil, and every part of his models painted pink (#FF77A8), like the priest's chasuble.
- `public/js/church.js`: the church on screen (three.js r128, `public/vendor/`, pinned). His MagicaVoxel models come
  from angelio.org (`/api/art`, the Studio's Drawings page) and are used as soon as they exist; plain stand-in boxes
  hold the place of anything not made yet (the room, altar, racks, candles, people). The checklist of pieces is on the
  Drawings page.
- `public/js/vox.js`: a copy of `hub/public/js/vox.js` (a test keeps them the same).
- `public/js/app.js`: the screens: home, "How it works", the round, the finish.

Still to come (see ROADMAP.md): pick-one-of-three upgrades between rounds (longer wicks, glass covers, an altar
server, a bigger rack), the Byzantine church to choose, Church-year events (the Advent wreath, Candlemas, the Easter
Vigil), and "today's game" (the same round for everyone that day).
