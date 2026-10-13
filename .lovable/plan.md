# Hifz Tajweed Voice Examiner

## Goal
Extend the Hifz Ustadh from word-matching into audio-based Tajweed coaching with ayah-specific, actionable feedback.

## Experience
- Let learners recite as they do today; when they stop or finish, examine the captured practice audio against the selected Quran passage.
- Give concise, inline teacher feedback tied to the ayah and relevant Tajweed rule, with a spoken correction in the selected Ustadh/Ustadha voice and a trusted reference recitation.
- Distinguish observed evidence from uncertainty. When audio quality or evaluator confidence is insufficient, say so instead of presenting a guess as a correction.
- Keep audio temporary for evaluation; do not save recordings.

## Technical approach
- Add an audio-capture boundary that does not couple the Tajweed rules or result contract to browser-only UI, preserving future Android recreation.
- Verify an audio-capable model and supported gateway request before implementing the examiner; do not infer Tajweed correctness from Scribe's transcript or substitute a text-only model.
- Ground findings in the selected surah/ayah and a curated Tajweed reference; constrain result fields and validate them before speaking or displaying feedback.
- Keep existing word alignment and correction behavior intact. Tajweed findings supplement, rather than replace, word/ayah feedback.

## Safety and validation
- Treat model-generated rule judgments as coaching suggestions until checked against recitations reviewed by a qualified Tajweed teacher.
- Test supported rules and uncertainty/failure states with representative Arabic recitation audio; verify no recording is persisted and feedback stays attached to the correct ayah.
- If the available audio model cannot reliably distinguish Tajweed features, stop short of claiming it can and surface only grounded rule guidance until a validated evaluator exists.

## Technical details
- Keep domain contracts and Tajweed reference mapping platform-independent; isolate microphone capture, upload, and playback behind adapters.
- Preserve the existing Ustadh voice picker and inline-feedback constraint.
- Reuse the current secure server-side function boundary for model access; no model key or prompt in browser code.