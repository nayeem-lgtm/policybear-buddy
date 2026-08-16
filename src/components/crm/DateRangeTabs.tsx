import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DatePresetKey =
  | "today"
  | "yesterday"
  | "7d"
  | "month"
  | "last-month"
  | "year"
  | "custom";

export interface DateSelection {
  preset: DatePresetKey;
  range?: DateRange;
}

const PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7d" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
];

export function presetLabel(sel: DateSelection) {
  if (sel.preset === "custom" && sel.range?.from) {
    const from = format(sel.range.from, "MMM d");
    const to = sel.range.to ? format(sel.range.to, "MMM d") : from;
    return `${from} – ${to}`;
  }
  return PRESETS.find((p) => p.key === sel.preset)?.label ?? "Today";
}

export function DateRangeTabs({
  value,
  onChange,
  className,
}: {
  value: DateSelection;
  onChange: (next: DateSelection) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full border border-border/70 bg-card p-1 shadow-card",
        className,
      )}
    >
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange({ preset: p.key })}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            value.preset === p.key
              ? "bg-brand text-brand-foreground shadow-brand"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              value.preset === "custom"
                ? "bg-brand text-brand-foreground shadow-brand"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <CalendarIcon className="size-4" />
            {value.preset === "custom" ? presetLabel(value) : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={value.range}
            onSelect={(range) =>
              onChange(range ? { preset: "custom", range } : { preset: "custom" })
            }
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
