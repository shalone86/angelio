# Angelio

Free learning games, video lessons and songs for kids, everything read aloud, at **[angelio.org](https://angelio.org)**.
All of Angelio lives in this one repo.

| Folder | What | Lives at |
|---|---|---|
| `hub/` | the angelio.org home page, Sticker World, the admin pages, and the router that puts every app under its path | angelio.org |
| `apps/snap` | Snap & Split (PreK) | /snap/ |
| `apps/regroup` | Regroup! (1–3) | /regroup/ |
| `apps/doubles` | Doubles (1–3) | /doubles/ |
| `apps/grammar` | Grammar! (1–3) | /grammar/ |
| `apps/fractions` | Fraction Feast | /fractions/ |
| `apps/letters` | Letter Lane (PreK–K) | /letters/ |
| `apps/read` | Read Aloud (1–3) | /read/ |
| `apps/watch` | Watch & Sing: video lessons, courses, quizzes, songs and albums | (preview) |
| `apps/articulate` | Articulate (speech practice) | /articulate/ and articulate.shalonely.com |
| `template/` | the app template (and, for now, the source of the shared kit) | |

Each app is still its own Cloudflare Worker, with its own `wrangler.jsonc`. The apps were brought in with their
full history (their old repos are archives now).

```bash
npm install              # once, at the top: one shared install for every app
npm test                 # every app's tests
npm run deploy -- watch  # deploy one app (hub, letters, …); refuses if there's uncommitted work
npm run kit-check        # where an app's copy of the shared kit differs from the template's
```

What's next is in [ROADMAP.md](ROADMAP.md): the Angelio Studio, so every lesson, song, quiz and game can be
edited without code.

## License

MIT, see [LICENSE](LICENSE). The name "Angelio" and its logo are not part of the license.
