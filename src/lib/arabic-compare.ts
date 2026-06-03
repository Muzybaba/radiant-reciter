/**
 * Normalize Arabic text by removing diacritics/tashkeel for comparison.
 */
export function normalizeArabic(text: string): string {
  return text
    // strip all diacritics / tashkeel / quranic marks
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    // unify alef forms
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, "\u0627")
    // unify ya / alef maksura
    .replace(/[\u064A\u0649\u06CC]/g, "\u064A")
    // unify ta marbuta -> ha
    .replace(/\u0629/g, "\u0647")
    // unify hamza forms onto bare hamza-carrier (drop standalone hamza)
    .replace(/[\u0624\u0626]/g, "")
    .replace(/\u0621/g, "")
    // strip tatweel
    .replace(/\u0640/g, "")
    // strip non-arabic punctuation
    .replace(/[^\u0600-\u06FF\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Phoneme-class normalization for verse-locked matching.
 * Collapses Quranic letters that MSA-trained ASR engines (Scribe) routinely
 * confuse — emphatic vs plain consonants, interdentals, etc. Used ONLY for
 * matching/alignment, never for display.
 *
 * Mappings are intentionally conservative: pairs that Scribe confuses in
 * practice on Quranic recitation, not full phonetic classes.
 */
const PHONEME_MAP: Record<string, string> = {
  // emphatic -> plain
  "\u0635": "\u0633", // ص -> س
  "\u0636": "\u062F", // ض -> د
  "\u0637": "\u062A", // ط -> ت
  "\u0638": "\u0632", // ظ -> ز
  // interdentals -> sibilants/dentals (Scribe MSA output)
  "\u062B": "\u0633", // ث -> س
  "\u0630": "\u0632", // ذ -> ز
  // velar/uvular collapse (Scribe often substitutes)
  "\u0642": "\u0643", // ق -> ك
  // pharyngeal/glottal collapse (already mapped ta-marbuta -> ه above)
  "\u062D": "\u0647", // ح -> ه
  "\u062E": "\u0647", // خ -> ه
  "\u063A": "\u0639", // غ -> ع
};

export function phonemicNormalize(text: string): string {
  const base = normalizeArabic(text);
  let out = "";
  for (const ch of base) out += PHONEME_MAP[ch] ?? ch;
  return out;
}

/**
 * Levenshtein distance between two phoneme strings, normalized 0..1.
 */
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

/**
 * Phonetic distance 0..1 between two Arabic word forms (already collapsed via
 * phoneme classes). Also discounts prefix matches (in-progress word).
 */
function phoneticDistance(a: string, b: string): number {
  if (!a || !b) return 1;
  if (a === b) return 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length >= 2 && longer.startsWith(shorter)) {
    // partial / in-progress word — strong match
    return 0.15;
  }
  return levenshteinNorm(a, b);
}

/**
 * True if two normalized Arabic words are "close enough" — exact, prefix,
 * or short edit distance. Used so the live pointer follows mid-word.
 */
function wordsClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // prefix match (in-progress word being recognized)
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length >= 2 && longer.startsWith(shorter)) return true;
  // tiny edit distance for short words
  if (Math.abs(a.length - b.length) > 2) return false;
  let diff = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) { i++; j++; continue; }
    diff++;
    if (diff > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return len >= 4 && diff <= 1;
}

/**
 * Full LCS DP table for backtracking.
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Compare spoken text against the correct verse text using LCS.
 */
export function compareTexts(spoken: string, correct: string): number {
  const a = normalizeArabic(spoken);
  const b = normalizeArabic(correct);

  if (!a || !b) return 0;

  const wordsSpoken = a.split(" ");
  const wordsCorrect = b.split(" ");

  const dp = lcsTable(wordsSpoken, wordsCorrect);
  const lcs = dp[wordsSpoken.length][wordsCorrect.length];

  return wordsCorrect.length > 0 ? lcs / wordsCorrect.length : 0;
}

export type WordDiff = { word: string; status: "correct" | "missed" };
export type WordStatus = "default" | "correct" | "weak" | "missed" | "current";

/**
 * Verse-locked alignment result.
 *  - statuses:           per correct-word display status
 *  - alignedSpokenNorm:  for each correct word, the normalized spoken token the
 *                        aligner paired with it (or null if none). Used by the
 *                        teacher-review flow to save (correct, spoken) pairs.
 *  - confidences:        per correct-word match confidence in [0,1]. 1 = exact,
 *                        0 = no spoken token paired.
 */
export interface VerseLockedAlignment {
  statuses: WordStatus[];
  alignedSpokenNorm: (string | null)[];
  confidences: number[];
}


/**
 * Returns per-word diff of the correct verse against spoken text.
 * Each correct word is "correct" if in the LCS, otherwise "missed".
 */
export function diffWords(spoken: string, correct: string): WordDiff[] {
  const aNorm = normalizeArabic(spoken);
  const bNorm = normalizeArabic(correct);

  const correctOriginalWords = correct
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  if (!aNorm || !bNorm) {
    return correctOriginalWords.map((w) => ({ word: w, status: "missed" as const }));
  }

  const wordsSpoken = aNorm.split(" ");
  const wordsCorrect = bNorm.split(" ");

  const dp = lcsTable(wordsSpoken, wordsCorrect);

  const matchedCorrectIndices = new Set<number>();
  let i = wordsSpoken.length;
  let j = wordsCorrect.length;
  while (i > 0 && j > 0) {
    if (wordsSpoken[i - 1] === wordsCorrect[j - 1]) {
      matchedCorrectIndices.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return correctOriginalWords.map((word, idx) => ({
    word,
    status: matchedCorrectIndices.has(idx) ? "correct" : "missed",
  }));
}

/**
 * Verse-locked alignment result.
 *  - statuses:           per correct-word display status
 *  - alignedSpokenNorm:  for each correct word, the normalized spoken token the
 *                        aligner paired with it (or null if none). Used by the
 *                        teacher-review flow to save (correct, spoken) pairs.
 */
export interface VerseLockedAlignment {
  statuses: WordStatus[];
  alignedSpokenNorm: (string | null)[];
}

export interface VerseLockedOptions {
  /** Set of "${correctNorm}|${spokenNorm}" pairs to treat as a perfect match. */
  acceptedPairs?: Set<string>;
}

/**
 * Needleman-Wunsch alignment of the spoken transcript against the known
 * correct ayah. The ayah is the "lattice" — every correct word must be
 * accounted for. Returns per-word status plus alignment metadata.
 */
export function verseLockedAlign(
  spoken: string,
  correct: string,
  opts: VerseLockedOptions = {}
): VerseLockedAlignment {
  const correctOriginalWords = correct
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  const wordsCorrect = correctOriginalWords.map((w) => phonemicNormalize(w));
  const n = wordsCorrect.length;

  if (n === 0) {
    return { statuses: [], alignedSpokenNorm: [] };
  }

  const spokenNorm = phonemicNormalize(spoken);
  if (!spokenNorm) {
    const statuses: WordStatus[] = correctOriginalWords.map(() => "default");
    statuses[0] = "current";
    return { statuses, alignedSpokenNorm: new Array(n).fill(null) };
  }

  const wordsSpoken = spokenNorm.split(" ");
  const m = wordsSpoken.length;

  const INS = 0.7;
  const DEL = 0.9;
  const MATCH_THRESHOLD = 0.45;
  const pairs = opts.acceptedPairs;

  // Substitution cost with teacher-correction lookup
  const subCost = (si: number, ci: number): number => {
    if (pairs && pairs.has(`${wordsCorrect[ci]}|${wordsSpoken[si]}`)) return 0;
    return phoneticDistance(wordsSpoken[si], wordsCorrect[ci]);
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
      const left = dp[i][j - 1] + (isLastSpoken ? DEL * 0.4 : DEL);
      let best = diag, dir = 0;
      if (up < best) { best = up; dir = 1; }
      if (left < best) { best = left; dir = 2; }
      dp[i][j] = best;
      bt[i][j] = dir;
    }
  }

  const statuses: WordStatus[] = correctOriginalWords.map(() => "default");
  const alignedSpokenNorm: (string | null)[] = new Array(n).fill(null);
  let i = m, j = n;
  let lastMatchedCorrectIdx = -1;
  let pendingCurrent = -1;

  while (i > 0 && j > 0) {
    const dir = bt[i][j];
    if (dir === 0) {
      const sub = subCost(i - 1, j - 1);
      alignedSpokenNorm[j - 1] = wordsSpoken[i - 1];
      if (sub <= MATCH_THRESHOLD) {
        statuses[j - 1] = "correct";
        if (j - 1 > lastMatchedCorrectIdx) lastMatchedCorrectIdx = j - 1;
      } else if (i === m && sub <= 0.7) {
        pendingCurrent = j - 1;
      } else {
        statuses[j - 1] = "missed";
        if (j - 1 > lastMatchedCorrectIdx) lastMatchedCorrectIdx = j - 1;
      }
      i--; j--;
    } else if (dir === 1) {
      i--;
    } else {
      if (j - 1 <= lastMatchedCorrectIdx) {
        statuses[j - 1] = "missed";
      }
      j--;
    }
  }
  while (i > 0) i--;

  if (pendingCurrent >= 0) {
    statuses[pendingCurrent] = "current";
  } else {
    const nextIdx = lastMatchedCorrectIdx + 1;
    if (nextIdx < statuses.length) statuses[nextIdx] = "current";
  }

  return { statuses, alignedSpokenNorm };
}

/**
 * Backwards-compatible wrapper — just the statuses.
 */
export function progressiveWordStatus(
  spoken: string,
  correct: string,
  opts: VerseLockedOptions = {}
): WordStatus[] {
  return verseLockedAlign(spoken, correct, opts).statuses;
}

