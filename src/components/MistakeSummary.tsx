interface MistakeSummaryProps {
  count: number;
  surahName: string;
  onReset: () => void;
}

const MistakeSummary = ({ count, surahName, onReset }: MistakeSummaryProps) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="bg-card border border-border rounded-sm px-6 py-3 flex items-center gap-4"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        <p className="text-sm text-foreground">
          <span className="text-mistake-text font-medium">{count} mistake{count > 1 ? "s" : ""}</span>
          {" "}in {surahName}.
        </p>
        <button
          onClick={onReset}
          className="label-ui text-primary hover:text-foreground transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default MistakeSummary;
