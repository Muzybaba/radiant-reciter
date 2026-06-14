import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin } from "lucide-react";
import PageShell from "@/components/PageShell";

interface Timings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface PrayerData {
  timings: Timings;
  date: string;
  city?: string;
}

const ORDER: (keyof Timings)[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

const getCurrentPrayer = (t: Timings): keyof Timings | null => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  let current: keyof Timings | null = null;
  for (const p of ORDER) {
    const [h, m] = t[p].split(":").map(Number);
    if (h * 60 + m <= mins) current = p;
  }
  return current;
};

const Salah = () => {
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimes = (lat: number, lon: number, city?: string) => {
    const today = new Date();
    const ddmmyyyy = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    fetch(
      `https://api.aladhan.com/v1/timings/${ddmmyyyy}?latitude=${lat}&longitude=${lon}&method=2`,
    )
      .then((r) => r.json())
      .then((j) => {
        setData({
          timings: j.data.timings,
          date: j.data.date.readable,
          city,
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load prayer times.");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      // Fallback to Makkah
      fetchTimes(21.4225, 39.8262, "Makkah");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchTimes(pos.coords.latitude, pos.coords.longitude),
      () => fetchTimes(21.4225, 39.8262, "Makkah"),
    );
  }, []);

  const current = data ? getCurrentPrayer(data.timings) : null;

  return (
    <PageShell
      eyebrow="Five Daily Prayers"
      title="Salah"
      subtitle="Today's prayer times based on your location."
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-center text-muted-foreground py-10">{error}</p>
      ) : data ? (
        <>
          <div className="flex items-center justify-between mb-8 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="flex items-center gap-2">
              <MapPin size={12} /> {data.city ?? "Your location"}
            </span>
            <span>{data.date}</span>
          </div>

          <ul className="space-y-3">
            {ORDER.map((p, i) => {
              const isCurrent = current === p;
              return (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative flex items-center justify-between px-6 py-5 rounded-2xl border transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-primary/10 bg-card/40"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -left-px top-3 bottom-3 w-0.5 bg-primary rounded-full" />
                  )}
                  <div>
                    <p
                      className={`font-display text-2xl ${
                        isCurrent ? "text-accent" : "text-foreground/90"
                      }`}
                    >
                      {p}
                    </p>
                    {isCurrent && (
                      <p className="text-[9px] uppercase tracking-[0.3em] text-primary mt-1">
                        Current
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-display text-3xl tabular-nums ${
                      isCurrent ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {data.timings[p]}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </>
      ) : null}
    </PageShell>
  );
};

export default Salah;
