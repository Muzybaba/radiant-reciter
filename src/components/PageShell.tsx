import { ReactNode } from "react";
import AppearanceMenu from "@/components/AppearanceMenu";

interface PageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const PageShell = ({ eyebrow, title, subtitle, children }: PageShellProps) => {
  return (
    <div className="min-h-screen bg-vignette pb-32">
      <header className="page-container pt-10 pb-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            {eyebrow && <p className="label-ui mb-3 text-primary">{eyebrow}</p>}
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="mt-3 text-sm leading-6 text-muted-foreground max-w-lg">{subtitle}</p>}
          </div>
          <AppearanceMenu />
        </div>
        <div className="mt-7 h-px bg-border/50" />
      </header>
      <main className="page-container">{children}</main>
    </div>
  );
};

export default PageShell;
