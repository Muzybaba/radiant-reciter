import { Check, LayoutGrid, Rows3, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppearance, type ThemeChoice } from "@/contexts/AppearanceContext";

const themes: { id: ThemeChoice; label: string; swatch: string }[] = [
  { id: "parchment", label: "Parchment", swatch: "bg-theme-parchment" },
  { id: "stone", label: "Stone", swatch: "bg-theme-stone" },
  { id: "sage", label: "Sage", swatch: "bg-theme-sage" },
];

const AppearanceMenu = () => {
  const { theme, layout, setTheme, setLayout } = useAppearance();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Customize appearance" className="rounded-full bg-card">
          <SlidersHorizontal />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-5">
        <p className="font-display text-lg text-foreground">Your reading space</p>
        <p className="mt-1 text-xs text-muted-foreground">Saved automatically on this device.</p>

        <p className="label-ui mt-6 mb-3">Color</p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              onClick={() => setTheme(item.id)}
              className="h-auto flex-col gap-2 px-2 py-3 text-[11px]"
              aria-pressed={theme === item.id}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${item.swatch}`}>
                {theme === item.id && <Check className="h-3.5 w-3.5 text-foreground" />}
              </span>
              {item.label}
            </Button>
          ))}
        </div>

        <p className="label-ui mt-6 mb-3">Spacing</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={layout === "comfortable" ? "default" : "outline"} onClick={() => setLayout("comfortable")}>
            <LayoutGrid /> Comfortable
          </Button>
          <Button variant={layout === "compact" ? "default" : "outline"} onClick={() => setLayout("compact")}>
            <Rows3 /> Compact
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AppearanceMenu;