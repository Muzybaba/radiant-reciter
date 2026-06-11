import { useState, useCallback, useRef, useEffect, useSyncExternalStore, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { GraduationCap, Settings } from "lucide-react";
import { surahs } from "@/data/surahs";
import SurahSidebar from "@/components/SurahSidebar";
import SurahSelector from "@/components/SurahSelector";
import MushafPage from "@/components/MushafPage";
import MicButton from "@/components/MicButton";
import MistakeSummary from "@/components/MistakeSummary";
import HomeView from "@/components/HomeView";
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
  const [view, setView] = useState<"home" | "mushaf">("home");
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
      setSettledTranscript("");
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
    setSettledTranscript("");
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
    setSettledTranscript("");
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
    <div className="min-h-screen flex w-full bg-vignette">
      <SurahSidebar
        surahs={surahs}
        activeSurahId={activeSurahId}
        activeView={view}
        onSelect={(id) => { setActiveSurahId(id); setView("mushaf"); }}
        onSelectHome={() => setView("home")}
        correctionsCount={corrCount}
      />

      <main className="flex-1 relative flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-12 py-7 border-b border-primary/10">
          <div className="flex flex-col">
            <h1 className="font-display text-2xl font-semibold text-primary tracking-[0.25em] uppercase">
              Muraqaba
            </h1>
            <span className="text-[10px] text-muted-foreground tracking-[0.3em] -mt-0.5 uppercase">
              Spiritual Vigilance
            </span>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={() => setTeacherMode((v) => !v)}
              className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${
                teacherMode
                  ? "bg-primary/10 border-primary/40 text-accent"
                  : "bg-foreground/5 border-foreground/10 text-muted-foreground hover:border-primary/30"
              }`}
              title="Tap any word to teach the matcher"
            >
              <GraduationCap size={13} />
              <span className="text-[10px] uppercase tracking-[0.25em]">
                Teacher {teacherMode ? "On" : "Off"}
              </span>
              <span
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  teacherMode ? "bg-primary/40" : "bg-foreground/10"
                }`}
              >
                <span
                  className={`absolute top-1 w-2 h-2 rounded-full transition-all ${
                    teacherMode ? "left-5 bg-accent" : "left-1 bg-foreground/30"
                  }`}
                />
              </span>
            </button>
            <button
              className="hidden sm:flex w-10 h-10 rounded-full border border-primary/30 items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              aria-label="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Mobile surah selector (only on Mushaf view) */}
        {view === "mushaf" && (
          <div className="md:hidden px-6 py-4 border-b border-primary/10">
            <SurahSelector
              surahs={surahs}
              activeSurahId={activeSurahId}
              onSelect={setActiveSurahId}
            />
          </div>
        )}

        {/* Main canvas */}
        <div className="flex-1 overflow-y-auto pb-56">
          <AnimatePresence mode="wait">
            {view === "home" ? (
              <HomeView
                key="home"
                surahs={surahs}
                onStartReciting={() => setView("mushaf")}
                onSelectSurah={(id) => { setActiveSurahId(id); setView("mushaf"); }}
              />
            ) : (
              <div key="mushaf" className="max-w-2xl mx-auto px-8 md:px-12 py-16">
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
                {teacherMode && (
                  <p className="text-center label-ui mt-16 opacity-60">
                    Tap any word to mark it correct — the matcher will learn
                  </p>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {isSupported && view === "mushaf" && (
          <MicButton isListening={isListening} onToggle={handleReciteToggle} />
        )}

        {view === "mushaf" && (
          <MistakeSummary
            count={currentMistakes.length}
            surahName={activeSurah.name}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
