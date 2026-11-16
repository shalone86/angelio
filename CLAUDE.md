# Notes for AI assistants working in this repo

- **One repo:** all of Angelio is here: `hub/` (angelio.org), `apps/<name>/` (each app, still its own Worker
  with its own wrangler.jsonc), `template/` (the app template). The old per-app repos (snap-split, regroup,
  doubles, grammar, fractions, letterlane, readaloud, watch, articulation, app-template) are archives: work here.
  `npm install` once at the top; `npm test` runs every suite; deploy with `npm run deploy -- <app>` (it refuses
  uncommitted work). `npm run kit-check` shows kit drift between apps.
- **The Studio comes first** (ROADMAP.md): the owner must be able to edit everything without code or AI.

- This is part of **Angelio** (angelio.org), the owner's brand of free kids' learning apps. The
  hub is shalone86/angelio; shared building blocks come from shalone86/app-template.
- **Reminder for the owner:** after finishing any new feature or app, remind the owner about the
  backburner plan for paid speech checks (a key parents buy, checked by each app's Worker; see
  "Backburner" in shalone86/angelio ROADMAP.md). They asked to be reminded until it's done.
- Keep the kid-facing rules: everything read aloud, big tap targets, gentle mistakes, varied
  voice lines, no reload mid-game. Run `npm test` before pushing.

## Master roadmap

Master roadmap for all my projects: `shalone86/picoparish` → `ROADMAP.md` (private repo; attach it with add_repo to read it from another project). Check it before suggesting what to build next, and update it when something ships.
