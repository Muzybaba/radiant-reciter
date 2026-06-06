import { motion } from "framer-motion";
import type { Surah } from "@/data/surahs";
import type { WordStatus } from "@/lib/arabic-compare";
import MushafWord from "./MushafWord";

interface MushafPageProps {
  surah: Surah;
  verseStatuses: WordStatus[][];
  isReciting: boolean;
  currentVerseIdx: number;
  currentWordIdx: number;
  teacherMode: boolean;
  onWordTap?: (verseIdx: number, wordIdx: number) => void;
}

function toArabicDigits(n: number): string {
  return String(n)
    .split("")
    .map((c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)])
    .join("");
}

function splitWords(text: string): string[] {
  return text.replace(/\u0640/g, "").replace(/\s+/g, " ").trim().split(" ");
}

const MushafPage = ({
  surah,
  verseStatuses,
  isReciting,
  currentVerseIdx,
  currentWordIdx,
  teacherMode,
  onWordTap,
}: MushafPageProps) => {
  return (
    <motion.div
      key={surah.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
    >
      {/* Surah ornamental header */}
      <div className="relative mb-20 flex flex-col items-center select-none">
        <div className="absolute inset-y-0 -inset-x-12 border-y border-primary/20 pointer-events-none" />
        <span className="font-display text-[11px] text-primary uppercase tracking-[0.5em] mb-3">
          Surah
        </span>
        <h2 dir="rtl" className="font-arabic text-6xl text-foreground font-bold">
          {surah.nameArabic}
        </h2>
        <div className="mt-4 flex items-center gap-4 text-muted-foreground text-[10px] tracking-[0.3em] uppercase">
          <span>{surah.name}</span>
          <span className="w-1 h-1 rounded-full bg-primary/50" />
          <span>{surah.verses.length} Ayahs</span>
        </div>
      </div>

      {/* Mushaf body */}
      <div
        dir="rtl"
        className="font-arabic text-[2.1rem] sm:text-[2.35rem] leading-[2.6] text-right"
        style={{ textAlignLast: "right", wordSpacing: "0.15em" }}
      >
        <p className="flex flex-wrap gap-x-2 gap-y-1 justify-end">
          {surah.verses.map((verse, vi) => {
            const words = splitWords(verse.text);
            const statuses = verseStatuses[vi] || [];
            return (
              <span key={verse.number} className="contents">
                {words.map((w, wi) => {
                  const status = statuses[wi] || "default";
                  const afterCursor =
                    vi > currentVerseIdx ||
                    (vi === currentVerseIdx && wi > currentWordIdx);
                  const dim = isReciting && status === "default" && afterCursor;
                  return (
                    <MushafWord
                      key={`${vi}-${wi}`}
                      word={w}
                      status={status}
                      dim={dim}
                      clickable={teacherMode}
                      onClick={teacherMode ? () => onWordTap?.(vi, wi) : undefined}
                    />
                  );
                })}
                {/* Ayah end marker */}
                <span
                  className="relative inline-block mx-0.5 select-none text-primary/70 align-middle"
                  style={{ width: "1em", height: "1em", lineHeight: "1em" }}
                  aria-hidden
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[1em] leading-none">
                    ۝
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center text-[0.38em] tabular-nums text-primary">
                    {toArabicDigits(verse.number)}
                  </span>
                </span>
              </span>
            );
          })}
        </p>
      </div>
    </motion.div>
  );
};

export default MushafPage;
