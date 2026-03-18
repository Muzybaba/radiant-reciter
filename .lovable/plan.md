

## Problem

1. **Word-by-word review panel only appears after stopping** — the diff summary section with `VerseDiff` components only shows after `finishRecitation()`. The user wants mistakes to be visible inline immediately, not in a separate post-recitation panel.

2. **Recognition stalls/jumps** — when audio is unclear, the speech API may stop producing results, causing the pointer to freeze and then jump. The user wants an Arabic voice prompt ("أعد" / repeat) when this happens.

## Plan

### 1. Remove the post-recitation diff panel entirely

The separate "Word-by-word review" section (`showDiff`, `VerseDiff`, `verseDiffs`) is redundant since completed verses already show inline green/red word colors via `verseWordStatuses`. Remove the diff panel UI and related state (`showDiff`, `verseDiffs`, `VerseDiff` import).

**File: `src/pages/Index.tsx`**
- Remove `showDiff`, `verseDiffs` state
- Remove the `diffEntries` computation and the `AnimatePresence` block rendering `VerseDiff`
- Remove `VerseDiff` and `diffWords` imports
- Keep `verseWordStatuses` — this already colors completed verses inline
- In `finishRecitation`, just set `isReciting = false` (no diff building)

### 2. Add stall detection with Arabic voice prompt

Detect when recognition produces no new words for ~4 seconds while actively reciting. Use the browser's `SpeechSynthesis` API to speak "أعد" (repeat) in Arabic.

**File: `src/pages/Index.tsx`**
- Add a `lastTranscriptTime` ref, updated every time `handleResult` or `handleInterim` fires
- Add a `useEffect` interval (every 1s) that checks if `isReciting && (now - lastTranscriptTime > 4000)`. If so:
  - Use `window.speechSynthesis.speak(new SpeechSynthesisUtterance("أعد"))` with `lang = "ar"`
  - Reset the timer so it doesn't spam (set a cooldown of ~6 seconds)

**File: `src/hooks/use-speech-recognition.ts`**
- On `recognition.onend`, if still supposed to be listening (continuous mode), auto-restart to prevent silent drops. This addresses the "jumps" issue where the recognition silently stops.

### 3. Auto-restart recognition on silent end

The Web Speech API sometimes silently ends in continuous mode. Add auto-restart logic.

**File: `src/hooks/use-speech-recognition.ts`**
- Add a `shouldBeListening` ref
- On `recognition.onend`, if `shouldBeListening` is true, call `recognition.start()` again after a short delay
- Set `shouldBeListening = false` only when `stop()` is explicitly called

