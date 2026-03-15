/**
 * Normalize Arabic text by removing diacritics/tashkeel for comparison.
 */
export function normalizeArabic(text: string): string {
  return text
    // Remove tashkeel (diacritics)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    // Normalize alef variations to plain alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    // Normalize taa marbuta to haa
    .replace(/\u0629/g, "\u0647")
    // Remove tatweel
    .replace(/\u0640/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Longest Common Subsequence length between two word arrays.
 */
function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Use 1D DP for space efficiency
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j];
      curr[j] = 0;
    }
  }

  return prev[n];
}

/**
 * Compare spoken text against the correct verse text using LCS.
 * Returns a similarity score 0-1 based on how many correct words
 * appear in order in the spoken text.
 */
export function compareTexts(spoken: string, correct: string): number {
  const a = normalizeArabic(spoken);
  const b = normalizeArabic(correct);

  if (!a || !b) return 0;

  const wordsSpoken = a.split(" ");
  const wordsCorrect = b.split(" ");

  const lcs = lcsLength(wordsSpoken, wordsCorrect);

  return wordsCorrect.length > 0 ? lcs / wordsCorrect.length : 0;
}
