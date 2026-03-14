import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { surahs } from "@/data/surahs";
import SurahSelector from "@/components/SurahSelector";
import VerseCard from "@/components/VerseCard";
import MistakeSummary from "@/components/MistakeSummary";

const Index = () => {
  const [activeSurahId, setActiveSurahId] = useState(112);
  const [mistakes, setMistakes] = useState<Record<number, number[]>>({});

  const activeSurah = surahs.find((s) => s.id === activeSurahId)!;
  const currentMistakes = mistakes[activeSurahId] || [];

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
            {activeSurah.verses.map((verse) => (
              <VerseCard
                key={verse.number}
                number={verse.number}
                text={verse.text}
                isMistake={currentMistakes.includes(verse.number)}
                onTap={() => handleMistake(verse.number)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Footer hint */}
        <p className="text-center label-ui mt-16 opacity-50">
          Tap a verse to mark a mistake
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
