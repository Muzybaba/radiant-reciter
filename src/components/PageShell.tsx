import { ReactNode } from "react";

interface PageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const PageShell = ({ eyebrow, title, subtitle, children }: PageShellProps) => {
  return (
    <div className="min-h-screen bg-vignette pb-32">
      <header className="px-6 sm:px-12 pt-14 pb-10 max-w-3xl mx-auto">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl sm:text-5xl text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-sm text-muted-foreground max-w-md">
            {subtitle}
          </p>
        )}
        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </header>
      <main className="max-w-3xl mx-auto px-6 sm:px-12">{children}</main>
    </div>
  );
};

export default PageShell;
