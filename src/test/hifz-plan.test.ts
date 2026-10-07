import { describe, expect, it } from "vitest";
import {
  createDefaultHifzPlan,
  daysSinceDate,
  isBlockDue,
  localDateKey,
  parseHifzPlan,
  recordHifzSession,
  summarizeHifzRetention,
  type HifzPracticeSession,
} from "@/lib/hifz-plan";

const surahs = [
  { id: 112, verses: [{ number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }, { number: 5 }] },
  { id: 113, verses: [{ number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }] },
  { id: 114, verses: [{ number: 1 }, { number: 2 }, { number: 3 }, { number: 4 }] },
];

const session = (blockId: HifzPracticeSession["blockId"], date: string): HifzPracticeSession => ({
  blockId,
  surahId: 112,
  fromVerse: 2,
  toVerse: 3,
  date,
  completedAt: `${date}T12:00:00.000Z`,
  accuracy: 80,
  totalWords: 5,
});

describe("Hifz daily plan domain", () => {
  it("creates three usable defaults without including the Bismillah as an ayah", () => {
    const plan = createDefaultHifzPlan(surahs);
    expect(plan.ranges.sabaq).toEqual({ surahId: 112, fromVerse: 2, toVerse: 3 });
    expect(plan.ranges.sabqi.surahId).toBe(113);
    expect(plan.ranges.manzil.surahId).toBe(114);
  });

  it("falls back safely for invalid or mismatched saved data", () => {
    const defaults = createDefaultHifzPlan(surahs);
    expect(parseHifzPlan("not json", surahs)).toEqual(defaults);
    const invalid = JSON.stringify({
      version: 1,
      ranges: { ...defaults.ranges, sabaq: { surahId: 999, fromVerse: 1, toVerse: 1 } },
      sessions: [],
    });
    expect(parseHifzPlan(invalid, surahs)).toEqual(defaults);
  });

  it("schedules Manzil weekly while Sabaq and Sabqi are due each day", () => {
    const sessions = [session("manzil", "2026-10-01")];
    expect(isBlockDue(sessions, "sabaq", "2026-10-07")).toBe(true);
    expect(isBlockDue(sessions, "sabqi", "2026-10-07")).toBe(true);
    expect(isBlockDue(sessions, "manzil", "2026-10-07")).toBe(false);
    expect(isBlockDue(sessions, "manzil", "2026-10-08")).toBe(true);
  });

  it("records completion and summarizes the local seven-day practice window", () => {
    const state = recordHifzSession(createDefaultHifzPlan(surahs), session("sabaq", "2026-10-07"));
    const summary = summarizeHifzRetention(state.sessions, "2026-10-07");
    expect(summary).toEqual({ practicedDays: 1, recentSessions: 1, accuracy: 80, dueBlocks: 2 });
    expect(isBlockDue(state.sessions, "sabaq", "2026-10-07")).toBe(false);
  });

  it("uses the device-local calendar date key and safely handles date differences", () => {
    expect(localDateKey(new Date(2026, 9, 8, 0, 30))).toBe("2026-10-08");
    expect(daysSinceDate("2026-10-01", "2026-10-08")).toBe(7);
    expect(daysSinceDate(undefined, "2026-10-08")).toBeNull();
  });
});