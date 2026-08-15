import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-card md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-2 inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-brand uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="truncate font-display text-[1.6rem] leading-tight font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
