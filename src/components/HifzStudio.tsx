import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ear, Eye, EyeOff, Lightbulb, Mic, RotateCcw, Square } from "lucide-react";
import { surahs } from "@/data/surahs";
import { useScribeRecognition } from "@/hooks/use-scribe-recognition";
import { alignSurah } from "@/lib/surah-matcher";
import type { WordStatus } from "@/lib/arabic-compare";
import { getAcceptedPairs, getAcceptedSlots } from "@/lib/corrections-store";
import { supabase } from "@/integrations/supabase/client";

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

// Verse 1 in our data is the Bismillah; real ayah N = verse.number - 1.
const verseAudioUrl = (surahId: number, verseNumber: number) => {
  const [s, a] = verseNumber === 1 ? [1, 1] : [surahId, verseNumber - 1];
  return `https://everyayah.com/data/Alafasy_128kbps/${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3`;
};

const HifzStudio = ({ onComplete }: { onComplete?: (surahId: number) => void }) => {
  const [surahId, setSurahId] = useState(surahs[0].id);
  const [mode, setMode] = useState<Mode>("hidden");
  const [transcript, setTranscript] = useState("");
  const [settled, setSettled] = useState("");
  const [hints, setHints] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(surahs[0].verses.length);
  const [playingHint, setPlayingHint] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeRef = useRef(false);
  const baseRef = useRef("");
  const transcriptRef = useRef("");

  const fullSurah = surahs.find((s) => s.id === surahId)!;
  const surah = useMemo(
    () => ({ ...fullSurah, verses: fullSurah.verses.slice(from - 1, to) }),
    [fullSurah, from, to]
  );

  useEffect(() => {
    const id = setTimeout(() => setSettled(transcript), 300);
    return () => clearTimeout(id);
  }, [transcript]);

  const onText = useCallback((t: string) => {
    const full = baseRef.current ? `${baseRef.current} ${t}` : t;
    transcriptRef.current = full;
    setTranscript(full);
  }, []);
  const { isListening, start, stop, reset } = useScribeRecognition({
    language: "ara",
    onResult: onText,
    onInterim: onText,
    onError: (m) => setError(m),
  });

  const alignment = useMemo(() => {
    const a = alignSurah(settled, surah, {
      acceptedPairs: getAcceptedPairs(),
      acceptedSlots: getAcceptedSlots(),
      surahId,
      emitWeak: true,
    });
    // The matcher marks the last word you said as "current" (pulsing), which
    // hid it from scoring — so the final word of an ayah/surah never counted.
    // If that word was actually heard, credit it immediately.
    const verseStatuses = a.verseStatuses.map((v, vi) =>
      v.map((s, wi) => {
        if (s !== "current") return s;
        const conf = a.confidences[vi]?.[wi] ?? 0;
        if (a.alignedSpokenNorm[vi]?.[wi] == null) return s;
        return conf >= 0.7 ? "correct" : conf >= 0.25 ? "weak" : "missed";
      })
    );
    return { ...a, verseStatuses };
  }, [settled, surah, surahId]);

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
  const [ustadhSpeaking, setUstadhSpeaking] = useState(false);
  const [ustadhLine, setUstadhLine] = useState<string | null>(null);
  const [voice, setVoice] = useState<"male" | "female">(
    () => (localStorage.getItem("muraqaba.ustadhVoice") as "male" | "female") || "male"
  );
  const changeVoice = (v: "male" | "female") => {
    setVoice(v);
    localStorage.setItem("muraqaba.ustadhVoice", v);
  };

  const playUrl = (url: string) =>
    new Promise<void>((resolve) => {
      const a = new Audio(url);
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });

  const runUstadh = useCallback(async () => {
    const mistakes: { vi: number; words: string[] }[] = [];
    alignment.verseStatuses.forEach((v, vi) => {
      const words = surah.verses[vi].text.split(/\s+/);
      const bad = v.map((s, wi) => (s === "missed" || s === "weak" ? words[wi] : null)).filter(Boolean) as string[];
      if (bad.length) mistakes.push({ vi, words: bad });
    });
    const ayahLabel = (vi: number) => {
      const n = surah.verses[vi].number;
      return n === 1 ? "the Bismillah" : `Ayah ${n - 1}`;
    };
    const text = mistakes.length === 0
      ? `MashaAllah, beautiful. You recited ${fullSurah.name} without mistakes. Barakallahu feek.`
      : `Good effort. In ${ayahLabel(mistakes[0].vi)}, pay attention to ${mistakes[0].words.slice(0, 3).join("، ")}. ` +
        (mistakes.length > 1 ? `You also slipped in ${mistakes.slice(1, 3).map((m) => ayahLabel(m.vi)).join(" and ")}. ` : "") +
        `Listen carefully, then try ${ayahLabel(mistakes[0].vi)} again.`;
    setUstadhLine(text);
    setUstadhSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke("ustadh-tts", { body: { text } });
      if (error) throw error;
      if (data?.audioContent) await playUrl(`data:audio/mpeg;base64,${data.audioContent}`);
      if (mistakes.length) await playUrl(verseAudioUrl(surahId, surah.verses[mistakes[0].vi].number));
    } catch (e) {
      console.error("Ustadh failed:", e);
    } finally {
      setUstadhSpeaking(false);
    }
  }, [alignment, surah, surahId, fullSurah.name]);

  useEffect(() => {
    if (finished && isListening) {
      stop();
      onComplete?.(surahId);
      runUstadh();
    }
  }, [finished, isListening, stop, onComplete, surahId, runUstadh]);

  const restart = () => {
    reset?.();
    baseRef.current = "";
    transcriptRef.current = "";
    setTranscript("");
    setSettled("");
    setHints(new Set());
  };

  const toggleMic = async () => {
    setError(null);
    if (isListening) {
      stop();
      if (stats.done > 0) runUstadh();
    } else {
      setUstadhLine(null);
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
    setFrom(1);
    setTo(surahs.find((s) => s.id === id)!.verses.length);
    restart();
  };

  const changeRange = (f: number, t: number) => {
    if (isListening) stop();
    setFrom(Math.min(f, t));
    setTo(Math.max(f, t));
    restart();
  };

  const playAudioHint = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingHint) {
      audio.pause();
      setPlayingHint(false);
      return;
    }
    const verse = surah.verses[Math.min(alignment.currentVerseIdx ?? 0, surah.verses.length - 1)];
    if (!verse) return;
    // Pause the mic so the Qari's voice isn't recognized as the reciter's.
    resumeRef.current = isListening;
    if (isListening) stop();
    audio.src = verseAudioUrl(surahId, verse.number);
    setPlayingHint(true);
    audio.play().catch(() => {
      setPlayingHint(false);
      setError("audio");
    });
  };

  const onHintEnded = async () => {
    setPlayingHint(false);
    if (resumeRef.current) {
      resumeRef.current = false;
      baseRef.current = transcriptRef.current;
      await start();
    }
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

      <div className="flex flex-wrap items-center gap-2 mb-5 text-xs text-muted-foreground">
        <span className="uppercase tracking-[0.25em]">Ayat</span>
        <select aria-label="From ayah" value={from} onChange={(e) => changeRange(Number(e.target.value), to)}
          className="rounded-lg border border-primary/20 bg-background px-2 py-1.5 text-sm text-foreground">
          {fullSurah.verses.map((v) => <option key={v.number} value={v.number}>{v.number}</option>)}
        </select>
        <span>to</span>
        <select aria-label="To ayah" value={to} onChange={(e) => changeRange(from, Number(e.target.value))}
          className="rounded-lg border border-primary/20 bg-background px-2 py-1.5 text-sm text-foreground">
          {fullSurah.verses.map((v) => <option key={v.number} value={v.number}>{v.number}</option>)}
        </select>
        <button onClick={() => changeRange(1, fullSurah.verses.length)}
          className="rounded-full border border-primary/20 px-3 py-1.5 hover:bg-primary/5 text-foreground">All</button>
        <button onClick={() => changeRange(1, Math.min(3, fullSurah.verses.length))}
          className="rounded-full border border-primary/20 px-3 py-1.5 hover:bg-primary/5 text-foreground">First 3</button>
      </div>

      <audio ref={audioRef} onEnded={onHintEnded} onError={() => { setPlayingHint(false); }} />

      <div dir="rtl" className="font-arabic text-2xl sm:text-3xl leading-[2.4] text-right space-y-3 mb-6">
        {surah.verses.map((v, vi) => {
          const words = v.text.split(/\s+/);
          const statuses = alignment.verseStatuses[vi] || [];
          return (
            <p key={v.number} className={playingHint && vi === alignment.currentVerseIdx ? "rounded-lg bg-primary/10 animate-pulse" : ""}>
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
      {ustadhLine && (
        <p className={`text-center text-sm italic text-foreground/80 mb-4 ${ustadhSpeaking ? "animate-pulse" : ""}`}>
          Ustadh: “{ustadhLine}”
        </p>
      )}
      {error && <p className="text-center text-sm text-destructive mb-4">{error === "audio" ? "The recitation hint could not play. Please try again." : "The microphone could not start. Please try again."}</p>}

      <div className="flex items-center justify-center gap-6">
        <button onClick={restart} aria-label="Restart" className="p-3 rounded-full border border-primary/20 text-muted-foreground hover:text-primary">
          <RotateCcw size={18} />
        </button>
        <button
          onClick={toggleMic}
          aria-label={isListening ? "Stop" : "Start reciting"}
          className={`w-16 h-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg ${isListening ? "animate-pulse" : ""}`}
        >
          {isListening ? <Square size={20} /> : <Mic size={22} />}
        </button>
        <button
          onClick={giveHint}
          disabled={mode !== "hidden"}
          aria-label="Hint next word"
          className="p-3 rounded-full border border-primary/20 text-muted-foreground hover:text-primary disabled:opacity-30"
        >
          <Lightbulb size={18} />
        </button>
        <button
          onClick={playAudioHint}
          aria-label={playingHint ? "Stop listening hint" : "Hear this ayah"}
          className={`p-3 rounded-full border border-primary/20 hover:text-primary ${playingHint ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
        >
          <Ear size={18} />
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
