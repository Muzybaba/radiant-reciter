import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { surahs } from "@/data/surahs";
import SurahSelector from "@/components/SurahSelector";
import VerseCard from "@/components/VerseCard";
import MistakeSummary from "@/components/MistakeSummary";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { compareTexts } from "@/lib/arabic-compare";

const Index = () => {
  const [activeSurahId, setActiveSurahId] = useState(112);
  const [mistakes, setMistakes] = useState<Record<number, number[]>>({});
  const [activeVerseIndex, setActiveVerseIndex] = useState(0);
  const [isReciting, setIsReciting] = useState(false);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  const handleResult = useCallback(
    (transcript: string) => {
      const idx = activeVerseIndexRef.current;
      const verse = activeSurah.verses[idx];
      if (!verse) return;

      const score = compareTexts(transcript, verse.text);

      if (score < 0.4) {
        markMistake(verse.number);
      }

      // Move to next verse
      if (idx < activeSurah.verses.length - 1) {
        const nextIdx = idx + 1;
        activeVerseIndexRef.current = nextIdx;
        setActiveVerseIndex(nextIdx);
      }
    },
    [activeSurah, markMistake]
  );

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    lang: "ar",
    continuous: true,
    onResult: handleResult,
  });

  const handleReciteToggle = () => {
    if (isListening) {
      stop();
      setIsReciting(false);
    } else {
      setActiveVerseIndex(0);
      activeVerseIndexRef.current = 0;
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
  };

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
              <VerseCard
                key={verse.number}
                number={verse.number}
                text={verse.text}
                isMistake={currentMistakes.includes(verse.number)}
                isActive={isReciting && idx === activeVerseIndex}
                onTap={() => handleMistake(verse.number)}
              />
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
