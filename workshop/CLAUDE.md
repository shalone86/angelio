# The workshop (Angelio's Lesson Studio)

Shalone Cason's kids faith videos for Angelio's Watch & Sing: each lesson is one `lesson.yml` that becomes a narrated
video with his face, its quiz, and its words with sources. Shalone works in chat; Claude does the file work. Start a
lesson with `/lesson` (`.claude/skills/lesson/SKILL.md` at the repo root). **What to make next: `plan/videos.yml`** (the
video checklist; the stopping point is in the Angelio ROADMAP.md, "Videos: the stopping point").

This folder runs on his Mac only (`npm install` here once; it isn't part of the website and isn't in the repo's
workspaces). Moved here from shalone86/sdcourses in Nov 2026; that repo is now the archive (the adult courses, the Ghost
theme and publishing, Battles, Town, the PICO-8 game tools). His adult videos are finished: everything here is for kids.

- **The owner is Shalone Cason, a man (he/him).** In the recordings he is Dad; his wife is Mom. Never call him "she".

## Who decides what (never cross these lines)

- **Shalone chooses** the topic (and the music, or the course's track).
  Claude finds 3–5 anchor quotations and builds the script; he can swap,
  cut, or ask for more quotes, and his call is final.
- **Shalone writes the intro and outro.** Give him facts in `notes`, never
  prose. His fixed lines are always in them (the template and the studio's
  New lesson put them in): the intro ends "I'm your host Shalone Cason, and let's begin in the name of the Father and of the Son and of the Holy Spirit."
  and the outro ends "Thanks for learning with us. I've been your host Shalone, and until next time, stay holy, my friends." If he dictates text in chat, use his words as given (ask before
  fixing more than a typo).
- **Shalone approves.** Only set `status: reviewed` when he explicitly says the
  lesson is approved: the script and the quiz first (in the studio), then the video. "Approve and send to Angelio"
  puts it in Watch & Sing.

## Content rules

- Every point stands on one direct quotation (`quote.text`), **from the Catechism (vatican.va) or Christ – Our Pascha
  for the great majority** (his rule, Nov 2026), the source linked so the words can be checked. The Catholic
  Encyclopedia (newadvent.org) is fine, especially for history; Scripture (NABRE, bible.usccb.org) when the Catechism
  quotes it. For kids, the quotation must be understandable: a short exact passage that carries the meaning.
  Wikipedia is `reference: true`: background only, never quoted.
- Christ – Our Pascha (the Ukrainian Catholic catechism) is free online; every source entry for it carries both
  `file: sources-local/ugcc-catechism.txt` (the check reads this) and `url: https://ukrcatholic.org/fileadmin/user_upload/PDFs/Our_Faith/Christ-our-Pascha-Catechism-of-the-Ukrainian-Catholic-Church-by-Comission-for-the-Catehism-z-lib.org_.pdf` (the post links to it).
- Copy quotations exactly. `npm run check -- <course>/<lesson>` must pass.
- Explanations: 60–100 words, plain, no flourishes. Whole lesson ~550–650 words.
- Quizzes: one or more per point, mixing `choice`, `truefalse`, and `blank`; a `blank` has `wrong:` (one or two wrong
  words: Watch & Sing shows word tiles). He approves the quiz with the script.
- Every intro opens the same way: `title`, then `host` (his photo) at "I'm your
  host", then `trinity` at "in the name of the Father" (templates/lesson.yml has it).
- Don't state contested history more confidently than the sources do.
- Kids style: `style: kids` in course.yml (or a lesson.yml) gives bright
  colors, the rounded Fredoka font, bouncing shapes, and scenes and items
  background shapes moving to the music's beat (`scripts/beats.mjs`, cached
  as `music/<track>.beats.json`). `motion: dance` (music videos) also makes
  the pictures, headings and his video bounce, snaps them to the beat, and
  shows the beats as dots in the Timing tab; the default `calm` is for
  explainers.
- Guide characters: his pixel characters (`sprites/`: idle, walk, run, look up, point; a
  `sprite` scene can be flipped) are fun guides, like Crash Course or Kurzgesagt, especially
  for kids. They guide and react; they never stand for a whole idea. Things like a chalice or the
  Eucharist get a real picture (Wikimedia etc.) or a 2D shape sketch (like the iconostasis). He
  adjusts everything in the Timing tab.
- Maps can highlight `areas:`: a country (Natural Earth name or a common one,
  "United States"), a continent, a group of countries (EU, NATO, BRICS…;
  members as of 2025), or an empire (approximate, at about its peak; those
  show "Borders approximate"). The list is `video/data/areas.json` (plus the
  older `video/data/empires.ts`); add new ones there. With areas and no
  `region:`, a map fits itself to them (`region: auto`); regions also include
  world, africa, asia, americas, oceania and more.

## Commands (all take `<course>/<lesson-folder>`)

| command | does |
|---|---|
| `npm run new -- course <slug> "<Title>"` | scaffold a course |
| `npm run new -- lesson <course> "<Title>"` | scaffold the next lesson |
| `npm run check` | verify quotations against sources |
| `npm run stills` | contact sheet of every scene (`dist/…/contact-sheet.jpg`) |
| `npm run prepare-lesson` | timing + `recording-script.md` |
| `npm run render` | `lesson.mp4` + `poster.jpg` (several minutes; run in background) |
| `npm run send` | put an approved lesson in Watch & Sing (what "Approve and send to Angelio" runs; needs `ANGELIO_ADMIN_KEY` in .env) |
| `npm run voxels` | bring new and changed voxel characters over from angelio.org into `voxels/` |
| `npm run split -- <c>/<l> <file>` | split a one-take recording into sections |
| `npm run song -- <name>` | make a music video from `songs/<name>/` (`dist/songs/<name>/<name>.mp4`) |

Rendering on the Mac needs nothing extra (Remotion downloads its own
Chrome). In a cloud session, prefix with
`REMOTION_BROWSER=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/*/headless_shell | head -1)`.

Sending to Angelio needs `ANGELIO_ADMIN_KEY` (the Studio's admin key) in `.env` here (gitignored; `scripts/lib.mjs`
loads it). He types it into the file himself; never ask him to paste it into chat. A lesson goes to Watch & Sing
under `watch_id:` (written after the first send), else `replaces:` (the old video it takes the place of), else its
title; its course is course.yml's `watch:` id. Kids thumbnails (`video/KidsThumb.tsx`) become its picture there; they
use his own corner shapes from `thumb-shapes/` (PNG or SVG; `corner-<tl|tr|bl|br>-…` names are flush corner pieces).

## Lesson Studio (his editor and recorder)

A local page on his Mac: `npm start` (or double-click `Lesson Studio.command`)
runs `studio/server.mjs` (in this folder) and opens http://localhost:5178 (`studio/index.html`).
It must be local: browsers only allow the microphone on localhost. It runs
as a login background item (`org.angelio.workshop`, written for this folder by `studio/launchd/install.sh`,
run with `npm run studio-autostart`, which also removes the old sdcourses one): it starts at login and restarts
if it stops; logs in `~/Library/Logs/angelio-workshop.log`. After changing
studio or script code, `npm run studio-restart` (don't start a second copy).
If it's already running, `npm start` just opens the page.

- **Home and the tabs:** a fresh start opens on Home (`homeView` in studio/index.html): the last lesson with
  its three tabs (Script & recording, Timing, Video & approval), Open another lesson, + New lesson,
  and a card for each tool (Pixel art, Music videos; `TOOLS`). A refresh reopens
  where he was (`sessionStorage['studio.open']` tells the two apart). Off Home, the tools are across the
  top after ← Home, and a lesson's three tabs sit beside its title (`.lesson-tabs` in the header), so he
  switches straight between them; a lesson's title shows only on its own tabs. A new tool gets a tab there and a card on Home.
- **Script & recording:** one slide per section. His edits are saved straight
  into lesson.yml (`applyEdits` in `scripts/studio.mjs` splices only the
  changed text), then the quote check runs. Changing the script of an
  approved lesson sets it back to `status: draft`. Quotations are locked.
- **Recording:** per slide, or one take with Next taps as the cut points.
  Each section ends up as `audio/<section>.wav`, with the browser's original
  beside it (`.webm`, or `.m4a` from Safari; a one take keeps `take.webm`).
- **Keys:** R/F19 record (F19 also presses Yes on an "Are you sure?"), F17/F18 change
  slide, F16 scrolls down the slide (back to the top at the bottom). (A prompter mode was tried
  and removed at his request; don't bring it back unasked.)
- **Camera:** "Record my video too" (in the Microphone panel) records his
  webcam with the voice. Clips go to `<lesson>/camera/` (gitignored: his
  face stays off the public repo, so it exists only on this Mac); a
  voice-only re-record drops that slide's clip. `prepare.mjs` cuts each clip
  so it lines up with the trimmed voice. Per slide, the Timing tab sets
  `camera:` in timing.yml: bubble (default), card, side, lower, only, off
  (geometry in `video/Camera.tsx`).
- **Pixel art tab** (`studio/pixels.js`): he draws 1–8 frame pixel
  animations, 1–8 frames (8/16/24/32/48/64 px; pencil, dither, eraser, fill, line, box, circle,
  select & move, color picker; copy/cut/paste across drawings; **Insert a drawing…** (and Insert on each saved drawing's tile) drops a saved drawing into the open one as a piece he drags and resizes, all its frames or just the first (`insert` → `place` in studio/pixels.js, the same path as Paste); flips; the size can change any time and keeps the drawing, lined up by a 3 × 3 square (`resizeArt`; smaller asks first, Undo brings it back); **layers** (up to 8, left/bottom at the back: new, hide, send back / bring forward, delete; saved as `layers` beside `frames`, which stay the visible layers put together, so everything else reads drawings as before; in the editor `frames` is the active layer, `flatOf` in studio/pixels.js puts them together); frames can be added empty or as a copy, and moved by dragging or with Move left / right; "Draw in every frame" makes pencil, eraser, shapes, fill and moves change all frames; saved drawings open from a grid of moving thumbnails; mirror, onion
  skin, speed; keys: B pencil, E eraser, F fill, S line/box/circle, C next / X previous color,
  I pick, M select (Delete clears it), . / , next / previous frame; Export frame (PNG, enlarged) or animation (GIF, made by
  ffmpeg at `/api/sprite/gif`)). **Comic** checkbox: each frame is a panel (up to 12; `kind: comic`), with a
  **Words** tool: click the panel to type words he drags, in Pixel, Sans, Serif or Bold letters, three sizes,
  with an optional speech bubble, thought bubble or box (`window.ComicWords` at the top of studio/pixels.js; Pixel is a
  pixel font with a pixel bubble, the other three are real smooth letters (Helvetica, Georgia) with smooth bubbles, his choice;
  kept as `words`, never painted into his pixels); paper white, black or see-through; export this panel, every
  panel, or one strip with a space between panels and a line around each. Saved to `sprites/<name>.json` (shared by all lessons;
  `scripts/sprites.mjs`). In a lesson: Timing tab → + Add a picture here →
  Pixel animation (picked from a search box and moving thumbnails, `SpriteGallery.picker` in studio/reference.js), a `sprite` scene (`move: stay | hop | across | across-left`, `size`; across-left mirrors it);
  prepare.mjs copies the drawing into the props. With `motion: dance` it
  changes frame on the beat. The tab can show a
  **reference picture** under the drawing (`studio/reference.js`; never saved):
  from his Mac, pasted (a copied picture or its link, e.g. from Google;
  fetched by `/api/fetch-image`), or from the free picture search.
- **New lessons and slides:** "+ New lesson" (studio header) picks a course
  here or a new one, and starts with one blank slide (the
  intro). Each slide has "+ Add a slide after this" / "Remove this slide" /
  "+ Add a closing slide" (`scripts/slides.mjs`: lesson.yml is edited as
  text, recordings and timing move with renumbered slides, removed ones go to
  `audio/removed/`). His own slides (`quote.link` present) have boxes for the
  section title, direct quote, highlight, source and link (the link becomes
  the source the quote check uses), and a quiz editor (choice, true/false,
  fill in the blank; saved with `setValue`, checked like the post checks
  them). Slides without a quotation are allowed.
- **Changing a picture:** clicking any picture's block on the Timing tab opens
  its form with its boxes filled in (op `replace`, same place and timing);
  pictures from the search open their options instead: framing, crop, caption,
  the credit line shown on the video (editable), and **Change the picture…**
  (same place, timing and framing). His gallery's credit is just "The Free
  Catholic Gallery (sdcason.com)". Forms use
  separate boxes (no `|`). **Icons** (`type: icons`): 1–4 lucide.dev icons
  that draw themselves in, each with an optional word (cued when said); the
  form has an icon search with previews (`/api/icons`).
- **Colors just for one use** (`studio/colors.js`): one-off characters aren't saved as drawings.
  A `sprite` or `puppet` scene's `colors: {'#OLD': '#NEW'}` (Timing tab form → Colors, one box per
  color with "same as" squares) recolor the drawing when the
  video is made (`recolorArt` in prepare.mjs); every pose follows.
  **Save as a character…** makes real drawings of every pose (`saveColors`, remembered in
  `.versions.json`) for one he'll reuse.
- **Characters from a base** (Pixel art tab → New character from a base…): a
  base is a character with `-idle`, `-point`, `-look-up`, `-walk`, `-run` (his:
  thick-beard-guy, thick-guy, skinny-guy, guy-beard, vestment-guy, thick-woman,
  skinny-woman; and deacon, east-bishop, east-deacon: versions he marked as bases with
  `isBase: true` in `.versions.json`, which need only an idle and pass on whatever poses they have). He picks one, names the new character, recolors only its idle
  (one color box per part of the base, with "same as" color squares, so parts can share a color
  and still be changed apart), and Save makes all five poses with the
  same color swaps (`colorVersion` in `scripts/sprites.mjs`; `sprites/.versions.json`
  remembers each one's base). Bases are never changed.
- **Copy a pose to other characters…** (Pixel art tab): a pose he drew once (e.g.
  eastern-monk-blessing) becomes a draft for every other character, made from its own idle
  (the changed squares only, lined up with a shift for kneeling; colors from the nearest
  matching part; `copyPose` in `scripts/sprites.mjs`). He ticks which to make; drafts never
  replace an existing drawing, and he touches them up. Color versions also get any extra
  poses their base has.
- **Puppet** (`type: puppet`, PUPPET.md): an 8 × 8 character he draws as
  `<name>-<action>` drawings (actions include blessing, B, and kneel, K), played with the keys while the video runs on the
  Timing tab; recorded in timing.yml (`scenes.<i>.puppet`).
- **Voxel characters** (`type: voxel`; `scripts/voxels.mjs`, `video/voxel-draw.js`, `video/scenes/Voxel.tsx`): his
  MagicaVoxel models, one .vox per pose (priest-idle, priest-walk-slow…), uploaded on Angelio's Drawings page
  (angelio.org/studio/draw/), which is their one home (the Angelio games use them too). Each has its speed, set there.
  The studio copies new and changed ones into `voxels/` (`<slug>.vox` + `index.json`) when the Timing tab asks
  (`/api/voxels`, at most every 20 s) or with `npm run voxels`, and backs them up; renders use that copy, so they work
  offline. Timing tab → + Add a picture here → Voxel character: pick from pictures of every model (search box), then
  `look` (his marker colors, picked per picture: hair #255359, eyes #0b346e, skin #fad689, a priest's chasuble #ff77a8 or Byzantine phelonion #ffcc66 (the form's Vestment); `withLook` in
  video/voxel-draw.js, applied by prepare.mjs; ready colors or any color in the form), `view` (front, front-right, right, back-right, back, back-left, left, front-left), `move` (stay, hop, across,
  across-left: walking across with no view picked turns them three-quarters the way they go), `size`, `caption`.
  `voxel-draw.js` paints the blocks on a 2D canvas at any angle (no 3D library); the video, the Timing tab and the
  picker all use it. The reader `scripts/vox.mjs` is a copy of Angelio's `hub/public/js/vox.js`: keep them the same.
  MagicaVoxel animations are keyframes (a copied frame points at the same model; old models can stay in the file), so
  frames come from the file's scene, not its list of models. His pixel characters stay for PICO-8 games; new
  characters start as voxels (decided Nov 2026), and get a pixel version only when a PICO-8 game needs one.
  (The Blender characters were removed in Nov 2026: they never got used.)
- **Voxel build notes per lesson** (`voxels:` in `lesson.yml` and scripted `todo` entries in `plan/videos.yml`): each
  lesson lists the voxel `characters` and `props` to make from its script (`[{slug, label, note}]`, plus an optional
  `note:`), reusing Candle Rack and shared lesson slugs where possible. Lesson Studio shows it as a collapsible note
  in the lesson header (`#voxel-note` in `studio/index.html`, checked against `voxels/` by `voxelPlan()` in
  `studio/server.mjs`, with **Check for new models** hitting `/api/voxels?force=1`) and as an expandable checklist on
  each video in Home's **Videos to make** list (`/api/plan`).
- **Nudging:** clicking any scene block shows Move ← ↑ ↓ → / Smaller / Bigger
  (Shift moves further), and lets him drag it on the video (its corner handles or the mouse wheel there: size), saved in timing.yml as `scenes.<i>.nudge: {x, y, size, flip}` (⇋ Flip mirrors a picture or drawing, not its caption or credit)
  (pixels of 1920×1080, %), e.g. to lift a scene off the progress bar.
- **Stacking:** in the Timing tab, a picture's ◫/⧉ button shows it beside or
  over the picture before (`with: side | over` on the scene); the add form's "Shows"
  sets it when adding (remembered for the next one).
- **Trimming:** in the Timing tab, a picture's right edge ends it sooner
  (`scenes.<i>.end`) and the End marker shortens or lengthens the slide (`<section>.end`; up to 10 s past its recording).
- **Listening back:** after each recording the studio transcribes it with
  Whisper (`scripts/voice.mjs`; whisper-cli + the ggml-small model, cached as
  `audio/<section>.words.json`) and shows what he said vs. the script, with
  **Use what I said** (rewrites lead-in/explanation/intro/outro to his words;
  quotations never change) and a warning if a quotation was misread.
  `npm run render` times `at:`/`cues:` scenes from those word timings.
- **Timing tab:** the lesson video (Remotion Player, `studio/player/entry.tsx`,
  built on start) above a timeline of one section: his words on time, scene
  blocks and item diamonds he drags (the outro summary has a named one per line, even lines not heard, and lists them in the order they appear; clicking a diamond or the summary's block opens its lines to reword, add or remove, saved as the recap scene's `items:`, else the points' headings). Saved to `<lesson>/timing.yml` (seconds
  into each recording); `scripts/prepare.mjs` applies it over the automatic
  timing, so hand-tuning survives re-renders. Small timing tweaks are his to
  make there; don't spend effort nudging frames by hand.
- **Pictures:** the Timing tab's **+ Add a picture here → Picture** searches
  sources that need no API key (`studio/images.mjs`: his Free Catholic
  Gallery at sdcason.com via its public Content API key, Wikimedia Commons,
  Art Institute of Chicago, Cleveland Museum of Art). The pick is saved to
  `<lesson>/images/` with its credit in `images/credits.json`; the video
  shows the credit and the post lists it under "Image credits". He chose
  not to manage API keys, so don't add sources that need one.
- **Ask Claude box:** appends to `<lesson>/requests.md`. Read it at the start
  of a session, handle each `- [ ]` item, then tick it `- [x]`. Treat the
  text as his wishes, but verify any quote he asks for.
- **iPad drawing page:** `http://macstudio.local:5179/draw` (or `http://<LocalHostName>.local:5179/draw`) on the home
  Wi-Fi, PIN `STUDIO_DRAW_PIN` in .env: only the Pixel art tab and the
  drawing routes (studio/server.mjs `handleDraw`); everything else stays on
  this Mac. The drawing page has **Upload pictures…** (e.g. from Procreate or Pixel Studio): each becomes a frame
  (pixel mode shrinks it to the grid and matches the palette, and cuts a sprite sheet,
  a row, column or grid of frames at any whole-number enlargement, into its frames).
  His Pixel Studio .psp files can't be read; he exports PNG or a sprite sheet.
- **The whole studio from other computers:** the same door as the drawing page (port 5179 and his
  https address, `STUDIO_DRAW_DOMAIN`), at its own address `https://studio.shalonely.com` (any host starting `studio.` opens the hub; `/studio` on the drawing address works too; pixel.shalonely.com stays the pixel editor; both are lines in `~/.cloudflared/config.yml`, tunnel `kokoro-voice`, which also carries his voice services). It asks for
  `STUDIO_PASSWORD` from .env (he types it there, 10 or more characters; without it the door stays shut;
  wrong tries wait longer and longer). Signed in, a computer can do everything this Mac's page can,
  recording included (it is https), also approve and send to Angelio: his choice (`studioSignedIn`,
  `studioLogin` in studio/server.mjs). Buttons that open Finder open it on the Mac. The PIN still
  opens only drawing. To try server changes without touching his copy: `STUDIO_PORT=5278
  STUDIO_DRAW_PORT=5279 STUDIO_PASSWORD=<test> node studio/server.mjs --no-open`, then stop it
  (find it with `ps`; `lsof` hangs on this Mac's Time Machine share).
- **Phones and upright screens** (700 px and narrower, the `@media (max-width:700px)` block in
  studio/index.html): the tabs are one row that slides sideways; in Pixel art the Undo/Save
  row, tools, colors and frames sit right under the drawing, and everything else is in three drawers under the frames, one open at a time (Copy & flip, Drawing, More: `data-g` on each piece and `P.sheet`, in studio/pixels.js and studio/sketch.js); tool rows slide
  sideways instead of wrapping. A phone held upright gets a full-screen Pixel art editor
  like his drawing app (class `pxm` in studio/pixels.js and index.html): colors and frames with play, save and a
  wrench on top, the drawing in the middle (two fingers zoom and slide; a stroke the first finger began is taken
  back), a layers strip and two rows of icon tools at the bottom (the rows keep where he slid them) (`studio/px-icons.js`, made by `node scripts/px-icons.mjs` from Lucide),
  everything else in the wrench's sheet. Landscape/iPad keep the older layout for now. Check new screens at
  375 px wide: nothing may scroll the page sideways.
- **Posters** (`npm run render`): the title card without his camera clip.
- **Backup to GitHub:** the studio commits and pushes a lesson's folder a
  few minutes after his last change to it, and right after he sends it to
  Angelio (drawings too); the Video & approval tab shows the last backup. If GitHub has newer work, it pulls first. Commit
  messages start "Studio backup:". Pull before working elsewhere.
- **Music videos tab** (`studio/songs.js`, `scripts/songs.mjs`, `video/MusicVideo.tsx`): he makes the song in
  Logic; here he makes its video (1920 × 1080). A song is `songs/<name>/`: `song.yml`, the sound
  (`song.mp3`/wav/m4a/aiff) and, if he has it, `song.mid` (Logic: File → Export → All Tracks as MIDI File).
  One slide per line of the words (**Paste all the words…** makes them; a slide with no words is fine), each
  with a start time: **Tap the lines** (Space as each line starts, from the picked slide) or **Tap the words**
  (Space on every word: a sing-along, the word lights up when sung; `times`), or typed / "Starts now". Per
  slide: a background (the song's color with bouncing shapes, another color, or one of his drawings) and
  characters (any saved drawing), both "same as the slide before" unless changed; he drags a character on
  the paused video and resizes it by its corner. Each character **Dances to** the beat or one part of the
  song and hops, sways, grows or only changes frame on each hit. With a MIDI the parts are his tracks, exact
  (regions with the same name are one part); without one the beat, drums, bass and melody are guessed from
  the sound (`songParts`, cached in `parts.json`). **Make the video** (or `npm run song -- <name>`, with
  `--seconds <n>` or `--still <s>` for a quick look) writes `dist/songs/<name>/<name>.mp4`; nothing is
  uploaded anywhere. His sound and MIDI files stay on this Mac (gitignored; the repo is public): only `song.yml` is backed up. The words on the slides are his: never write or change lyrics for him.
- **"Are you sure?"** questions open beside the button he clicked
  (`studio/ask.js`, `ask(message)`), not the browser's box; use it for new ones.
- **Video & approval:** "Make the video" runs `scripts/render.mjs`. "Approve and
  send to Angelio" is his approval: it sets `status: reviewed`, then runs
  `scripts/send-to-angelio.mjs` (quotes checked, video and thumbnail uploaded in parts, the lesson put in the Watch & Sing
  library with its quiz (`scripts/watch-lesson.mjs`), words and source links; the library keeps the older version).
  For a kids lesson without its own `thumb:` it first asks which drawing goes on the thumbnail (`thumb: {sprite}`).
- **Kids thumbnail maker** (Video & approval tab, kids lessons; `studio/thumb.js`): the
  thumbnail live, with up to 3 of his drawings he drags, resizes by the corner, and
  gives a frame and flip; dashed lines mark the home page's crop. Saved as
  `thumb.pics: [{sprite, x, y, size, frame, flip}]` (1280×720 pixels, x/y the middle,
  size the height); "Back to automatic" removes them. Title and shapes stay automatic.

## Audio

He records in the Lesson Studio and reads freely until it feels right. The
studio transcribes each recording and offers to update the script to his
words (the post text should match the video). Quotations must stay exact: if
he misreads one, the studio tells him to re-record that slide. For phone
uploads, `node scripts/voice.mjs <recording> <trimmed.wav>` does the same.
If he uploads phone recordings in chat
instead: one continuous take → `npm run split -- <course>/<lesson> <file>`
cuts it at his pauses into `audio/<section>.wav` and prints the cut times;
check them against the section lengths. Separate files → copy them to
`audio/` as `intro`, `point-1`…`point-N`, `outro`, and remove any older
`<section>.wav` first (a .wav wins over other formats).
Music: a course's `music:` in course.yml (files in `music/`), a lesson can
override; it's mixed low under the voice automatically.

## Master roadmap

Master roadmap for all my projects: `shalone86/picoparish` → `ROADMAP.md` (private repo; attach it with add_repo to read it from another project). Check it before suggesting what to build next, and update it when something ships.
