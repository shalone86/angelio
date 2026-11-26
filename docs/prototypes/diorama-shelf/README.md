# Voxel diorama shelf prototype

Open [index.html](index.html) directly in a browser. The preview is self-contained and saves the arrangement, turns, shelf design, lighting, and world in that browser. Raised Garden Beds is the preferred direction. Tap a slot and choose a collectible. Tap an occupied slot for turn and clear controls.

The prototype has six positions across two rows, four backdrop worlds, and four lighting presets. The collectible angles and their cast shadows come from voxel geometry. The backdrops use shaded block faces rendered from a fixed camera. Missions, Parish Bells, and the Prize Box are future integration ideas. The prototype lives under docs, outside the deployed Hub assets.

## Pick up here

- Refine the full-width background crop and its fit against the raised beds at different screen sizes.
- Keep the back-row spots easy to tap when the shelf is full.
- Try treating whole backdrops as Prize Box rewards, with Parish Orchard available as a starter world.

## Rebuild the artwork

From the repository root, run these commands after changing the corresponding generator. Both update the embedded artwork in `index.html`.

```sh
node docs/prototypes/diorama-shelf/shelf-art.mjs
python3 docs/prototypes/diorama-shelf/shelf-worlds.py
```

Edit the scenery blocks in `shelf-worlds.py`. The figure and prop catalog, camera and shadow projections are in `shelf-art.mjs`. The shelf layout and interactions are in `index.html`.
