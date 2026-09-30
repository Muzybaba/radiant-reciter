import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeChoice = "parchment" | "stone" | "sage";
export type LayoutChoice = "comfortable" | "compact";

interface AppearanceContextValue {
  theme: ThemeChoice;
  layout: LayoutChoice;
  setTheme: (theme: ThemeChoice) => void;
  setLayout: (layout: LayoutChoice) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

const readChoice = <T extends string>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  return (localStorage.getItem(key) as T | null) ?? fallback;
};

export const AppearanceProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeChoice>(() => readChoice("muraqaba.theme", "parchment"));
  const [layout, setLayout] = useState<LayoutChoice>(() => readChoice("muraqaba.layout", "comfortable"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("muraqaba.theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.layout = layout;
    localStorage.setItem("muraqaba.layout", layout);
  }, [layout]);

  return (
    <AppearanceContext.Provider value={{ theme, layout, setTheme, setLayout }}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within AppearanceProvider");
  return value;
};