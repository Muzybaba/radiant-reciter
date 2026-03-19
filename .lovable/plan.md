

## Problems Identified

1. **Transcript is lost on recognition restart** — When the Web Speech API silently ends and auto-restarts, each new session resets `event.resultIndex`. The hook only sends the current segment, not the accumulated transcript. This means after a restart, the matching logic receives incomplete text and the highlighting breaks or jumps.

2. **Highlighter jumps too fast** — `progressiveWordStatus` processes all spoken words instantly and jumps the pointer to the end of the matched region. If the user says 3 words between renders, the pointer leaps 3 words at once instead of smoothly advancing word by word.

3. **Stall detection fires during recognition gaps** — When recognition restarts (300ms gap), `lastTranscriptTime` isn't updated, which can contribute to false stall triggers.

## Plan

### 1. Accumulate transcript across recognition restarts

**File: `src/hooks/use-speech-recognition.ts`**

Add a `cumulativeTranscriptRef` that appends each final result segment. On `onResult`, send the cumulative transcript (not just the latest segment). On `onInterim`, send cumulative + current interim. Add a `reset()` function that clears the accumulation, called when starting a new recitation session.

This ensures recognition restarts don't lose previous words.

### 2. Smooth word-by-word pointer advancement

**File: `src/pages/Index.tsx`**

Instead of directly setting `activeWordStatuses` from `progressiveWordStatus` (which jumps), introduce a "target statuses" and a "displayed statuses" model:

- `progressiveWordStatus` computes the target (where matching has reached)
- A `useEffect` with a short interval (~250ms) advances the displayed statuses one word at a time toward the target
- The "current" pointer moves smoothly, one word per tick, creating a karaoke-like flow

This decouples the speech matching speed from the visual pointer speed.

### 3. Longer transition on word color changes

**File: `src/components/VerseCard.tsx`**

Increase the CSS `transition-colors duration` from `150ms` to `300ms` so color changes feel smoother rather than instant.

### 4. Fix stall detection timing

**File: `src/pages/Index.tsx`**

Update `lastTranscriptTime` in the recognition restart logic too (via a callback or by resetting it when the hook signals a restart). Also increase the stall threshold to 8 seconds to be safe, since the smooth pointer adds visual delay.

### Summary of changes

| File | Change |
|------|--------|
| `use-speech-recognition.ts` | Accumulate transcript across restarts, expose `reset()` |
| `Index.tsx` | Smooth pointer advancement via interval, fix stall timing |
| `VerseCard.tsx` | Increase transition duration to 300ms |
| `arabic-compare.ts` | No changes needed |

