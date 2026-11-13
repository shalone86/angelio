# Angelio roadmap

Free learning games for kids at **angelio.org**, made by a Catholic family. Free with the device's
voice; donations welcome; a paid Pro voice (natural Cloudflare voice) with an access token later.

## Live

| App | Path | Grades | Repo |
|---|---|---|---|
| Snap & Split | /snap/ | PreK | shalone86/snap-split |
| Regroup! | /regroup/ | 1–3 | shalone86/regroup |
| Doubles | /doubles/ | 1–3 | not on GitHub yet |
| Grammar! | /grammar/ | 1–3 | not on GitHub yet |
| Articulate | /articulate/ (and articulate.shalonely.com, kept on purpose: a friend uses it) | All ages | shalone86/articulation |

## Backburner (remind the owner after each new thing we finish)

**Paid speech checks.** Reading aloud stays free (device voice). "Say it out loud" checking costs
real money (Whisper on Workers AI), so it needs a family code.

Phase 1 (done, free codes, no payments):
- Codes live in the shared KV store `angelio-codes` (binding `CODES`); logic in `worker/codes.js`
  (same file in app-template and every app). The owner makes codes at angelio.org/admin/
  (needs the `ADMIN_KEY` secret on the angelio Worker).
- Parents enter a code once on the hub (localStorage `angelio:code`); every app on angelio.org sends
  it as header `x-angelio-code`. Articulate's Settings has its own box for articulate.shalonely.com.
- With var `REQUIRE_CODE = "true"`, an app's Worker allows `FREE_PER_DAY` (3) free checks a day per
  network, then needs a code with checks left this month. `SPEECH_DAILY_CAP` (500) and
  `TTS_DAILY_CAP` (3000, live in every game now) are site-wide safety caps per day.
- Articulate: code support is in the repo but not deployed/on yet. Planned for Friday: owner makes
  codes, adds `"REQUIRE_CODE": "true"` to articulation's vars, deploys.

Phase 2 (when sharing publicly): payments (Stripe or Lemon Squeezy) that create a code automatically
and email it, plus terms and a refund policy.

## Next apps

- **Phonics & reading** (PreK–2): sounds, blending, Elkonin boxes, letter tiles, decodable sentences, read-aloud checked with voice recordings (reuse articulation's recorder and Whisper scoring; whole words work better than single sounds for young voices).
- **Writing skills** (1–4): build and expand sentences ("The dog ran." → "The big dog ran fast."), fix run-ons, order sentences into a paragraph, topic sentences.
- ~~**Fractions**~~: live as **Fraction Feast** (angelio.org/fractions/). Next ideas: animate equivalent fractions (cut each half into 2 → 4 quarters), fractions greater than 1, grade 4.
- **Multiplication & division beyond Doubles** (3–4): arrays → area model, dealing into groups, remainders.
- **Measurement** (K–3, from the owner's list): drag a ruler to measure (start at 0, not at the end!), inches and
  centimeters, longer/shorter; liquids: pour between cups and jugs to compare and measure capacity (cups,
  quarts, liters); weight on a balance scale; reading clocks could live here too.
- **Maps & grids** (K–3): left/right/above/below, follow directions on a grid ("3 steps right, 2 up"), find
  things by row and column (A3, B5), then simple coordinates; read a map with a key and compass rose (N, S, E, W).
  Pairs well with the history apps' maps later.
- **Catholic history**: saints, the early Church, councils and great moments on drag-and-drop timelines; maps of missions and pilgrimages.
- **World history**: build timelines and maps yourself (drag events, place civilizations), memory games.
- **U.S. history**: interactive maps and timelines from the first peoples to today.
- Possibly on the hub later: **Hablar** (Spanish, hablar.shalonely.com).
- **Articulate keeps both addresses**: articulate.shalonely.com must keep working (no redirect). Don't set HOME_URL for it.

## Ideas from the owner's workbooks (Nov 2026)

Topics only: we write all our own sentences, pictures and wording.

**Grammar! (existing app): new levels**
- **Proofreading marks** (grades 2–3), a good "editor" level: tap a mistake, choose the real mark, and see it
  drawn on the sentence: ≡ capitalize, ⊙ add a period, ? add a question mark, ∧ add a word, the loop to take
  out, a circle for spelling, ¶ indent, and quotation marks. A final "fix this paragraph" round uses them all.
- ~~**Usage pairs**~~: done (Nov 2026): A or An, I/Me & We/Us (grade 1); Is/Are & Was/Were, Has/Have/Had & Do/Does,
  Sees/Runs/Gives & Saw/Ran/Gave (grade 2). Next up: **proofreading marks**.
- **Verbs**: helping verbs, verbs that don't show action (is, am, are, was), adding -ed/-ing with spelling changes
  (hop → hopped, make → making), irregular verbs (already partly there).
- **Sentences**: naming part and action part (subject and predicate), kinds of sentences (telling, asking,
  exclaiming, commanding), joining two sentences with *and*/*but*, adding describing words, beginning
  sentences in different ways, writing clear sentences.
- **Mechanics**: initials, titles of respect (Mr., Mrs., Dr., Fr., Sr.), names of places, days, months and
  holidays (with feast days: All Saints' Day, Christmas, Easter), titles of books and songs, commas in place
  names and dates, apostrophes.
- **Words** (maybe its own "Word Workshop" app): rhyming words, synonyms and antonyms, homographs, homophones
  (Articulate already has a homophone list), troublesome words (to/too/two, their/there/they're), compound
  words, prefixes and suffixes.
- **Research skills**: ABC order (to the 1st, 2nd letter), dictionary guide words, parts of a book (title page,
  table of contents, glossary), fact or fantasy.

**Writing Skills (planned app): the writing units, in order**
- Grade 1: words → what is a sentence → a sentence about a picture → writing and completing sentences →
  writing a paragraph → writing a letter.
- Grade 2: a sentence about a picture → a personal story → a friendly letter (and addressing an envelope) →
  a paragraph that describes → a story (beginning, middle, end) → a how-to paragraph (first, next, then, last).
- Grade 3: main idea and supporting details, order in a paragraph, personal narrative, a poem, an information
  paragraph, a book report, a persuading paragraph.
- How it could work: a picture scene and a word bank → build the sentence by tapping words → the voice reads it
  back → proofread it with the marks from Grammar!. Natural faith touches: a thank-you letter to a grandparent
  or godparent, a how-to paragraph ("how to set the table for Sunday dinner"), a story about a saint.

**Math (from the math workbook cover)**
- Telling time and metric units → the Measurement app above.
- Problem solving → word problems in Regroup! and Doubles ("12 children came to Mass, then 9 more…"), read aloud,
  with the blocks to model them.

## Platform

- **Catholic words and themes** in questions across all apps (counting rosary beads, saints' names in grammar sentences, feast days in the calendar questions). Plan: keep each app's question banks in data files so a "Catholic" set can be swapped in.
- **Pro voice access token**: all apps share angelio.org, so one token in localStorage (e.g. `angelio:token`) can unlock the Pro voice everywhere; each app's Worker checks it before calling Workers AI, and the device voice is the free default.
- **Donations**: a donate link on the hub (and a small "Support Angelio" link on each app's grown-ups page).
- **Shared look**: every app built from shalone86/app-template (lesson cards, varied prompts, voice with fallback, sounds, motion, offline).
- **Back to the hub**: a small "Angelio" link in each app's top bar.
- **Accounts stay optional** (or never): progress lives on the device; an export/import code for moving between devices.
