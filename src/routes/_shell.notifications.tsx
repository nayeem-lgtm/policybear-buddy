import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  AtSign,
  Bell,
  Briefcase,
  CheckCheck,
  Clock,
  FileCheck,
  ShieldAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { FilterBar } from "@/components/crm/FilterBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  notifications as initialNotifications,
  type NotificationItem,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Policy Bear CRM" },
      {
        name: "description",
        content: "Grouped notification feed with read status and category filters.",
      },
      { property: "og:title", content: "Notifications — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Grouped notification feed with read status and category filters.",
      },
    ],
  }),
  component: NotificationsPage,
});

const categoryIcons: Record<NotificationItem["category"], LucideIcon> = {
  Urgent: AlertTriangle,
  Attendance: Clock,
  Sales: Briefcase,
  QA: ShieldAlert,
  Policies: FileCheck,
  Payroll: Wallet,
  System: Bell,
  Mentions: AtSign,
};

const categories = Array.from(new Set(initialNotifications.map((n) => n.category)));

function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [category, setCategory] = useState("all");

  const filtered = useMemo(
    () => items.filter((n) => category === "all" || n.category === category),
    [items, category],
  );

  const today = filtered.filter((n) => !n.time.toLowerCase().includes("yesterday"));
  const earlier = filtered.filter((n) => n.time.toLowerCase().includes("yesterday"));

  const unreadCount = items.filter((n) => !n.read).length;

  function toggleRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Notifications"
        description="Everything routed to you, grouped by when it happened."
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="size-4" /> Mark all as read
          </Button>
        }
      />

      <FilterBar
        filters={[{ key: "category", label: "Type", options: categories }]}
        values={{ category }}
        onChange={(_, v) => setCategory(v)}
        onReset={() => setCategory("all")}
        trailing={
          <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
            {unreadCount} unread
          </Badge>
        }
      />

      <NotificationGroup title="Today" items={today} onToggle={toggleRead} />
      <NotificationGroup title="Earlier" items={earlier} onToggle={toggleRead} />

      {filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground shadow-card">
          No notifications match this filter.
        </Card>
      )}
    </div>
  );
}

function NotificationGroup({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: NotificationItem[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <Card className="gap-0 divide-y divide-border overflow-hidden p-0 shadow-card">
        {items.map((n) => {
          const Icon = categoryIcons[n.category];
          return (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors",
                !n.read && "bg-brand/5",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  n.category === "Urgent" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-brand" />}
                  <Badge variant="secondary" className="shrink-0 text-[0.65rem]">{n.category}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{n.read ? "Read" : "Unread"}</span>
                <Switch checked={n.read} onCheckedChange={() => onToggle(n.id)} />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
