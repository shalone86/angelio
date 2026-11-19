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

Nov 18, 2026, a different road to consider first: **speech checks on the device**. Whisper's small models run inside
the browser (WebGPU) on recent phones, tablets and computers: free, private (the voice never leaves the device), and
nothing to pay or keep running, which fits "Angelio is meant to be finished". The model files (about 40–150 MB, pinned)
would be hosted on angelio.org and downloaded once. Plan: try it in Articulate and Read Aloud; keep the Cloudflare check
(free 20 a day) for devices that can't; payments (Gumroad license keys, no webhooks) only if still wanted after that.

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

## The finish line (decided Nov 18, 2026): Angelio is meant to be finished

Goal: a complete package. "If I'm gone, here's Angelio: it's done, go enjoy it." Not a feed that needs feeding.
Every app has a last level; when it's done it's frozen (bug fixes only), and new ideas go to "Maybe someday".

**Done checklist (per app; then mark it "1.0, finished"):**
1. A one-line finish line: "Done means a child can ___, across these grades", and the last level exists.
2. Every level's questions checked by tests.
3. Played start to finish by a real child on a phone, an iPad and a computer; bugs fixed.
4. Every fixed line recorded by Mom or Dad (Lines in angelio.org/admin/sounds) or, later, baked into audio files.
5. Works offline after the first visit.
6. Its content in the Studio's master copy, backed up to GitHub.
7. No dated words (years, prices, current events, "new!", popular characters).
8. The grown-ups page says what it covers and for which ages.
9. Marked "1.0, finished" here.

**What Angelio will be when it's done:**
- Math (PreK–3): Snap & Split, Regroup, Doubles, Fraction Feast. Essentially done.
- Reading (PreK–3): Letter Lane, Read Aloud, Grammar; still to build: Spelling, maybe Writing 1–3 (fenced to grades 1–3).
- Faith: the four pillars below as Watch & Sing lessons with quizzes, plus Prayers, Catechism sorting, and a salvation-history
  timeline (about 20 events, Creation to the Church). Music: open-ended, hers to make as she likes.
- Out (owner's leaning, Nov 18): general history apps (World, U.S., Catholic history as a whole) and Civics. Through 3rd grade
  they aren't core, there's no science either, and they don't have a clean drag-and-drop shape. Salvation history stays (Pillar 1).

**Faith lessons: the four pillars** (the shape of both the Catechism of the Catholic Church / its Compendium and Christ – Our
Pascha; East and West shown side by side where they differ). About 45 lessons, then the lessons are done; saints, popes,
comics and seasons are a welcome "bonus shelf", not required.
1. What we believe (the Creed, ~12): God and Creation; the story of salvation from Adam to Jesus; Jesus' life, death,
   Resurrection and Ascension; the Holy Spirit; the Church; Mary and the saints; heaven.
2. How we celebrate (~10): the seven Sacraments (Confirmation / Chrismation); the Mass / Divine Liturgy; the church and icons;
   the Church year.
3. How we live (~12): the two great commandments; the Ten Commandments; the Beatitudes; works of mercy; virtues; sin,
   sorrow and forgiveness.
4. How we pray (~10): the Our Father line by line; the Sign of the Cross (both ways); Hail Mary, Glory Be; the Jesus Prayer;
   the Rosary; morning and night prayers.
**Where the 63 lessons sit (sorted Nov 18):**
- Pillar 1, believe (11): the Resurrection; angels (What are angels, Cherubim, Seraphim, the order and number, evil
  angels, Michael, Gabriel, Raphael); the Church (Why are there bad people in the Church?, Infallibility, What is the
  Byzantine Catholic Church?).
- Pillar 2, celebrate (27): the Church year (Advent, the Advent wreath, Gaudete, the Jesse tree, nativity scenes, the
  Christmas tree, Epiphany, Ash Wednesday, Lent, Laetare, Passiontide, veiling statues, Palm Sunday, Holy Week, Holy
  Saturday, Pascha, the day of Easter, Easter traditions, Eastertide); church and liturgy (statues and paintings, bowing and
  kneeling, staying home from Mass, the Byzantine rite, what Byzantine means, inside a Byzantine church).
- Pillar 3, live (3): the Golden Rule, penance, ideas for penance.
- Pillar 4, pray (13): an introduction to prayer, the need, the difference it makes, conditions, posture, attention, vocal,
  mental, public and private; the Sign of the Cross (two lessons, East and West); the Stations of the Cross.
- Saints, popes and history (10): St Aidan, St Valentine, St Frances Cabrini, St Gabriel of Our Lady of Sorrows, St
  Vladimir, Blessed Stepinac, the Brothers of the Sacred Heart, Pope Francis, Pope Leo XIV, the conclave. Plus a comic
  (A Legend for Easter). Evergreen note: tell popes as history ("Pope Francis led the Church from 2013…"), never "our pope".

**Gaps (about 32 core lessons left, then the lessons are done):**
- Pillar 1 (~10): God the Father and Creation; the Trinity; the Bible story (also the timeline); Jesus became man (the
  Incarnation); Jesus' life and miracles; the Cross; the Ascension; the Holy Spirit and Pentecost; Mary; heaven and the
  communion of saints.
- Pillar 2 (~8): the seven Sacraments, one each (Baptism; Confirmation / Chrismation; the Eucharist; Confession; Anointing of
  the Sick; Marriage; Holy Orders); the parts of the Mass / Divine Liturgy. The Church year is already complete.
- Pillar 3 (~8): the two great commandments; the Ten Commandments (two or three lessons); the Beatitudes; the works of mercy;
  the virtues; sin, sorrow and forgiveness.
- Pillar 4 (~6): the Our Father, line by line; the Hail Mary; the Glory Be; the Jesus Prayer; the Rosary; morning and night
  prayers. (How to pray is already well covered.)

**Videos: the stopping point** (owner, Nov 18). Most of the 63 videos will be redone (years old, some talking head, clip or
generated art, some robot voice): Pico Parish pixel style throughout, her face in each one (the kids love it), East and West
together, up to date. The old scripts are a head start. The video set is finished when every pillar lesson (~45) and every
church history stop (~25) has its new video and quiz: about 70 in all. Old videos stay up until their new one replaces them;
saints, popes and seasonal extras beyond that are a bonus shelf. Music stays open-ended.

**Church history, East and West, very short** (owner, Nov 18): one walk from Pentecost to today, joined to the salvation
history timeline, so parents have it in one place. Fenced: about 25 stops, a couple per few centuries; each stop is one short
card (and maybe a video) with a saint or pope; a drag-the-stops-in-order game. Draft stops, for her to change:
Pentecost · Peter and Paul in Rome · the martyrs (St Perpetua) · Constantine, the Church set free (313) · the Council of Nicaea and the
Creed (325; St Nicholas, St Athanasius) · the desert fathers (St Anthony) · St Augustine · St Patrick · St Benedict and the monks ·
Hagia Sophia · Pope St Gregory the Great · Sts Cyril and Methodius · St Vladimir and the baptism of Kyiv (988) · East and West
grow apart (1054), and the Eastern Catholic Churches that later returned to union · St Francis and St Dominic · St Thomas Aquinas ·
Our Lady of Guadalupe (1531) · the Council of Trent and the missionaries (St Francis Xavier) · the Union of Brest (1596) · St
Martin de Porres and St Rose of Lima · St Kateri Tekakwitha · St Thérèse · Lourdes and Fátima · martyrs under communism (Blessed
Stepinac and the Greek Catholic martyrs) · the Second Vatican Council · St John Paul II and St Teresa of Calcutta · today: one
Church, East and West, in every country. Keep contested history as gently hedged as the sources are.
Not a separate game: a Watch & Sing course ("Church history"), each stop a short video with its quiz. Two new kinds of quiz
question for it (and reusable anywhere): **timeline** (drag the events into order along a line, with dates shown after) and
**map** (tap where it happened on a simple world or Mediterranean map). The Studio's quiz builder gets both.

**Games for Angelio** (talked through Nov 18, 2026). Real games, like Blessed! and Candles! on Pico Parish: replaying
is the content, so they never need new levels.

*The rule for every game: easy to play, hard to master* (Pac-Man, Crossy Road, Vampire Survivors):
- **Floor:** one tap action, everything read aloud, and the first 30 seconds anyone can do. No "Game over": a run ends
  gently (a timer, or three little misses) with "You served 12 meals!" and their own best score.
- **Ceiling:** it speeds up and adds more at once; **streaks** multiply the score (a miss only resets the streak);
  **risk for reward** (wait for the bigger prize, or take the safe one); **patterns** a focused player learns; and between
  rounds, **pick one of three** small upgrades (Vampire Survivors), so every run plays a little differently.
- **Fresh with no upkeep:** random every run; a **"today's game"** seed worked out on the device (the same day gives
  everyone the same run); the **Church year** from the date (Advent, Christmas, Lent, Easter, feast days, saint of the
  day), so it changes through the year and repeats every year; stickers as unlocks.
- **Done when it has:** the loop, 6 to 10 unlocks, the endless and daily modes, the seasons, all read aloud. Then frozen.

*The seven games:*
1. **Saints Cooking.** Tap the ingredients in the recipe's order. Ramp: orders queue up with a timer each; recipes get
   more steps; two or three orders at once (which first?); a perfect streak earns tips. Between days, pick one of three:
   a faster oven, a helper saint who does one step, a bigger tip jar. Saints Martha and Lawrence (cooks' patrons); feast
   days bring their own recipes.
2. **Candles**, as up to three tap games from the Pico Parish one (Nov 18, 2026; the PICO-8 Candles is a Vampire Survivors
   style game: walk, auto-prayer, candles left behind, grace, pick one of three, 12 combos, a 5-minute day). Art: test page
   https://claude.ai/artifact/FFkp1FnQTM6aEeBn78PFqM (A: PICO-8 as is, B: crisp pixels + smooth light and words, C: voxels
   made automatically from her drawings).
   - **Candle Rack** (first; she wants to play it). Decided Nov 19, 2026: **voxels only**, her own MagicaVoxel models
     (.vox, uploaded on the Studio's Drawings page, where the checklist of people and church pieces lives); pixel versions
     can be redone later. **Each round is the time before Mass or the Divine Liturgy**: getting the sanctuary ready ("Mass
     starts in 3 minutes"), the priest (hurrying) or server comes by, people come early to pray and light candles for their
     intentions; when time runs out the bells ring and the priest processes in (slow walk). The game says so plainly:
     nobody tends candles all through Mass. One church inside, candles go out, tap to light. Ramp: candles burn at
     different speeds; relight just before one goes out for a "just in time" bonus; swipe along a row to light it in one
     go (a chain); prayer intentions in colors (light the right color); drafts when the door opens (it creaks first);
     the sanctuary lamp must never go out; pick one of three between rounds (longer wicks, glass covers, an altar server
     who keeps one row lit, a bigger rack). Church year: the Advent wreath in order, Candlemas, the Easter Vigil (one
     flame passed through a dark church), All Souls.
   - **Light the Town**: the Pico Parish game without walking. Tap where a candle goes; people walk to the light; the
     upgrades, combos, events and orders stay.
   - **Lamplighter** (Crossy Road style): tap to hop up the streets at dusk, swipe sideways, light lamps and windows;
     wind, processions and carts cross. Endless; the voxel look fits it best.
3. **Saints Match.** Memory cards with the saint drawings; the voice names each one. Ramp: bigger grids, a clock, a
   flawless streak multiplier, then matching a saint to their sign (Peter and the keys), cards that shuffle on hard.
4. **Choir.** Tap on the beat (built from Boba Beats). Ramp: the tempo rises, 1 lane then 2 then 3, held notes, perfect vs
   good timing, a combo meter; easy mode counts loose taps. Cantor sheet music becomes its harder levels, not a new game.
5. **Garden Givers.** Tap to plant, water and pick; fill the food bank's basket. Ramp: crops ripen at different speeds,
   rain helps, crows steal, the food bank asks for certain foods, picked food spoils if left. Pick-one-of-three upgrades
   (a bigger watering can, a helper). Score: meals given.
6. **Mass Usher.** Tap a family, then a pew where they fit (a gentle Tetris). Ramp: families of different sizes, the clock
   until Mass starts, late arrivals, a bonus for keeping families together, and packed Christmas and Easter Masses.
7. **Coloring.** Tap to fill her drawings (no brushes or layers). The one game with no score; done is a set of pages plus
   seasonal pages. The picture saves to the device only.

Peters Pence (Balatro-style cards) is too hard for PreK: it moves to Pico Parish.

**Things that need upkeep, and the fix:**
- The robot voice (a Cloudflare AI model that can be retired): Mom and Dad record the fixed lines (539 sentences listed by
  tools/voice-lines.mjs, recorded a few at a time), then the rest baked once into audio files so nothing calls the AI.
- Paid family codes: keep paying optional; free checks must keep working forever.
- Keys and the Studio: needed only while editing; the apps run without them.
- Domain and Cloudflare: prepay angelio.org about 10 years with auto-renew; keep the plan cheap.
- "Keys to the house": a one-page note for someone trusted (domain, Cloudflare, GitHub, yearly costs); an open license;
  a plain copy of the site that runs anywhere once the voice is baked.

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
(nothing broken can be saved). The Ghost import is retired. Every old song has its MP3; new ones are exported from Logic and uploaded as a download. Next: drafts,
trash, export, then the Studio for the games' content.
Nov 18, 2026: **Studio for the reading lessons** (angelio.org/studio/reading.html): Letter Lane and Read Aloud's phonics
lessons (grade, level, order, what it teaches, How it works card, picture words as chunks with a live chunk preview, more
words, sentences with word counts per grade), hide = draft (saveable unfinished), preview in the real game. Both apps load
the saved lessons (/api/content/reading; their own copy when offline or before the first save). Rules shared by the page
and server (hub/public/js/reading-content.js); backups include them. Next: letters, rhymes and beats lists; Grammar's content.
Nov 18, 2026: **Drawings** (angelio.org/studio/draw/): the Lesson Studio's Pixel art editor (a copy, phone layout) with
a checklist per game (hub/public/js/art-content.js CHECKLISTS; Candle Rack's Roman and Byzantine pieces first). Saved to R2
(content/art/drawings.json, old versions and trash kept), backed up to GitHub (art/drawings/), readable by anyone at /api/art
(Claude and the games read them there). Seeded with her nuns, priests, deacons, candle, shrines and churches from sdcourses.
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

- ~~**PreK math beyond counting**~~: Nov 18, 2026, in **Snap & Split** (kept as the one PreK math app, so Math stays 4 tiles):
  topics Numbers (blocks), Shapes (find, more shapes, shapes all around), Colors & sorting (find a color, sort by color, sort
  by shape, which one doesn't belong), Patterns (AB, ABB/AAB, ABC/AABB), More or fewer (more/fewer, same, big and small,
  longer, taller). Shapes are drawn (apps/snap/public/js/prek.js + prek-view.js). Next ideas: position words (above, below,
  next to), making your own pattern, counting to 20.

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
