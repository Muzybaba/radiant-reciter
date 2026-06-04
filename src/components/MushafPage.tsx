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
  teacherMode,
  onWordTap,
}: MushafPageProps) => {
  return (
    <motion.div
      key={surah.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      dir="rtl"
      className="font-arabic text-[2.1rem] sm:text-[2.35rem] leading-[2.5] text-right text-foreground"
      style={{ textAlignLast: "right", wordSpacing: "0.15em" }}
    >
      {/* Surah ornamental header */}
      <div className="text-center mb-10 select-none">
        <div className="inline-block border-y border-foreground/20 px-8 py-3">
          <div className="label-ui mb-1">سُورَة</div>
          <div className="font-arabic text-3xl">{surah.nameArabic}</div>
        </div>
      </div>

      <p className="flex flex-wrap gap-x-2 gap-y-1 justify-end">
        {surah.verses.map((verse, vi) => {
          const words = splitWords(verse.text);
          const statuses = verseStatuses[vi] || [];
          const isActive = isReciting && vi === currentVerseIdx;
          return (
            <span
              key={verse.number}
              className={`contents`}
            >
              {words.map((w, wi) => {
                const status = statuses[wi] || "default";
                const dim =
                  isReciting &&
                  status === "default" &&
                  (vi > currentVerseIdx ||
                    (vi === currentVerseIdx && wi > 0 && !statuses.slice(0, wi).some((s) => s === "current")));
                return (
                  <MushafWord
                    key={`${vi}-${wi}`}
                    word={w}
                    status={status}
                    dim={!!dim && !isActive}
                    clickable={teacherMode}
                    onClick={teacherMode ? () => onWordTap?.(vi, wi) : undefined}
                  />
                );
              })}
              {/* Ayah end marker */}
              <span
                className="inline-flex items-center justify-center text-[1.4rem] mx-1 text-foreground/60 select-none"
                aria-hidden
              >
                ۝
                <span className="text-[0.85rem] -ml-[1.05rem] text-foreground/70 tabular-nums">
                  {toArabicDigits(verse.number)}
                </span>
              </span>
            </span>
          );
        })}
      </p>
    </motion.div>
  );
};

export default MushafPage;
