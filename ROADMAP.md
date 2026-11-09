# Angelio roadmap

Free learning games for kids at **angelio.org**, made by a Catholic family. Free with the device's
voice; donations welcome; a paid Pro voice (natural Cloudflare voice) with an access token later.

## Live

| App | Path | Grades | Repo |
|---|---|---|---|
| Snap & Split | /snap/ | PreK | shalone86/snap-split |
| Regroup! | /regroup/ | 1–3 | shalone86/regroup |
| Doubles | /doubles/ | 1–3 | not on GitHub yet |
| Grammar! | /grammar/ | 1–3 | not on GitHub yet |
| Articulate | /articulate/ (and articulate.shalonely.com, kept on purpose: a friend uses it) | All ages | shalone86/articulation |

## Backburner (remind the owner after each new thing we finish)

**Paid speech checks.** Reading aloud stays free (device voice). "Say it out loud" checking costs
real money (Whisper on Workers AI), so it needs a key:
- A parent pays (Stripe, or Ko-fi / Buy Me a Coffee memberships) and gets a short code by email.
- They enter it once on the hub; all apps share angelio.org, so every app sees it (e.g. localStorage `angelio:key`).
- Each app's Worker checks the key before `/api/transcribe` and keeps a monthly count per key (KV or D1) to cap costs.
- A small free daily sample (say 10 checks) so parents can try it.
- Without a key, the mic button hides or falls back to "listen and compare" (Articulate already has it).
- Not urgent: the owner isn't sharing Angelio widely yet.

## Next apps

- **Phonics & reading** (PreK–2): sounds, blending, Elkonin boxes, letter tiles, decodable sentences, read-aloud checked with voice recordings (reuse articulation's recorder and Whisper scoring; whole words work better than single sounds for young voices).
- **Writing skills** (1–4): build and expand sentences ("The dog ran." → "The big dog ran fast."), fix run-ons, order sentences into a paragraph, topic sentences.
- ~~**Fractions**~~: live as **Fraction Feast** (angelio.org/fractions/). Next ideas: animate equivalent fractions (cut each half into 2 → 4 quarters), fractions greater than 1, grade 4.
- **Multiplication & division beyond Doubles** (3–4): arrays → area model, dealing into groups, remainders.
- **Catholic history**: saints, the early Church, councils and great moments on drag-and-drop timelines; maps of missions and pilgrimages.
- **World history**: build timelines and maps yourself (drag events, place civilizations), memory games.
- **U.S. history**: interactive maps and timelines from the first peoples to today.
- Possibly on the hub later: **Hablar** (Spanish, hablar.shalonely.com).
- **Articulate keeps both addresses**: articulate.shalonely.com must keep working (no redirect). Don't set HOME_URL for it.

## Platform

- **Catholic words and themes** in questions across all apps (counting rosary beads, saints' names in grammar sentences, feast days in the calendar questions). Plan: keep each app's question banks in data files so a "Catholic" set can be swapped in.
- **Pro voice access token**: all apps share angelio.org, so one token in localStorage (e.g. `angelio:token`) can unlock the Pro voice everywhere; each app's Worker checks it before calling Workers AI, and the device voice is the free default.
- **Donations**: a donate link on the hub (and a small "Support Angelio" link on each app's grown-ups page).
- **Shared look**: every app built from shalone86/app-template (lesson cards, varied prompts, voice with fallback, sounds, motion, offline).
- **Back to the hub**: a small "Angelio" link in each app's top bar.
- **Accounts stay optional** (or never): progress lives on the device; an export/import code for moving between devices.
