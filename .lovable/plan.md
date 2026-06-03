# Make the voice recognition actually feel like Tarteel — all inside Lovable

## How Tarteel actually does it (short version)

Tarteel is not magic. Three things stacked:

1. **A Quran-tuned acoustic model.** They fine-tuned Whisper/Conformer on thousands of hours of recitation (Tarteel Dataset, EveryAyah, Quran.com qaris). It already "expects" classical Arabic phonemes — emphatic ص/ض/ط/ظ, ق vs ك, ح vs ه — instead of guessing MSA words.
2. **Verse-locked decoding.** They never let the recognizer output free text. The decoder is constrained to the mushaf: at every step it picks the most likely *next valid Quranic word from the expected ayah*, not the closest Arabic word. This is the single biggest accuracy unlock.
3. **Per-letter forced alignment.** Once the audio is matched to the ayah, CTC posteriors tell them exactly which letter you dropped, lengthened, or substituted. That's how the red/green highlighting feels surgical.

We can't ship (1) inside Lovable (no GPU). We **can** ship a much better (2) and a usable (3) — entirely in the app, no new infrastructure, no extra cost beyond Scribe + Lovable AI.

## What we'll build — three layers, all in-app

### Layer A — Verse-locked beam matcher (replaces current aligner)

Today `arabic-compare.ts` runs Needleman–Wunsch over the **whole** transcript vs the whole ayah, once per partial. That's why the pointer drifts on long ayahs and why a missed word desyncs everything.

Replace it with a **rolling beam over the expected sequence**:

- Maintain `K=5` candidate pointer positions (beams), each with a score.
- For each new Scribe partial, only score the *last 1–3 spoken tokens* against the *next 3–6 expected words* from each beam — not the full DP.
- Allow insertions (filler/noise) and deletions (skipped word) with caps, so one missed word can't desync the rest of the ayah.
- Pointer = best beam's current word. Mistakes = words the surviving beam marked as substituted/deleted.

Effect: pointer follows you smoothly mid-ayah, missed words light up immediately, recovering after a mistake is instant.

### Layer B — Lovable AI re-scoring for ambiguous partials

When Scribe emits a partial that doesn't cleanly match any beam (score gap < threshold), send a tiny request to Lovable AI Gateway:

- Model: `google/gemini-2.5-flash-lite` (cheapest, ~50ms).
- Prompt: "Spoken: `<scribe_partial>`. Expected next words: `<3 words from each top beam>`. Which is closest phonetically in Quranic Arabic? Return JSON `{beam, confidence}`."
- Use only as a **tiebreaker**, not on every partial. Caps at ~2–3 calls/sec per user.

This patches Scribe's worst confusions (ث/س, ذ/ز, ق/ك, ح/خ/ه) without us training anything. Free with Lovable AI.

### Layer C — Per-word confidence + audible feedback

- Each correct word stores its alignment score; below 0.7 = "weak" (yellow underline), below 0.45 + still consumed = "wrong" (red).
- Optional soft "tick" sound on a confidently-correct word so the user feels the app is keeping up. Toggle in settings.

### Layer D — Pre-warm + commit tuning (Scribe stability)

Small wins that compound:

- Connect Scribe **on page load** (not on first tap) so the first ayah doesn't lose the first 600ms.
- Switch commit strategy from `VAD` to `manual` with a 1.5s timer — VAD over-commits on long madd and breaks our pointer.
- Send a 200ms warm-up of silence after connect so the model's RNN state is initialized before the user starts.

## What we explicitly will NOT do (and why)

- **No custom GPU model.** That's the Phase 2 plan from `.lovable/plan.md`. The user wants this all in Lovable; we keep it that way.
- **No Whisper-via-edge-function fallback.** Latency is too high (3–5s) for live following; would degrade UX even if accuracy is better on paper.
- **No tajweed grading yet.** Needs phoneme timings Scribe doesn't expose. Revisit only if user explicitly asks.

## File changes (technical)

- `src/lib/arabic-compare.ts` — add `BeamMatcher` class, keep `verseLockedAlign` as a fallback for one-shot diff views (MistakeSummary).
- `src/hooks/use-verse-locked-matcher.ts` *(new)* — owns beam state across partials, exposes `{ currentVerseIdx, currentWordIdx, statuses, weakWords }`.
- `src/hooks/use-scribe-recognition.ts` — pre-warm connect, switch to manual commit + 1.5s timer, expose `connectionState`.
- `src/lib/ai-rescorer.ts` *(new)* — Lovable AI tiebreaker, debounced + rate-limited.
- `supabase/functions/ai-rescore/index.ts` *(new)* — proxies to `https://ai.gateway.lovable.dev` with `LOVABLE_API_KEY`, returns `{beam, confidence}`.
- `src/components/VerseCard.tsx` — render "weak" state (yellow underline) in addition to existing correct/missed/current.
- `src/pages/Index.tsx` — swap to the new hook; remove the per-partial full-verse alignment loop.

## Sequence

```text
1. Layer A (beam matcher)        ─► biggest perceived accuracy jump, ship first
2. Layer D (Scribe pre-warm/commit) ─► ships with A, ~30 min of work
3. Layer C (weak/strong UI)      ─► ships with A
4. Layer B (AI re-scorer)        ─► ships after A is verified working
```

## Two quick questions before I build

1. **Sound feedback** on each correct word — yes (subtle tick), or no (visual only)?
2. **AI re-scorer** uses Lovable AI credits (cheap but not free at scale). OK to enable by default, or gate behind a "Higher accuracy" toggle?
