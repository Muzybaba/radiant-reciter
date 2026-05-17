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

  const statuses: WordStatus[] = correctOriginalWords.map(() => "default");
  let spokenIdx = 0;
  let lastMatchedCorrectIdx = -1;
  const lastSpokenIdx = wordsSpoken.length - 1;

  for (let ci = 0; ci < wordsCorrect.length; ci++) {
    if (spokenIdx >= wordsSpoken.length) break;

    const isLastSpoken = spokenIdx === lastSpokenIdx;
    const sw = wordsSpoken[spokenIdx];
    const cw = wordsCorrect[ci];

    // Direct / fuzzy match
    if (wordsClose(sw, cw)) {
      statuses[ci] = "correct";
      lastMatchedCorrectIdx = ci;
      spokenIdx++;
      continue;
    }

    // Look ahead in spoken (insertions / filler)
    let consumedSpoken = 0;
    let matched = false;
    for (let look = 1; look <= 3 && spokenIdx + look < wordsSpoken.length; look++) {
      if (wordsClose(wordsSpoken[spokenIdx + look], cw)) {
        statuses[ci] = "correct";
        lastMatchedCorrectIdx = ci;
        spokenIdx += look + 1;
        consumedSpoken = look + 1;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Look ahead in correct (skipped a word)
    let skipped = false;
    for (let look = 1; look <= 2 && ci + look < wordsCorrect.length; look++) {
      if (wordsClose(wordsCorrect[ci + look], sw)) {
        statuses[ci] = "missed";
        lastMatchedCorrectIdx = ci;
        skipped = true;
        break;
      }
    }
    if (skipped) continue;

    // Last spoken word is a tail / partial of current correct word -> active pointer here
    if (isLastSpoken && (cw.startsWith(sw) || sw.startsWith(cw))) {
      // don't mark as missed — let pointer sit on this word
      break;
    }

    statuses[ci] = "missed";
    lastMatchedCorrectIdx = ci;
    spokenIdx++;
  }

  // Active pointer = the next word user should say
  const nextIdx = lastMatchedCorrectIdx + 1;
  if (nextIdx < statuses.length) {
    statuses[nextIdx] = "current";
  }

  return statuses;
}
