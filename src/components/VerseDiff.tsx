import type { WordDiff } from "@/lib/arabic-compare";

interface VerseDiffProps {
  number: number;
  words: WordDiff[];
}

const VerseDiff = ({ number, words }: VerseDiffProps) => {
  const hasMistakes = words.some((w) => w.status === "missed");

  if (!hasMistakes) return null;

  return (
    <div className="w-full text-right rounded-sm p-6 border border-border bg-card" dir="rtl">
      <div className="flex items-start gap-4">
        <span className="label-ui mt-3 shrink-0 tabular-nums">{number}</span>
        <p className="font-arabic text-3xl leading-[2.5] flex-1 text-right flex flex-wrap gap-x-2">
          {words.map((w, i) => (
            <span
              key={i}
              className={
                w.status === "correct"
                  ? "text-[hsl(var(--success-text))]"
                  : "text-[hsl(var(--mistake-text))] underline decoration-[hsl(var(--mistake-text))]/30 underline-offset-8"
              }
            >
              {w.word}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

export default VerseDiff;
