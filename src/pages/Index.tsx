import { useState, useCallback, useRef, useEffect, useSyncExternalStore, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { BookOpen } from "lucide-react";
import { surahs } from "@/data/surahs";
import SurahSidebar from "@/components/SurahSidebar";
import SurahSelector from "@/components/SurahSelector";
import MushafPage from "@/components/MushafPage";
import HomeView from "@/components/HomeView";
import QuranAudioPlayer from "@/components/QuranAudioPlayer";
import AppearanceMenu from "@/components/AppearanceMenu";
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
  const teacherMode = false;

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

          <div className="flex items-center gap-3"><span className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground"><BookOpen size={15} /> Read & listen</span><AppearanceMenu /></div>
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
                <QuranAudioPlayer surah={activeSurah} />
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
              </div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
};

export default Index;
