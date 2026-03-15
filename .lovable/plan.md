

## Plan: Active Verse Highlighting + Accuracy Improvements

### 1. Highlight active verse with white/bright background

Update `VerseCard` so the active verse stands out with a prominent white background (on light mode) or elevated surface color (on dark mode), making it obvious where to read:

- **VerseCard.tsx**: Change the `isActive` style from `bg-primary/5 border-primary/20` to `bg-white border-primary/30 shadow-md` (with dark mode variant `dark:bg-white/10`). This gives a clear "reading position" indicator.

### 2. Accuracy improvements

Three changes to make detection more reliable:

**a) Use interim results for comparison (not just final)**
Currently, `onResult` only fires on `isFinal` transcripts, which may batch multiple verses together. Instead:
- In `use-speech-recognition.ts`: Reset `fullTranscriptRef` after each `onResult` call so each comparison is scoped to the current verse segment, not an ever-growing transcript.
- Pass each final segment individually rather than the accumulated full transcript.

**b) Use fuzzy substring matching instead of strict positional word match**
The current `compareTexts` does strict index-by-index word comparison, which breaks if the user says extra words or the API returns slightly different word boundaries. Improve `arabic-compare.ts`:
- Switch to a **longest common subsequence (LCS)** approach: count how many words from the correct verse appear in the spoken text in order (not necessarily contiguous). Score = LCS length / correct verse word count.
- This handles insertions, partial matches, and word-boundary differences much better.

**c) Use interim transcripts for early verse advancement**
- Add an `onInterim` handler in `Index.tsx` that checks interim results against the current verse. If the interim score is already high (>0.6), advance to the next verse immediately rather than waiting for `isFinal`. This makes the UI feel more responsive.

### Files to change

| File | Change |
|------|--------|
| `src/components/VerseCard.tsx` | Update active verse styles to white/bright highlight with shadow |
| `src/lib/arabic-compare.ts` | Replace positional matching with LCS-based comparison |
| `src/hooks/use-speech-recognition.ts` | Reset transcript per segment; pass individual segments to `onResult` |
| `src/pages/Index.tsx` | Add `onInterim` handler for early verse advancement |

