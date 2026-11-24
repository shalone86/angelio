# Angelio Documentation

Welcome to the Angelio handbook and technical reference for **[angelio.org](https://angelio.org)**. Everything here is written in plain English so you can jump straight to a game's rules, understand how the site fits together, or fix an issue fast.

## Start Here

- **[Games & Apps Handbook](./games-guide.md)** — How every arcade game and learning app works: controls, stages, star scores, giant vs. mini stickers, unlockable characters, and Studio / Admin tools.
- **[Technical Help & Troubleshooting](./tech-help.md)** — Answers on why Angelio uses `#/` hash links (and how that compares to Ghost), how Workers and `kit/` fit together, voxel & audio workflows, and a searchable Symptom → Cause → Fix cookbook.
- **[Searchable Help Center (`help.html`)](./help.html)** — Double-click `docs/help.html` to open a standalone, offline-friendly browser page with instant search, keyboard shortcuts (`/` to search, `Esc` to clear), and category filters across all games and tech topics.
- **[Selling Unlock Codes](./selling-codes.md)** — Notes on promo/unlock codes (`/api/code`).
- **[Roadmap](../ROADMAP.md)** — Planned features, art checklists, Studio milestones, and Backburner items.

---

## Where Everything Lives in the Repo

Angelio keeps all 14 live apps and the hub in one monorepo:

| Folder | What lives here | Live URL |
|---|---|---|
| [`hub/`](../hub/) | Home page, `/games/` hub, `/stickers/` Sticker World, `/studio/`, `/admin/`, and the edge router placing every app under its folder path | `angelio.org` |
| [`kit/`](../kit/) | Master shared browser modules (router, progress store, star/sticker UI, sounds, speech, sprites, VFX) synced into apps | Synced via `npm run kit-sync` |
| [`template/`](../template/) | Starter scaffold for building a new Angelio app | — |
| [`tools/`](../tools/) | Repo automation (`deploy.mjs`, `kit-sync.mjs`, `kit-check.mjs`, `each.mjs`, `voice-lines.mjs`) | — |
| [`docs/`](./) | Game guides, Markdown tech help, offline searchable `help.html`, and selling code notes | Repo docs |
| [`workshop/`](../workshop/) | Working notes and experiments kept out of production bundles | — |
| [`art/`](../art/) & [`backup/`](../backup/) | Source art assets and nightly Studio content snapshots | — |

### The 5 Arcade Games

| Game | Folder | Live URL | Core Idea |
|---|---|---|---|
| **Candle Rack** | [`apps/candles/`](../apps/candles/) | `/candles/` | Keep vigil lamps & beeswax candles burning and clear stubs around the church |
| **Mass Usher** | [`apps/usher/`](../apps/usher/) | `/usher/` | Greet arrivals, scoot seated parishioners, and seat everyone quickly |
| **Monastery Porter** | [`apps/porter/`](../apps/porter/) | `/porter/` | Greet guests & deliveries at the monastery gate with a single yes/no choice |
| **Saints Match** | [`apps/match/`](../apps/match/) | `/match/` | Fast arcade memory pairs matching Catholic saints with their signs |
| **Garden Givers** | [`apps/garden/`](../apps/garden/) | `/garden/` | Protect monastery beds, fruit trees, and herbs from critters and harvest Food Bank baskets |

### The 9 Learning Apps

| App | Folder | Live URL | Focus |
|---|---|---|---|
| **PreK Math** | [`apps/snap/`](../apps/snap/) | `/snap/` | Early counting and number sense (PreK) |
| **Regroup!** | [`apps/regroup/`](../apps/regroup/) | `/regroup/` | Addition & subtraction regrouping (Grades 1–3) |
| **Doubles** | [`apps/doubles/`](../apps/doubles/) | `/doubles/` | Doubles facts fluency (Grades 1–3) |
| **Fraction Feast** | [`apps/fractions/`](../apps/fractions/) | `/fractions/` | Visual fractions practice |
| **Grammar!** | [`apps/grammar/`](../apps/grammar/) | `/grammar/` | Parts of speech & sentence grammar (Grades 1–3) |
| **Letter Lane** | [`apps/letters/`](../apps/letters/) | `/letters/` | Letter sounds & phonics (PreK–K) |
| **Read Aloud** | [`apps/read/`](../apps/read/) | `/read/` | Guided reading aloud (Grades 1–3) |
| **Watch & Sing** | [`apps/watch/`](../apps/watch/) | `/watch/` | Video lessons, courses, quizzes, songs, and albums |
| **Articulate** | [`apps/articulate/`](../apps/articulate/) | `/articulate/` | Speech practice (standalone setup outside `kit/`) |

---

## Everyday Commands

Run commands from the repo root (`/Users/shalone/.gemini/antigravity/scratch/angelio`):

```bash
npm install                  # One shared install for the whole monorepo
npm test                     # Strict kit-check + all app test suites
npm run kit-sync             # Copy updated kit/ files to apps (and bump sw.js)
npm run kit-check            # See where an app's kit/ files differ from kit/
npm run deploy -- garden     # Pull-clean check + deploy one Worker (hub, garden, match, ...)
npm test --workspace=garden  # Run tests for a single app
```

## Quick Question: Why Do Internal Links Have `#/`?

Short version: Angelio apps are single-page web apps designed to work offline from one `index.html`. Everything **before** the `#/` (`/garden/`, `/match/`, `/games/`) is a clean folder URL handled by the server, while everything **after** the `#/` (`#/play/garden`, `#/grownups`) is handled purely in the browser by `kit/router.js` without hitting the network. See **[Hash Links (`#/`) Explained](./tech-help.md#why-angelio-links-use-)** in the Tech Help guide for the full comparison with Ghost blogs.
