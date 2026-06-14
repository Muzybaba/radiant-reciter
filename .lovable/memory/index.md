# Project Memory

## Core
Muraqaba: All-in-one Islamic app — Quran (read + recite), Hadith library, Hifz tracker, Salah times.
Quran MVP: last three Surahs (112, 113, 114) for recitation matching; full surah list browsable in Hifz.
Visuals: "Pressed Paper" / Noir & Gold, Cormorant + Karla + Amiri.
Nav: Mobile-first bottom tab bar (Quran / Hadith / Hifz / Salah). No auth — local-only progress for now.
Stack: Supabase backend (via Lovable Cloud) + small public APIs (aladhan for prayer times, fawazahmed0 hadith CDN).
Constraints: No separate post-recitation review panels; all feedback inline.

## Memories
- [Backend Architecture](mem://tech/backend) — Supabase schema and configuration for mistake tracking
- [Voice Recognition](mem://features/voice-recognition) — Browser Speech API implementation with stability workarounds
- [Recitation Flow](mem://features/recitation-flow) — Real-time UI feedback for continuous recitation mode
- [Recitation Matching](mem://logic/recitation-matching) — Arabic text normalization and dual-logic matching (Greedy + LCS)
