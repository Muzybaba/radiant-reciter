/**
 * Teacher corrections — locally persisted feedback that teaches the matcher
 * which Scribe mishearings should count as correct.
 *
 * Two kinds of corrections:
 *  - pair:  (correctNorm, spokenNorm) — global equivalence. If Scribe outputs
 *           `spokenNorm` for a word whose normalized form is `correctNorm`,
 *           treat it as a perfect match anywhere in the Quran.
 *  - slot:  `${surahId}:${verseIdx}:${wordIdx}` — position-specific override.
 *           Used when no spoken word aligned to that position (skipped /
 *           dropped by Scribe) but the teacher confirms it was recited.
 */

import { phonemicNormalize } from "./arabic-compare";

const PAIRS_KEY = "muraqaba.corrections.pairs.v1";
const SLOTS_KEY = "muraqaba.corrections.slots.v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

let pairs = readSet(PAIRS_KEY);
let slots = readSet(SLOTS_KEY);

function emit() {
  for (const l of listeners) l();
}

export function subscribeCorrections(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAcceptedPairs(): Set<string> {
  return pairs;
}

export function getAcceptedSlots(): Set<string> {
  return slots;
}

export function pairKey(correctNorm: string, spokenNorm: string): string {
  return `${correctNorm}|${spokenNorm}`;
}

export function slotKey(surahId: number, verseIdx: number, wordIdx: number): string {
  return `${surahId}:${verseIdx}:${wordIdx}`;
}

/**
 * Record that a word at a specific position was correctly recited.
 * If the aligner had a spoken candidate for that slot, save it as a global
 * pair. Otherwise save a position-specific override.
 */
export function acceptCorrection(opts: {
  surahId: number;
  verseIdx: number;
  wordIdx: number;
  correctWord: string;
  spokenWord: string | null;
}) {
  const correctNorm = phonemicNormalize(opts.correctWord);
  const spokenNorm = opts.spokenWord ? phonemicNormalize(opts.spokenWord) : "";

  if (correctNorm && spokenNorm && correctNorm !== spokenNorm) {
    pairs = new Set(pairs);
    pairs.add(pairKey(correctNorm, spokenNorm));
    writeSet(PAIRS_KEY, pairs);
  } else {
    // Either Scribe heard nothing for this slot, or it heard the exact word
    // and the aligner still marked it missed (shouldn't happen, but cover it).
    slots = new Set(slots);
    slots.add(slotKey(opts.surahId, opts.verseIdx, opts.wordIdx));
    writeSet(SLOTS_KEY, slots);
  }
  emit();
}

export function clearAllCorrections() {
  pairs = new Set();
  slots = new Set();
  writeSet(PAIRS_KEY, pairs);
  writeSet(SLOTS_KEY, slots);
  emit();
}

export function correctionsCount(): number {
  return pairs.size + slots.size;
}
