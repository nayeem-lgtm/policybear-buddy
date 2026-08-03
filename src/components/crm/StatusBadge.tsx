import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "muted";

const toneClass: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  brand: "bg-brand/10 text-brand border-brand/25",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/22 text-brand-tan border-warning/45",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  info: "bg-brand-cyan/25 text-brand-teal border-brand-cyan/50",
  muted: "bg-muted text-muted-foreground border-border",
};

/** Single source of truth for how operational statuses are coloured. */
export const STATUS_TONES: Record<string, Tone> = {
  // generic
  Active: "success",
  Paid: "success",
  Approved: "success",
  Valid: "success",
  Completed: "success",
  Recovered: "success",
  Resolved: "success",
  Closed: "muted",
  Connected: "success",
  Effectuated: "success",
  Passed: "success",

  Pending: "warning",
  "In Review": "warning",
  "Pending Approval": "warning",
  "Pending Carrier": "warning",
  "In Progress": "brand",
  Investigating: "warning",
  Waiting: "warning",
  Scheduled: "info",
  Submitted: "brand",
  Working: "brand",
  Quoted: "brand",
  Due: "warning",
  Degraded: "warning",
  Paused: "warning",
  Draft: "muted",
  "Not Started": "muted",
  "Not Configured": "muted",
  New: "info",
  Open: "info",

  Overdue: "danger",
  Missed: "danger",
  Invalid: "danger",
  Failed: "danger",
  Denied: "danger",
  Disputed: "danger",
  Cancelled: "danger",
  Chargeback: "danger",
  Terminated: "danger",
  Critical: "danger",
  "Do Not Call": "danger",
  Returned: "danger",
  "Under Review": "warning",
  "Written Off": "muted",
  Refunded: "muted",
  "Not Interested": "muted",

  Urgent: "danger",
  High: "danger",
  Medium: "warning",
  Normal: "info",
  Low: "muted",
};

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? STATUS_TONES[status] ?? "neutral";
  return (
    <Badge variant="outline" className={cn("font-medium", toneClass[resolved], className)}>
      {status}
    </Badge>
  );
}
