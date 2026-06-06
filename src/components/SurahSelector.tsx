import { motion } from "framer-motion";
import type { Surah } from "@/data/surahs";

interface SurahSelectorProps {
  surahs: Surah[];
  activeSurahId: number;
  onSelect: (id: number) => void;
}

const SurahSelector = ({ surahs, activeSurahId, onSelect }: SurahSelectorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {surahs.map((s) => {
        const isActive = s.id === activeSurahId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`relative px-4 py-2 rounded-full transition-colors duration-200 label-ui ${
              isActive
                ? "text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="surah-pill"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              />
            )}
            <span className="relative z-10">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SurahSelector;
