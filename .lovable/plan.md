

## Problem

The current pointer uses a **fixed-speed timer** (e.g. 650ms per word) to advance, regardless of how fast or slow you actually speak. This is why it feels disconnected from your voice — it's not following you, it's running on a clock.

## Root cause

The Browser Speech API doesn't fire word-by-word — it sends chunks of recognized text. So we added a timer to "smooth" the display. But that timer moves independently of your actual speech, which defeats the purpose.

## Solution: Speech-driven pointer (no timer)

Remove the interval-based advancement entirely. Instead, apply `progressiveWordStatus` results **directly** to the display. The speech API already tells us which words have been spoken — we just need to show that immediately. CSS transitions (300ms) will handle visual smoothness.

### Changes

**`src/pages/Index.tsx`**
- Remove the `displayedIndexRef`, `targetWordStatuses` ref, and the smooth-pointer `useEffect` interval
- Remove `wordSpeed` state and the Settings popover (no longer needed)
- In `advanceVerse`, call `setDisplayedWordStatuses(statuses)` directly from `progressiveWordStatus` result
- In `handleInterim`, also update displayed statuses directly so the pointer moves as soon as interim results arrive
- Keep the stall detection as-is

**`src/components/VerseCard.tsx`**
- Keep the existing `transition-colors duration-300` on words — this provides the visual smoothness without a timer

This means:
- Say a word → speech API recognizes it → pointer moves to that word immediately
- If you pause, the pointer pauses with you
- If you speak fast, it keeps up
- CSS transitions make color changes feel smooth, not jarring

### Why this is better than the timer approach

The timer tried to simulate smooth movement but created a disconnect. By going speech-driven, the pointer is always in sync with your voice. The 300ms CSS transition provides enough visual smoothness without artificial delays.

