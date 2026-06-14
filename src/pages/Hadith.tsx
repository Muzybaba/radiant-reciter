import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import PageShell from "@/components/PageShell";

interface HadithData {
  arab: string;
  english: string;
  book: string;
  number: number;
}

const COLLECTIONS = [
  { id: "bukhari", label: "Bukhari", max: 7563 },
  { id: "muslim", label: "Muslim", max: 3032 },
  { id: "abudawud", label: "Abu Dawud", max: 4590 },
  { id: "tirmidzi", label: "Tirmidhi", max: 3625 },
  { id: "nasai", label: "Nasai", max: 5364 },
];

const fetchHadith = async (book: string, max: number): Promise<HadithData> => {
  const n = Math.floor(Math.random() * max) + 1;
  // fawazahmed0/hadith-api via jsDelivr (free, no key)
  const enUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${book}/sections/1.min.json`;
  const arUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${book}1/sections/1.min.json`;
  try {
    // Fallback: use the random hadith API
    const res = await fetch(
      `https://random-hadith-generator.vercel.app/${book}/`,
    );
    const json = await res.json();
    const d = json.data;
    return {
      arab: d.header || "",
      english: d.hadith_english || d.hadithEnglish || "",
      book: d.bookName || book,
      number: d.hadithNumber || n,
    };
  } catch {
    return {
      arab: "",
      english: "Unable to load hadith. Please try again.",
      book,
      number: n,
    };
  }
};

const Hadith = () => {
  const [collection, setCollection] = useState(COLLECTIONS[0]);
  const [hadith, setHadith] = useState<HadithData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const h = await fetchHadith(collection.id, collection.max);
    setHadith(h);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.id]);

  return (
    <PageShell
      eyebrow="Sayings of the Prophet ﷺ"
      title="Hadith"
      subtitle="A random narration from the great collections, refreshed on tap."
    >
      <div className="flex flex-wrap gap-2 mb-8">
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCollection(c)}
            className={`px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.25em] transition-all ${
              collection.id === c.id
                ? "bg-primary/10 border-primary text-accent"
                : "border-primary/15 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <motion.div
        key={hadith?.number}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-primary/20 bg-card/60 p-8 sm:p-12"
      >
        {/* Corner brackets */}
        <span className="absolute top-3 left-3 w-4 h-4 border-l border-t border-primary/60" />
        <span className="absolute top-3 right-3 w-4 h-4 border-r border-t border-primary/60" />
        <span className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-primary/60" />
        <span className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-primary/60" />

        {loading || !hadith ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {hadith.arab && (
              <p
                dir="rtl"
                className="font-arabic text-2xl sm:text-3xl leading-loose text-foreground/95 mb-8"
              >
                {hadith.arab}
              </p>
            )}
            <p className="font-display text-lg sm:text-xl italic text-foreground/80 leading-relaxed">
              {hadith.english}
            </p>
            <div className="mt-8 pt-6 border-t border-primary/15 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
                {hadith.book} · #{hadith.number}
              </span>
              <button
                onClick={load}
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-accent transition-colors"
              >
                <RefreshCw size={12} /> Another
              </button>
            </div>
          </>
        )}
      </motion.div>
    </PageShell>
  );
};

export default Hadith;
