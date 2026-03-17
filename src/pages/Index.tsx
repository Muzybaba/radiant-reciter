import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, X } from "lucide-react";
import { surahs } from "@/data/surahs";
import SurahSelector from "@/components/SurahSelector";
import VerseCard from "@/components/VerseCard";
import VerseDiff from "@/components/VerseDiff";
import MistakeSummary from "@/components/MistakeSummary";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { compareTexts, diffWords, progressiveWordStatus, type WordDiff, type WordStatus } from "@/lib/arabic-compare";

const Index = () => {
  const [activeSurahId, setActiveSurahId] = useState(112);
  const [mistakes, setMistakes] = useState<Record<number, number[]>>({});
  const [activeVerseIndex, setActiveVerseIndex] = useState(0);
  const [isReciting, setIsReciting] = useState(false);
  const [completedVerses, setCompletedVerses] = useState<Set<number>>(new Set());
  const [showDiff, setShowDiff] = useState(false);
  const [verseDiffs, setVerseDiffs] = useState<Record<number, WordDiff[]>>({});
  const [activeWordStatuses, setActiveWordStatuses] = useState<WordStatus[]>([]);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const verseTranscripts = useRef<Record<number, string>>({});

  const activeSurah = surahs.find((s) => s.id === activeSurahId)!;
  const currentMistakes = mistakes[activeSurahId] || [];
  const activeVerseIndexRef = useRef(0);

  const markMistake = useCallback((verseNumber: number) => {
    setMistakes((prev) => {
      const current = prev[activeSurahId] || [];
      if (current.includes(verseNumber)) return prev;
      return { ...prev, [activeSurahId]: [...current, verseNumber] };
    });
  }, [activeSurahId]);

  const finishRecitation = useCallback(() => {
    setIsReciting(false);
    // Build diffs from stored transcripts
    const diffs: Record<number, WordDiff[]> = {};
    activeSurah.verses.forEach((verse, idx) => {
      const transcript = verseTranscripts.current[idx] || "";
      if (transcript) {
        diffs[idx] = diffWords(transcript, verse.text);
      }
    });
    setVerseDiffs(diffs);
    setShowDiff(true);
  }, [activeSurah]);

  const advanceVerse = useCallback(
    (transcript: string, threshold: number) => {
      const idx = activeVerseIndexRef.current;
      const verse = activeSurah.verses[idx];
      if (!verse) return false;

      // Accumulate transcript for this verse
      verseTranscripts.current[idx] = transcript;

      // Update real-time word statuses
      const statuses = progressiveWordStatus(transcript, verse.text);
      setActiveWordStatuses(statuses);

      const score = compareTexts(transcript, verse.text);

      if (score < threshold) {
        return false;
      }

      if (score < 0.5) {
        markMistake(verse.number);
      }

      setCompletedVerses((prev) => new Set(prev).add(idx));

      if (idx < activeSurah.verses.length - 1) {
        const nextIdx = idx + 1;
        activeVerseIndexRef.current = nextIdx;
        setActiveVerseIndex(nextIdx);
        setActiveWordStatuses([]); // Reset for next verse
      } else {
        finishRecitation();
      }
      return true;
    },
    [activeSurah, markMistake, finishRecitation]
  );

  const handleResult = useCallback(
    (transcript: string) => {
      advanceVerse(transcript, 0.35);
    },
    [advanceVerse]
  );

  const handleInterim = useCallback(
    (transcript: string) => {
      advanceVerse(transcript, 0.55);
    },
    [advanceVerse]
  );

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    lang: "ar",
    continuous: true,
    onResult: handleResult,
    onInterim: handleInterim,
  });

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
      setActiveWordStatuses([]);
      setShowDiff(false);
      setVerseDiffs({});
      verseTranscripts.current = {};
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
    setShowDiff(false);
    setVerseDiffs({});
  };

  const getVerseStatus = (idx: number, verseNumber: number): "default" | "active" | "mistake" | "success" => {
    if (isReciting && idx === activeVerseIndex) return "active";
    if (currentMistakes.includes(verseNumber)) return "mistake";
    if (completedVerses.has(idx)) return "success";
    return "default";
  };

  const diffEntries = Object.entries(verseDiffs).filter(
    ([, words]) => words.some((w) => w.status === "missed")
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto py-[8vh] px-6">
        {/* Header */}
        <header className="text-center space-y-6 mb-16">
          <span className="label-ui">Muraqaba</span>
          <h1 className="font-arabic text-3xl text-foreground">{activeSurah.nameArabic}</h1>
          <SurahSelector
            surahs={surahs}
            activeSurahId={activeSurahId}
            onSelect={setActiveSurahId}
          />
        </header>

        {/* Recite Button */}
        {isSupported && (
          <div className="flex justify-center mb-8">
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

        {/* Diff Summary */}
        <AnimatePresence>
          {showDiff && diffEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="label-ui text-foreground">Word-by-word review</h2>
                <button onClick={() => setShowDiff(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {diffEntries.map(([idxStr, words]) => {
                  const idx = Number(idxStr);
                  const verse = activeSurah.verses[idx];
                  return verse ? (
                    <VerseDiff key={idx} number={verse.number} words={words} />
                  ) : null;
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verses */}
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
                  wordStatuses={isReciting && idx === activeVerseIndex ? activeWordStatuses : undefined}
                  onTap={() => handleMistake(verse.number)}
                />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Footer hint */}
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
