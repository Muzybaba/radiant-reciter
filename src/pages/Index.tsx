import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, GraduationCap } from "lucide-react";
import { surahs } from "@/data/surahs";
import SurahSelector from "@/components/SurahSelector";
import VerseCard from "@/components/VerseCard";
import MistakeSummary from "@/components/MistakeSummary";
import { useScribeRecognition } from "@/hooks/use-scribe-recognition";
import {
  compareTexts,
  verseLockedAlign,
  progressiveWordStatus,
  type WordStatus,
} from "@/lib/arabic-compare";
import {
  acceptCorrection,
  getAcceptedPairs,
  getAcceptedSlots,
  slotKey,
  subscribeCorrections,
} from "@/lib/corrections-store";

const Index = () => {
  const [activeSurahId, setActiveSurahId] = useState(112);
  const [mistakes, setMistakes] = useState<Record<number, number[]>>({});
  const [activeVerseIndex, setActiveVerseIndex] = useState(0);
  const [isReciting, setIsReciting] = useState(false);
  const [completedVerses, setCompletedVerses] = useState<Set<number>>(new Set());
  const [displayedWordStatuses, setDisplayedWordStatuses] = useState<WordStatus[]>([]);
  const [verseWordStatuses, setVerseWordStatuses] = useState<Record<number, WordStatus[]>>({});
  const [teacherMode, setTeacherMode] = useState(false);
  // Last alignment per verse — needed so teacher taps know which spoken token
  // was paired with each correct word.
  const verseAlignedSpoken = useRef<Record<number, (string | null)[]>>({});
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const verseTranscripts = useRef<Record<number, string>>({});
  const lastTranscriptTime = useRef<number>(0);
  const stallCooldown = useRef<boolean>(false);

  // Subscribe to corrections store so the aligner picks up new accepted pairs.
  const correctionsTick = useSyncExternalStore(
    subscribeCorrections,
    () => getAcceptedPairs().size + getAcceptedSlots().size,
    () => 0
  );

  const activeSurah = surahs.find((s) => s.id === activeSurahId)!;
  const currentMistakes = mistakes[activeSurahId] || [];
  const activeVerseIndexRef = useRef(0);

  // Apply position-specific slot overrides on top of aligner statuses.
  const applySlotOverrides = useCallback(
    (statuses: WordStatus[], verseIdx: number): WordStatus[] => {
      const slots = getAcceptedSlots();
      if (slots.size === 0) return statuses;
      let next: WordStatus[] | null = null;
      for (let wi = 0; wi < statuses.length; wi++) {
        if (slots.has(slotKey(activeSurahId, verseIdx, wi)) && statuses[wi] !== "correct") {
          next = next ?? [...statuses];
          next[wi] = "correct";
        }
      }
      return next ?? statuses;
    },
    [activeSurahId]
  );

  const markMistake = useCallback((verseNumber: number) => {
    setMistakes((prev) => {
      const current = prev[activeSurahId] || [];
      if (current.includes(verseNumber)) return prev;
      return { ...prev, [activeSurahId]: [...current, verseNumber] };
    });
  }, [activeSurahId]);

  const finishRecitation = useCallback(() => {
    setIsReciting(false);
  }, []);

  const advanceVerse = useCallback(
    (transcript: string, threshold: number) => {
      const idx = activeVerseIndexRef.current;
      const verse = activeSurah.verses[idx];
      if (!verse) return false;

      verseTranscripts.current[idx] = transcript;
      lastTranscriptTime.current = Date.now();

      const { statuses: rawStatuses, alignedSpokenNorm } = verseLockedAlign(
        transcript,
        verse.text,
        { acceptedPairs: getAcceptedPairs() }
      );
      verseAlignedSpoken.current[idx] = alignedSpokenNorm;
      const statuses = applySlotOverrides(rawStatuses, idx);
      setDisplayedWordStatuses(statuses);

      const score = compareTexts(transcript, verse.text);

      if (score < threshold) return false;

      if (score < 0.5) markMistake(verse.number);

      setCompletedVerses((prev) => new Set(prev).add(idx));

      const finalStatuses: WordStatus[] = statuses.map(s => s === "current" ? "default" : s);
      setVerseWordStatuses(prev => ({ ...prev, [idx]: finalStatuses }));

      if (idx < activeSurah.verses.length - 1) {
        const nextIdx = idx + 1;
        activeVerseIndexRef.current = nextIdx;
        setActiveVerseIndex(nextIdx);
        setDisplayedWordStatuses([]);
      } else {
        finishRecitation();
      }
      return true;
    },
    [activeSurah, markMistake, finishRecitation, applySlotOverrides]
  );

  const handleResult = useCallback(
    (transcript: string) => {
      lastTranscriptTime.current = Date.now();
      advanceVerse(transcript, 0.35);
    },
    [advanceVerse]
  );

  const handleInterim = useCallback(
    (transcript: string) => {
      lastTranscriptTime.current = Date.now();
      advanceVerse(transcript, 0.55);
    },
    [advanceVerse]
  );

  const { isListening, isSupported, start, stop, reset } = useScribeRecognition({
    language: "ara",
    onResult: handleResult,
    onInterim: handleInterim,
    onError: (msg) => console.error("Scribe error:", msg),
  });

  // Stall detection: speak "أعد" if no transcript for 8 seconds
  useEffect(() => {
    if (!isReciting) return;

    const interval = setInterval(() => {
      if (stallCooldown.current) return;
      const elapsed = Date.now() - lastTranscriptTime.current;
      if (elapsed > 8000 && lastTranscriptTime.current > 0) {
        stallCooldown.current = true;
        const utterance = new SpeechSynthesisUtterance("أعد");
        utterance.lang = "ar";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
        setTimeout(() => { stallCooldown.current = false; }, 8000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isReciting]);

  useEffect(() => {
    if (isReciting && verseRefs.current[activeVerseIndex]) {
      verseRefs.current[activeVerseIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeVerseIndex, isReciting]);

  const handleReciteToggle = () => {
    if (isListening) {
      stop();
      finishRecitation();
    } else {
      setActiveVerseIndex(0);
      activeVerseIndexRef.current = 0;
      setCompletedVerses(new Set());
      setDisplayedWordStatuses([]);
      setVerseWordStatuses({});
      verseTranscripts.current = {};
      lastTranscriptTime.current = Date.now();
      stallCooldown.current = false;
      reset();
      setIsReciting(true);
      start();
    }
  };

  const handleMistake = (verseNumber: number) => {
    setMistakes((prev) => {
      const current = prev[activeSurahId] || [];
      if (current.includes(verseNumber)) {
        return { ...prev, [activeSurahId]: current.filter((v) => v !== verseNumber) };
      }
      return { ...prev, [activeSurahId]: [...current, verseNumber] };
    });
  };

  const handleReset = () => {
    setMistakes((prev) => ({ ...prev, [activeSurahId]: [] }));
    setCompletedVerses(new Set());
  };

  const getVerseStatus = (idx: number, verseNumber: number): "default" | "active" | "mistake" | "success" => {
    if (isReciting && idx === activeVerseIndex) return "active";
    if (currentMistakes.includes(verseNumber)) return "mistake";
    if (completedVerses.has(idx)) return "success";
    return "default";
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto py-[8vh] px-6">
        <header className="text-center space-y-6 mb-16">
          <span className="label-ui">Muraqaba</span>
          <h1 className="font-arabic text-3xl text-foreground">{activeSurah.nameArabic}</h1>
          <SurahSelector
            surahs={surahs}
            activeSurahId={activeSurahId}
            onSelect={setActiveSurahId}
          />
        </header>

        {isSupported && (
          <div className="flex justify-center items-center gap-3 mb-8">
            <button
              onClick={handleReciteToggle}
              className={`flex items-center gap-3 px-8 py-4 rounded-full text-lg font-medium transition-all duration-300 ${
                isListening
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 animate-pulse"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              {isListening ? "Stop Reciting" : "Start Reciting"}
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSurahId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="space-y-2"
          >
            {activeSurah.verses.map((verse, idx) => (
              <div key={verse.number} ref={(el) => { verseRefs.current[idx] = el; }}>
                <VerseCard
                  number={verse.number}
                  text={verse.text}
                  status={getVerseStatus(idx, verse.number)}
                  wordStatuses={
                    isReciting && idx === activeVerseIndex
                      ? (displayedWordStatuses.length > 0 ? displayedWordStatuses : progressiveWordStatus("", verse.text))
                      : verseWordStatuses[idx]
                  }
                  onTap={() => handleMistake(verse.number)}
                />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <p className="text-center label-ui mt-16 opacity-50">
          {isReciting ? "Reciting... mistakes will be highlighted" : "Tap a verse to mark a mistake, or press Start Reciting"}
        </p>
      </div>

      <MistakeSummary
        count={currentMistakes.length}
        surahName={activeSurah.name}
        onReset={handleReset}
      />
    </div>
  );
};

export default Index;
