
# Make recitation actually work — Mushaf UI + dual-engine voice

The current card-per-ayah UI and Scribe-only pipeline are why it feels clunky. This round we do two things together: rebuild the reading surface to look like a real mushaf, and rebuild the recognition pipeline so the highlight actually follows your voice.

Out of scope for this round: Hadith, Salah times, Tahfiz tracking, multi-page navigation across the whole Quran. We keep the MVP corpus (Surahs 112–114) so we can iterate fast, then expand once it feels right.

## 1. Mushaf-style reading surface

Replace `VerseCard` + the stacked card list with a single `MushafPage` component.

- One continuous justified RTL block, Amiri 28–32px, line-height ~2.4 — like a printed mushaf.
- Ayah numbers rendered inline as small ornamental circles (۝ + Arabic-Indic digit), not as a separate column.
- No card chrome, no per-ayah borders. The "active ayah" is shown only by softly tinting its background span (warm cream wash on the pressed-paper bg).
- Word-level state still drives color (correct = success-text, weak = dotted underline, missed = mistake-text, current = primary with subtle pulse). All inline, no panels.
- Tap-to-jump: tap any word to set it as the cursor (start listening from that ayah). Long-press a word in teacher mode to accept it as correct.
- Bismillah and surah header rendered once at top in the mushaf header style.

`SurahSelector` stays as a slim top bar. The big play/listen control becomes a single floating mic button bottom-center.

## 2. Recognition engine — dual path

Build a `RecognitionRouter` that exposes one interface (`start`, `stop`, `onPartial`, `onCommitted`) and routes to one of two backends based on a setting:

- **Scribe (default, low-latency)** — current pipeline, but pre-warmed on page load and switched to manual commit with a 1.2s rolling timer so partials flush faster.
- **Whisper (high-accuracy)** — new edge function `whisper-transcribe` that accepts ~3s audio chunks (webm/opus) and forwards to OpenAI `whisper-1` with `language=ar` and a verse-prompt biasing string (the upcoming 1–2 ayahs in plain Arabic). Returns text per chunk.

Client-side, when Whisper mode is on, we record via `MediaRecorder` in 2.5s chunks with 0.5s overlap, ship each chunk to the edge function, append the text to the rolling transcript, and feed the same matcher. A toggle in the header (“Accuracy: Fast / Precise”) flips between them. Default = Precise (Whisper) since the user explicitly asked for it.

Note on API key: OpenAI is not currently connected. We'll add the `openai` standard connector (or fall back to a manual `OPENAI_API_KEY` secret) before deploying the function. The plan defers that to the connect step at implementation time — no action needed from you yet.

## 3. Verse-locked beam matcher (replaces the current single-shot NW align)

`src/lib/beam-matcher.ts` — new. Maintains a small set of beams (K=5), each a `{ ayahIdx, wordIdx, score }`. On every new committed/partial token:

- For each beam, try three moves: advance the word pointer (cost = phonetic distance to expected next word), skip the expected word (small penalty, capped consecutive), or ignore the spoken token (insertion penalty).
- Keep top-K by cumulative score. Display state derives from the best beam: words behind it = correct/weak/missed (frozen), word at pointer = current, words ahead = default/dimmed.
- Crossing into the next ayah is automatic when the best beam advances past the last word. No more `verseStartOffset` slicing — beams own the position.

This fixes both "pointer doesn't follow smoothly" and "verse advance feels wrong" because the matcher never has to reset between ayahs.

## 4. AI re-scorer (tiebreaker only)

When the top two beams are within a small score gap (ambiguous), call an edge function `recitation-rescore` once with the last ~2s of transcript and the candidate next-words for each beam. Use `google/gemini-3-flash-preview` via the Lovable AI Gateway with a strict tool schema returning `{ winner: 0 | 1 }`. Rate-limited to ≤2 calls/sec per session and only fires when ambiguous, so cost stays negligible.

## 5. Teacher review — make it not clunky

Stays inline (no panels) but lighter:

- Teacher mode toggle moves into the same header chip.
- In teacher mode, every word (not just missed) is tappable. Tap toggles between `correct ↔ missed` and persists via the existing `corrections-store`.
- Long-press shows a 2-button micro-popover: "Save pair globally" vs "Just here". This makes the global-vs-positional distinction visible instead of inferred.
- Add a small "✓ N corrections" counter chip next to the mode toggle.

## 6. Technical layout

```text
src/
  components/
    MushafPage.tsx          ← new, replaces VerseCard list in Index
    MushafWord.tsx          ← small inline word renderer (status + tap)
    MicButton.tsx           ← floating bottom-center mic
  hooks/
    use-recognition-router.ts ← new, picks Scribe or Whisper
    use-scribe-recognition.ts  ← keep, add pre-warm + manual commit
    use-whisper-recognition.ts ← new, MediaRecorder chunked
  lib/
    beam-matcher.ts         ← new, K-beam aligner
    arabic-compare.ts       ← keep phonemicNormalize + phoneticDistance, used by beam
    corrections-store.ts    ← unchanged
  pages/
    Index.tsx               ← rewired around MushafPage + RecognitionRouter + BeamMatcher
supabase/functions/
  whisper-transcribe/index.ts ← new (needs OPENAI_API_KEY)
  recitation-rescore/index.ts ← new (uses LOVABLE_API_KEY)
  scribe-token/index.ts       ← unchanged
```

## 7. Sequence of work

1. Mushaf UI shell (`MushafPage`, `MushafWord`, `MicButton`, rewire `Index`) — visible win first.
2. Beam matcher + integrate with existing Scribe pipeline; remove `verseStartOffset` slicing.
3. Whisper edge function + `use-whisper-recognition` + router toggle.
4. AI re-scorer edge function + ambiguity gate in beam matcher.
5. Teacher review polish (long-press popover, counter chip).

I'll surface the OpenAI connector step (or a secret prompt as fallback) right before step 3 — nothing needed from you now.
