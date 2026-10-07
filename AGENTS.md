# Architecture Guidance

- Keep Hifz plan types, scheduling/date rules, validation, and persisted data contracts in a UI- and platform-independent TypeScript domain module; keep browser storage, native storage, speech recognition, and presentation behind adapters so another platform can reproduce the same learner experience without inheriting web-only assumptions.