import { motion } from "framer-motion";
import { Home } from "lucide-react";
import type { Surah } from "@/data/surahs";

interface SurahSidebarProps {
  surahs: Surah[];
  activeSurahId: number;
  activeView: "home" | "mushaf";
  onSelect: (id: number) => void;
  onSelectHome: () => void;
  correctionsCount: number;
}

const SurahSidebar = ({
  surahs,
  activeSurahId,
  activeView,
  onSelect,
  onSelectHome,
  correctionsCount,
}: SurahSidebarProps) => {
  const homeActive = activeView === "home";

  return (
    <aside className="hidden md:flex w-72 shrink-0 border-r border-primary/15 bg-card flex-col h-screen sticky top-0">
      <div className="p-8 border-b border-primary/10">
        <h2 className="font-display text-primary text-xs uppercase tracking-[0.4em] font-medium">
          Muraqaba
        </h2>
      </div>

      {/* Home */}
      <div className="px-4 pt-4">
        <button
          onClick={onSelectHome}
          className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            homeActive
              ? "bg-primary/10 text-accent"
              : "text-foreground/50 hover:text-foreground/90 hover:bg-foreground/5"
          }`}
        >
          <Home size={14} className={homeActive ? "text-accent" : "text-muted-foreground"} />
          <span className="text-[11px] uppercase tracking-[0.3em]">Home</span>
        </button>
      </div>

      <div className="px-8 pt-6 pb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.35em]">
          Surahs
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {surahs.map((s) => {
            const isActive = !homeActive && s.id === activeSurahId;
            return (
              <li key={s.id} className="relative">
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                    className="absolute inset-y-0 left-0 w-full bg-primary/5 border-r-2 border-primary"
                  />
                )}
                <button
                  onClick={() => onSelect(s.id)}
                  className={`relative w-full flex items-center justify-between px-8 py-3 transition-colors ${
                    isActive
                      ? "text-accent"
                      : "text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5"
                  }`}
                >
                  <span className="text-left">
                    <span className={`block text-sm ${isActive ? "font-medium" : "font-light"}`}>
                      {s.id}. {s.name}
                    </span>
                    <span dir="rtl" className="font-arabic text-base text-primary/70 mt-0.5 block">
                      {s.nameArabic}
                    </span>
                  </span>
                  <span className="text-[10px] tracking-widest text-muted-foreground">
                    {s.verses.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6 border-t border-primary/10">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-[10px] text-primary uppercase tracking-[0.3em] mb-2 font-medium">
            Corrections
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-accent">{correctionsCount}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              saved
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SurahSidebar;
