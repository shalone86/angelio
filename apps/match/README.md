# Saints Match

An Angelio game (`angelio.org/match/`), **a playable demo** for now: arcade memory cards with Catholic saints and their signs, built to be fast and replayable while kids pick up who the saints are along the way.

## How it plays

- **2-second starting flash:** Every board deals face-up for a quick look, then flips face-down so observant players can chain matches right away.
- **Wave after wave (1:30 stages):** Clearing a board awards a Wave Clear bonus and deals the next wave immediately. Match quickly before the combo bar empties to build a multiplier up to `×5` (`×6` with St. Carlo).
- **Saint ↔ Symbol pairs:** Early boards match saints face-to-face, then ramp into matching each saint to their sign (like St. Peter and his keys, or St. Paul and his sword). Flipping a card updates the status clue silently alongside crisp sound effects (per-card speech is muted so fast flipping stays responsive).
- **✨ Golden Halo pair (Feast Rush):** One pair per board wears a golden shimmer; matching it triggers a brief **Feast Rush** worth double points!
- **🌬️ Wind Swaps:** On later boards, a breeze visibly slides two face-down cards to swap places. Matching a swapped card earns a **Sharp Eye ⚡** bonus.
- **🔥 All Saints Rush (Endless):** Unlocks with 2 stars on The Apostles. Starts with a 40 s clock (capped at 45 s); every match and board clear adds time back as boards grow from 4 to 8 pairs mixing all 36 saints.
- **Star-based stickers:** **3★** earns a **giant sticker** regardless of misses; **2★** earns a **mini sticker** and opens the next stage/patron helper.

## Stages & Patron Helpers

Six stages keep 3 male + 3 female parity in every stage except The Apostles:
1. **The Apostles** (6 men)
2. **Early Church** (3 men, 3 women)
3. **Eastern Church** (3 men, 3 women)
4. **Western Church** (3 men, 3 women)
5. **Modern Saints** (3 men, 3 women)
6. **Patron Saints** (3 men, 3 women)

Plus **All Saints Rush** (endless) and 6 unlockable **Patron Helpers** (3 men, 3 women), each with a perk and trade-off.

## Voxel art & testing

Every saint looks for `<slug>-idle` (for example `saint-peter-idle`) from `angelio.org/api/art` (listed on the Studio's Drawings page under `Saints Match: ...`), rendering a voxel portrait via `public/js/portraits.js` (with recolored uploaded stand-ins until each custom saint model is drawn). `vox.js`, `looks.js` and `three-r128.min.js` are kept identical to Candle Rack / Hub and verified by `test/copies.test.js`. Pure rules and star thresholds live in `public/js/match.js` and `test/match.test.js`.

```sh
npm test --workspace=match
```
