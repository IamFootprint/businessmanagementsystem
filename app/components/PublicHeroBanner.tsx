import type { ReactNode } from "react";

type PublicHeroBannerProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
};

export default function PublicHeroBanner({
  eyebrow = "CycleDesk",
  title,
  description,
  className,
  children
}: PublicHeroBannerProps) {
  return (
    <section className={`relative rounded-xl bg-primary p-6 md:p-8 text-primary-foreground overflow-hidden mb-6 ${className || ""}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
      <div className="relative z-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70 mb-1">{eyebrow}</p>
        <h1 className="font-display font-bold text-2xl md:text-3xl mb-2">{title}</h1>
        {description ? <p className="text-sm text-primary-foreground/80">{description}</p> : null}
        {children ? <div className="flex flex-wrap items-center gap-3 mt-4">{children}</div> : null}
      </div>
    </section>
  );
}
