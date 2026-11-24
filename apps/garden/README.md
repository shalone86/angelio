# Garden Givers

An Angelio game (`angelio.org/garden/`), **a playable demo** for now: protect the monastery garden, fruit orchard, and herb planters from bugs, birds, squirrels, and night critters; harvest what the Food Bank requests; and watch the courier carry each completed basket down the path!

## How it plays

- **Protect your crops:** Bugs, birds, squirrels, and night critters land on your garden beds, fruit trees, and herb planters. Tap critters (or their bouncing pin) right away to shoo them off and build a combo before they eat your produce! Bugs & crows leave in `1` tap; **squirrels and night raccoons take `2` taps** to chase off.
- **Pick for the Food Bank:** Food Bank orders ask for specific produce (for example, Carrots, or Apples + Pears + Celery). Tap ripe crops matching an open order to fill its slots; when complete, one of **2 persistent helper monks/sisters** walks round-robin between opposite rest posts to carry the basket to the Food Bank cart (with solid tree collision `r = 4.4` so characters walk around orchard trunks cleanly).
- **Don't keep the Food Bank waiting:** Every order starts with fresh bonus points that count down toward zero — and once overdue, ticks into negative points!
- **Four timed 0:45 stages (`150 / 250 / 425` star targets) + Endless Harvest:**
  1. **The Garden** (vegetable beds: carrots, tomatoes, celery)
  2. **The Orchard** (adds apple & pear trees + 2-tap squirrels)
  3. **The Herb Garden** (adds basil & mint planters + larger 3-item orders)
  4. **Night Vigil** (protect every bed, tree, and herb at night against escalating bursts including 2-tap raccoons — no orders or picking)
  5. **Endless Harvest** (opens with 2★ on The Garden: critter waves ramp up every 30 seconds until the eaten-produce meter fills at 10 eaten crops)
- **Star-based stickers (`byStars: true`):** **3★** earns a **giant sticker** regardless of mistakes; **2★** earns a **mini sticker** and opens the next stage and gardener; **0–1★** earns no new sticker.

## Starters & Unlockable Gardeners

- Start as **Brother Gardener** or **Sister Gardener** (reusing shared `monk` / `nun` voxel models; stationary walkers hold frame `0` cleanly until `-idle` models are uploaded in Studio).
- Unlock 4 specialist gardeners (2 monks, 2 nuns): **Brother Bug-Shooer** (auto-shoos bugs), **Sister Double Harvest** (1 tap picks 2 items), **Brother Patient** (food bank orders stay fresh longer), and **Sister Green Thumb** (crops ripen & regrow faster). Pick on Home or right on the Finish screen.

More details: [Games & Apps Handbook](../../docs/games-guide.md).

```sh
npm test --workspace=garden
```
