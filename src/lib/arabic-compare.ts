/**
 * Normalize Arabic text by removing diacritics/tashkeel for comparison.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0640/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

  // Backtrack to find which correct words were matched
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
