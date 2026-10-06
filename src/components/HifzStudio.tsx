import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ear, Eye, EyeOff, Lightbulb, Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    setUstadhSpeaking(true);
    try {
      if (mistakes.length === 0) {
        const text = `MashaAllah, beautiful. You recited ${fullSurah.name} without mistakes. Barakallahu feek.`;
        setUstadhLine(text);
        const { data, error } = await supabase.functions.invoke("ustadh-tts", { body: { text, voice } });
        if (error) throw error;
        if (data?.audioContent) await playUrl(`data:audio/mpeg;base64,${data.audioContent}`);
      } else {
        // Walk through EVERY mistake, one ayah at a time — speak the
        // correction, then play Alafasy for that ayah so it can be repeated.
        for (const m of mistakes.slice(0, 4)) {
          const text = `In ${ayahLabel(m.vi)}, pay attention to ${m.words.slice(0, 3).join("، ")}. Listen, then repeat.`;
          setUstadhLine(text);
          const { data, error } = await supabase.functions.invoke("ustadh-tts", { body: { text, voice } });
          if (!error && data?.audioContent) await playUrl(`data:audio/mpeg;base64,${data.audioContent}`);
          await playUrl(verseAudioUrl(surahId, surah.verses[m.vi].number));
        }
        if (mistakes.length > 4) {
          const text = `There were a few more slips. Let's go through them again next round.`;
          setUstadhLine(text);
          const { data } = await supabase.functions.invoke("ustadh-tts", { body: { text, voice } });
          if (data?.audioContent) await playUrl(`data:audio/mpeg;base64,${data.audioContent}`);
        }
      }
    } catch (e) {
      console.error("Ustadh failed:", e);
    } finally {
      setUstadhSpeaking(false);
    }
  }, [alignment, surah, surahId, fullSurah.name, voice]);

  // When the reciter pauses mid-ayah (~5s of silence), the Ustadh whispers
  // the next word to jog their memory — like a teacher in a halaqah.
  const lastWordRef = useRef("");
  const whisperingRef = useRef(false);
  const whisper = useCallback(async (word: string) => {
    if (whisperingRef.current) return;
    whisperingRef.current = true;
    setUstadhSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke("ustadh-tts", {
        body: { text: `...${word}`, voice },
      });
      if (!error && data?.audioContent) await playUrl(`data:audio/mpeg;base64,${data.audioContent}`);
    } catch (e) {
      console.error("Whisper failed:", e);
    } finally {
      setUstadhSpeaking(false);
      whisperingRef.current = false;
    }
  }, [voice]);

  useEffect(() => {
    if (!isListening || finished || playingHint) return;
    const id = setInterval(() => {
      const { currentVerseIdx: vi, currentWordIdx: wi } = alignment;
      if (vi == null || wi == null) return;
      const status = alignment.verseStatuses[vi]?.[wi];
      if (status !== "current" && status !== "default") return;
      const word = surah.verses[vi]?.text.split(/\s+/)[wi];
      if (!word) return;
      // First sight of this word: mark it. Only whisper when the SAME word
      // is still stuck on the next tick (~5s later) — a real pause.
      if (word !== lastWordRef.current) {
        lastWordRef.current = word;
        return;
      }
      if (whisperingRef.current) return;
      setUstadhLine(`...${word}`);
      whisper(word);
    }, 5000);
    return () => clearInterval(id);
  }, [isListening, finished, playingHint, alignment, surah, whisper]);

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
    lastWordRef.current = "";
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

  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-primary/20 bg-card/60 shadow-[var(--shadow-subtle)]">
      <div className="p-5 sm:p-8 lg:p-10">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">Recitation Studio</p>
            <h2 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">
              {mode === "hidden" ? "Recite to reveal" : "Guided recitation"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {isListening ? "Listening carefully — keep your natural pace" : "Begin when you feel ready"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={surahId}
              onChange={(e) => changeSurah(Number(e.target.value))}
              aria-label="Choose surah"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {surahs.map((s) => (
                <option key={s.id} value={s.id}>{s.id}. {s.name}</option>
              ))}
            </select>
            <Button
              variant={mode === "hidden" ? "secondary" : "outline"}
              onClick={() => setMode((m) => (m === "hidden" ? "visible" : "hidden"))}
              className="h-10"
            >
              {mode === "hidden" ? <EyeOff /> : <Eye />}
              {mode === "hidden" ? "Hidden" : "Visible"}
            </Button>
            <select
              value={voice}
              onChange={(e) => changeVoice(e.target.value as "male" | "female")}
              aria-label="Teacher voice"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="male">Ustadh</option>
              <option value="female">Ustadha</option>
            </select>
          </div>
        </div>

        <div className="mb-7 flex flex-wrap items-center gap-2 border-b border-primary/10 pb-5 text-xs text-muted-foreground">
          <span className="mr-1 font-semibold uppercase tracking-[0.22em]">Ayat</span>
          <select aria-label="From ayah" value={from} onChange={(e) => changeRange(Number(e.target.value), to)}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 font-medium text-foreground outline-none focus:ring-2 focus:ring-ring">
            {fullSurah.verses.map((v) => <option key={v.number} value={v.number}>{v.number === 1 ? "Bismillah" : v.number - 1}</option>)}
          </select>
          <span>to</span>
          <select aria-label="To ayah" value={to} onChange={(e) => changeRange(from, Number(e.target.value))}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 font-medium text-foreground outline-none focus:ring-2 focus:ring-ring">
            {fullSurah.verses.map((v) => <option key={v.number} value={v.number}>{v.number === 1 ? "Bismillah" : v.number - 1}</option>)}
          </select>
          <span className="mx-1 h-4 w-px bg-primary/15" aria-hidden="true" />
          <Button variant="ghost" size="sm" onClick={() => changeRange(1, fullSurah.verses.length)}>All</Button>
          <Button variant="ghost" size="sm" onClick={() => changeRange(1, Math.min(3, fullSurah.verses.length))}>First 3</Button>
        </div>

        <audio ref={audioRef} onEnded={onHintEnded} onError={() => { setPlayingHint(false); }} />

        <div className="relative mb-7 min-h-[250px] sm:min-h-[290px]">
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            <div className="h-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
          <div dir="rtl" className="space-y-2 pt-9 text-right font-arabic text-2xl leading-[2.45] sm:px-4 sm:text-3xl lg:px-8 lg:text-4xl">
            {surah.verses.map((v, vi) => {
              const words = v.text.split(/\s+/);
              const statuses = alignment.verseStatuses[vi] || [];
              return (
                <p key={v.number} className={`rounded-lg px-2 transition-colors ${playingHint && vi === alignment.currentVerseIdx ? "bg-primary/10" : ""}`}>
                  {words.map((w, wi) => {
                    const s = statuses[wi] ?? "default";
                    const hinted = hints.has(`${vi}:${wi}`);
                    return (
                      <span key={wi} className={`inline-block px-1.5 mx-0.5 ${statusClass(s, mode === "hidden", hinted)}`}>
                        {w}
                      </span>
                    );
                  })}
                  {v.number > 1 && <span className="mx-2 text-xl text-primary/70 sm:text-2xl">﴿{v.number - 1}﴾</span>}
                </p>
              );
            })}
          </div>
        </div>

        <div className="mb-7 grid grid-cols-3 divide-x divide-primary/10 border-y border-primary/10 py-4 text-center">
          <Mini label="Accuracy" value={`${stats.accuracy}%`} />
          <Mini label="Words" value={`${stats.done}/${stats.total}`} />
          <Mini label="Mistakes" value={String(stats.missed)} />
        </div>

        {finished && <p className="mb-4 text-center text-sm font-medium text-primary">Surah complete — {stats.accuracy}% accuracy. MashaAllah.</p>}
        {ustadhLine && (
          <div className={`mx-auto mb-5 max-w-2xl border-l-2 border-primary px-4 py-2 text-sm italic text-foreground/80 ${ustadhSpeaking ? "animate-pulse" : ""}`}>
            <span className="not-italic font-semibold text-primary">{voice === "male" ? "Ustadh" : "Ustadha"}</span> — “{ustadhLine}”
          </div>
        )}
        {error && <p className="mb-4 text-center text-sm text-destructive">{error === "audio" ? "The recitation hint could not play. Please try again." : "The microphone could not start. Please try again."}</p>}

        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <Button onClick={restart} variant="ghost" size="icon" aria-label="Restart" title="Restart" className="rounded-full text-muted-foreground">
            <RotateCcw />
          </Button>
          <div className="relative mx-1">
            {isListening && <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:hidden" aria-hidden="true" />}
            <Button
              onClick={toggleMic}
              aria-label={isListening ? "Stop and review" : "Start reciting"}
              title={isListening ? "Stop and review" : "Start reciting"}
              className="relative h-20 w-20 rounded-full shadow-[var(--shadow-gold)] transition-transform hover:scale-105 active:scale-95 motion-reduce:transform-none"
            >
              {isListening ? <Square className="!h-6 !w-6" /> : <Mic className="!h-7 !w-7" />}
            </Button>
          </div>
          <Button onClick={giveHint} variant="ghost" size="icon" disabled={mode !== "hidden"} aria-label="Reveal next word" title="Reveal next word" className="rounded-full text-muted-foreground">
            <Lightbulb />
          </Button>
          <Button
            onClick={playAudioHint}
            variant={playingHint ? "secondary" : "ghost"}
            size="icon"
            aria-label={playingHint ? "Stop listening hint" : "Hear this ayah"}
            title={playingHint ? "Stop listening hint" : "Hear this ayah"}
            className="rounded-full text-muted-foreground hover:text-primary"
          >
            <Ear />
          </Button>
        </div>
        <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {isListening ? "Tap to finish & review" : "Tap to begin"}
        </p>
      </div>
    </section>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="px-2">
    <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
  </div>
);

export default HifzStudio;
