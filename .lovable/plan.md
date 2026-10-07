# Hifz Daily System and Portability

## Goal
Turn Hifz into a practical daily memorization routine using the traditional Sabaq, Sabqi, and Manzil cycle, while keeping the rules understandable and portable for a future native Android rebuild.

## What to build
- Add a daily plan that separates new memorization (Sabaq), recent revision (Sabqi), and older revision (Manzil), with sensible defaults and editable surah/ayah selections.
- Let each practice block launch the existing recitation studio at its selected range; mark a block complete only after the learner records a completed practice.
- Persist plan settings and practice history locally, show due work and a small retention summary, and handle day changes safely.
- Extract the plan rules and persisted data shape into a UI-independent TypeScript module, and document the portable product rules and native recreation guidance for a future agent.

## Technical notes
- Preserve the current browser recitation engine; native microphone recognition is a later platform-specific adapter, not part of this change.
- Keep progress local-only and avoid introducing authentication or a backend dependency.
- Record the shared domain boundary in the project’s root `AGENTS.md` so future platform work can recreate the same behavior without copying web-specific UI code.

## Verification
- Run the existing focused tests and TypeScript validation.
- Check the Hifz page in the preview for the daily blocks, selection flow, and completion state.
