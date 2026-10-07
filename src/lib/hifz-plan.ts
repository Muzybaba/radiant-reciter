/**
 * Platform-independent Hifz daily-plan rules and storage contract.
 * Keep browser, native, and other persistence adapters outside this module.
 */

export type HifzBlockId = "sabaq" | "sabqi" | "manzil";

export interface HifzRange {
  surahId: number;
  fromVerse: number;
  toVerse: number;
}

export interface HifzPracticeSession extends HifzRange {
  blockId: HifzBlockId;
  date: string;
  completedAt: string;
  accuracy: number;
  totalWords: number;
}

export interface HifzPlanState {
  version: 1;
  ranges: Record<HifzBlockId, HifzRange>;
  sessions: HifzPracticeSession[];
}

export interface SurahRangeInfo {
  id: number;
  verses: { number: number }[];
}

export const HIFZ_PLAN_STORAGE_KEY = "muraqaba.hifz.daily-plan.v1";
export const HIFZ_BLOCK_IDS: HifzBlockId[] = ["sabaq", "sabqi", "manzil"];
export const MANZIL_INTERVAL_DAYS = 7;

export const HIFZ_BLOCK_INFO: Record<HifzBlockId, { title: string; subtitle: string }> = {
  sabaq: { title: "Sabaq", subtitle: "New memorization" },
  sabqi: { title: "Sabqi", subtitle: "Recent revision" },
  manzil: { title: "Manzil", subtitle: "Long-term revision" },
};

/** Date keys intentionally use the device's local calendar, not UTC. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeDefaultRange(surah: SurahRangeInfo, offset: number): HifzRange {
  const firstMemorizationVerse = surah.verses.length > 1 ? 2 : 1;
  const lastVerse = surah.verses[surah.verses.length - 1]?.number ?? firstMemorizationVerse;
  return {
    surahId: surah.id,
    fromVerse: firstMemorizationVerse,
    toVerse: Math.min(lastVerse, firstMemorizationVerse + offset),
  };
}

export function createDefaultHifzPlan(surahs: SurahRangeInfo[]): HifzPlanState {
  const [first, second, third] = surahs;
  if (!first || !second || !third) {
    throw new Error("A Hifz plan needs at least three available surahs.");
  }
  return {
    version: 1,
    ranges: {
      sabaq: makeDefaultRange(first, 1),
      sabqi: makeDefaultRange(second, 1),
      manzil: makeDefaultRange(third, 2),
    },
    sessions: [],
  };
}

function isValidRange(value: unknown, surahs: SurahRangeInfo[]): value is HifzRange {
  if (!value || typeof value !== "object") return false;
  const range = value as Partial<HifzRange>;
  if (!Number.isInteger(range.surahId) || !Number.isInteger(range.fromVerse) || !Number.isInteger(range.toVerse)) {
    return false;
  }
  const surah = surahs.find((item) => item.id === range.surahId);
  const first = surah?.verses[0]?.number;
  const last = surah?.verses[surah.verses.length - 1]?.number;
  return first != null && last != null && range.fromVerse! >= first && range.toVerse! <= last && range.fromVerse! <= range.toVerse!;
}

function isValidSession(value: unknown, surahs: SurahRangeInfo[]): value is HifzPracticeSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<HifzPracticeSession>;
  return HIFZ_BLOCK_IDS.includes(session.blockId as HifzBlockId)
    && isValidRange(session, surahs)
    && typeof session.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(session.date)
    && typeof session.completedAt === "string"
    && Number.isFinite(Date.parse(session.completedAt))
    && typeof session.accuracy === "number"
    && Number.isFinite(session.accuracy)
    && session.accuracy >= 0
    && session.accuracy <= 100
    && Number.isInteger(session.totalWords)
    && (session.totalWords ?? -1) >= 0;
}

export function parseHifzPlan(raw: string | null, surahs: SurahRangeInfo[]): HifzPlanState {
  const defaults = createDefaultHifzPlan(surahs);
  if (!raw) return defaults;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults;
    const value = parsed as Partial<HifzPlanState>;
    if (value.version !== 1 || !value.ranges || !value.sessions) return defaults;
    const ranges = {} as Record<HifzBlockId, HifzRange>;
    for (const blockId of HIFZ_BLOCK_IDS) {
      if (!isValidRange(value.ranges[blockId], surahs)) return defaults;
      ranges[blockId] = value.ranges[blockId];
    }
    if (!Array.isArray(value.sessions)) return defaults;
    return {
      version: 1,
      ranges,
      sessions: value.sessions.filter((session) => isValidSession(session, surahs)),
    };
  } catch {
    return defaults;
  }
}

export function recordHifzSession(
  state: HifzPlanState,
  session: HifzPracticeSession,
): HifzPlanState {
  return { ...state, sessions: [...state.sessions, session] };
}

export function isBlockCompleteToday(
  sessions: HifzPracticeSession[],
  blockId: HifzBlockId,
  today: string,
): boolean {
  return sessions.some((session) => session.blockId === blockId && session.date === today);
}

function dateOrdinal(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function daysSinceDate(dateKey: string | undefined, today: string): number | null {
  if (!dateKey) return null;
  const difference = dateOrdinal(today) - dateOrdinal(dateKey);
  return Number.isFinite(difference) ? Math.max(0, difference) : null;
}

export function isBlockDue(
  sessions: HifzPracticeSession[],
  blockId: HifzBlockId,
  today: string,
): boolean {
  if (isBlockCompleteToday(sessions, blockId, today)) return false;
  if (blockId !== "manzil") return true;
  const latest = sessions
    .filter((session) => session.blockId === blockId)
    .map((session) => session.date)
    .sort()
    .at(-1);
  const daysSince = daysSinceDate(latest, today);
  return daysSince == null || daysSince >= MANZIL_INTERVAL_DAYS;
}

export function summarizeHifzRetention(sessions: HifzPracticeSession[], today: string) {
  const recent = sessions.filter((session) => {
    const age = daysSinceDate(session.date, today);
    return age != null && age >= 0 && age < 7;
  });
  const practicedDays = new Set(recent.map((session) => session.date)).size;
  const accuracy = recent.length
    ? Math.round(recent.reduce((sum, session) => sum + session.accuracy, 0) / recent.length)
    : null;
  const dueBlocks = HIFZ_BLOCK_IDS.filter((blockId) => isBlockDue(sessions, blockId, today)).length;
  return { practicedDays, recentSessions: recent.length, accuracy, dueBlocks };
}