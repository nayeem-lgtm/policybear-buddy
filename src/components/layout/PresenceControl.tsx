import { Coffee, LogIn, LogOut, PhoneOff, Play, UtensilsCrossed, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration, useShift } from "@/context/ShiftContext";
import type { PresenceStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const statusTone: Record<PresenceStatus, string> = {
  Available: "bg-success/12 text-success border-success/25",
  "On Call": "bg-brand/12 text-brand border-brand/25",
  "Post Call": "bg-brand-lavender/40 text-brand-ink border-brand-lavender",
  Break: "bg-warning/20 text-brand-tan border-warning/40",
  Lunch: "bg-warning/20 text-brand-tan border-warning/40",
  "Not Available": "bg-destructive/12 text-destructive border-destructive/25",
  Meeting: "bg-brand-cyan/25 text-brand-teal border-brand-cyan/50",
  Training: "bg-brand-cyan/25 text-brand-teal border-brand-cyan/50",
  "Signed Out": "bg-muted text-muted-foreground border-border",
};

export function StatusPill({
  status,
  className,
}: {
  status: PresenceStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusTone[status], className)}>
      {status}
    </Badge>
  );
}

/** Header presence widget with the quick shift actions from Page 11 / global quick actions. */
export function PresenceControl() {
  const {
    status,
    statusSeconds,
    allowanceSeconds,
    overrunSeconds,
    setStatus,
    demoMode,
    setDemoMode,
  } = useShift();

  const over = overrunSeconds > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 font-medium",
            over && "border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              status === "Available"
                ? "bg-success"
                : status === "On Call"
                  ? "bg-brand"
                  : over
                    ? "bg-destructive"
                    : "bg-warning",
            )}
          />
          <span className="hidden sm:inline">{status}</span>
          <span className="tabular text-xs text-muted-foreground">
            {formatDuration(statusSeconds)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">Shift actions</span>
          <span className="block text-xs text-muted-foreground">
            {allowanceSeconds
              ? `${status} allowance ${formatDuration(allowanceSeconds)}${over ? ` · over by ${formatDuration(overrunSeconds)}` : ""}`
              : "Standard Pacific 07:00–16:00"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setStatus("Available", "Signed in")}>
          <LogIn className="size-4" /> Sign In
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Available")}>
          <Play className="size-4" /> Return / Available
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Break")}>
          <Coffee className="size-4" /> Start Break
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Lunch")}>
          <UtensilsCrossed className="size-4" /> Start Lunch
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Not Available", "Technical issue reported")}>
          <Wrench className="size-4" /> Report Technical Issue
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Signed Out", "Signed out")}>
          <LogOut className="size-4" /> Sign Out
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <Label htmlFor="demo-timers" className="text-xs font-normal text-muted-foreground">
            <PhoneOff className="mr-1 inline size-3.5" />
            Fast alarm demo timers
          </Label>
          <Switch id="demo-timers" checked={demoMode} onCheckedChange={setDemoMode} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
