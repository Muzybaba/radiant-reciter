import type { WordStatus } from "@/lib/arabic-compare";

interface MushafWordProps {
  word: string;
  status: WordStatus;
  dim?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

const colorMap: Record<WordStatus, string> = {
  default: "text-foreground/60",
  correct: "text-[hsl(var(--success-text))] text-glow-gold",
  weak: "text-[hsl(var(--weak-text))] underline decoration-dotted underline-offset-[6px] decoration-[hsl(var(--weak-text)/0.5)]",
  missed: "text-[hsl(var(--mistake-text))]",
  current: "text-accent text-glow-gold animate-word-pulse",
};

const MushafWord = ({ word, status, dim, clickable, onClick }: MushafWordProps) => {
  const cls = `transition-all duration-500 ${colorMap[status]} ${dim ? "opacity-25" : ""} ${
    clickable ? "cursor-pointer hover:bg-primary/10 rounded px-0.5 -mx-0.5" : ""
  }`;

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {word}
      </button>
    );
  }
  return <span className={cls}>{word}</span>;
};

export default MushafWord;
