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
          return (
            <span key={verse.number} className="contents">
              {words.map((w, wi) => {
                const status = statuses[wi] || "default";
                // Dim words strictly after the current pointer
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
              {/* Ayah end marker — digit centered inside the ornament */}
              <span
                className="relative inline-block mx-0.5 select-none text-foreground/60 align-middle"
                style={{ width: "1em", height: "1em", lineHeight: "1em" }}
                aria-hidden
              >
                <span className="absolute inset-0 flex items-center justify-center text-[1em] leading-none">
                  ۝
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-[0.38em] tabular-nums text-foreground/80">
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
