import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: { value: string; direction: "up" | "down" };
  tone?: "default" | "brand" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
  className?: string;
}) {
  const toneRing: Record<string, string> = {
    default: "",
    brand: "before:bg-brand",
    success: "before:bg-success",
    warning: "before:bg-warning",
    danger: "before:bg-destructive",
    info: "before:bg-brand-cyan",
  };

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden p-4 shadow-card",
        "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:content-['']",
        toneRing[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold text-foreground">{value}</div>
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
    </Card>
  );
}
