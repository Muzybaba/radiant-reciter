import { NavLink } from "react-router-dom";
import { BookOpen, ScrollText, Brain, Moon, Home } from "lucide-react";

const tabs = [
  { to: "/", label: "Quran", icon: BookOpen, end: true },
  { to: "/hadith", label: "Hadith", icon: ScrollText },
  { to: "/hifz", label: "Hifz", icon: Brain },
  { to: "/salah", label: "Salah", icon: Moon },
];

const BottomTabs = () => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-primary/20"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="max-w-2xl mx-auto grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground/80"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[10px] uppercase tracking-[0.2em]">
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute top-0 w-8 h-px bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomTabs;
