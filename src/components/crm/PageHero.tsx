import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Premium page hero used across the Admin and Finance workspaces.
 * Dark brand panel + mesh wash, title block, inline meta chips, an actions
 * slot and a full-width control rail (date tabs, week pickers, mode toggles).
 */
export function PageHero({
  eyebrow,
  title,
  description,
  meta,
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
  const metaTone: Record<string, string> = {
    default: "text-brand-cyan",
    success: "text-success",
    warning: "text-brand-yellow",
    danger: "text-destructive",
  };

  return (
    <section
      className={cn(
        "brand-gradient relative overflow-hidden rounded-3xl border border-brand-ink/40 shadow-raised",
        className,
      )}
    >
      <div className="brand-mesh absolute inset-0 opacity-70" aria-hidden />
      <div
        className="absolute -top-24 -right-16 size-72 rounded-full bg-brand-cyan/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-brand-cyan uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1.5 font-display text-2xl leading-tight font-semibold text-brand-ink-foreground sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-brand-ink-foreground/70">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {meta && meta.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {meta.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-brand-ink-foreground/12 bg-brand-ink-foreground/8 px-3 py-2 backdrop-blur-sm"
              >
                <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-brand-ink-foreground/55 uppercase">
                  {m.label}
                </p>
                <p
                  className={cn(
                    "tabular mt-0.5 text-sm font-semibold",
                    metaTone[m.tone ?? "default"],
                  )}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {controls && (
          <div className="-mx-1 overflow-x-auto px-1 pt-1 [&_[data-slot=tabs-list]]:bg-brand-ink-foreground/10">
            {controls}
          </div>
        )}
      </div>
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
