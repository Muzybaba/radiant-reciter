## Home Interface Plan

Build a new Home view that lives inside the existing app shell — no new route. The sidebar gets a "Home" entry at the top; selecting it swaps the main canvas from the Mushaf page to the new Home view. Selecting any surah (from sidebar or from the Home grid) returns to the Mushaf view.

Aesthetic stays locked to the existing **Noir & Gold + Cormorant/Karla + Amiri** system. No new colors, no new fonts.

### Content blocks (in order)

1. **Hero — Greeting + CTA**
   - Tiny gold eyebrow: `In the name of Allah` (uppercase, tracked).
   - Big Cormorant headline: `Begin in stillness.` (or time-aware: Good morning / evening).
   - One-line Karla subtitle about Muraqaba — recite, be corrected, remember.
   - Primary CTA: **Start Reciting** (gold-bordered button) → jumps to last-opened surah in Mushaf view and auto-focuses the mic.
   - Secondary ghost link: **Choose a Surah** → scrolls to the grid below.
   - Soft ornamental divider underneath (thin gold rule with a centered ۝-style glyph).

2. **Surah Grid (MVP: 112, 113, 114)**
   - Section label: `THE LAST THREE` (uppercase, tracked, gold).
   - 3 cards in a responsive grid (1-col mobile, 3-col desktop).
   - Each card: large Amiri Arabic name (right-aligned), Latin name + meaning underneath, ayah count, and a subtle hover lift with gold border glow.
   - Click anywhere on card → opens that surah in the Mushaf.

3. **Daily Ayah**
   - Quote-styled block: a single short ayah in Amiri (centered, large), translation in Cormorant italic underneath, attribution as `Surah · Ayah` in tracked uppercase.
   - For MVP: pick deterministically from the loaded surahs based on the day-of-year (no backend).
   - Framed by thin gold corner brackets to feel manuscript-like.

### Routing / state

- No router change. Add a `view: "home" | "mushaf"` state in `src/pages/Index.tsx`, defaulting to `"home"`.
- `SurahSidebar` gets a new top item **Home** above the surah list. Active state mirrors current sidebar pattern (gold left border + `text-accent`).
- Selecting a surah anywhere flips `view` to `"mushaf"`.
- Mobile: add a Home pill alongside the existing `SurahSelector` (or a small Home icon button).

### Files

- **New:** `src/components/HomeView.tsx` — composes Hero, SurahGrid, DailyAyah.
- **New:** `src/components/home/Hero.tsx`, `src/components/home/SurahGrid.tsx`, `src/components/home/DailyAyah.tsx` (kept small + focused).
- **Edit:** `src/components/SurahSidebar.tsx` — add Home item + `activeView` prop + `onSelectHome`.
- **Edit:** `src/pages/Index.tsx` — add `view` state, render `HomeView` vs Mushaf block, wire CTA + grid clicks to switch view + set `activeSurahId`.

### Out of scope (per your answers)

- No stats/progress block, no "continue where you left off" card, no new route.
- No backend changes — daily ayah is picked locally.
- Recitation engine, matcher, mic logic untouched.

### Open question

You wrote "I want the app to be" and the message cut off — I'll proceed with the spec above, but if you had a specific vibe word (calmer, more cinematic, more minimal, more devotional, etc.) drop it and I'll fold it in before building.
