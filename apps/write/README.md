# Writing Skills 📝

Free grade 1 to 4 writing skills, with everything read aloud. Part of [Angelio](https://angelio.org).
Play at **[angelio.org/write/](https://angelio.org/write/)**.

| | Level 1 | Level 2 |
|---|---|---|
| 1st Grade | Complete sentence?, Build a sentence, Finish the sentence | Add describing words, Picture stories, Parts of a letter |
| 2nd Grade | Stretch the sentence, Combine sentences, Fix run-ons | Beginning/middle/end, How-to order, Friendly letters & envelopes |
| 3rd Grade | Topic sentences, What doesn't belong?, Concluding sentences | Transition words, Fact or opinion?, Order the paragraph |
| 4th Grade | Show, don't tell · Short summaries · Be the editor | |

Each level begins with a short "How it works" card, then 6 questions across four interactive modes:

1. **Build a sentence:** tap word cards in order to build a sentence matching a scene.
2. **Choose & hear:** pick strong sentences, transitions, greetings, summaries, or revisions (tap `🔊` next to any choice to hear it first).
3. **Order it:** snap story parts, how-to steps, letters, envelopes, or paragraph sentences into labeled slots.
4. **Tap what doesn't belong:** read a 4-sentence paragraph and tap the one sentence that wandered off topic.

## Code

- `public/js/writing-data.js`: 21 levels × 8 items (168 handcrafted prompts, passages, letters, and paragraphs).
- `public/js/writing.js`: level lookup, seeded shuffling, and question generator (no DOM; tested in `test/writing.test.js`).
- `public/js/app.js`: screens and interactions. Shared kit in `public/js/kit/` (master copy: `kit/` at the top).

```bash
npm test
npm run deploy -- write   # from the top of the repo
```

## License

MIT, see [LICENSE](LICENSE). The name "Angelio" and its logo are not part of the license.
