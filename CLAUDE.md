# Notes for AI assistants working in this repo

- **The owner is Shalone Cason, a man (he/him).** In the recordings he is Dad; his wife is Mom. Never call him "she".
- **Keep docs short and visual:** Human time is valuable — never write walls of text or thousands of words. Make what a feature **does and doesn't** do clear in as few words as possible, and add real screenshots (`docs/img/`) wherever an image explains it faster than prose.
- **One repo:** all of Angelio is here: `hub/` (angelio.org), `apps/<name>/` (each app, still its own Worker
  with its own wrangler.jsonc), `template/` (the app template). The old per-app repos (snap-split, regroup,
  doubles, grammar, fractions, letterlane, readaloud, watch, articulation, app-template) are archives: work here.
  `npm install` once at the top; `npm test` runs every suite; deploy with `npm run deploy -- <app>` (it refuses
  uncommitted work).
- **The shared kit has one master copy: `kit/`** (voice, stickers, store, finish screen, Next button…). Never edit an app's
  `public/js/kit/` copy: change `kit/`, run `npm run kit-sync`, bump each app's sw.js VERSION, test, commit. `npm test` fails
  if any copy drifts. Articulate isn't on the kit (older, separate design).
- **The workshop** (`workshop/`, Nov 2026): the Lesson Studio, moved from shalone86/sdcourses (now the archive). It makes
  his kids videos (script, recording, timing, video, approval) and sends each to Watch & Sing. It runs on his Mac only:
  not deployed, not in the npm workspaces (`cd workshop && npm install` there). Its own notes: `workshop/CLAUDE.md`;
  the video checklist: `workshop/plan/videos.yml`; the `/lesson` skill: `.claude/skills/lesson/`.
- **The Studio comes first** (ROADMAP.md): the owner must be able to edit everything without code or AI.
- **The Studio holds the master copy of content** (angelio.org/studio, R2 bucket `watch-media`): Watch & Sing's library
  (`content/watch/library.json`) and the reading lessons (`content/reading/lessons.json`, Letter Lane + Read Aloud). The copies
  in the repo (`apps/watch/public/data/library.json`, phonics.js PATTERNS) are only fallbacks and nightly backups: changing
  them doesn't change what people see once he has saved in the Studio. To change content, change it in the Studio (or ask
  him to), or update R2 and say so. Backup commits ("Studio backup: …") land on main: pull before working.

- **Workflow (owner's wish, Nov 2026):** plan with the big model, then hand the coding to a Sonnet subagent whenever that saves tokens.
- This is part of **Angelio** (angelio.org), the owner's brand of free kids' learning apps. The
  hub is shalone86/angelio; shared building blocks come from shalone86/app-template.
- **Reminder for the owner:** after finishing any new feature or app, remind the owner about the
  backburner plan for paid speech checks (a key parents buy, checked by each app's Worker; see
  "Backburner" in shalone86/angelio ROADMAP.md). They asked to be reminded until it's done.
- Keep the kid-facing rules: everything read aloud, big tap targets, gentle mistakes, varied
  voice lines, no reload mid-game. Run `npm test` before pushing.

## Master roadmap

Master roadmap for all my projects: `shalone86/picoparish` → `ROADMAP.md` (private repo; attach it with add_repo to read it from another project). Check it before suggesting what to build next, and update it when something ships.
