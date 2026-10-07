import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import HifzStudio from "@/components/HifzStudio";
import { surahs } from "@/data/surahs";
import {
  HIFZ_BLOCK_IDS,
  HIFZ_BLOCK_INFO,
  HIFZ_PLAN_STORAGE_KEY,
  createDefaultHifzPlan,
  isBlockDue,
  isBlockCompleteToday,
  localDateKey,
  parseHifzPlan,
  recordHifzSession,
  summarizeHifzRetention,
  type HifzBlockId,
  type HifzPlanState,
  type HifzRange,
} from "@/lib/hifz-plan";

interface HifzState {
  memorized: number[];
  reviewedToday: string | null;
  streak: number;
}

const KEY = "muraqaba.hifz";

const readPlan = (): HifzPlanState => {
  try {
    return parseHifzPlan(localStorage.getItem(HIFZ_PLAN_STORAGE_KEY), surahs);
  } catch {
    return createDefaultHifzPlan(surahs);
  }
};

const loadState = (): HifzState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { memorized: [], reviewedToday: null, streak: 0 };
};

const saveState = (s: HifzState) => {
  localStorage.setItem(KEY, JSON.stringify(s));
};

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const Hifz = () => {
  const [state, setState] = useState<HifzState>(() => loadState());
  const [plan, setPlan] = useState<HifzPlanState>(() => readPlan());
  const [activeBlock, setActiveBlock] = useState<HifzBlockId | null>(null);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    try {
      localStorage.setItem(HIFZ_PLAN_STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // Private browsing or quota limits should not prevent a recitation session.
    }
  }, [plan]);

  const todayKey = localDateKey();
  const retention = useMemo(() => summarizeHifzRetention(plan.sessions, todayKey), [plan.sessions, todayKey]);

  const updateRange = (blockId: HifzBlockId, range: HifzRange) => {
    setPlan((current) => ({ ...current, ranges: { ...current.ranges, [blockId]: range } }));
  };

  const recordPractice = (blockId: HifzBlockId, result: { range: HifzRange; accuracy: number; totalWords: number }) => {
    setPlan((current) => recordHifzSession(current, {
      ...result.range,
      blockId,
      date: localDateKey(),
      completedAt: new Date().toISOString(),
      accuracy: result.accuracy,
      totalWords: result.totalWords,
    }));
    setActiveBlock(null);
  };

  const toggle = (id: number) => {
    setState((s) => ({
      ...s,
      memorized: s.memorized.includes(id)
        ? s.memorized.filter((x) => x !== id)
        : [...s.memorized, id],
    }));
  };

  const markReviewed = () => {
    setState((s) => {
      if (s.reviewedToday === today()) return s;
      const newStreak = s.reviewedToday === yesterday() ? s.streak + 1 : 1;
      return { ...s, reviewedToday: today(), streak: newStreak };
    });
  };

  const reviewedToday = state.reviewedToday === today();
  const total = surahs.length;
  const done = state.memorized.length;
  const pct = Math.round((done / total) * 100);

  return (
    <PageShell
      eyebrow="Memorization"
      title="Hifz"
      subtitle="Recite from memory — words reveal as you say them."
    >
      <HifzStudio
        key={activeBlock ?? "daily-studio"}
        initialRange={activeBlock ? plan.ranges[activeBlock] : undefined}
        onComplete={(id) =>
          setState((s) => ({
            ...s,
            memorized: s.memorized.includes(id) ? s.memorized : [...s.memorized, id],
          }))
        }
        onSessionComplete={(result) => {
          if (activeBlock) recordPractice(activeBlock, result);
        }}
      />

      <section aria-labelledby="daily-plan-heading" className="mb-10 border-y border-primary/15 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">A steady cycle</p>
            <h2 id="daily-plan-heading" className="mt-1 font-display text-2xl text-foreground">Today’s Hifz plan</h2>
          </div>
          <p className="text-xs text-muted-foreground">{retention.practicedDays}/7 days practiced · {retention.accuracy == null ? "No recent score" : `${retention.accuracy}% recent accuracy`}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {HIFZ_BLOCK_IDS.map((blockId) => {
            const range = plan.ranges[blockId];
            const selectedSurah = surahs.find((item) => item.id === range.surahId) ?? surahs[0];
            const completed = isBlockCompleteToday(plan.sessions, blockId, todayKey);
            const due = isBlockDue(plan.sessions, blockId, todayKey);
            const latestSession = [...plan.sessions].reverse().find((session) => session.blockId === blockId);
            const latestAccuracy = latestSession?.accuracy;
            return (
              <article key={blockId} className="border border-primary/20 bg-card/50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl text-foreground">{HIFZ_BLOCK_INFO[blockId].title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{HIFZ_BLOCK_INFO[blockId].subtitle}</p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${completed ? "text-primary" : due ? "text-accent" : "text-muted-foreground"}`}>
                    {completed ? "Done today" : due ? "Due today" : "On track"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_1fr] gap-2">
                  <label className="col-span-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Surah
                    <select
                      aria-label={`${HIFZ_BLOCK_INFO[blockId].title} surah`}
                      value={range.surahId}
                      onChange={(event) => {
                        const nextSurah = surahs.find((item) => item.id === Number(event.target.value));
                        const firstAyah = nextSurah?.verses[1]?.number ?? nextSurah?.verses[0]?.number ?? 1;
                        const lastAyah = nextSurah?.verses[nextSurah.verses.length - 1]?.number ?? firstAyah;
                        updateRange(blockId, { surahId: Number(event.target.value), fromVerse: firstAyah, toVerse: Math.min(lastAyah, firstAyah + (blockId === "manzil" ? 2 : 1)) });
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                    >
                      {surahs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  {(["from", "to"] as const).map((edge) => (
                    <label key={edge} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {edge === "from" ? "From ayah" : "To ayah"}
                      <select
                        aria-label={`${HIFZ_BLOCK_INFO[blockId].title} ${edge === "from" ? "starting" : "ending"} ayah`}
                        value={edge === "from" ? range.fromVerse : range.toVerse}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          const fromVerse = edge === "from" ? value : Math.min(range.fromVerse, value);
                          const toVerse = edge === "to" ? value : Math.max(range.toVerse, value);
                          updateRange(blockId, { ...range, fromVerse, toVerse });
                        }}
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
                      >
                        {selectedSurah.verses.filter((verse) => verse.number > 1).map((verse) => (
                          <option key={verse.number} value={verse.number}>{verse.number - 1}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{selectedSurah.name} · ayat {range.fromVerse - 1}–{range.toVerse - 1}</span>
                  <span>{latestAccuracy == null ? "No score yet" : `Last ${latestAccuracy}%`}</span>
                </div>
                <Button className="mt-4 w-full" onClick={() => setActiveBlock(blockId)}>
                  {completed ? "Practice again" : "Start practice"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      {activeBlock && (
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setActiveBlock(null)}>
            <ArrowLeft /> Back to today’s plan
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            {HIFZ_BLOCK_INFO[activeBlock].title} · {surahs.find((item) => item.id === plan.ranges[activeBlock].surahId)?.name ?? "Surah"}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="Memorized" value={`${done}/${total}`} />
        <Stat label="Progress" value={`${pct}%`} />
        <Stat
          label="Streak"
          value={String(state.streak)}
          icon={<Flame size={14} className="text-primary" />}
        />
      </div>

      {/* Daily review */}
      <button
        onClick={markReviewed}
        disabled={reviewedToday}
        className={`w-full mb-12 py-5 rounded-2xl border transition-all ${
          reviewedToday
            ? "border-primary/30 bg-primary/5 text-accent"
            : "border-primary text-primary hover:bg-primary/10"
        }`}
      >
        <span className="text-[11px] uppercase tracking-[0.3em]">
          {reviewedToday ? "✓ Reviewed today" : "Mark today's review"}
        </span>
      </button>

      {/* Surah checklist */}
      <p className="text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
        Surah Checklist
      </p>
      <ul className="space-y-2">
        {surahs.map((s) => {
          const done = state.memorized.includes(s.id);
          return (
            <motion.li key={s.id} whileTap={{ scale: 0.98 }}>
              <button
                onClick={() => toggle(s.id)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${
                  done
                    ? "border-primary/40 bg-primary/5"
                    : "border-primary/10 hover:border-primary/30"
                }`}
              >
                <span className="flex items-center gap-4">
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] ${
                      done
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-primary/30 text-muted-foreground"
                    }`}
                  >
                    {done ? <Check size={12} /> : s.id}
                  </span>
                  <span className="text-left">
                    <span className="block text-sm text-foreground">
                      {s.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {s.verses.length} ayat
                    </span>
                  </span>
                </span>
                <span
                  dir="rtl"
                  className="font-arabic text-xl text-primary/80"
                >
                  {s.nameArabic}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </PageShell>
  );
};

const Stat = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-primary/20 bg-card/60 p-5">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
    </div>
    <p className="font-display text-3xl text-accent">{value}</p>
  </div>
);

export default Hifz;
