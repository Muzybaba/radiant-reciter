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
 * Compare spoken text against the correct verse text.
 * Returns a similarity score 0-1.
 */
export function compareTexts(spoken: string, correct: string): number {
  const a = normalizeArabic(spoken);
  const b = normalizeArabic(correct);

  if (!a || !b) return 0;

  const wordsA = a.split(" ");
  const wordsB = b.split(" ");

  // Count matching words (order-aware)
  let matches = 0;
  const maxLen = Math.max(wordsA.length, wordsB.length);

  for (let i = 0; i < Math.min(wordsA.length, wordsB.length); i++) {
    if (wordsA[i] === wordsB[i]) {
      matches++;
    }
  }

  return maxLen > 0 ? matches / maxLen : 0;
}
