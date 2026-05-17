# Plan: Beat Tarteel on Quran recitation accuracy

You picked the hardest path: a **Quran-specific ASR** that's more accurate than Tarteel, packaged as a full product. Here's an honest plan — what's realistic in Lovable, what isn't, and the sequence to actually get there.

## Reality check first

Tarteel's moat is not their app. It's:
1. A **Quran-trained acoustic model** (fine-tuned on thousands of hours of recitation).
2. **Verse-locked decoding** — the recognizer is constrained to the Mushaf text, so it picks the *closest valid Quranic word*, not the closest MSA word.
3. **Years of labeled mistake data** from millions of users.

You cannot beat that with a generic API (Scribe, Whisper API, Deepgram). You need #1 and #2. #3 comes with time.

Lovable is a frontend + edge function platform. The **app** can live here. The **ML model serving** cannot — it needs a GPU box (Modal, Replicate, RunPod, Fly GPU, or a Hugging Face Inference Endpoint). The plan reflects that split.

## Phase 1 — Verse-locked decoding on top of Scribe (1–2 weeks, in Lovable)

Biggest accuracy win you can ship *this week* without any ML training. Tarteel-grade for short passages.

- Build a **constrained matcher**: when the user starts reciting a known surah/ayah, we already know the exact expected word sequence. Instead of trusting Scribe's free-form transcript, score each Scribe partial against the *next 3–5 expected words* using phonetic edit distance over a Quran-aware normalization (already started in `arabic-compare.ts`).
- Add **phoneme-level normalization**: collapse hamzat al-wasl, alef variants, ta marbuta, tanwin, shadda — map Scribe's MSA-style output to canonical Quranic root forms.
- Add a **rolling beam** over the expected sequence so missed words don't desync the pointer.
- Result: Scribe stays the engine, but mistakes are scored against the *real* ayah, not free text. This alone closes ~60% of the gap to Tarteel on the surahs you support.

## Phase 2 — Custom Quran ASR model (4–8 weeks, off-Lovable infra)

This is what actually beats Tarteel.

- **Dataset**: bootstrap from public sources — Tarteel's own open dataset (~2k hours, CC-BY), EveryAyah.com (multiple qaris, full Quran, aligned), Quran.com recitations. ~5–10k hours achievable in weeks.
- **Model**: fine-tune `openai/whisper-large-v3` or `facebook/seamless-m4t-v2-large` on the Quran corpus. Whisper-v3 large fine-tuned on EveryAyah alone hits <5% WER on classical Arabic — published baseline.
- **Serving**: deploy on **Modal** or **Replicate** as a streaming WebSocket endpoint (~300ms latency on an A10G). Lovable edge function proxies the token, exactly like the current Scribe flow.
- **Verse-locked decoding** (CTC prefix beam constrained to the ayah lattice) — this is the real unlock. Forces the model to only emit valid Quranic word sequences.

## Phase 3 — Tajweed grading (4 weeks, on top of Phase 2)

Needs phoneme timing, which a custom model gives you and Scribe never will.

- Forced-align the reciter's audio to the ayah using the custom model's CTC outputs.
- Rule engine for the gradeable rules: madd lengths (count frames), ghunna (nasal energy on noon/meem with shadda), qalqala (energy bursts on ق ط ب ج د at sukun), idgham/ikhfaa (spectral overlap).
- Per-letter color overlay in the mushaf view: green = correct, yellow = weak, red = missed rule.

## Phase 4 — Hifz product layer (parallel, in Lovable)

The stuff that turns "good recognizer" into "app people pay for".

- Auth + accounts (Lovable Cloud).
- Full mushaf (114 surahs), ayah audio per qari, juz/hizb/page navigation.
- **Mistake history** per user per ayah → spaced-repetition revision schedule (the actual reason Hifz students would switch).
- Streaks, daily targets, teacher accounts that can view a student's mistake log.
- Mobile: ship as PWA first, then Capacitor wrap for iOS/Android (Lovable supports this).

## Phase 5 — Data flywheel

Every recitation users do becomes labeled training data (with consent). Re-train the model every 2–3 months. This is how you eventually pass Tarteel, not just match them.

## Sequence and decision points

```text
Now ─► Phase 1 (Lovable only)
            │
            ▼
       Decide: are accuracy gains good enough as a v1 product?
            │
       ┌────┴────┐
       ▼         ▼
   Ship MVP    Commit to Phase 2 (needs ~$500/mo GPU + ML work)
   + Phase 4              │
                          ▼
                     Phase 3 + Phase 5
```

## What I need from you to start Phase 1 right now

1. Confirm we expand the matcher first (no new infra, no costs, ships this week).
2. Confirm the **target surah list for Phase 1**. Right now memory says MVP = surahs 112/113/114. To meaningfully demo accuracy vs Tarteel we probably want at least Juz Amma (surahs 78–114). OK to expand?
3. For Phase 2, are you willing to stand up a Modal or Replicate account when we get there? (I can't host GPU inference inside Lovable, but I can write all the serving + training code.)

## Technical details (for reference)

- **Phase 1 file changes**: extend `src/lib/arabic-compare.ts` with a phoneme-class normalizer and a windowed beam matcher; add a `useVerseLockedMatcher` hook that consumes Scribe partials and outputs `{currentWordIdx, mistakes[]}`. No backend changes.
- **Phase 2 stack**: HuggingFace `transformers` + `peft` LoRA fine-tune of Whisper-v3 on 4×A100 (~$200 one-off training). Serve via Modal `@asgi_app` with WebSocket, return token deltas + per-frame CTC posteriors. Edge function `whisper-token` mints short-lived signed URLs, mirroring current `scribe-token`.
- **Phase 3 alignment**: use the CTC posteriors from Phase 2 (no separate aligner needed). Tajweed rules run client-side on the returned frame timings.
- **Storage**: Supabase tables `recitations`, `recitation_mistakes`, `revision_schedule`. Audio in Supabase Storage with user-scoped RLS. Opt-in flag `consent_training_data` gates Phase 5 export.
