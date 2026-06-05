import { useState, useCallback, useRef, useEffect, useSyncExternalStore, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { surahs } from "@/data/surahs";
import SurahSelector from "@/components/SurahSelector";
import MushafPage from "@/components/MushafPage";
import MicButton from "@/components/MicButton";
import MistakeSummary from "@/components/MistakeSummary";
import { useScribeRecognition } from "@/hooks/use-scribe-recognition";
import { alignSurah, type SurahAlignment } from "@/lib/surah-matcher";
import type { WordStatus } from "@/lib/arabic-compare";
import {
  acceptCorrection,
  correctionsCount,
  getAcceptedPairs,
  getAcceptedSlots,
  subscribeCorrections,
} from "@/lib/corrections-store";

const Index = () => {
  const [activeSurahId, setActiveSurahId] = useState(112);
  const [mistakes, setMistakes] = useState<Record<number, number[]>>({});
  const [isReciting, setIsReciting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [settledTranscript, setSettledTranscript] = useState("");
  const [teacherMode, setTeacherMode] = useState(false);

  // Debounce: only "commit" the transcript to the matcher after 500ms of
  // no new speech — gives the reciter a beat to finish an ayah before
  // words light up green/red. Feels like a teacher nodding after you pause.
  useEffect(() => {
    const id = setTimeout(() => setSettledTranscript(transcript), 500);
    return () => clearTimeout(id);
  }, [transcript]);
  const lastTranscriptTime = useRef<number>(0);
  const stallCooldown = useRef<boolean>(false);
  const verseAlignedSpoken = useRef<(string | null)[][]>([]);

  // Re-render on corrections change so the alignment recomputes.
  const correctionsTick = useSyncExternalStore(
    subscribeCorrections,
    () => correctionsCount(),
    () => 0
  );

  const activeSurah = surahs.find((s) => s.id === activeSurahId)!;
  const currentMistakes = mistakes[activeSurahId] || [];

  // Compute alignment on every transcript or corrections change.
  const alignment: SurahAlignment = useMemo(() => {
    return alignSurah(settledTranscript, activeSurah, {
      acceptedPairs: getAcceptedPairs(),
      acceptedSlots: getAcceptedSlots(),
      surahId: activeSurahId,
      emitWeak: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledTranscript, activeSurah, activeSurahId, correctionsTick]);

  // Keep aligned-spoken ref fresh for teacher taps.
  useEffect(() => {
    verseAlignedSpoken.current = alignment.alignedSpokenNorm;
  }, [alignment]);

  // Auto-collect mistakes when reciting: any verse with ≥1 missed word after we passed it.
  useEffect(() => {
    if (!isReciting) return;
    const missedVerseNumbers = activeSurah.verses
      .map((v, vi) => {
        if (vi >= alignment.currentVerseIdx) return null;
        const statuses = alignment.verseStatuses[vi] || [];
        return statuses.some((s) => s === "missed") ? v.number : null;
      })
      .filter((n): n is number => n !== null);
    if (missedVerseNumbers.length === 0) return;
    setMistakes((prev) => {
      const cur = prev[activeSurahId] || [];
      const next = Array.from(new Set([...cur, ...missedVerseNumbers]));
      if (next.length === cur.length) return prev;
      return { ...prev, [activeSurahId]: next };
    });
  }, [alignment, isReciting, activeSurah, activeSurahId]);

  const handleResult = useCallback((t: string) => {
    lastTranscriptTime.current = Date.now();
    setTranscript(t);
  }, []);

  const handleInterim = useCallback((t: string) => {
    lastTranscriptTime.current = Date.now();
    setTranscript(t);
  }, []);

  const { isListening, isSupported, start, stop, reset } = useScribeRecognition({
    language: "ara",
    onResult: handleResult,
    onInterim: handleInterim,
    onError: (msg) => console.error("Scribe error:", msg),
  });

  // Stall reminder
  useEffect(() => {
    if (!isReciting) return;
    const interval = setInterval(() => {
      if (stallCooldown.current) return;
      const elapsed = Date.now() - lastTranscriptTime.current;
      if (elapsed > 8000 && lastTranscriptTime.current > 0) {
        stallCooldown.current = true;
        const u = new SpeechSynthesisUtterance("أعد");
        u.lang = "ar";
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
        setTimeout(() => { stallCooldown.current = false; }, 8000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isReciting]);

  // Auto-finish when global pointer reaches the end with the last word matched.
  useEffect(() => {
    if (!isReciting) return;
    const lastVi = activeSurah.verses.length - 1;
    const lastWi = (alignment.verseStatuses[lastVi]?.length ?? 1) - 1;
    const lastStatus = alignment.verseStatuses[lastVi]?.[lastWi];
    if (lastStatus === "correct" || lastStatus === "weak") {
      // Done
      stop();
      setIsReciting(false);
    }
  }, [alignment, isReciting, activeSurah, stop]);

  const handleReciteToggle = () => {
    if (isListening) {
      stop();
      setIsReciting(false);
    } else {
      setTranscript("");
      lastTranscriptTime.current = Date.now();
      stallCooldown.current = false;
      reset();
      setIsReciting(true);
      start();
    }
  };

  const handleReset = () => {
    setMistakes((prev) => ({ ...prev, [activeSurahId]: [] }));
    setTranscript("");
  };

  // Teacher tap: toggle word state. If currently correct/weak → mark missed (clear correction).
  // If missed/default → accept correction (save pair or slot).
  const handleWordTap = useCallback(
    (verseIdx: number, wordIdx: number) => {
      const verse = activeSurah.verses[verseIdx];
      if (!verse) return;
      const words = verse.text.replace(/\u0640/g, "").trim().split(/\s+/);
      const correctWord = words[wordIdx];
      if (!correctWord) return;
      const alignedSpoken = verseAlignedSpoken.current[verseIdx]?.[wordIdx] ?? null;
      acceptCorrection({
        surahId: activeSurahId,
        verseIdx,
        wordIdx,
        correctWord,
        spokenWord: alignedSpoken,
      });
    },
    [activeSurah, activeSurahId]
  );

  // Reset transcript on surah switch
  useEffect(() => {
    setTranscript("");
    if (isListening) {
      stop();
      setIsReciting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSurahId]);

  const corrCount = correctionsTick;

  // Build "display" statuses — when not reciting, drop any "current" markers.
  const displayStatuses: WordStatus[][] = useMemo(() => {
    if (isReciting) return alignment.verseStatuses;
    return alignment.verseStatuses.map((arr) =>
      arr.map((s) => (s === "current" ? "default" : s))
    );
  }, [alignment, isReciting]);

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-2xl mx-auto py-[6vh] px-6">
        <header className="text-center space-y-5 mb-10">
          <span className="label-ui">Muraqaba</span>
          <SurahSelector
            surahs={surahs}
            activeSurahId={activeSurahId}
            onSelect={setActiveSurahId}
          />
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setTeacherMode((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium tracking-wider uppercase transition-all duration-200 border ${
                teacherMode
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
              }`}
              title="Tap any word to teach the matcher"
            >
              <GraduationCap size={12} />
              Teacher {teacherMode ? "On" : "Off"}
            </button>
            {corrCount > 0 && (
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                ✓ {corrCount} saved
              </span>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <MushafPage
            key={activeSurahId}
            surah={activeSurah}
            verseStatuses={displayStatuses}
            isReciting={isReciting}
            currentVerseIdx={alignment.currentVerseIdx}
            currentWordIdx={alignment.currentWordIdx}
            teacherMode={teacherMode}
            onWordTap={handleWordTap}
          />
        </AnimatePresence>

        <p className="text-center label-ui mt-12 opacity-50">
          {teacherMode
            ? "Tap any word to mark it correct — the matcher will learn"
            : isReciting
              ? "Listening… recite naturally"
              : isSupported
                ? "Press the mic to begin"
                : "Microphone not supported in this browser"}
        </p>
      </div>

      {isSupported && <MicButton isListening={isListening} onToggle={handleReciteToggle} />}

      <MistakeSummary
        count={currentMistakes.length}
        surahName={activeSurah.name}
        onReset={handleReset}
      />
    </div>
  );
};

export default Index;
