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
  const toneRing: Record<string, string> = {
    default: "before:bg-border",
    brand: "before:bg-brand",
    success: "before:bg-success",
    warning: "before:bg-warning",
    danger: "before:bg-destructive",
    info: "before:bg-brand-cyan",
  };

  const toneWash: Record<string, string> = {
    default: "after:from-muted/30",
    brand: "after:from-brand/8",
    success: "after:from-success/8",
    warning: "after:from-warning/12",
    danger: "after:from-destructive/7",
    info: "after:from-brand-cyan/12",
  };

  const iconTone: Record<string, string> = {
    default: "bg-muted text-muted-foreground ring-border",
    brand: "bg-brand/10 text-brand ring-brand/15",
    success: "bg-success/12 text-success ring-success/15",
    warning: "bg-warning/25 text-brand-tan ring-warning/25",
    danger: "bg-destructive/12 text-destructive ring-destructive/15",
    info: "bg-brand-cyan/25 text-brand-teal ring-brand-cyan/25",
  };

  const card = (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-hidden rounded-2xl border-border/70 p-5 shadow-card transition-all duration-200 hover:shadow-raised",
        to && "group cursor-pointer hover:-translate-y-0.5 hover:border-brand/40",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-20 after:bg-gradient-to-b after:to-transparent after:content-['']",
        toneRing[tone],
        toneWash[tone],
        className,
      )}
    >
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl ring-1",
              iconTone[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="tabular relative mt-3 font-display text-[1.85rem] leading-none font-semibold tracking-tight text-foreground">
        {value}
      </div>

      <div className="mt-1 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
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
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {to && (
        <GoIcon className="absolute right-4 bottom-4 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Card>
  );

  if (!to) return card;
  return (
    <Link to={to as never} className="block focus-visible:outline-none">
      {card}
    </Link>
  );
}
