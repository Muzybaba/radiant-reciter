import { motion } from "framer-motion";
import { ArrowDown, Mic } from "lucide-react";

interface HeroProps {
  onStartReciting: () => void;
  onChooseSurah: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Peace of the night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Peace of the night";
}

const Hero = ({ onStartReciting, onChooseSurah }: HeroProps) => {
  return (
    <section className="relative pt-16 pb-24 text-center">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-[10px] text-primary uppercase tracking-[0.5em]"
      >
        In the name of Allah
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display font-light text-5xl sm:text-7xl text-foreground mt-8 leading-[1.05] tracking-tight"
      >
        {greeting()},
        <br />
        <span className="italic text-accent">begin in stillness.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-8 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed font-light"
      >
        Muraqaba listens as you recite — gently marking what slips, so the next
        return is closer than the last.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          onClick={onStartReciting}
          className="group inline-flex items-center gap-3 px-8 py-4 border border-primary/50 text-accent hover:bg-primary/10 hover:border-primary transition-all rounded-full text-[11px] uppercase tracking-[0.35em]"
        >
          <Mic size={14} className="text-primary group-hover:scale-110 transition-transform" />
          Start Reciting
        </button>
        <button
          onClick={onChooseSurah}
          className="inline-flex items-center gap-2 px-6 py-4 text-muted-foreground hover:text-accent transition-colors text-[11px] uppercase tracking-[0.35em]"
        >
          Choose a Surah
          <ArrowDown size={12} />
        </button>
      </motion.div>

      {/* Ornamental divider */}
      <div className="flex items-center justify-center gap-6 mt-24 opacity-70">
        <span className="h-px w-24 bg-gradient-to-r from-transparent to-primary/50" />
        <span className="font-arabic text-primary/80 text-2xl leading-none">۝</span>
        <span className="h-px w-24 bg-gradient-to-l from-transparent to-primary/50" />
      </div>
    </section>
  );
};

export default Hero;
