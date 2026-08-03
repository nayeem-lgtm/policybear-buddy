import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  time: string;
  event: string;
  detail?: string;
  tone?: "success" | "info" | "brand" | "muted" | "warning" | "danger";
  trailing?: ReactNode;
}

const dotTone: Record<string, string> = {
  success: "bg-success",
  info: "bg-brand-cyan",
  brand: "bg-brand",
  muted: "bg-muted-foreground/50",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-4 pl-6", className)}>
      <span className="absolute top-1.5 bottom-1.5 left-[0.3125rem] w-px bg-border" />
      {items.map((item, i) => (
        <li key={`${item.time}-${i}`} className="relative">
          <span
            className={cn(
              "absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ring-2 ring-card",
              dotTone[item.tone ?? "muted"],
            )}
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                <span className="tabular mr-2 text-muted-foreground">{item.time}</span>
                {item.event}
              </p>
              {item.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
              )}
            </div>
            {item.trailing}
          </div>
        </li>
      ))}
    </ol>
  );
}
