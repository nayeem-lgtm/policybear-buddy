import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock, Umbrella } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { FilterBar } from "@/components/crm/FilterBar";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { useFilters, unique } from "@/lib/use-filters";
import { leaveRequests, employees } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/leave")({
  head: () => ({
    meta: [
      { title: "Leave Center — Policy Bear CRM" },
      {
        name: "description",
        content: "Leave balances, request approvals and the weekly team out-of-office calendar.",
      },
      { property: "og:title", content: "Leave Center — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Leave balances, request approvals and the weekly team out-of-office calendar.",
      },
    ],
  }),
  component: LeavePage,
});

type LeaveRequest = (typeof leaveRequests)[number];

const leaveTypes = ["PTO", "Sick", "Unpaid", "Bereavement", "Jury Duty"];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function LeavePage() {
  const [rows, setRows] = useState<LeaveRequest[]>(leaveRequests);
  const [requestOpen, setRequestOpen] = useState(false);

  const statusOptions = useMemo(() => unique(rows, (r) => r.status), [rows]);
  const typeOptions = useMemo(() => unique(rows, (r) => r.type), [rows]);

  const { search, setSearch, values, setValue, reset, filtered } = useFilters(rows, {
    searchFields: (r) => [r.employee, r.reason],
    filters: {
      status: (r) => r.status,
      type: (r) => r.type,
    },
  });

  const pendingCount = rows.filter((r) => r.status === "Pending").length;
  const approvedCount = rows.filter((r) => r.status === "Approved").length;
  const avgBalance = Math.round(rows.reduce((s, r) => s + r.balance, 0) / rows.length);

  const balancesByType = leaveTypes.map((type) => {
    const subset = rows.filter((r) => r.type === type);
    const balance = subset.length
      ? Math.round(subset.reduce((s, r) => s + r.balance, 0) / subset.length)
      : 8;
    return { type, balance };
  });

  const offThisWeek = employees.slice(0, 7).map((e, i) => ({
    employee: e.name,
    day: weekDays[i % weekDays.length],
  }));

  function updateStatus(id: string, status: "Approved" | "Denied") {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status } : row)));
    toast.success(`Request ${id} ${status.toLowerCase()}.`);
  }

  const columns: Column<LeaveRequest>[] = [
    { key: "employee", header: "Employee", cell: (r) => r.employee },
    { key: "type", header: "Type", cell: (r) => <Badge variant="secondary">{r.type}</Badge> },
    { key: "dates", header: "Dates", cell: (r) => `${r.startDate} → ${r.endDate}` },
    { key: "days", header: "Days", cell: (r) => r.days, align: "right" },
    { key: "balance", header: "Balance", cell: (r) => r.balance, align: "right" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      cell: (r) =>
        r.status === "Pending" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "Approved")}>
              Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "Denied")}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{r.approver}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Leave Center"
        description="Balances, approvals and who's out this week across every team."
        actions={
          <Button onClick={() => setRequestOpen(true)}>
            <CalendarDays className="size-4" /> Request leave
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Requests" value={pendingCount} tone="warning" icon={<Clock className="size-4" />} />
        <StatCard label="Approved This Month" value={approvedCount} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Avg. Balance (days)" value={avgBalance} icon={<Umbrella className="size-4" />} />
        <StatCard label="Total Requests" value={rows.length} icon={<CalendarDays className="size-4" />} />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="p-4 shadow-card lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-foreground">Balances by leave type</p>
          <div className="space-y-2.5">
            {balancesByType.map((b) => (
              <div key={b.type} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-muted-foreground">{b.type}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, (b.balance / 15) * 100)}%` }}
                  />
                </div>
                <span className="tabular w-8 text-right text-xs">{b.balance}d</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 shadow-card lg:col-span-3">
          <p className="mb-3 text-sm font-semibold text-foreground">Out this week</p>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => (
              <div key={d} className="rounded-md border border-border p-2 text-center">
                <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{d}</p>
                <div className="mt-1.5 space-y-1">
                  {offThisWeek
                    .filter((o) => o.day === d)
                    .map((o) => (
                      <p key={o.employee} className="truncate text-xs text-foreground">
                        {o.employee.split(" ")[0]}
                      </p>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by employee or reason…"
        filters={[
          { key: "status", label: "Status", options: statusOptions },
          { key: "type", label: "Type", options: typeOptions },
        ]}
        values={values}
        onChange={setValue}
        onReset={reset}
      />

      <DataTable columns={columns} rows={filtered} footer={<span>{filtered.length} of {rows.length} requests</span>} />

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
            <DialogDescription>Submit a new leave request for approval.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Leave type</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Start date</Label>
                <Input type="date" />
              </div>
              <div className="grid gap-1.5">
                <Label>End date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Textarea placeholder="Brief reason for the request" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setRequestOpen(false);
                toast.success("Leave request submitted for approval.");
              }}
            >
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
