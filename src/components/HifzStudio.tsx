import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lightbulb, RotateCcw } from "lucide-react";
import MicButton from "@/components/MicButton";
import { surahs } from "@/data/surahs";
import { useScribeRecognition } from "@/hooks/use-scribe-recognition";
import { alignSurah } from "@/lib/surah-matcher";
import type { WordStatus } from "@/lib/arabic-compare";
import { getAcceptedPairs, getAcceptedSlots } from "@/lib/corrections-store";

type Mode = "hidden" | "visible";

const statusClass = (s: WordStatus, hidden: boolean, hinted: boolean) => {
  const revealed = !hidden || hinted || s === "correct" || s === "weak" || s === "missed";
  if (!revealed) return "text-transparent bg-primary/10 rounded-md select-none";
  switch (s) {
    case "correct": return "text-foreground transition-colors";
    case "weak": return "text-primary underline decoration-dotted";
    case "missed": return "text-destructive underline decoration-wavy";
    case "current": return "text-primary animate-word-pulse";
    default: return hinted ? "text-primary/60" : "text-foreground/80";
  }
};

const HifzStudio = ({ onComplete }: { onComplete?: (surahId: number) => void }) => {
  const [surahId, setSurahId] = useState(surahs[0].id);
  const [mode, setMode] = useState<Mode>("hidden");
  const [transcript, setTranscript] = useState("");
  const [settled, setSettled] = useState("");
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const surah = surahs.find((s) => s.id === surahId)!;

  useEffect(() => {
    const id = setTimeout(() => setSettled(transcript), 300);
    return () => clearTimeout(id);
  }, [transcript]);

  const onText = useCallback((t: string) => setTranscript(t), []);
  const { isListening, start, stop, reset } = useScribeRecognition({
    language: "ara",
    onResult: onText,
    onInterim: onText,
    onError: (m) => setError(m),
  });

  const alignment = useMemo(
    () =>
      alignSurah(settled, surah, {
        acceptedPairs: getAcceptedPairs(),
        acceptedSlots: getAcceptedSlots(),
        surahId,
        emitWeak: true,
      }),
    [settled, surah, surahId]
  );

  const stats = useMemo(() => {
    let correct = 0, missed = 0, weak = 0, total = 0;
    alignment.verseStatuses.forEach((v) =>
      v.forEach((s) => {
        total++;
        if (s === "correct") correct++;
        else if (s === "missed") missed++;
        else if (s === "weak") weak++;
      })
    );
    const done = correct + weak + missed;
    const accuracy = done ? Math.round(((correct + weak * 0.5) / done) * 100) : 0;
    return { correct, missed, weak, total, done, accuracy };
  }, [alignment]);

  const finished = stats.total > 0 && stats.done >= stats.total;
  useEffect(() => {
    if (finished && isListening) {
      stop();
      onComplete?.(surahId);
    }
  }, [finished, isListening, stop, onComplete, surahId]);

  const restart = () => {
    reset?.();
    setTranscript("");
    setSettled("");
    setHints(new Set());
  };

  const toggleMic = async () => {
    setError(null);
    if (isListening) stop();
    else {
      restart();
      await start();
    }
  };

  const giveHint = () => {
    const key = `${alignment.currentVerseIdx}:${alignment.currentWordIdx}`;
    setHints((h) => new Set(h).add(key));
  };

  const changeSurah = (id: number) => {
    if (isListening) stop();
    setSurahId(id);
    restart();
  };

  return (
    <section className="mb-12 rounded-3xl border border-primary/20 bg-card/70 p-5 sm:p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary">Recitation Studio</p>
          <h2 className="font-display text-xl text-foreground mt-1">
            {mode === "hidden" ? "Recite to reveal" : "Guided recitation"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={surahId}
            onChange={(e) => changeSurah(Number(e.target.value))}
            className="rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm text-foreground"
          >
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>{s.id}. {s.name}</option>
            ))}
          </select>
          <button
            onClick={() => setMode((m) => (m === "hidden" ? "visible" : "hidden"))}
            className="flex items-center gap-1.5 rounded-lg border border-primary/20 px-3 py-2 text-xs text-foreground hover:bg-primary/5"
          >
            {mode === "hidden" ? <EyeOff size={14} /> : <Eye size={14} />}
            {mode === "hidden" ? "Hidden" : "Visible"}
          </button>
        </div>
      </div>

      <div dir="rtl" className="font-arabic text-2xl sm:text-3xl leading-[2.4] text-right space-y-3 mb-6">
        {surah.verses.map((v, vi) => {
          const words = v.text.split(/\s+/);
          const statuses = alignment.verseStatuses[vi] || [];
          return (
            <p key={v.number}>
              {words.map((w, wi) => {
                const s = statuses[wi] ?? "default";
                const hinted = hints.has(`${vi}:${wi}`);
                return (
                  <span key={wi} className={`inline-block px-1 mx-0.5 ${statusClass(s, mode === "hidden", hinted)}`}>
                    {w}
                  </span>
                );
              })}
              <span className="text-primary/70 text-xl mx-1">﴿{v.number}﴾</span>
            </p>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 text-center">
        <Mini label="Accuracy" value={`${stats.accuracy}%`} />
        <Mini label="Words" value={`${stats.done}/${stats.total}`} />
        <Mini label="Mistakes" value={String(stats.missed)} />
      </div>

      {finished && (
        <p className="text-center text-sm text-primary mb-4">
          Surah complete — {stats.accuracy}% accuracy. MashaAllah.
        </p>
      )}
      {error && <p className="text-center text-sm text-destructive mb-4">The microphone could not start. Please try again.</p>}

      <div className="flex items-center justify-center gap-6">
        <button onClick={restart} aria-label="Restart" className="p-3 rounded-full border border-primary/20 text-muted-foreground hover:text-primary">
          <RotateCcw size={18} />
        </button>
        <MicButton isListening={isListening} onToggle={toggleMic} />
        <button
          onClick={giveHint}
          disabled={mode !== "hidden"}
          aria-label="Hint next word"
          className="p-3 rounded-full border border-primary/20 text-muted-foreground hover:text-primary disabled:opacity-30"
        >
          <Lightbulb size={18} />
        </button>
      </div>
    </section>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-primary/15 bg-background/60 py-3">
    <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
    <p className="font-display text-lg text-foreground mt-1">{value}</p>
  </div>
);

export default HifzStudio;
