import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ArrowUpRight as GoIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  delta,
  tone = "default",
  icon,
  className,
  to,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: { value: string; direction: "up" | "down" };
  tone?: "default" | "brand" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
  className?: string;
  /** When set, the whole card becomes a link to this route. */
  to?: string;
}) {
  const glowTone: Record<string, string> = {
    default: "bg-muted-foreground/15 group-hover:bg-muted-foreground/25",
    brand: "bg-brand/15 group-hover:bg-brand/25",
    success: "bg-success/15 group-hover:bg-success/25",
    warning: "bg-warning/20 group-hover:bg-warning/30",
    danger: "bg-destructive/15 group-hover:bg-destructive/25",
    info: "bg-brand-cyan/20 group-hover:bg-brand-cyan/30",
  };

  const barTone: Record<string, string> = {
    default: "bg-muted-foreground/40",
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    info: "bg-brand-cyan",
  };

  const iconTone: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    brand: "bg-brand/10 text-brand",
    success: "bg-success/12 text-success",
    warning: "bg-warning/20 text-brand-tan",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-brand-cyan/22 text-brand-teal",
  };

  const card = (
    <Card
      className={cn(
        "group relative h-full gap-0 overflow-hidden rounded-3xl border-white/70 bg-card/70 p-6 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-raised",
        to && "cursor-pointer",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 size-32 rounded-full blur-3xl transition-colors duration-300",
          glowTone[tone],
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[0.69rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm [&_svg]:size-5",
              iconTone[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="tabular relative mt-4 font-display text-[2rem] leading-none font-bold tracking-tight text-foreground">
        {value}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              delta.direction === "up" ? "text-success" : "text-destructive",
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>

      {to && (
        <GoIcon className="absolute right-5 bottom-5 size-4 text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      <span
        aria-hidden
        className={cn(
          "absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 ease-out group-hover:w-full",
          barTone[tone],
        )}
      />
    </Card>
  );


  if (!to) return card;
  return (
    <Link to={to as never} className="block focus-visible:outline-none">
      {card}
    </Link>
  );
}
