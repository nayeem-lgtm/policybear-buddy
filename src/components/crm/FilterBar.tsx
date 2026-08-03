import type { ReactNode } from "react";
import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface FilterDef {
  key: string;
  label: string;
  options: string[];
}

/**
 * Compact filter rail used across every list page.
 * Deliberately dropdown-first so dashboards stay readable instead of dense.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  values = {},
  onChange,
  onReset,
  trailing,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  values?: Record<string, string>;
  onChange?: (key: string, value: string) => void;
  onReset?: () => void;
  trailing?: ReactNode;
  className?: string;
}) {
  const activeCount = Object.values(values).filter((v) => v && v !== "all").length;

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)}>
      {onSearchChange && (
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
          />
        </div>
      )}

      {filters.map((f) => (
        <Select
          key={f.key}
          value={values[f.key] ?? "all"}
          onValueChange={(v) => onChange?.(f.key, v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[9.5rem] gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {f.label}</SelectItem>
            {f.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeCount > 0 && (
        <Badge variant="secondary" className="gap-1">
          {activeCount} filter{activeCount > 1 ? "s" : ""}
          {onReset && (
            <button type="button" onClick={onReset} aria-label="Clear filters">
              <X className="size-3" />
            </button>
          )}
        </Badge>
      )}

      {onReset && activeCount === 0 && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onReset}>
          Reset
        </Button>
      )}

      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}
