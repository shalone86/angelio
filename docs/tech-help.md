# Angelio Technical Help & Troubleshooting

Searchable reference for how **[angelio.org](https://angelio.org)** works under the hood, how deploys and shared files stay in sync, and how to diagnose common bugs quickly.

- Prefer a live search box in your browser? Double-click **[`help.html`](./help.html)** (works offline via `file://`).
- Looking for game rules, characters, and star thresholds? See the **[Games & Apps Handbook](./games-guide.md)**.

---

## Why Angelio Links Use `#/`

`Keywords: hash, hashtag, #, #/, router, links, urls, ghost, pushstate, seo, offline, pwa`

### Why `#/` shows up inside an app

Inside any Angelio app (like `/garden/#/play/garden` or `/match/#/grownups`), [`kit/router.js`](../kit/router.js) reads `location.hash.replace(/^#\/?/, "")` and listens to `window.addEventListener("hashchange", route)` rather than changing the path with `history.pushState`.

Here is how a URL splits into two jobs on Angelio:

```text
https://angelio.org/garden/#/play/garden
\_________________________/ \__________/
   1. Server (Cloudflare)      2. Browser (kit/router.js)
```

1. **Before `#/` (`/garden/`, `/candles/`, `/match/`) — handled by the server:**  
   [`hub/worker/index.js`](../hub/worker/index.js) matches the first path segment in its `APPS` map, redirects `/garden` → `/garden/` (`301`), strips `/garden` (`inner.pathname`), and forwards the request to that app's own Cloudflare Worker.
2. **After `#/` (`#/`, `#/play/garden`, `#/grownups`) — handled only in the browser:**  
   Nothing after `#` is ever sent over the network. Changing `#/play/...` never breaks relative asset paths (`css/app.css`, `js/app.js`, `sw.js`), never needs per-route fallback rules in 14 separate Workers, and lets an offline service worker (`sw.js`) serve a single cached `index.html` regardless of which stage or screen is open.

### Why Ghost doesn't use `#/`, and is `#/` common practice?

**Short answer:** No — on public websites, blogs, and modern web apps today, **`#/` URLs are uncommon**. They feel unfamiliar coming from **Ghost** because Ghost is a server-backed publishing platform: every blog post (`/my-post/`) needs its own real URL on the server for Google indexing (SEO), link previews, and sharing.

For **small offline-first single-page apps (SPAs)** meant for one family device, hash routing (`#/`) is still a valid, simple engineering choice:
- **Public entry URLs on Angelio stay clean** (no `#/`): `angelio.org/games/`, `angelio.org/garden/`, `angelio.org/match/`, `angelio.org/candles/`, `angelio.org/stickers/`, `angelio.org/studio/`.
- **Kids don't usually share deep sub-screen links** like "stage 2 mid-round," and search engines shouldn't index ephemeral game screens.
- **When changing away from `#/` would be worth it:** Primarily if you want families to share clean links to specific pages inside a content catalog (such as an individual **Watch & Sing** lesson or song URL without `#/watch/...`). Switching later means using `history.pushState` + returning `index.html` for unknown HTML sub-routes in that Worker (so `/app/play/2` doesn't `404` on refresh), keeping asset URLs clean rather than relative (`./`), and carefully matching offline `sw.js` rules.

---

## Architecture Overview

`Keywords: architecture, hub, workers, kit, template, r2, localstorage, articulate, service binding`

- **One Hub + 14 App Workers:** Each folder in `apps/` deploys as its own Cloudflare Worker (`wrangler.jsonc`), wired into [`hub/worker/index.js`](../hub/worker/index.js) through `APPS` service bindings.
- **`kit/` is the shared master:** Common client modules (`router.js`, `store.js`, `ui.js`, `sound.js`, `speech.js`, `tts.js`, `stickers.js`, `fx.js`, `jingle.js`, `dock.js`, `lesson.js`, `api.js`, `vary.js`) live in [`kit/`](../kit/). Never permanently edit copies inside `apps/*/public/js/kit/` directly—edit `kit/` and run `npm run kit-sync`. (`apps/articulate/` is an exception and sits outside `kit/`.)
- **Where data lives:**
  - **Code & rules:** Git repository + Cloudflare Workers.
  - **Live Studio content:** Cloudflare **R2** (Watch & Sing library, uploaded `.vox` drawings, Candle Rack church spots, family voice recordings, letter sounds), snapshotted nightly into [`backup/`](../backup/) on `main`.
  - **Player progress & unlocks:** Browser **`localStorage`** under `<path>:v1` (stars, best scores, stickers, chosen character, chosen voice). `/games/` reads those `<path>:v1` entries to show stars and best scores.

---

## Operations Cheat Sheet

`Keywords: commands, npm, test, deploy, sync, add app, voxel, studio, voices, backup`

| Task | Command / Place | Notes |
|---|---|---|
| First-time setup | `npm install` | Single shared install at repo root |
| Run full test suite | `npm test` | Runs strict `kit-check` + all app test suites |
| Run one game's tests | `npm test --workspace=garden` | Replace `garden` with `candles`, `usher`, `porter`, `match`, etc. |
| Sync shared `kit/` edits | `npm run kit-sync` | Copies `kit/` into all kit apps and bumps their `sw.js` cache version |
| Check `kit/` drift | `npm run kit-check` | Reports any app whose kit copy differs from `kit/` |
| Pull latest Studio backups | `git pull --rebase origin main` | Nightly backup commits land on `main`; always rebase before pushing |
| Deploy a single Worker | `npm run deploy -- garden` | Refuses if working tree has uncommitted changes |
| Upload/track `.vox` art | `angelio.org/studio/draw/` | Tracks checklist items from [`hub/public/js/art-content.js`](../hub/public/js/art-content.js) |
| Move Candle Rack props | `angelio.org/studio/candles/` | Edits priest, server, big candle, and lamp spots saved to `/api/candles/layout` |
| Record voices / sounds | `/admin/voices.html` & `/admin/sounds.html` | Recorded audio is served via `/api/tts` and `/speech/` |

### Adding a New Game or App
1. Copy [`template/`](../template/) into `apps/<name>/` and configure its `wrangler.jsonc`.
2. Add `<name>` to `APPS` and service bindings in [`hub/worker/index.js`](../hub/worker/index.js).
3. Register its card in [`hub/public/js/apps.js`](../hub/public/js/apps.js).
4. Run `npm run kit-sync` and `npm test`, then deploy both `<name>` and `hub`.

---

## Troubleshooting Cookbook (Symptom → Cause → Fix)

### 1. Site shows old code or misses a fix after deploy
`Keywords: cache, old version, stale, sw.js, service worker, refresh, deploy`
- **Likely Cause:** The browser's service worker (`sw.js`) is still serving the previously cached bundle because the Worker didn't get a new cache version or the browser hasn't picked up the updated worker yet.
- **Fix:** Whenever editing shared code, run `npm run kit-sync` so `sw.js` gets bumped cleanly; if editing an app directly, bump its `sw.js` version before deploying (`npm run deploy -- <app>`). In the browser, do a hard reload or clear site data / Application → Service Workers → Update.

### 2. Black screen when opening a game
`Keywords: black screen, blank, tdz, cannot access before initialization, referenceerror, crash`
- **Likely Cause:** A module initialization error (such as accessing a `const` helper before its declaration—Temporal Dead Zone—or an uncaught error in `mount()` / `play()`) aborted rendering before the canvas appeared.
- **Fix:** Open DevTools Console (`Option+Cmd+I` on Mac) to read the exact first thrown error and line number, run `npm test --workspace=<app>` plus a headless browser/live smoke load of `/<app>/#/play/<stage>` before deploying, and avoid calling module-level `const` bindings prior to their definition line.

### 3. `npm test` fails on `kit-check`
`Keywords: kit-check, kit-sync, test failed, strict, kit drift`
- **Likely Cause:** An edit was made in `kit/` without syncing apps, OR an app's copy in `apps/<app>/public/js/kit/` was edited manually without changing master [`kit/`](../kit/).
- **Fix:** Put shared changes in [`kit/`](../kit/) and run `npm run kit-sync`, then re-run `npm test`. Never leave un-synced manual edits inside `apps/*/public/js/kit/`.

### 4. `npm run deploy` refuses to run
`Keywords: deploy failed, uncommitted, working tree dirty, tools/deploy.mjs`
- **Likely Cause:** `tools/deploy.mjs` refuses to deploy when `git status` has uncommitted changes so production never drifts ahead of Git.
- **Fix:** Commit (or cleanly stash) all changes first, check `git status -sb`, then re-run `npm run deploy -- <app>`.

### 5. `git push` rejected (`fetch first` / non-fast-forward)
`Keywords: git push rejected, main, backup, rebase, nightly`
- **Likely Cause:** Automated nightly Studio backups commit directly to `origin/main`, moving the remote branch ahead of your local checkout.
- **Fix:** Run `git pull --rebase origin main && git push origin main`.

### 6. Voxel character missing, shows boxes, or wrong clothes/vestment colors
`Keywords: voxel, vox, art, stand-in, hex color, markers, idle, -idle, checklist`
- **Likely Cause:** Either the model slug hasn't been uploaded on `/studio/draw/` yet (so colored-box stand-ins display intentionally), its slug doesn't match `hub/public/js/art-content.js` (e.g. `monk-idle`, `nun-idle`, `saint-peter-idle`), or MagicaVoxel used custom RGB colors instead of the reserved marker hexes (`#255359` hair, `#0066ff`/`#0b346e` eyes, `#cccc99`/`#fad689` skin, `#ffcc99` shirt, `#ff9966` dress, `#ff9999` belt, `#ffcccc` shoes, `#ff77a8` chasuble, `#ffcc66` phelonion).
- **Fix:** Verify the exact slug on `/studio/draw/`, confirm marker hex codes in `looks.js`, and note that until missing `-idle` files are uploaded, Garden Givers intentionally freezes characters on walking frame `0` when stationary.

### 7. Finish-screen reward sticker swings wildly across the screen
`Keywords: sticker, swing, bob, animation, keyframes, css, finish screen`
- **Likely Cause:** Global `kit/base.css` defines a gentle `@keyframes bob` animation for finish stickers. If a game's own `app.css` also defines `@keyframes bob` (for crops, waves, etc.) with a large `translateX` or transform swing, it overrides `base.css`'s gentle sticker bob.
- **Fix:** Namespace game-specific animations uniquely (for example `@keyframes cropBob` in Garden Givers) and never reuse `bob` as a `@keyframes` name in `apps/*/public/css/app.css`.

### 8. Game gave the wrong giant/mini sticker vs. stars
`Keywords: sticker, giant, mini, 3 stars, mistakes, byStars, store.js, ui.js`
- **Likely Cause:** Arcade games must pass/honor `byStars: true` so **3★** always earns a **giant sticker** (even with mistakes), **2★** earns a **mini sticker**, and **0–1★** earns no new sticker—unlike learning apps where 0 mistakes decides giant vs. mini.
- **Fix:** Verify `byStars: true` in shared [`kit/store.js`](../kit/store.js) and [`kit/ui.js`](../kit/ui.js) and sync with `npm run kit-sync`.

### 9. Spoken lines or sound effects are silent
`Keywords: audio, sound, muted, safari, ios, voice, tts, match`
- **Likely Cause:** Browsers block Web Audio / `Audio` playback until a user tap/gesture unlocks audio (`kit/sound.js`), a line hasn't been recorded in `/admin/voices.html`, or you are in **Saints Match**, where per-card TTS is intentionally muted during fast flipping so taps stay snappy.
- **Fix:** Tap anywhere in the game UI after load to unlock audio, verify volume/mute toggles, check `/admin/voices.html` for missing lines, or test `/<app>/api/tts` in DevTools Network.

### 10. Characters walk through orchard trees or helper monks stack in Garden Givers
`Keywords: tree collision, helper, courier, garden, stack, disappear, overlap`
- **Likely Cause:** Walk targets missing tree collision clearance (`TREE_COLLIDER_R = 4.4`, `clearTarget`, `stepWithCollisions`), or helper courier routing mismatching persistent posts (`MAX_COURIERS = 2`, `HELPER_POSTS`).
- **Fix:** Keep `TREE_COLLIDER_R`, `clearTarget`, and `stepWithCollisions` active for gardener and courier paths in `apps/garden/public/js/plot.js`, and run `npm test --workspace=garden` to validate ordering/collision logic.

### 11. Keys, Cloudflare tokens, or Stripe secrets
`Keywords: secrets, env, wrangler, api key, cloudflare, stripe, gitignore`
- **Likely Cause:** Risk of committing admin keys, Cloudflare tokens, or Stripe secrets into public Git history.
- **Fix:** Never commit `.env` or secret files to Git; manage Worker secrets via Cloudflare / Wrangler secrets (`wrangler secret put ...`) and keep browser Admin keys only in your local browser session/storage when intentionally clicking "Remember on this device".
