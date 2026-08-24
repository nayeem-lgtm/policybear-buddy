import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Headless page hero: the decorative title banner is intentionally not rendered
 * (kept as an sr-only heading for accessibility/SEO). Only the functional rail —
 * date tabs, mode toggles and page actions — stays visible.
 */
export function PageHero({
  title,
  actions,
  controls,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: { label: string; value: ReactNode; tone?: "default" | "success" | "warning" | "danger" }[];
  actions?: ReactNode;
  controls?: ReactNode;
  className?: string;
}) {
  const hasRail = Boolean(actions || controls);

  return (
    <section className={cn(hasRail && "space-y-3", className)}>
      <h1 className="sr-only">{title}</h1>
      {hasRail && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {controls && <div className="-mx-1 min-w-0 overflow-x-auto px-1">{controls}</div>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </section>
  );
}


/** Elegant section heading with a hairline rule, used between panel groups. */
export function SectionRule({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" aria-hidden />
      {action}
    </div>
  );
}
