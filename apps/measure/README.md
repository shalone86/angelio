# Measurement, Time & Money

Free **K–5** measurement, time and money practice, part of [Angelio](https://angelio.org/math/). 23 levels, everything read aloud, works offline, no accounts.

**What it does**
- 🎬 **Animated walkthroughs, one for every kind of question** (ruler, clock, coins, pitcher, line plot, scales, graphs…). A 👆 finger taps and the art moves, step by step, with a spoken caption. It loops like a GIF. Shown before practice, on `#/watch/:id`, and as a dismissible "Watch how" card the first time a new kind of question appears.
- ✏️ **Scratchpad** (grades 2–5, questions with numbers): write your math over the question with a finger or pen. Cleared on the next question, never saved. It lives in the shared kit (`kit/scratch.js`).
- 🫗 **Pouring**: no goal line to copy; the amount is said in words, and the red Goal line shows only as a hint (💡 or a wrong Check).

**What it doesn't do**
- No saving of scribbles, no accounts, no timers.

```sh
npm test                  # all tests
npm run deploy -- measure # deploy the Worker (from the repo root)
```

Code map: `measure.js` (levels, questions) · `measure-svg.js` (all drawings) · `scenes.js` (the walkthroughs, pure) · `watch.js` (the player) · `app.js` (screens).
