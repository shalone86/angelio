# Angelio

Free learning games, video lessons and songs for kids, everything read aloud, at **[angelio.org](https://angelio.org)**.
All of Angelio lives in this one repo.

| Folder | What | Lives at |
|---|---|---|
| `hub/` | the angelio.org home page, `/games/` hub, Sticker World (`/stickers/`), `/studio/`, `/admin/`, and the router that puts every app under its path | angelio.org |
| `apps/candles` | Candle Rack (church vigil candles & Adoration chapel game) | /candles/ |
| `apps/usher` | Mass Usher (seat families in church pews game) | /usher/ |
| `apps/porter` | Monastery Porter (monastery gatekeeper game) | /porter/ |
| `apps/match` | Saints Match (Catholic saints & symbols memory game) | /match/ |
| `apps/garden` | Garden Givers (monastery garden & Food Bank game) | /garden/ |
| `apps/snap` | PreK Math (PreK) | /snap/ |
| `apps/regroup` | Regroup! (1–3) | /regroup/ |
| `apps/doubles` | Doubles (1–3) | /doubles/ |
| `apps/grammar` | Grammar! (1–3) | /grammar/ |
| `apps/fractions` | Fraction Feast | /fractions/ |
| `apps/letters` | Letter Lane (PreK–K) | /letters/ |
| `apps/read` | Read Aloud (1–3) | /read/ |
| `apps/watch` | Watch & Sing: video lessons, courses, quizzes, songs and albums | /watch/ |
| `apps/articulate` | Articulate (speech practice) | /articulate/ and articulate.shalonely.com |
| `kit/` | master shared kit synced into apps | |
| `template/` | starter scaffold for new apps | |
| `docs/` | game handbook, searchable Markdown tech help, offline `help.html`, and selling code notes | |

Each app is still its own Cloudflare Worker, with its own `wrangler.jsonc`. The apps were brought in with their
full history (their old repos are archives now).

```bash
npm install              # once, at the top: one shared install for every app
npm test                 # every app's tests + strict kit check
npm run deploy -- watch  # deploy one app (hub, letters, …); refuses if there's uncommitted work
npm run kit-sync         # copy shared kit/ changes into every kit app and bump sw.js
npm run kit-check        # where an app's copy of the shared kit differs from kit/
```

## Documentation & Tech Help

- **[Documentation Home](docs/README.md)** — Repo overview and starting index.
- **[Games & Apps Handbook](docs/games-guide.md)** — Rules, stages, star scores, stickers, unlockables, Studio, and Admin tools across every game and learning app.
- **[Technical Help & Troubleshooting](docs/tech-help.md)** — Why internal links use `#/` (vs. Ghost), Worker architecture, deploy rules, voxel markers, and Symptom → Cause → Fix guides.
- **[Offline Searchable Help Center (`docs/help.html`)](docs/help.html)** — Open directly in any browser for instant topic search and category filtering.

What's next is in [ROADMAP.md](ROADMAP.md): the Angelio Studio, so every lesson, song, quiz and game can be
edited without code.

## License

MIT, see [LICENSE](LICENSE). The name "Angelio" and its logo are not part of the license.
