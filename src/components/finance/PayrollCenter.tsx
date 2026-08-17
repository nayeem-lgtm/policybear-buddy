import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Download,
  Info,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAttendanceRegister } from "@/lib/shift.functions";
import { formatHm, pacificDate, workedSeconds, type ShiftSessionRow } from "@/lib/shift-shared";
import {
  HOURLY_RATE,
  PAYROLL_TAX_RULE,
  commissionPerSale,
  money,
  payrollWeeks,
  sales,
  type PayrollWeek,
} from "@/lib/company-data";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const WEEK_HOURS_TARGET = 40;
const DAY_HOURS_TARGET = 8;
const EMPLOYER_TAX_RATE = 0.0765;
const EMPLOYEE_TAX_RATE = 0.12;

/* ---------- date helpers (Pacific calendar strings) ---------- */

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseStr(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Monday of the work week containing `dateStr`. */
function mondayOf(dateStr: string) {
  const d = parseStr(dateStr);
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return toStr(d);
}

function addDays(dateStr: string, n: number) {
  const d = parseStr(dateStr);
  d.setDate(d.getDate() + n);
  return toStr(d);
}

function fmtDay(dateStr: string) {
  return parseStr(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDayLong(dateStr: string) {
  return parseStr(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function hoursOf(seconds: number) {
  return Math.round((seconds / 3600) * 100) / 100;
}

/* ---------- payroll model ---------- */

interface PayrollLine {
  userId: string;
  name: string;
  team: string;
  initials: string;
  perDaySeconds: number[]; // Mon..Fri
  workedSeconds: number;
  daysWorked: number;
  hours: number;
  regularHours: number;
  otHours: number;
  rate: number;
  basePay: number;
  otPay: number;
  validSales: number;
  perSale: number;
  commission: number;
  incentive: number;
  gross: number;
  employeeTaxes: number;
  employerTaxes: number;
  netPay: number;
  cashOutflow: number;
}

function csvDownload(filename: string, rows: (string | number)[][]) {
  const body = rows
    .map((r) => r.map((c) => (typeof c === "string" && /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PayrollCenter() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(pacificDate()));
  const [mode, setMode] = useState<"weekly" | "daily">("weekly");
  const [dayIndex, setDayIndex] = useState(() => {
    const dow = parseStr(pacificDate()).getDay();
    return Math.min(4, Math.max(0, dow === 0 ? 4 : dow - 1));
  });
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<PayrollLine | null>(null);

  const weekDays = useMemo(() => DAY_LABELS.map((_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[4]!;
  const activeDay = weekDays[dayIndex]!;

  const fetchRegister = useServerFn(getAttendanceRegister);
  const register = useQuery({
    queryKey: ["payroll-attendance", weekStart, weekEnd],
    queryFn: () => fetchRegister({ data: { from: weekStart, to: weekEnd } }),
  });

  const sessions: ShiftSessionRow[] = register.data?.sessions ?? [];
  const profiles = register.data?.profiles ?? [];

  const rangeFrom = mode === "weekly" ? weekStart : activeDay;
  const rangeTo = mode === "weekly" ? weekEnd : activeDay;

  const lines = useMemo<PayrollLine[]>(() => {
    const byUser = new Map<string, ShiftSessionRow[]>();
    for (const s of sessions) {
      if (s.work_date < rangeFrom || s.work_date > rangeTo) continue;
      const arr = byUser.get(s.user_id) ?? [];
      arr.push(s);
      byUser.set(s.user_id, arr);
    }

    const out: PayrollLine[] = [];
    for (const p of profiles) {
      const rows = byUser.get(p.id) ?? [];
      if (rows.length === 0 && mode === "daily") continue;

      const perDaySeconds = weekDays.map((d) =>
        rows.filter((r) => r.work_date === d).reduce((s, r) => s + workedSeconds(r), 0),
      );
      const totalSeconds = rows.reduce((s, r) => s + workedSeconds(r), 0);
      const hours = hoursOf(totalSeconds);
      const cap = mode === "weekly" ? WEEK_HOURS_TARGET : DAY_HOURS_TARGET;
      const regularHours = Math.min(hours, cap);
      const otHours = Math.max(0, Math.round((hours - cap) * 100) / 100);
      const rate = HOURLY_RATE;
      const basePay = regularHours * rate;
      const otPay = otHours * rate * 1.5;

      const agentSales = sales.filter(
        (s) => s.agent === p.name && s.saleDate >= rangeFrom && s.saleDate <= rangeTo,
      );
      const validSales = agentSales.reduce((s, r) => s + (r.countSale ?? 0), 0);
      const perSale = commissionPerSale(validSales);
      const commission = validSales * perSale;
      const incentive = agentSales.reduce((s, r) => s + (r.personalLeadIncentive ?? 0), 0);

      const gross = basePay + otPay + commission + incentive;
      const employeeTaxes = gross * EMPLOYEE_TAX_RATE;
      const employerTaxes = gross * EMPLOYER_TAX_RATE;
      const netPay = gross - employeeTaxes;

      out.push({
        userId: p.id,
        name: p.name,
        team: p.team ?? "—",
        initials: p.avatar_initials ?? p.name.slice(0, 2).toUpperCase(),
        perDaySeconds,
        workedSeconds: totalSeconds,
        daysWorked: perDaySeconds.filter((s) => s > 0).length,
        hours,
        regularHours,
        otHours,
        rate,
        basePay,
        otPay,
        validSales,
        perSale,
        commission,
        incentive,
        gross,
        employeeTaxes,
        employerTaxes,
        netPay,
        cashOutflow: netPay + employeeTaxes + employerTaxes,
      });
    }
    return out.sort((a, b) => b.gross - a.gross || a.name.localeCompare(b.name));
  }, [sessions, profiles, weekDays, rangeFrom, rangeTo, mode]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => l.name.toLowerCase().includes(q) || l.team.toLowerCase().includes(q));
  }, [lines, query]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, l) => ({
          hours: acc.hours + l.hours,
          basePay: acc.basePay + l.basePay + l.otPay,
          commission: acc.commission + l.commission + l.incentive,
          gross: acc.gross + l.gross,
          employerTaxes: acc.employerTaxes + l.employerTaxes,
          net: acc.net + l.netPay,
          outflow: acc.outflow + l.cashOutflow,
          ot: acc.ot + l.otHours,
        }),
        { hours: 0, basePay: 0, commission: 0, gross: 0, employerTaxes: 0, net: 0, outflow: 0, ot: 0 },
      ),
    [lines],
  );

  const dayTotals = useMemo(
    () =>
      weekDays.map((d, i) => ({
        date: d,
        label: DAY_LABELS[i]!,
        hours: hoursOf(lines.reduce((s, l) => s + (l.perDaySeconds[i] ?? 0), 0)),
        headcount: lines.filter((l) => (l.perDaySeconds[i] ?? 0) > 0).length,
      })),
    [weekDays, lines],
  );
  const maxDayHours = Math.max(...dayTotals.map((d) => d.hours), 1);

  function generateRun() {
    const header = [
      "Run type",
      "Period start",
      "Period end",
      "Agent",
      "Team",
      "Days worked",
      "Hours",
      "Regular hours",
      "OT hours",
      "Rate",
      "Base pay",
      "OT pay",
      "Valid sales",
      "Per sale",
      "Commission",
      "Incentive",
      "Gross",
      "Employee taxes",
      "Employer taxes",
      "Net pay",
      "Company outflow",
    ];
    const rows = visible.map((l) => [
      mode === "weekly" ? "Weekly" : "Daily",
      rangeFrom,
      rangeTo,
      l.name,
      l.team,
      l.daysWorked,
      l.hours,
      l.regularHours,
      l.otHours,
      l.rate,
      l.basePay.toFixed(2),
      l.otPay.toFixed(2),
      l.validSales,
      l.perSale,
      l.commission.toFixed(2),
      l.incentive.toFixed(2),
      l.gross.toFixed(2),
      l.employeeTaxes.toFixed(2),
      l.employerTaxes.toFixed(2),
      l.netPay.toFixed(2),
      l.cashOutflow.toFixed(2),
    ]);
    csvDownload(`payroll-${mode}-${rangeFrom}${mode === "weekly" ? `_${rangeTo}` : ""}.csv`, [header, ...rows]);
  }

  const columns: Column<PayrollLine>[] = [
    {
      key: "agent",
      header: "Agent",
      cell: (l) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand/10 text-[0.7rem] font-semibold text-brand">{l.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{l.name}</p>
            <p className="text-xs text-muted-foreground">{l.team}</p>
          </div>
        </div>
      ),
    },
    ...(mode === "weekly"
      ? DAY_LABELS.map((d, i) => ({
          key: `d${i}`,
          header: d,
          align: "right" as const,
          cell: (l: PayrollLine) => (
            <span className={cn("tabular text-xs", (l.perDaySeconds[i] ?? 0) === 0 && "text-muted-foreground/60")}>
              {(l.perDaySeconds[i] ?? 0) > 0 ? formatHm(l.perDaySeconds[i]!) : "—"}
            </span>
          ),
        }))
      : []),
    {
      key: "hours",
      header: "Hours",
      align: "right",
      cell: (l) => (
        <div className="text-right">
          <p className="tabular font-medium text-foreground">{l.hours.toFixed(2)}h</p>
          <p className="text-xs text-muted-foreground">
            {l.daysWorked} day{l.daysWorked === 1 ? "" : "s"}
            {l.otHours > 0 ? ` · OT ${l.otHours.toFixed(2)}h` : ""}
          </p>
        </div>
      ),
    },
    { key: "rate", header: "Rate", align: "right", cell: (l) => <span className="tabular">{money(l.rate)}</span> },
    {
      key: "base",
      header: "Base + OT",
      align: "right",
      cell: (l) => (
        <div className="text-right">
          <p className="tabular font-medium">{money(l.basePay + l.otPay)}</p>
          {l.otPay > 0 && <p className="text-xs text-brand-tan">OT {money(l.otPay)}</p>}
        </div>
      ),
    },
    {
      key: "commission",
      header: "Commission",
      align: "right",
      cell: (l) => (
        <div className="text-right">
          <p className="tabular font-medium text-success">{money(l.commission + l.incentive)}</p>
          <p className="text-xs text-muted-foreground">
            {l.validSales} sale{l.validSales === 1 ? "" : "s"}
            {l.perSale > 0 ? ` @ ${money(l.perSale)}` : ""}
          </p>
        </div>
      ),
    },
    { key: "gross", header: "Gross", align: "right", cell: (l) => <span className="tabular font-semibold">{money(l.gross)}</span> },
    {
      key: "taxes",
      header: "Taxes",
      align: "right",
      cell: (l) => (
        <div className="text-right text-xs">
          <p className="tabular text-muted-foreground">EE {money(l.employeeTaxes)}</p>
          <p className="tabular text-brand-tan">ER {money(l.employerTaxes)}</p>
        </div>
      ),
    },
    { key: "net", header: "Net pay", align: "right", cell: (l) => <span className="tabular font-semibold text-foreground">{money(l.netPay)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (l) => (
        <Badge variant={l.hours >= (mode === "weekly" ? WEEK_HOURS_TARGET : DAY_HOURS_TARGET) ? "default" : "outline"} className="text-xs">
          {l.hours === 0 ? "No hours" : l.hours >= (mode === "weekly" ? WEEK_HOURS_TARGET : DAY_HOURS_TARGET) ? "Full" : "Partial"}
        </Badge>
      ),
    },
  ];

  const recordedWeeks = useMemo(() => {
    const map = new Map<string, PayrollWeek[]>();
    for (const r of payrollWeeks) {
      const arr = map.get(r.weekStart) ?? [];
      arr.push(r);
      map.set(r.weekStart, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([week, rows]) => ({
        week,
        agents: rows.length,
        base: rows.reduce((s, r) => s + r.basePayroll, 0),
        commission: rows.reduce((s, r) => s + r.commissionDue + r.incentiveDue, 0),
        net: rows.reduce((s, r) => s + r.netPay, 0),
        outflow: rows.reduce((s, r) => s + r.gustoOutflow, 0),
        cost: rows.reduce((s, r) => s + r.totalCompanyCost, 0),
        status: rows.every((r) => r.baseStatus === "Paid") ? "Paid" : "Payable",
      }));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounting"
        title="Payroll"
        description="Mon–Fri payroll built straight from attendance. Hours count themselves; commission and taxes roll in automatically."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => register.refetch()} disabled={register.isFetching}>
              <RefreshCw className={cn("size-4", register.isFetching && "animate-spin")} />
              Sync attendance
            </Button>
            <Button size="sm" onClick={generateRun} disabled={visible.length === 0}>
              <Download className="size-4" />
              Generate {mode === "weekly" ? "weekly" : "daily"} payroll
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <Card className="flex flex-col gap-4 rounded-2xl border-border/70 p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-9" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-0 px-1">
            <p className="text-sm font-semibold text-foreground">
              Week of {fmtDay(weekStart)} – {fmtDay(weekEnd)}
            </p>
            <p className="text-xs text-muted-foreground">
              5-day work week · {mode === "weekly" ? "weekly run" : `daily run · ${fmtDayLong(activeDay)}`}
            </p>
          </div>
          <Button variant="outline" size="icon" className="size-9" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(mondayOf(pacificDate()))}>
            <CalendarDays className="size-4" />
            This week
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border/70 bg-card p-1">
            {(["weekly", "daily"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === m ? "bg-brand text-brand-foreground shadow-brand" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {m === "weekly" ? "Weekly run" : "Daily run"}
              </button>
            ))}
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {weekDays.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setMode("daily");
                  setDayIndex(i);
                }}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  mode === "daily" && dayIndex === i
                    ? "border-brand/50 bg-brand/10 text-brand"
                    : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {DAY_LABELS[i]} · {fmtDay(d)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agent or team…"
              className="h-9 w-full sm:w-56"
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paid hours"
          value={`${totals.hours.toFixed(2)}h`}
          hint={totals.ot > 0 ? `incl. ${totals.ot.toFixed(2)}h overtime` : "auto-counted from attendance"}
          icon={<Clock3 className="size-4" />}
          tone="brand"
          to="/attendance"
        />
        <StatCard label="Base + overtime" value={money(totals.basePay)} hint={`${money(HOURLY_RATE)}/hr · 1.5× over ${mode === "weekly" ? "40h" : "8h"}`} icon={<Wallet className="size-4" />} tone="info" />
        <StatCard label="Commission + incentive" value={money(totals.commission)} hint="tiered per valid sale" icon={<Coins className="size-4" />} tone="success" to="/commissions" />
        <StatCard label="Company cash outflow" value={money(totals.outflow)} hint={`net ${money(totals.net)} + taxes`} icon={<Banknote className="size-4" />} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-3 rounded-2xl border-border/70 p-5 shadow-card xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Hours by day</p>
              <p className="text-xs text-muted-foreground/80">Attendance-linked, Monday to Friday</p>
            </div>
            <Badge variant="outline" className="gap-1 text-xs">
              <Users className="size-3" />
              {lines.length} on payroll
            </Badge>
          </div>
          <div className="space-y-2.5">
            {dayTotals.map((d, i) => (
              <button
                key={d.date}
                type="button"
                onClick={() => {
                  setMode("daily");
                  setDayIndex(i);
                }}
                className="w-full space-y-1 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {d.label} · {fmtDay(d.date)}
                  </span>
                  <span className="tabular font-medium text-foreground">
                    {d.hours.toFixed(2)}h · {d.headcount} agents
                  </span>
                </div>
                <Progress value={(d.hours / maxDayHours) * 100} className="h-1.5" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-3 rounded-2xl border-border/70 p-5 shadow-card">
          <p className="text-[0.7rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Run summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{mode === "weekly" ? `${fmtDay(rangeFrom)} – ${fmtDay(rangeTo)}` : fmtDayLong(rangeFrom)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Agents paid</span><span className="tabular">{lines.filter((l) => l.gross > 0).length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Base + OT</span><span className="tabular">{money(totals.basePay)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Commission + incentive</span><span className="tabular">{money(totals.commission)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Gross payroll</span><span className="tabular font-medium">{money(totals.gross)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Employer taxes (7.65%)</span><span className="tabular text-brand-tan">{money(totals.employerTaxes)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Cash outflow</span><span className="tabular">{money(totals.outflow)}</span></div>
          </div>
          <Button className="w-full" onClick={generateRun} disabled={visible.length === 0}>
            <Download className="size-4" />
            Generate {mode === "weekly" ? "weekly" : "daily"} run
          </Button>
        </Card>
      </div>

      <Card className="flex items-start gap-3 rounded-2xl border-border/70 p-4 shadow-card">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-sm text-muted-foreground">{PAYROLL_TAX_RULE}</p>
      </Card>

      {/* Register */}
      <Tabs defaultValue="run">
        <TabsList>
          <TabsTrigger value="run">{mode === "weekly" ? "Weekly register" : "Daily register"}</TabsTrigger>
          <TabsTrigger value="history">Recorded weeks</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="mt-4">
          <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {mode === "weekly" ? "Weekly payroll register" : `Daily payroll — ${fmtDayLong(activeDay)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {visible.length} agents · hours pulled from attendance sign-in/out
                </p>
              </div>
              <ShieldCheck className="size-4 text-success" />
            </div>
            {register.isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading attendance…</p>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No attendance recorded for this {mode === "weekly" ? "week" : "day"} yet.
              </p>
            ) : (
              <DataTable columns={columns} rows={visible} onRowClick={(l) => setDetail(l)} />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-card">
            <p className="text-sm font-semibold text-foreground">Recorded weekly runs</p>
            <DataTable
              columns={[
                { key: "week", header: "Week", cell: (r) => <span className="font-medium text-foreground">Week of {fmtDay(r.week)}</span> },
                { key: "agents", header: "Agents", align: "right", cell: (r) => <span className="tabular">{r.agents}</span> },
                { key: "base", header: "Base", align: "right", cell: (r) => <span className="tabular">{money(r.base)}</span> },
                { key: "commission", header: "Commission", align: "right", cell: (r) => <span className="tabular">{money(r.commission)}</span> },
                { key: "net", header: "Net pay", align: "right", cell: (r) => <span className="tabular font-medium">{money(r.net)}</span> },
                { key: "outflow", header: "Cash outflow", align: "right", cell: (r) => <span className="tabular">{money(r.outflow)}</span> },
                { key: "cost", header: "Company cost", align: "right", cell: (r) => <span className="tabular font-semibold">{money(r.cost)}</span> },
                { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={recordedWeeks}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Line detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  {mode === "weekly" ? `Week of ${fmtDay(weekStart)}` : fmtDayLong(activeDay)} · {detail.team}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {mode === "weekly" && (
                  <div className="grid grid-cols-5 gap-2 pb-2">
                    {DAY_LABELS.map((d, i) => (
                      <div key={d} className="rounded-lg border border-border/70 p-2 text-center">
                        <p className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">{d}</p>
                        <p className="tabular text-xs font-medium">{hoursOf(detail.perDaySeconds[i] ?? 0).toFixed(1)}h</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Hours worked</span><span className="tabular">{formatHm(detail.workedSeconds)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Regular / OT</span><span className="tabular">{detail.regularHours.toFixed(2)}h / {detail.otHours.toFixed(2)}h</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base pay</span><span className="tabular">{money(detail.basePay)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Overtime pay</span><span className="tabular">{money(detail.otPay)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission ({detail.validSales} × {money(detail.perSale)})</span><span className="tabular">{money(detail.commission)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Personal-lead incentive</span><span className="tabular">{money(detail.incentive)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span className="tabular font-medium">{money(detail.gross)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employee taxes (memo)</span><span className="tabular">{money(detail.employeeTaxes)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employer taxes</span><span className="tabular text-brand-tan">{money(detail.employerTaxes)}</span></div>
                <div className="flex justify-between text-base font-semibold"><span>Net pay</span><span className="tabular">{money(detail.netPay)}</span></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
