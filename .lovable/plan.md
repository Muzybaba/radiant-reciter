# Better recitation tracking — upgrade voice engine

## Goal

Make the highlighter follow your recitation accurately, in real time, even with tajweed, slow elongations, and quiet voice. The current browser Speech API is the bottleneck — it's inconsistent for Arabic, drops words, and only emits chunks (never letter-by-letter), so no client logic can fully fix it.

## Why the browser API can't get much better

- Chrome's `webkitSpeechRecognition` is not Quran-aware. It mishears tajweed, merges words, and frequently drops audio after silences.
- It never exposes letters or phonemes — only loose word chunks. "Letter by letter" tracking is impossible on top of it.
- It auto-stops on pauses, which breaks the flow when you elongate (madd).

## Recommended approach: ElevenLabs Scribe v2 Realtime

Switch the recognition engine from browser Web Speech to **ElevenLabs Scribe v2 Realtime**. It streams audio over WebSocket and returns:
- partial transcripts with very low latency
- committed transcripts with **per-word timestamps**
- strong Arabic accuracy (much better than Chrome for Quranic recitation)

This unlocks:
- A pointer that moves the moment a word is recognized (true speech-driven, like the previous plan, but actually accurate).
- Proper handling of long madd / pauses without the engine cutting out.
- Clean per-word matching against the verse using the existing `progressiveWordStatus` logic — no algorithm change needed, just a better signal feeding it.

## Why not "letter by letter"

Even Scribe doesn't expose phonemes live. True letter-level tracking would require a custom forced-aligner (e.g. wav2vec2 fine-tuned on Quran) running server-side — weeks of work and heavy infra. **Word-level with reliable timestamps gives the same UX feel** at a fraction of the complexity, because Arabic recitation words are short and the pointer updates feel immediate.

## What changes

### Backend (Lovable Cloud)
- Enable Lovable Cloud.
- Add `ELEVENLABS_API_KEY` secret.
- Edge function `scribe-token` that mints a 15-min single-use realtime token (keeps the API key server-side).

### Frontend
- Add `@elevenlabs/react`.
- New hook `useScribeRecognition` (mirrors the current `useSpeechRecognition` interface: `start`, `stop`, `reset`, `onInterim`, `onResult`) backed by `useScribe` with `commitStrategy: "vad"` and `language: "ara"`.
- `src/pages/Index.tsx` swaps the hook import. The matching logic, pointer, pulse animation, and stall detection stay the same — they just receive a much better transcript stream.
- Keep the current Web Speech hook as a fallback if the user denies the network call or the token endpoint fails.

### UX tweaks while we're in there
- Lower the interim threshold (now 0.55) since Scribe is more reliable — pointer advances sooner.
- Remove the 8-second "أعد" auto-prompt on the first pass (it fired during legitimate madd); replace with a softer visual hint after 12s of silence.

## Cost / setup note

ElevenLabs Scribe Realtime is a paid API. You'll need an ElevenLabs account and API key. Pricing is per audio-minute; a typical recitation session is cheap, but it is not free like the browser API.

## Out of scope

- True phoneme/letter-level alignment (requires custom ML model).
- Tajweed-rule scoring (separate future feature).
- Storing recitation history (separate Cloud feature).
