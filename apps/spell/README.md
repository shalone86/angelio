# Spelling 🐝

Free grade 1 to 3 spelling, with everything read aloud. Part of [Angelio](https://angelio.org).
Play at **[angelio.org/spell/](https://angelio.org/spell/)**. The patterns come in the same order as
[Read Aloud](https://angelio.org/read/): first a child learns to read a pattern, then to spell it.

| | Level 1 | Level 2 |
|---|---|---|
| 1st Grade | Short a · i · o · u · e, **ck ll ss ff**, **sh ch th** | Blends (start, end), **-s / -es**, **-ing / -ed** |
| 2nd Grade | **Magic e**, ai/ay, ee/ea, oa/ow | igh and y, y says ee, bossy r, oi/oy ou/ow, tch dge |
| 3rd Grade | Endings: **drop the e**, **double it**, **y → i**, **f → ves** | Silent kn wr mb, -tion -ture -le, **ABC order** |
| ✏️ My Words | This week's list from school, typed on the grown-ups page | |

Each level: a "How it works" card, then 8 questions, easy to hard:

1. **Pick the spelling** of three (rain · rayn · rane). The wrong ones are real kid mistakes, never a real word that
   sounds the same (no "sale" for a sail).
2. **What's missing?** tr _ n → ai or ay (1st grade adds `🔊` buttons so kids can preview Mom/Dad phonetic sounds).
3. **Spell it** from letter tiles (1st & 2nd grade, with phonetic `🔊` preview buttons in 1st grade) or a full 26-letter QWERTY keyboard (3rd grade, or all grades via Grown-ups). Physical keyboard typing works everywhere, and right letters stay after a first miss.

Not yet: guide words, homophones (their/there), sentences read aloud for each word, recorded word lists.

## Code

- `public/js/spelling.js`: the levels, words and question maker (no DOM; tested in `test/spelling.test.js`).
  A word's tricky part is in brackets, `r(ai)n`; `alt` lists the other ways to spell it, which make the wrong choices.
- `public/js/app.js`: screens and interactions. Shared kit in `public/js/kit/` (master copy: `kit/` at the top).

```bash
npm test
npm run deploy -- spell   # from the top of the repo
```

## License

MIT, see [LICENSE](LICENSE). The name "Angelio" and its logo are not part of the license.
