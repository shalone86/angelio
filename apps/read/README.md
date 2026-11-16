# Read Aloud 📖

Free grade 1 to 3 phonics and reading games, with everything read aloud. Part of [Angelio](https://angelio.org).
Play at **[angelio.org/read/](https://angelio.org/read/)**. For PreK and Kindergarten (letters, first sounds, blending),
see [Letter Lane](https://github.com/shalone86/letterlane).

| | Levels |
|---|---|
| 1st Grade | **ck and ing** · **Blends** (fr, st, sl…) · **Magic e** |
| 2nd Grade | **ai, ay, ee, ea** · **oa, ow, igh** · **Bossy r** (ar, or, er, ir, ur) · **oi, oy, ou, ow** · **tch and dge** |
| 3rd Grade | **Syllables** · **Silent letters** (kn, wr, mb) · **Endings** (-tion, -ture, -le) |

Words are broken into their sound chunks, the way phonics programs teach: a "How it works" card says how the chunk
sounds ("igh says eye, like night"), then the child

1. taps each chunk of a word to hear it, sounds it out (n · igh · t), and finds its picture;
2. hears a word and finds it among look-alike words;
3. reads a sentence (tap any word for help) and finds the picture that matches. Sentences grow with the grades:
   4 to 7 words in 1st grade, 7 to 11 in 2nd, and two sentences in 3rd.

Next: a "say it out loud" check for the sentences, reusing Articulate's listener (needs a family code, see the hub's
ROADMAP.md).

## Code

Plain HTML, CSS and ES modules in `public/`, no build step, built on the
[Angelio app template](https://github.com/shalone86/app-template).

- `public/js/phonics.js`: the phonics patterns, words in sound chunks, sentences, and their questions (shared with
  Letter Lane, which uses the Kindergarten ones; tested in `test/`)
- `public/js/reading.js`: grades, levels and the question maker
- `public/js/lessons.js`: the "How it works" cards
- `public/js/app.js`: screens and interactions

```bash
npm install
npm test
npx wrangler deploy
```

## License

MIT, see [LICENSE](LICENSE). The name "Angelio" and its logo are not part of the license.
