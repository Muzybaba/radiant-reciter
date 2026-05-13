import { motion } from "framer-motion";
import type { WordStatus } from "@/lib/arabic-compare";

type VerseStatus = "default" | "active" | "mistake" | "success";

interface VerseCardProps {
  number: number;
  text: string;
  status: VerseStatus;
  wordStatuses?: WordStatus[];
  onTap: () => void;
}

const statusStyles: Record<VerseStatus, string> = {
  default: "bg-transparent border-transparent hover:bg-accent hover:border-border",
  active: "bg-white dark:bg-white/10 border-primary/30 shadow-md",
  mistake: "bg-[hsl(var(--mistake-bg))] border-[hsl(var(--mistake-border))]",
  success: "bg-[hsl(var(--success-bg))] border-[hsl(var(--success-border))]",
};

const numberStyles: Record<VerseStatus, string> = {
  default: "",
  active: "text-primary",
  mistake: "text-[hsl(var(--mistake-text))]",
  success: "text-[hsl(var(--success-text))]",
};

const wordColorMap: Record<WordStatus, string> = {
  default: "",
  correct: "text-[hsl(var(--success-text))]",
  missed: "text-[hsl(var(--mistake-text))]",
  current: "text-primary rounded-sm px-1.5 py-0.5 -mx-0.5 animate-word-pulse",
};

const VerseCard = ({ number, text, status, wordStatuses, onTap }: VerseCardProps) => {
  const words = text.split(/\s+/);
  const hasWordStatuses = wordStatuses && wordStatuses.length > 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`w-full text-right rounded-sm p-6 transition-colors duration-200 border group relative ${statusStyles[status]}`}
      dir="rtl"
    >
      <div className="flex items-start gap-4">
        <span className={`label-ui mt-3 shrink-0 tabular-nums ${numberStyles[status]}`}>
          {number}
        </span>
        <button onClick={onTap} className="font-arabic text-4xl leading-[2.5] flex-1 text-right">
          <p className="flex flex-wrap gap-x-2">
            {words.map((word, i) => {
              const ws = hasWordStatuses ? (wordStatuses[i] || "default") : "default";
              // For active verse, dim upcoming words
              const dimUpcoming = status === "active" && hasWordStatuses && ws === "default";
              return (
                <span
                  key={i}
                  className={`transition-all duration-300 ${wordColorMap[ws]} ${dimUpcoming ? "opacity-40" : ""}`}
                >
                  {word}
                </span>
              );
            })}
          </p>
        </button>
      </div>
    </motion.div>
  );
};

export default VerseCard;
