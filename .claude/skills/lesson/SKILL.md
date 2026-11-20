---
name: lesson
description: Make or redo a kids video lesson with Shalone in the workshop (angelio/workshop), from the checklist to Watch & Sing. Use when he asks for a new lesson, a redo, scripts for the video checklist, or invokes /lesson.
---

# Making a lesson (the workshop)

Work in `workshop/` and follow its CLAUDE.md ("who decides what"). Each **Stop** waits for Shalone. Keep messages short:
he reads on his phone.

## 1. Pick it from the checklist

`workshop/plan/videos.yml` lists every video to make (the ~70 that finish the set). Each entry says its pillar, the old
Watch & Sing video it replaces (`replaces:`), the old script to start from (`old_script:`, a transcript in
`workshop/plan/old-scripts/` or a lesson already here), and its status. Take the next `todo` in his order unless he
names one.

## 2. Quotes and script

1. Read the old script first: keep what works (his words, the order, the jokes kids liked), and find what each point
   needs: one exact quotation.
2. Sources, in this order: the Catechism (vatican.va/archive/ENG0015, paragraph numbers) and Christ – Our Pascha
   (`sources-local/ugcc-catechism.txt` + its url, see CLAUDE.md) for the great majority; the Catholic Encyclopedia
   (newadvent.org/cathen) for history; Scripture (NABRE) when the Catechism quotes it. Wikipedia only to orient.
   East and West side by side where they differ. For kids: short exact passages a child can follow.
3. `npm run new -- lesson <course> "<Title>"` (or edit the lesson already there) and build `lesson.yml`: 3–5 points,
   each on one exact quotation with its link, a 60–100-word explanation in plain kids words, 1–2 visuals (his pixel or
   voxel characters guide; real pictures for real things), and a quiz (mix `choice`, `truefalse`, `blank` with
   `wrong:`). Set `replaces:` when it takes an old video's place. Facts for his intro/outro go in `notes`; their
   `text` holds only his fixed lines (the template has them). Also add a `voxels:` block (`characters:` and `props:`,
   reusing Candle Rack and shared lesson slugs where possible) so he knows which MagicaVoxel models to build for the script.
4. `npm run check -- <course>/<lesson>` until it passes; set the checklist entry to `script`.

**Stop.** He reads the script and the quiz together in the studio (Script & recording), edits anything, writes him
intro and outro, and may ask for other quotes (Ask Claude box or chat). His "the script is good" sets the entry to
`approved-script`.

## 3. Record and watch

He records in the studio (per slide or one take; his camera too), then "Make the video" on the Video & approval tab.
If he uploads phone recordings in chat instead, see CLAUDE.md → Audio, then render in the background.

**Stop.** He re-records what he wants. Only his explicit approval sets `status: reviewed`: the "Approve and send to
Angelio" button, or his saying so in chat (then `npm run send -- <course>/<lesson>`).

## 4. Into Watch & Sing

Sending puts the video, thumbnail, quiz and words with source links in Watch & Sing, in place of the old video it
replaces. Set the checklist entry to `done`, commit and push (`main`).
