import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Flame } from "lucide-react";
import PageShell from "@/components/PageShell";
import HifzStudio from "@/components/HifzStudio";
import { surahs } from "@/data/surahs";

interface HifzState {
  memorized: number[];
  reviewedToday: string | null;
  streak: number;
}

const KEY = "muraqaba.hifz";

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

  useEffect(() => saveState(state), [state]);

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
        onComplete={(id) =>
          setState((s) => ({
            ...s,
            memorized: s.memorized.includes(id) ? s.memorized : [...s.memorized, id],
          }))
        }
      />

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
