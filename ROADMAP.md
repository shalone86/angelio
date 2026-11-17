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
| Letter Lane | /letters/ | PreK–K | shalone86/letterlane |
| Read Aloud | /read/ | 1–3 | shalone86/readaloud |
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
- With var `REQUIRE_CODE = "true"`, an app's Worker allows `FREE_PER_DAY` (20) free checks a day per
  network, then needs a code with checks left this month. `SPEECH_DAILY_CAP` (500) and
  `TTS_DAILY_CAP` (3000, live in every game now) are site-wide safety caps per day.
- Articulate: **on since Nov 13, 2026** (`REQUIRE_CODE` in articulation's wrangler.jsonc vars; set it
  to "false" and deploy to open speech checks again).

Phase 2 (when sharing publicly): payments (Stripe or Lemon Squeezy) that create a code automatically
and email it, plus terms and a refund policy.

## NOW: the Angelio Studio (decided Nov 16, 2026; before any other new features)

Why: with the kids videos and songs moving in, the owner must be able to see, add and edit everything
without AI or code (like Ghost was). Decisions so far:
- **Content lives in GitHub** as plain data files; every Studio save is a commit (history, undo), and
  Cloudflare republishes. Videos, pictures and downloads live in R2 (bucket `watch-media`).
- **People:** the owner first; can add people as full admins or limited to some sections (Cloudflare
  Access for sign-in, roles kept with the content). Visitors and kids still have no accounts and no data.
- **One repo** for all of Angelio (apps, modules, kit, content, studio); the per-app repos become archives.
- **Kids site retires:** kids.methodiusmedia.com was never promoted; Watch & Sing (shalone86/watch,
  preview at watch.ariyandhamma.workers.dev) replaces it. The Methodius hub points to Angelio
  (maybe two tabs: Learn and Watch).
- **Three layers:** the kit (voice, stickers, stars, offline), modules (game templates: video lessons +
  quiz, songs & albums, phonics, number blocks, sentences, Sticker World…, each declaring its content's
  shape) and content (everything she writes). An app = modules + content + name + icon + address.
- **Studio v1:** library of everything; editors with a live preview using the real game code; uploads
  (thumbnail from a frame, MP3 made from a song's video); quiz builder (choice, word tiles, order, match);
  drafts and publish; history and undo; trash; export everything.

Progress, Nov 17, 2026: **Studio v1 for Watch & Sing is live** at angelio.org/studio (admin key). Her choices: saves go live
at once (R2 `watch-media`: content/watch/library.json; the watch Worker serves it as data/library.json), every save keeps
the old version (content/watch/history/, History → Look / Bring back), nightly + "Back up now" copy to GitHub once a
GITHUB_TOKEN secret is on the angelio Worker; sign-in is her admin key (helpers with Cloudflare Access later). Editors:
lessons (video and picture uploads, picture from a video frame, courses, quiz builder: pick/true-false/blank/order/match,
"checked, ready for kids", words), songs (credits, downloads with uploads, albums, lead sheet link), courses and albums
(order). Hide instead of delete; live preview with the real Watch & Sing (?studio). Rules in hub/public/js/watch-content.js
(nothing broken can be saved). The Ghost import is retired. Next: MP3 made from a song's video in the Studio, drafts,
trash, export, then the Studio for the games' content.
Progress: **one repo done** (Nov 16, 2026: hub/, apps/*, template/, with every app's history; shared install,
`npm test` for everything, safe deploy, kit check). Next: the kit shared for real (no copies), and Watch & Sing's
content as the master copy (no longer imported from Ghost).

Order: (1) one repo + all content as validated data files (Watch & Sing first) → (2) Studio v1 for
Watch & Sing → (3) Studio for every game's content → (4) "New app" wizard → (5) open-source kit
(the H5P idea for kids: learning games, video courses and song albums with a visual studio, run on Cloudflare).
After (2): sdcourses' Lesson Studio gets "Send to Angelio" (upload the video and thumbnail, save the lesson
and its quiz through the Studio; true/false → two choices, fill-ins get two "wrong words" for word tiles).

## Recorded sounds (Nov 2026)

The robot voice can't say lone letter sounds well ("tuh" comes out "too", "ih" like "eh"). A grown-up records each
sound once at **angelio.org/admin/sounds** (needs the admin key); recordings are trimmed and evened out in the
browser, stored in the shared KV store (`clip:<sound>`, index `clips:index`), and Letter Lane and Read Aloud play them
wherever a sound is marked `{{tuh}}` in spoken text (kit `tts.js` → `setClips`). Unrecorded sounds still use the voice.

## Next apps

- ~~**Phonics & reading, PreK–K**~~: live as **Letter Lane** (angelio.org/letters/). Nov 17, 2026: follows the Hooked on
  Phonics outline, two levels per grade: PreK all 26 letters, big/little both ways, first sounds, rhymes, beats; K short
  vowels one at a time, blend/build, -ck, sh ch th, compound words, adding -s. Next: sight words, letter tracing.
- ~~**Reading, grades 1–3**~~: live as **Read Aloud** (angelio.org/read/). Nov 17, 2026: 1st blends (start/end), two-part
  words, -ing/-er/-ed/-es/-ly; 2nd long vowels (magic e, teams, y), bossy r, oi/ou, soft c/g, silent letters, tch/dge;
  3rd big words, oo/aw, prefixes, -tion/-ture/-le, -ful/-less/-ness. 8 questions a level incl. spell-it and
  pick-the-sentence. Both apps share `reading.js`/`phonics.js` (`grades.js` picks the grades). Next: **say it out loud**
  checks on the sentences (Articulate's recorder; family codes), sight words, short stories with comprehension questions.
- ~~**Lead sheet maker**~~: live Nov 17, 2026 at angelio.org/admin/leadsheet.html (admin key). Her pick: the vamp card's
  content in the color-chords look (each section's chord loop as colored tiles, colored chord tags over the words,
  chorus boxed, guitar chord boxes, melody staff per section). Melody from a Logic MIDI file or played in on a MIDI
  keyboard (Chrome/Edge); key −/+ and Print on angelio.org/leadsheet/?id=<song>; Watch & Sing song pages link it (and
  hide the old PDF). Code: hub/public/js/leadsheet.js, abcjs 6.7.2 (MIT) in hub/public/vendor. Next ideas: melodies
  pulled from the vocals (less reliable than MIDI), ukulele boxes, sing-along that follows the melody.
- **Spelling** (1–3, owner asked Nov 17, 2026; later): hear a word, build it from letter tiles, then the
  spelling patterns in the same order as Read Aloud (short vowels, -ck, blends, magic e, vowel teams, -ed/-ing
  endings, plurals); weekly word lists a parent can type in. Coming-soon card is on the hub.
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

## Catechism with the game styles we already have (owner's idea, Nov 2026)

Each idea reuses a piece that already works, so they're cheaper to build than new game types. A natural
anchor: **First Reconciliation and First Communion prep (grade 2)**, plus the Montessori-based
**Catechesis of the Good Shepherd**, which fits the Montessori colors and materials already in Grammar!.

| Game style we have | Catechism version |
|---|---|
| Sentence order (Grammar!) | **Prayer Builder**: put the lines of the Sign of the Cross, Glory Be, Our Father, Hail Mary, Apostles' Creed in order, read aloud |
| Fill the blank (Grammar!) | **Finish the prayer** line by line; later, short Bible verses |
| Sort into groups (Montessori classify) | Seven sacraments (initiation, healing, service), works of mercy (corporal or spiritual), virtues (theological or cardinal), commandments (love God or love neighbor) |
| Colors and symbols (Montessori colors) | **Liturgical colors**: purple for Advent and Lent, white for Christmas and Easter, green for Ordinary Time, red for Pentecost and martyrs; "what color will Father wear?" |
| Drag-and-drop timeline (planned for history) | The **Church year** wheel; the **parts of the Mass** in order; salvation history (Creation, Noah, Abraham, Moses, David, Jesus, Pentecost) |
| Bead bars and counting (Doubles!) | **Rosary**: count a decade (10 Hail Marys), 5 decades, the 4 sets of mysteries and their days |
| Speech checks (Articulate) | **Say the prayer** and see each word light up; memorize a verse. A good reason for family codes |
| Sticker World playsets | **Build the sanctuary**: place the altar, tabernacle, ambo, crucifix, candles and font, each named and explained (like the atrium model in Good Shepherd) |
| Q and A choice (Sense modes) | Simple catechism questions ("Who made you? God made me.") and **saints and their symbols** (St. Peter's keys, St. Francis's animals, St. Patrick's shamrock) |

Content needs care: follow the Catechism and a children's catechism (for example the Baltimore No. 1
questions, public domain), and ideally have a priest or catechist look it over.

## Civics (owner's idea, Nov 2026): "how our government works", nonpartisan

- **Three branches** (a tree with three branches): sort jobs into legislative (makes laws), executive
  (carries them out), judicial (decides what laws mean); checks and balances as a see-saw.
- **How a bill becomes a law**: an idea → a bill → the House and the Senate vote → the President signs or
  vetoes → it becomes a law. Drag the steps along a path, like a board game.
- **Voting**: a class election (vote for the class pet's name), secret ballots, counting with tally
  marks (a math tie-in), majority wins; who can vote, how to register, why every vote counts.
- **Forms of government**: monarchy, democracy (direct), republic (representatives), dictatorship;
  "who decides?" scenarios to match.
- **History of democracy** (on the history timeline): Athens, the Roman Republic, Magna Carta, the
  Mayflower Compact, the Declaration of Independence, the Constitution and Bill of Rights, women's
  suffrage, the Voting Rights Act.
- **Local government**: mayor, city council, school board, fire and police; "who do we call?" (a
  pothole, a new park); a Sticker World **"Build your town"** playset.
- **Symbols and rights**: the flag, the Capitol, the White House, the Liberty Bell; rights and
  responsibilities. A natural tie-in with Catholic social teaching: the common good, the dignity of
  every person, and subsidiarity (solve things at the most local level first).

## Platform

- **Catholic words and themes** in questions across all apps (counting rosary beads, saints' names in grammar sentences, feast days in the calendar questions). Plan: keep each app's question banks in data files so a "Catholic" set can be swapped in.
- **Pro voice access token**: all apps share angelio.org, so one token in localStorage (e.g. `angelio:token`) can unlock the Pro voice everywhere; each app's Worker checks it before calling Workers AI, and the device voice is the free default.
- **Donations**: a donate link on the hub (and a small "Support Angelio" link on each app's grown-ups page).
- **Shared look**: every app built from shalone86/app-template (lesson cards, varied prompts, voice with fallback, sounds, motion, offline).
- **Back to the hub**: a small "Angelio" link in each app's top bar.
- **Accounts stay optional** (or never): progress lives on the device; an export/import code for moving between devices.
