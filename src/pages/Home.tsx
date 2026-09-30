import { NavLink } from "react-router-dom";
import { BookOpen, ScrollText, Brain, Moon, ArrowRight, Mic } from "lucide-react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";

const modules = [
  { to: "/quran", label: "Quran", arabic: "القرآن", icon: BookOpen, desc: "Read and listen" },
  { to: "/hadith", label: "Hadith", arabic: "الحديث", icon: ScrollText, desc: "Browse the collections" },
  { to: "/hifz", label: "Hifz", arabic: "الحفظ", icon: Brain, desc: "Recite and improve" },
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
      subtitle="Read, remember, learn, and keep your prayers in one calm place."
    >
      <section className="grid gap-4 sm:grid-cols-[1.35fr_0.65fr] mb-8">
        <NavLink to="/quran" className="relative overflow-hidden rounded-lg bg-feature p-6 text-feature-foreground shadow-subtle">
          <p className="label-ui text-feature-muted">Continue reading</p>
          <div className="mt-8 flex items-end justify-between gap-4">
            <div><h2 className="font-display text-3xl font-bold">Al-Ikhlas</h2><p className="mt-1 text-sm text-feature-muted">5 ayahs · Read or listen</p></div>
            <span dir="rtl" className="font-arabic text-4xl">الإخلاص</span>
          </div>
        </NavLink>
        <NavLink to="/hifz" className="rounded-lg border-2 border-border/50 bg-card p-6 shadow-subtle">
          <Mic className="text-primary" />
          <p className="mt-8 font-semibold text-foreground">Hifz practice</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Recite with live word correction</p>
        </NavLink>
      </section>
      <div className="module-grid grid grid-cols-2 gap-4">
        {modules.map(({ to, label, arabic, icon: Icon, desc }) => (
          <NavLink
            key={to}
            to={to}
            className="group relative rounded-lg border border-border/70 bg-card p-5 shadow-subtle transition-all hover:-translate-y-0.5 hover:border-primary/50"
          >
            <div className="flex items-start justify-between">
              <Icon className="text-primary" size={22} strokeWidth={1.5} />
              <span className="font-arabic text-2xl text-accent/80">{arabic}</span>
            </div>
            <h3 className="mt-6 font-display text-xl font-bold text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            <ArrowRight className="mt-5 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
          </NavLink>
        ))}
      </div>
    </PageShell>
  );
};

export default Home;
