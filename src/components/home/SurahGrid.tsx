import { motion } from "framer-motion";
import type { Surah } from "@/data/surahs";

interface SurahGridProps {
  surahs: Surah[];
  onSelect: (id: number) => void;
}

const meanings: Record<number, string> = {
  112: "The Sincerity",
  113: "The Daybreak",
  114: "Mankind",
};

const SurahGrid = ({ surahs, onSelect }: SurahGridProps) => {
  return (
    <section id="surah-grid" className="py-20">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-[10px] text-primary uppercase tracking-[0.4em] font-medium">
          The Last Three
        </h2>
        <span className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase">
          Al-Mu'awwidhat
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {surahs.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            whileHover={{ y: -4 }}
            onClick={() => onSelect(s.id)}
            className="group relative text-left p-7 rounded-2xl border border-primary/15 bg-card hover:border-primary/50 transition-all overflow-hidden"
          >
            {/* glow on hover */}
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex items-start justify-between">
              <span className="font-display text-3xl text-accent/80 group-hover:text-accent transition-colors">
                {s.id}
              </span>
              <span dir="rtl" className="font-arabic text-4xl text-foreground group-hover:text-glow-gold transition-all">
                {s.nameArabic}
              </span>
            </div>

            <div className="mt-10">
              <p className="font-display text-xl text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground italic mt-1">
                {meanings[s.id] ?? ""}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span>{s.verses.length} Ayahs</span>
              <span className="text-primary group-hover:translate-x-1 transition-transform">
                Open →
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default SurahGrid;
