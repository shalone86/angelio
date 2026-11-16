# Letter Lane 🔤

Free PreK and Kindergarten reading games, with everything read aloud. Part of [Angelio](https://angelio.org).
Play at **[angelio.org/letters/](https://angelio.org/letters/)**.

| | Levels |
|---|---|
| PreK | **Letters** in three small groups (s a t p i n · m d g o c k · e u r h b f l) · **First Sounds** · **Rhyme Time** · **Clap the Beats** |
| Kindergarten | **Big and Little Letters** · **Blend It!** (c-a-t → cat) · **Build It!** (put a word's letters in its sound boxes) · **First Sentences** · **sh, ch, th** |

The Kindergarten phonics levels teach a chunk (sh, ch, th) with a "How it works" card, then the child taps each chunk of
a word to hear it and sounds it out (sh · i · p), finds a word they hear, and reads three-word sentences (tap any word for
help). Grades 1 to 3 continue in [Read Aloud](https://github.com/shalone86/readaloud), which shares `phonics.js`.

Letters are shown in [Andika](https://software.sil.org/andika/), a font made for beginning readers. The voice can't say
perfectly pure letter sounds, so every sound comes with a picture word ("sss, like sun").

## Code

Plain HTML, CSS and ES modules in `public/`, no build step, built on the
[Angelio app template](https://github.com/shalone86/app-template).

- `public/js/reading.js`: letters and sounds, word lists, and the question maker (pure, tested in `test/`)
- `public/js/phonics.js`: the phonics patterns, words in sound chunks, sentences, and their questions (shared with Read Aloud; Letter Lane uses the Kindergarten ones)
- `public/js/lessons.js`: the "How it works" cards
- `public/js/app.js`: screens and interactions

```bash
npm install
npm test
python3 -m http.server -d public 8787   # or: npm run dev
npx wrangler deploy
```

## License

MIT, see [LICENSE](LICENSE). The name "Angelio" and its logo are not part of the license.
