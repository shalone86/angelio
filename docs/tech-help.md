# Tech Help & Troubleshooting

Quick reference for **[angelio.org](https://angelio.org)** routing, Workers, `kit/`, and fixes.

---

## Why Internal Links Use `#/`

```text
https://angelio.org/garden/#/play/garden
\_________________________/ \__________/
  1. Cloudflare (hub proxy)   2. Browser (kit/router.js)
```

- **Server (`/garden/`, `/candles/`, `/games/`):** [`hub/worker/index.js`](../hub/worker/index.js) matches the folder prefix and forwards to that app's Worker.
- **Browser (`#/play/garden`, `#/grownups`):** Never hits the network — keeps `./css/app.css` paths valid and lets offline `sw.js` serve one cached `index.html`.
- **Ghost contrast:** Public blog posts need server URLs for SEO and link sharing; Angelio game sub-screens **don't** (if per-lesson Watch & Sing share URLs are wanted later, switch just that app to `history.pushState` + Worker `index.html` fallback).

---

## Architecture in 4 Bullets

- **1 Hub + 14 App Workers:** Each `apps/<name>/` has its own `wrangler.jsonc`, wired via `APPS` in `hub/worker/index.js`.
- **Single source `kit/`:** Shared browser modules live in [`kit/`](../kit/). Edit `kit/`, run `npm run kit-sync`, bump each changed app's `sw.js` (`Articulate` sits outside `kit/`).
- **R2 vs Git vs `localStorage`:** Studio edits (Watch & Sing, `.vox` art, Candle spots, voices) save to **R2** and back up nightly to `backup/` on `main`; child stars/scores/stickers live in browser `localStorage` (`<path>:v1`, `angelio:stickers`).
- **Offline voxel caching:** All 5 arcade `sw.js` Workers cache `/api/art` and `/api/art/vox` per `slug` (`artNetworkFirst`) so URL query updates don't strand offline caches.

---

## Symptom → Fix

| Symptom | Cause | Fix |
|---|---|---|
| Old code after deploy | Cached `sw.js` shell | Bump `sw.js` `VERSION` (or `npm run kit-sync`), commit, redeploy; hard-reload browser |
| Black screen in game | Module crash or TDZ (`const` called before init) | Check DevTools Console, move helper declarations up, run `npm test --workspace=<app>` |
| `npm test` fails `kit-check` | Direct edit inside `apps/*/public/js/kit/` | Put change in [`kit/`](../kit/) and run `npm run kit-sync` |
| `npm run deploy` refuses | Uncommitted changes (`tools/deploy.mjs` guard) | Commit first (`git status -sb`), then deploy |
| `git push` rejected | Nightly Studio backup landed on `origin/main` | `git pull --rebase origin main && git push origin main` |
| Boxes or wrong colors | Missing `/studio/draw/` `.vox` or non-marker hex | Check exact slug in `hub/public/js/art-content.js` + `looks.js` marker hexes |
| Finish sticker swings wildly | Game `app.css` defines `@keyframes bob` | Rename game keyframe (e.g. `cropBob`) — never use `bob` in `apps/*/public/css/app.css` |
| Arcade vs learning sticker mismatch | Wrong `byStars` flag on `showFinish` / `stickerBook` | Arcade games require `{ byStars: true }` |
| Audio silent / no card speech | Browser tap lock, missing clip, or Saints Match | Tap screen once, check `/admin/voices.html`; card flip TTS is intentionally off in Match |
| Never leak secrets | Keys placed in `.env` or repo files | Keep secrets in Cloudflare / `wrangler secret put`; Admin key stays browser-local |

## Add a New App (4 Steps)
1. Copy [`template/`](../template/) → `apps/<name>/` and set `wrangler.jsonc`.
2. Add `<name>` to `APPS` + bindings in [`hub/worker/index.js`](../hub/worker/index.js) and [`hub/public/js/apps.js`](../hub/public/js/apps.js).
3. Run `npm run kit-sync && npm test`.
4. Commit and deploy `<name>` + `hub`.
