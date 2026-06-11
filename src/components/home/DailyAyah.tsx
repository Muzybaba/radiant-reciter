import { motion } from "framer-motion";
import type { Surah } from "@/data/surahs";

interface DailyAyahProps {
  surahs: Surah[];
}

const translations: Record<string, string> = {
  "112-2": "Say: He is Allah, the One.",
  "112-3": "Allah, the Eternal Refuge.",
  "113-2": "Say: I seek refuge in the Lord of daybreak.",
  "114-2": "Say: I seek refuge in the Lord of mankind.",
  "114-4": "The God of mankind.",
};

function pickDaily(surahs: Surah[]) {
  const keys: { surah: Surah; verseIdx: number }[] = [];
  surahs.forEach((s) => {
    s.verses.forEach((_v, vi) => {
      if (vi === 0) return; // skip basmala
      keys.push({ surah: s, verseIdx: vi });
    });
  });
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const pick = keys[dayOfYear % keys.length];
  return pick;
}

const DailyAyah = ({ surahs }: DailyAyahProps) => {
  const { surah, verseIdx } = pickDaily(surahs);
  const verse = surah.verses[verseIdx];
  const key = `${surah.id}-${verse.number}`;
  const translation = translations[key] ?? "—";

  return (
    <section className="py-24">
      <div className="flex items-center justify-center mb-10">
        <span className="text-[10px] text-primary uppercase tracking-[0.4em]">
          Ayah of the Day
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative max-w-2xl mx-auto px-10 sm:px-16 py-16 text-center"
      >
        {/* corner brackets */}
        <span className="absolute top-0 left-0 w-8 h-8 border-l border-t border-primary/50" />
        <span className="absolute top-0 right-0 w-8 h-8 border-r border-t border-primary/50" />
        <span className="absolute bottom-0 left-0 w-8 h-8 border-l border-b border-primary/50" />
        <span className="absolute bottom-0 right-0 w-8 h-8 border-r border-b border-primary/50" />

        <p
          dir="rtl"
          className="font-arabic text-3xl sm:text-4xl text-foreground leading-[2.2]"
        >
          {verse.text}
        </p>

        <p className="mt-10 font-display italic text-lg text-muted-foreground">
          “{translation}”
        </p>

        <p className="mt-6 text-[10px] text-primary uppercase tracking-[0.4em]">
          {surah.name} · Ayah {verse.number}
        </p>
      </motion.div>
    </section>
  );
};

export default DailyAyah;
