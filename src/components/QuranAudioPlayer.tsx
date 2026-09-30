import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Surah } from "@/data/surahs";

const audioUrl = (surahId: number, ayah: number) =>
  `https://everyayah.com/data/Alafasy_128kbps/${String(surahId).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;

const QuranAudioPlayer = ({ surah }: { surah: Surah }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ayahIndex, setAyahIndex] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setAyahIndex(0);
    setError(false);
  }, [surah.id]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      setError(false);
      await audio.play();
      setPlaying(true);
    } catch {
      setError(true);
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setAyahIndex(0);
    audio.src = audioUrl(surah.id, 1);
    void audio.play().then(() => setPlaying(true)).catch(() => setError(true));
  };

  const nextAyah = () => {
    if (ayahIndex >= surah.verses.length - 1) {
      setPlaying(false);
      setAyahIndex(0);
      return;
    }
    setAyahIndex((index) => index + 1);
  };

  useEffect(() => {
    if (!playing || ayahIndex === 0) return;
    void audioRef.current?.play().catch(() => setError(true));
  }, [ayahIndex, playing]);

  return (
    <div className="mb-10 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-subtle">
      <audio ref={audioRef} src={audioUrl(surah.id, ayahIndex + 1)} onEnded={nextAyah} onError={() => setError(true)} />
      <Button size="icon" onClick={toggle} aria-label={playing ? "Pause recitation" : "Play recitation"} className="rounded-full">
        {playing ? <Pause /> : <Play />}
      </Button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Volume2 className="h-4 w-4 text-primary" /> Mishary Alafasy</p>
        <p className="text-xs text-muted-foreground">{error ? "Audio could not load. Try again." : `Ayah ${ayahIndex + 1} of ${surah.verses.length}`}</p>
      </div>
      <Button size="icon" variant="ghost" onClick={restart} aria-label="Restart recitation"><RotateCcw /></Button>
    </div>
  );
};

export default QuranAudioPlayer;