interface MistakeSummaryProps {
  count: number;
  surahName: string;
  onReset: () => void;
}

const MistakeSummary = ({ count, surahName, onReset }: MistakeSummaryProps) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className="bg-card border border-primary/20 rounded-lg px-5 py-3 flex items-center gap-4 backdrop-blur"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        <p className="text-sm text-foreground/80 font-light">
          <span className="text-[hsl(var(--mistake-text))] font-medium">
            {count} mistake{count > 1 ? "s" : ""}
          </span>{" "}
          <span className="text-muted-foreground">in {surahName}</span>
        </p>
        <button
          onClick={onReset}
          className="label-ui text-primary hover:text-accent transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default MistakeSummary;
