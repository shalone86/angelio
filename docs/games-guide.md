# Angelio Games & Apps Handbook

This is the plain-English guide to every game, learning app, and companion tool on **[angelio.org](https://angelio.org)**.

- Looking to launch a game directly? Visit **[angelio.org/games/](https://angelio.org/games/)**.
- Looking for error fixes or why internal links use `#/`? See **[Technical Help & Troubleshooting](./tech-help.md)** or open **[`help.html`](./help.html)**.

---

## How Rewards, Stars & Stickers Work Across Angelio

### Arcade Games (5 games)

**Candle Rack**, **Mass Usher**, **Monastery Porter**, **Saints Match**, and **Garden Givers** all share the `byStars: true` sticker rule in [`kit/store.js`](../kit/store.js) and [`kit/ui.js`](../kit/ui.js):

| Stage Result | Sticker Earned | Unlocks |
|---|---|---|
| **3 stars (★★★)** | **Giant sticker** (no matter how many mistakes or spills happened) | Unlocks the next stage + character unlocks requiring 2★ or 3★ |
| **2 stars (★★)** | **Mini sticker** | Unlocks the next stage + 2★ characters/endless modes |
| **0–1 star (★ / ☆☆☆)** | **No new sticker** (already earned stickers remain on your board) | Practice continues; current stage stays open |

### Learning Apps (9 apps)

Learning apps (**PreK Math**, **Regroup!**, **Doubles**, **Fraction Feast**, **Grammar!**, **Letter Lane**, **Read Aloud**, and **Watch & Sing** quizzes) award:
- **Giant sticker** for finishing with **0 mistakes**
- **Mini sticker** for finishing with **1 or more mistakes**

### Voxel Art & Marker Colors (`looks.js`)

3D voxel games (**Candle Rack**, **Mass Usher**, **Monastery Porter**, **Saints Match**, and **Garden Givers**) fetch `.vox` MagicaVoxel models from `angelio.org/api/art` (managed on `/studio/draw/`). Until a model is uploaded, built-in colored-box stand-ins keep the game playable.

If you paint a character model with these reserved marker hex colors in MagicaVoxel, the game recolors them per character/season automatically:

| Part | Marker Hex Color(s) | Behavior |
|---|---|---|
| Hair | `#255359` | Randomized natural hair colors (gray/white for `older`) |
| Eyes | `#0066ff`, `#0b346e` | Randomized eye colors |
| Skin | `#cccc99`, `#fad689` | Randomized skin tones |
| Shirt / Dress / Belt / Shoes | `#ffcc99` / `#ff9966` / `#ff9999` / `#ffcccc` | Randomized Sunday clothes on parishioners |
| Roman Chasuble / Byzantine Phelonion | `#ff77a8` / `#ffcc66` | Automatically follows the liturgical season color on priests (`priest-*`, `east-priest-*`) |

---

## The 5 Arcade Games

### 1. Candle Rack (`/candles/`)

*Keep vigil candles and the sanctuary lamp burning before Mass begins.*  
Code: [`apps/candles/`](../apps/candles/) · Developer README: [`apps/candles/README.md`](../apps/candles/README.md)

- **Controls & Core Play:**
  - **Tap or swipe** across unlit or flickering (`< 25%` wax) candles to light them. Lighting within `2 s` builds a combo multiplier (`×2` at 3 in a row up to `×5` at 12).
  - **Light just in time:** Catching a flickering candle before it goes out awards bonus points.
  - **Watch the door & Sanctuary Lamp:** Drafts blow out rows after the door creaks; the Sanctuary Lamp drains over `20–30 s`—tap it to add oil before the room darkens.
  - **Relight your taper:** From Stage 2 onward, your lighting taper runs down after a set number of lights—tap the big paschal/altar candle to relight it.
  - **Blocked racks:** Praying parishioners kneel in front of racks, blocking two spots across both rows. Tap the **priest** or **altar server** so they walk behind the racks and light blocked candles for you.
- **Stages (90 s timed + Endless):**
  1. **Sunday Mass** (`roman`) — Normal burn, unlimited taper, 2 racks (16 spots).
  2. **Divine Liturgy** (`byzantine`) — Introduces the lighting taper limit.
  3. **Christmas Midnight Mass** (`roman`) — Faster burn and larger crowds.
  4. **Pascha** (`byzantine`) — Starts completely dark (`dark: true`); every candle begins unlit.
  5. **Adoration at Night** (Endless, opens after 2★ on Sunday Mass) — 4 racks (32 spots) around the monstrance. Candles activate over `240 s` and burn twice as fast every `180 s`; the round ends when too many active candles (`45%`, minimum `10`) are out at once.
- **Character Picker:** Candle Rack has **no** character picker.
- **Studio Layout Tool:** Move priest, server, big candle, lamp, and end-of-round spots live at **`/studio/candles/`** (saved to `/api/candles/layout`).

---

### 2. Mass Usher (`/usher/`)

*Welcome arriving families at the church doors and seat them together quickly before Mass starts.*  
Code: [`apps/usher/`](../apps/usher/) · Developer README: [`apps/usher/README.md`](../apps/usher/README.md)

- **Controls & Core Play:**
  - **Tap a pew** to walk the front family there, then **tap the pew again** to seat as many members as fit (or seat in back standing room, row 5, for reduced points).
  - **Swipe along a pew** to ask seated people to **scoot** toward the aisle or wall so a whole family can sit together. Some parishioners won't scoot (`📌` stayers).
  - **Scoring:** `10` pts per seated person vs. `4` pts per standing person, plus a `+3`/person quick bonus if seated within `8 s` of reaching the front of the line. Splitting families across distant pews reduces points.
- **Stages (120 s timed + Endless):**
  1. **Sunday Mass** (`roman`, 2★ `150` / 3★ `370`)
  2. **Divine Liturgy** (`byzantine`, 2★ `140` / 3★ `320`)
  3. **Christmas Midnight Mass** (`roman`, 2★ `140` / 3★ `260`)
  4. **Pascha** (`byzantine`, 2★ `100` / 3★ `240`)
  5. **Adoration at Night** (Endless, opens after 2★ on Sunday Mass) — Families arrive and leave (`stayFor: 25–50 s`); ends when `6` families pile up waiting at the doors.
- **Playable Ushers (all male; selectable on Home and Play Next / Finish):**
  - **Usher** (starter) — Balanced walking speed (`1×`) and normal scooting.
  - **Young Usher** (2★ on Sunday Mass) — Very fast (`1.5×` speed), but too shy to ask people to scoot (`noScoot`).
  - **Experienced Usher** (2★ on Divine Liturgy) — Automatically gets seated parishioners to scoot on arrival (`autoScoot`), walks slower (`0.7×`).
  - **Respected Usher** (2★ on Christmas Midnight Mass) — Normal speed (`1×`), and everyone listens—even pinned stayers scoot over (`moveStayers`).

---

### 3. Monastery Porter (`/porter/`)

*Answer the monastery gate—greet honored guests, let the needy in, and kindly turn away peddlers and roaming goats.*  
Code: [`apps/porter/`](../apps/porter/) · Developer README: [`apps/porter/README.md`](../apps/porter/README.md)

- **Controls & Core Play:**
  - **One decision per visitor:** **Welcome** (swipe up, tap the gate, tap Welcome, or press `W` / `↑` / `Space` / `Enter`) vs. **Send away** (swipe sideways, tap Send away, or press `S` / `←` / `→`).
  - **Mind the outgoing brothers:** Wait until an outgoing monk crosses the gate before welcoming someone in, or they bump elbows (`-combo`).
  - **Combos & Patience:** Every `5` right answers increases the multiplier (up to `×5`), plus quick-answer bonuses when answered with more than `55%` patience left; wrong answers cost `8` pts.
- **Stages (Timed + Endless):**
  1. **Sunday Mass** — Open church hospitality.
  2. **Guest Day** — Specific monastery guest rules.
  3. **The Great Silence** — Stricter admission rules while someone in real trouble always enters.
  4. **Feast Day Crowd** (Endless) — Runs until too many impatient visitors fill the gate line (`maxLine`).
- **Starters & Unlockable Porters (3 monks + 3 nuns; selectable on Home & Play Next):**
  - **Brother Porter** & **Sister Porter** (starters) — Standard balanced gatekeepers (`monk` / `nun` voxel models).
  - **Brother André** (2★ on Sunday Mass) — First mistake each minute is forgiven, combos step every `7` instead of `5`.
  - **Old Brother Porter** (2★ on Guest Day) — Visitors wait `1.4×` longer, slight `0.6 s` gap calling next visitor.
  - **Brother with the Dog** (2★ on The Great Silence) — Dog chases animals away automatically (`5` pts), then barks for `1.5 s` pausing Send away.
  - **Sister Portress** (3★ on Sunday Mass) — Visitors who belong glow warmly, though patience drains faster (`0.8×`).
  - **Sister with the Bell** (3★ on Guest Day) — One-shot bell (`B` key or button) refills waiting patience and pauses new arrivals for `5 s`.
  - **Respected Sister** (3★ on The Great Silence) — Outgoing brothers and visitors never bump (`noBump`), `0.85×` points per answer.

---

### 4. Saints Match (`/match/`)

*Fast arcade memory cards pairing Catholic saints with themselves and their signature symbols.*  
Code: [`apps/match/`](../apps/match/) · Developer README: [`apps/match/README.md`](../apps/match/README.md)

- **Controls & Core Play:**
  - **2-second opening peek:** Every board starts face-up briefly before flipping down.
  - **Card flips:** Tapping cards updates the status clue cleanly with crisp sound effects (per-card TTS is intentionally muted so fast flipping stays smooth).
  - **Combos & Feast Rush:** Chain matches quickly to climb up to `×5` (`×6` with St. Carlo). Matching the ✨ **Golden Halo** pair starts **Feast Rush** for double points.
  - **Wind Swaps:** Later boards blow two face-down cards into swapped spots; matching a swapped card awards a **Sharp Eye ⚡** bonus.
- **Stages (six 1:30 stages + Endless; strict 3M + 3F parity after The Apostles):**
  1. **The Apostles** (6 men)
  2. **Early Church** (3 men, 3 women)
  3. **Eastern Church** (3 men, 3 women)
  4. **Western Church** (3 men, 3 women)
  5. **Modern Saints** (3 men, 3 women)
  6. **Patron Saints** (3 men, 3 women)
  7. **All Saints Rush** (Endless, opens at 2★ on The Apostles) — Starts with a **40 s clock (capped at 45 s)**; every match and board clear adds seconds as boards grow from 4 to 8 pairs mixing all 36 saints.
- **Patron Helpers (Starter + 3 men / 3 women, each opened at 2★ on its stage):**
  - **Altar Server** (starter) — Balanced 2 s peek, `×5` max combo.
  - **St. Anthony** (2★ on The Apostles) — Reveals 1 lost pair per board (`0.9×` points).
  - **St. Lucy** (2★ on Early Church) — `+1.4 s` peek and `8.0 s` Feast Rush duration, faster wind swaps (`0.8×`).
  - **St. John Chrysostom** (2★ on Eastern Church) — `+4` pts on Saint ↔ Sign matches, `-0.5 s` peek.
  - **St. Clare** (2★ on Western Church) — First miss per board preserves your combo (`max ×4`).
  - **St. Carlo Acutis** (2★ on Modern Saints) — Steps combo every match (`×6` max) and extends Rush time, faster peek (`-0.9 s`).
  - **St. Cecilia** (2★ on Patron Saints) — Disables wind swaps (`noSwap`) and extends the combo bar to `6.5 s`.

---

### 5. Garden Givers (`/garden/`)

*Defend the monastery beds, orchard, and herbs from critters, and harvest ripe Food Bank orders.*  
Code: [`apps/garden/`](../apps/garden/) · Developer README: [`apps/garden/README.md`](../apps/garden/README.md)

- **Controls & Core Play:**
  - **Shoo critters (1 tap vs. 2 taps):** Tap critters or their pins immediately. **Bugs & crows** leave on `1` tap; **squirrels & night raccoons** take `2` taps to chase away!
  - **Harvest Food Bank baskets:** Tap ripe produce (Carrots, Tomatoes, Celery, Apples, Pears, Basil, Mint) matching an open Food Bank card. Completing a basket dispatches one of **2 helper monks/sisters** down the path to the cart.
  - **Watch the order freshness:** Completed orders earn fresh bonus points while young, and tick negative if kept overdue.
  - **Solid orchard trees:** Trees have collision clearance (`TREE_COLLIDER_R = 4.4`) so characters walk around trunks smoothly instead of clipping inside.
- **Stages (0:45 timed + Endless Harvest) & Star Targets (`100 / 200 / 300` across every timed stage):**
  1. **The Garden** (45 s) — Vegetable beds (Carrots, Tomatoes, Celery), bugs & birds.
  2. **The Orchard** (45 s, 2★ on Garden) — Adds Apple & Pear trees plus 2-tap squirrels.
  3. **The Herb Garden** (45 s, 2★ on Orchard) — Adds Basil & Mint planters plus larger 3-item Food Bank orders.
  4. **Night Vigil** (45 s, 2★ on Herbs) — Protect every bed, tree, and herb at night against escalating waves (including 2-tap raccoons)—no Food Bank orders or picking.
  5. **Endless Harvest** (opens at 2★ on The Garden) — Critter pressure steps up every `30 s` until the **eaten-produce meter** fills (`maxEaten: 10`).
- **Starters & Unlockable Gardeners (selectable on Home and Play Next):**
  - **Brother Gardener** & **Sister Gardener** (starters, reusing `monk` / `nun` models).
  - **Brother Bug-Shooer** (2★ on The Garden) — Automatically shoos critters near pests.
  - **Sister Double Harvest** (2★ on The Orchard) — Each ripe tap picks `2` matching items at once.
  - **Brother Patient** (2★ on The Herb Garden) — Food Bank orders stay fresh longer.
  - **Sister Green Thumb** (2★ on Night Vigil) — Crops ripen and regrow faster.

---

## The 9 Learning Apps

| App | Path | Audience | Summary |
|---|---|---|---|
| **PreK Math** | `/snap/` | PreK | Tap, count, and match small quantities; read aloud with giant/mini stickers |
| **Regroup!** | `/regroup/` | Grades 1–3 | Visual base-10 carrying & borrowing practice |
| **Doubles** | `/doubles/` | Grades 1–3 | Mental math doubles (`6+6`, doubles+1) mastery |
| **Fraction Feast** | `/fractions/` | Elementary | Slice, shade, and compare fractions on food plates |
| **Grammar!** | `/grammar/` | Grades 1–3 | Nouns, verbs, adjectives, and sentence building |
| **Letter Lane** | `/letters/` | PreK–K | Phonics, letter sounds, and early word building |
| **Read Aloud** | `/read/` | Grades 1–3 | Guided read-aloud practice using phoneme & speech checks |
| **Watch & Sing** | `/watch/` | All ages | Curated video lessons, courses, albums, songs, and interactive quizzes (managed in Studio) |
| **Articulate** | `/articulate/` | Speech practice | Standalone speech articulation practice app (`articulate.shalonely.com` / `/articulate/`, outside `kit/`) |

---

## Hub, Studio & Admin Tools

- **Games Hub (`angelio.org/games/`):** Shows all live games plus coming-soon ideas, displays your saved best score & stars per game from `<path>:v1` in `localStorage`, and includes 🔊 spoken descriptions.
- **Sticker World (`angelio.org/stickers/`):** Scenic boards where kids place the **giant** and **mini** stickers earned across every Angelio app.
- **Angelio Studio (`angelio.org/studio/`):** Password-protected editor (`Admin key`):
  - **Watch & Sing** (`/studio/`): Edit lessons, songs, courses, and albums with live preview, save history, and R2 backups.
  - **Reading lessons** (`/studio/reading.html`): Manage reading lesson content.
  - **Drawings** (`/studio/draw/`): Upload `.vox` MagicaVoxel files, track art checklists (including `-idle` animations), and preview rendered models.
  - **Candle Rack layout** (`/studio/candles/`): Drag priest, server, big candle, lamp, and procession spots in Roman & Byzantine churches.
- **Admin Dashboard (`angelio.org/admin/`):**
  - **Family Codes** (`/admin/`): Create, search, cap (default `300` monthly speech checks), or revoke unlock codes (`/api/code`).
  - **Letter Sounds** (`/admin/sounds.html`): Record phoneme/letter audio clips.
  - **Family Voices** (`/admin/voices.html`): Record spoken game lines for family voice packs (`<app>/api/tts`).
  - **Lead Sheets** (`/admin/leadsheet`): Print/format song lead sheets.
