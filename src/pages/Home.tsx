import { NavLink } from "react-router-dom";
import { BookOpen, ScrollText, Brain, Moon } from "lucide-react";
import PageShell from "@/components/PageShell";

const modules = [
  { to: "/quran", label: "Quran", arabic: "القرآن", icon: BookOpen, desc: "Read & recite" },
  { to: "/hadith", label: "Hadith", arabic: "الحديث", icon: ScrollText, desc: "Prophetic traditions" },
  { to: "/hifz", label: "Hifz", arabic: "الحفظ", icon: Brain, desc: "Memorization tracker" },
  { to: "/salah", label: "Salah", arabic: "الصلاة", icon: Moon, desc: "Prayer times" },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Peaceful night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Peaceful night";
};

const Home = () => {
  return (
    <PageShell
      eyebrow="ٱلسَّلَامُ عَلَيْكُمْ"
      title={greeting()}
      subtitle="Your all-in-one companion for Quran, Hadith, Hifz and Salah."
    >
      <div className="grid grid-cols-2 gap-4 mt-2">
        {modules.map(({ to, label, arabic, icon: Icon, desc }) => (
          <NavLink
            key={to}
            to={to}
            className="group relative rounded-lg border border-primary/20 bg-card/40 p-5 transition-all hover:border-primary/60 hover:bg-card/70"
          >
            <div className="flex items-start justify-between">
              <Icon className="text-primary" size={22} strokeWidth={1.5} />
              <span className="font-arabic text-2xl text-accent/80">{arabic}</span>
            </div>
            <h3 className="mt-6 font-display text-xl text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </NavLink>
        ))}
      </div>
    </PageShell>
  );
};

export default Home;
