import { motion } from "framer-motion";
import type { Surah } from "@/data/surahs";
import Hero from "./home/Hero";
import SurahGrid from "./home/SurahGrid";
import DailyAyah from "./home/DailyAyah";

interface HomeViewProps {
  surahs: Surah[];
  onStartReciting: () => void;
  onSelectSurah: (id: number) => void;
}

const HomeView = ({ surahs, onStartReciting, onSelectSurah }: HomeViewProps) => {
  const scrollToGrid = () => {
    document.getElementById("surah-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto px-6 sm:px-12 pb-32"
    >
      <Hero onStartReciting={onStartReciting} onChooseSurah={scrollToGrid} />
      <SurahGrid surahs={surahs} onSelect={onSelectSurah} />
      <DailyAyah surahs={surahs} />
    </motion.div>
  );
};

export default HomeView;
