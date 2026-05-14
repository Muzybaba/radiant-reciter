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
export type WordStatus = "default" | "correct" | "missed" | "current";

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
 * Progressive word-by-word status for real-time highlighting.
 * Compares spoken words against verse words sequentially.
 * Words matched so far = "correct", spoken but not matched = "missed", not yet reached = "default".
 */
export function progressiveWordStatus(spoken: string, correct: string): WordStatus[] {
  const bNorm = normalizeArabic(correct);

  const correctOriginalWords = correct
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  if (!bNorm) {
    return correctOriginalWords.map(() => "default");
  }

  const aNorm = normalizeArabic(spoken);

  // No spoken words yet — mark first word as current pointer
  if (!aNorm) {
    const statuses: WordStatus[] = correctOriginalWords.map(() => "default");
    statuses[0] = "current";
    return statuses;
  }

  const wordsSpoken = aNorm.split(" ");
  const wordsCorrect = bNorm.split(" ");

  // Greedy sequential match: walk through correct words, try to match spoken words in order
  const statuses: WordStatus[] = correctOriginalWords.map(() => "default");
  let spokenIdx = 0;
  let lastMatchedCorrectIdx = -1;

  for (let ci = 0; ci < wordsCorrect.length; ci++) {
    if (spokenIdx >= wordsSpoken.length) break;

    if (wordsCorrect[ci] === wordsSpoken[spokenIdx]) {
      statuses[ci] = "correct";
      lastMatchedCorrectIdx = ci;
      spokenIdx++;
    } else {
      // Look ahead in spoken words to handle insertions
      let found = false;
      for (let look = 1; look <= 3 && spokenIdx + look < wordsSpoken.length; look++) {
        if (wordsCorrect[ci] === wordsSpoken[spokenIdx + look]) {
          statuses[ci] = "correct";
          lastMatchedCorrectIdx = ci;
          spokenIdx += look + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        // Also look ahead in correct words to handle skipped words
        let skipped = false;
        for (let look = 1; look <= 2 && ci + look < wordsCorrect.length; look++) {
          if (wordsCorrect[ci + look] === wordsSpoken[spokenIdx]) {
            // Mark current as missed, don't advance spokenIdx
            statuses[ci] = "missed";
            lastMatchedCorrectIdx = ci;
            skipped = true;
            break;
          }
        }
        if (!skipped) {
          statuses[ci] = "missed";
          lastMatchedCorrectIdx = ci;
          spokenIdx++;
        }
      }
    }
  }

  // Mark the next unprocessed word as "current" (the reading pointer)
  const nextIdx = lastMatchedCorrectIdx + 1;
  if (nextIdx < statuses.length) {
    statuses[nextIdx] = "current";
  }

  return statuses;
}
