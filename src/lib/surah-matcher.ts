/**
 * Surah-level verse-locked alignment.
 *
 * Concatenates every word of every ayah in a surah into one flat lattice, runs
 * a Needleman-Wunsch alignment of the spoken transcript against it, then splits
 * the resulting per-word statuses back into per-verse arrays. This is the
 * "beam matcher" in spirit — there is a single global pointer that flows
 * across ayah boundaries, so verse advancement is implicit (no manual reset,
 * no transcript slicing).
 */

import {
  phonemicNormalize,
  type WordStatus,
} from "./arabic-compare";

// Re-export for callers
export type { WordStatus };

export interface SurahLikeVerse {
  number: number;
  text: string;
}
export interface SurahLike {
  id: number;
  verses: SurahLikeVerse[];
}

export interface SurahAlignment {
  /** Per-verse word statuses, parallel to surah.verses */
  verseStatuses: WordStatus[][];
  /** Per-verse, per-word: which normalized spoken token aligned here (or null) */
  alignedSpokenNorm: (string | null)[][];
  /** Per-verse, per-word: confidence 0..1 */
  confidences: number[][];
  /** Position of the "current" pointer (best guess at where the reciter is) */
  currentVerseIdx: number;
  currentWordIdx: number;
}

export interface SurahAlignOptions {
  acceptedPairs?: Set<string>;
  /** Position-specific overrides: `${surahId}:${verseIdx}:${wordIdx}` */
  acceptedSlots?: Set<string>;
  surahId?: number;
  emitWeak?: boolean;
}

// Phonetic helpers (kept local so we can tune separately from arabic-compare).
function levenshteinNorm(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return 1;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] / Math.max(m, n);
}

function phoneticDistance(a: string, b: string): number {
  if (!a || !b) return 1;
  if (a === b) return 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length >= 2 && longer.startsWith(shorter)) return 0.15;
  return levenshteinNorm(a, b);
}

function splitVerseWords(text: string): string[] {
  return text.replace(/\u0640/g, "").replace(/\s+/g, " ").trim().split(" ");
}

export function alignSurah(
  spoken: string,
  surah: SurahLike,
  opts: SurahAlignOptions = {}
): SurahAlignment {
  const { acceptedPairs, acceptedSlots, surahId, emitWeak = true } = opts;

  // Build flat lattice
  const flatOriginal: string[] = [];
  const flatNorm: string[] = [];
  const ownerVerse: number[] = [];
  const ownerWord: number[] = [];
  surah.verses.forEach((v, vi) => {
    const words = splitVerseWords(v.text);
    words.forEach((w, wi) => {
      flatOriginal.push(w);
      flatNorm.push(phonemicNormalize(w));
      ownerVerse.push(vi);
      ownerWord.push(wi);
    });
  });
  const n = flatNorm.length;

  // Empty surah edge case
  if (n === 0) {
    return {
      verseStatuses: [],
      alignedSpokenNorm: [],
      confidences: [],
      currentVerseIdx: 0,
      currentWordIdx: 0,
    };
  }

  // Build empty per-verse outputs
  const verseStatuses: WordStatus[][] = surah.verses.map((v) =>
    splitVerseWords(v.text).map(() => "default" as WordStatus)
  );
  const alignedSpokenNorm: (string | null)[][] = surah.verses.map((v) =>
    splitVerseWords(v.text).map(() => null as string | null)
  );
  const confidences: number[][] = surah.verses.map((v) =>
    splitVerseWords(v.text).map(() => 0)
  );

  const spokenNorm = phonemicNormalize(spoken);
  if (!spokenNorm) {
    verseStatuses[0][0] = "current";
    return {
      verseStatuses,
      alignedSpokenNorm,
      confidences,
      currentVerseIdx: 0,
      currentWordIdx: 0,
    };
  }

  const wordsSpoken = spokenNorm.split(" ");
  const m = wordsSpoken.length;

  const INS = 0.7; // skip spoken token
  const DEL = 0.9; // skip expected word
  const STRONG_THRESHOLD = 0.30;
  const WEAK_THRESHOLD = 0.55;
  const PENDING_THRESHOLD = 0.75;

  const subCost = (si: number, ci: number): number => {
    if (acceptedPairs && acceptedPairs.has(`${flatNorm[ci]}|${wordsSpoken[si]}`)) return 0;
    return phoneticDistance(wordsSpoken[si], flatNorm[ci]);
  };

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const bt: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) { dp[i][0] = i * INS; bt[i][0] = 1; }
  for (let j = 1; j <= n; j++) { dp[0][j] = j * DEL; bt[0][j] = 2; }

  for (let i = 1; i <= m; i++) {
    const isLastSpoken = i === m;
    for (let j = 1; j <= n; j++) {
      const diag = dp[i - 1][j - 1] + subCost(i - 1, j - 1);
      const up = dp[i - 1][j] + INS;
      // tail bias: at end of spoken stream, skipping remaining expected words is cheap
      const left = dp[i][j - 1] + (isLastSpoken ? DEL * 0.4 : DEL);
      let best = diag, dir = 0;
      if (up < best) { best = up; dir = 1; }
      if (left < best) { best = left; dir = 2; }
      dp[i][j] = best;
      bt[i][j] = dir;
    }
  }

  let i = m, j = n;
  let lastMatchedFlatIdx = -1;
  let pendingCurrentFlatIdx = -1;

  while (i > 0 && j > 0) {
    const dir = bt[i][j];
    if (dir === 0) {
      const sub = subCost(i - 1, j - 1);
      const vi = ownerVerse[j - 1];
      const wi = ownerWord[j - 1];
      alignedSpokenNorm[vi][wi] = wordsSpoken[i - 1];
      confidences[vi][wi] = Math.max(0, 1 - sub);
      if (sub <= STRONG_THRESHOLD) {
        verseStatuses[vi][wi] = "correct";
        if (j - 1 > lastMatchedFlatIdx) lastMatchedFlatIdx = j - 1;
      } else if (sub <= WEAK_THRESHOLD) {
        verseStatuses[vi][wi] = emitWeak ? "weak" : "correct";
        if (j - 1 > lastMatchedFlatIdx) lastMatchedFlatIdx = j - 1;
      } else if (sub <= PENDING_THRESHOLD) {
        // Borderline match — still credit it (weak) so the final word of a
        // surah doesn't get stuck uncolored after a pause.
        verseStatuses[vi][wi] = emitWeak ? "weak" : "correct";
        if (j - 1 > lastMatchedFlatIdx) lastMatchedFlatIdx = j - 1;
      } else {
        verseStatuses[vi][wi] = "missed";
        if (j - 1 > lastMatchedFlatIdx) lastMatchedFlatIdx = j - 1;
      }
      i--; j--;
    } else if (dir === 1) {
      i--;
    } else {
      // skipped expected word — mark missed only if we've already passed it
      if (j - 1 <= lastMatchedFlatIdx) {
        const vi = ownerVerse[j - 1];
        const wi = ownerWord[j - 1];
        verseStatuses[vi][wi] = "missed";
      }
      j--;
    }
  }

  // Apply slot overrides
  if (acceptedSlots && surahId != null) {
    for (let vi = 0; vi < verseStatuses.length; vi++) {
      for (let wi = 0; wi < verseStatuses[vi].length; wi++) {
        if (
          acceptedSlots.has(`${surahId}:${vi}:${wi}`) &&
          verseStatuses[vi][wi] !== "correct"
        ) {
          verseStatuses[vi][wi] = "correct";
        }
      }
    }
  }

  // Place the "current" pointer — sit on the LAST word the reciter said
  // (so the pulse stops where they paused), not on the next expected word.
  let cursorFlat: number;
  if (pendingCurrentFlatIdx >= 0) {
    cursorFlat = pendingCurrentFlatIdx;
  } else if (lastMatchedFlatIdx >= 0) {
    cursorFlat = lastMatchedFlatIdx;
  } else {
    cursorFlat = 0;
  }
  const cursorVi = ownerVerse[cursorFlat];
  const cursorWi = ownerWord[cursorFlat];
  // Overlay the pulse on top of whatever status that word has.
  verseStatuses[cursorVi][cursorWi] = "current";

  return {
    verseStatuses,
    alignedSpokenNorm,
    confidences,
    currentVerseIdx: cursorVi,
    currentWordIdx: cursorWi,
  };
}
