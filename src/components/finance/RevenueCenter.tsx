import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  Coins,
  DollarSign,
  Gauge,
  PhoneCall,
  PiggyBank,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { recordCalculationOnce } from "@/lib/audit-log";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/crm/PageHeader";
import { PageHero } from "@/components/crm/PageHero";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { DataTable, type Column } from "@/components/crm/DataTable";
import { FilterBar } from "@/components/crm/FilterBar";
import { DateRangeTabs, presetLabel, type DateSelection } from "@/components/crm/DateRangeTabs";
import { selectionBounds, inSelection } from "@/lib/date-range";
import { unique } from "@/lib/use-filters";
import { useExpenseLedger } from "@/lib/expense-store";
import { expectedCarrierRevenue, isRevenueCollected } from "@/lib/metrics-engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  sales,
  payrollWeeks,
  trafficByDay,
  AGENT_NAMES,
  money,
  type SaleRecord,
} from "@/lib/company-data";

const CARD_GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

function fmtDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function SectionHead({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-brand/10 text-brand">{icon}</span>
      <div>
        <p className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground/80">{subtitle}</p>}
      </div>
    </div>
  );
}

export function RevenueCenter() {
  const { user } = useAuth();
  const [sel, setSel] = useState<DateSelection>({ preset: "year" });
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const bounds = selectionBounds(sel);
  const payables = useExpenseLedger();

  const scopedSales = useMemo(
    () => sales.filter((s) => inSelection(s.saleDate, sel)),
    [sel],
  );

  const scopedWeeks = useMemo(
    () => payrollWeeks.filter((w) => inSelection(w.weekStart, sel)),
    [sel],
  );

  const scopedPayables = useMemo(
    () => payables.filter((p) => inSelection(p.costDate ?? `${p.month}-01`, sel)),
    [payables, sel],
  );

  const scopedTraffic = useMemo(
    () => trafficByDay.filter((d) => inSelection(d.date, sel)),
    [sel],
  );

  /* ---------- business snapshot ---------- */
  const salesCounted = scopedSales.reduce((s, r) => s + (r.countSale ?? 0), 0);
  const monthlyPremium = scopedSales.reduce((s, r) => s + r.premium, 0);
  const policyAmount = scopedSales.reduce((s, r) => s + r.policyAmount, 0);
  const carrierReceived = scopedSales
    .filter(isRevenueCollected)
    .reduce((s, r) => s + expectedCarrierRevenue(r), 0);
  const carrierBooked = scopedSales.reduce((s, r) => s + expectedCarrierRevenue(r), 0);
  const companyCost = scopedWeeks.reduce((s, r) => s + r.totalCompanyCost, 0);
  const netCash = scopedWeeks.reduce((s, r) => s + r.netCash, 0);

  useEffect(() => {
    const period = `${bounds.from ?? "all"}_${bounds.to ?? "all"}`;
    recordCalculationOnce(`revenue:${period}`, {
      actor: user?.name ?? null,
      actorEmail: user?.email ?? null,
      category: "Revenue",
      action: "Recalculated finance overview",
      recordType: "Revenue",
      recordId: period,
      detail: {
        sales: salesCounted,
        monthlyPremium: Number(monthlyPremium.toFixed(2)),
        policyAmount: Number(policyAmount.toFixed(2)),
        carrierBooked: Number(carrierBooked.toFixed(2)),
        carrierReceived: Number(carrierReceived.toFixed(2)),
        companyCost: Number(companyCost.toFixed(2)),
        netCash: Number(netCash.toFixed(2)),
      },
    });
  }, [bounds.from, bounds.to, salesCounted, monthlyPremium, policyAmount, carrierBooked, carrierReceived, companyCost, netCash, user?.name, user?.email]);

  /* ---------- commission view ---------- */
  const annualizedPremium = monthlyPremium * 12;
  const totalCommission = carrierBooked;
  const receivable = Math.max(0, carrierBooked - carrierReceived);
  const netContribution = carrierReceived - companyCost;
  const agentPay = scopedWeeks.reduce((s, r) => s + r.basePayroll + r.commissionDue + r.incentiveDue, 0);
  const trafficCost = scopedWeeks.reduce((s, r) => s + r.trafficCost, 0);

  /* ---------- operations pulse ---------- */
  const incomingCalls = scopedTraffic.reduce((s, d) => s + d.calls, 0);
  const trafficSales = scopedTraffic.reduce((s, d) => s + d.sales, 0);
  const connectRate = incomingCalls > 0 ? trafficSales / incomingCalls : 0;
  const costPerSale = trafficSales > 0 ? trafficCost / trafficSales : 0;
  const paidHours = scopedWeeks.reduce((s, r) => s + r.paidHours, 0);
  const salesPerHour = paidHours > 0 ? salesCounted / paidHours : 0;

  /* ---------- payment exposure ---------- */
  const pendingFirst = scopedSales.filter((r) => r.paymentStatus === "Pending First Payment");
  const pendingExposure = pendingFirst.reduce((s, r) => s + r.premium, 0);

  const paymentStatusRows = useMemo(() => {
    const map = new Map<string, { status: string; count: number; premium: number }>();
    for (const s of scopedSales) {
      const key = s.paymentStatus ?? "Unknown";
      const cur = map.get(key) ?? { status: key, count: 0, premium: 0 };
      cur.count += 1;
      cur.premium += s.premium;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, [scopedSales]);

  const costRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of scopedPayables) map.set(p.category, (map.get(p.category) ?? 0) + p.amount);
    const rows = Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
    rows.sort((a, b) => b.amount - a.amount);
    return rows;
  }, [scopedPayables]);
  const costTotal = costRows.reduce((s, r) => s + r.amount, 0);

  const weeklyChart = useMemo(() => {
    const keys = Array.from(new Set(scopedWeeks.map((w) => w.weekStart))).sort();
    return keys.map((k) => {
      const w = scopedWeeks.filter((x) => x.weekStart === k);
      return {
        week: fmtDay(k),
        premium: Math.round(w.reduce((s, r) => s + r.premiumWritten, 0)),
        cost: Math.round(w.reduce((s, r) => s + r.totalCompanyCost, 0)),
        netCash: Math.round(w.reduce((s, r) => s + r.netCash, 0)),
      };
    });
  }, [scopedWeeks]);

  const revenueByDay = useMemo(() => {
    const map = new Map<string, { date: string; premium: number; carrier: number }>();
    for (const s of scopedSales) {
      const cur = map.get(s.saleDate) ?? { date: s.saleDate, premium: 0, carrier: 0 };
      cur.premium += s.premium;
      if (isRevenueCollected(s)) cur.carrier += expectedCarrierRevenue(s);
      map.set(s.saleDate, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({ ...r, label: fmtDay(r.date), premium: Math.round(r.premium), carrier: Math.round(r.carrier) }));
  }, [scopedSales]);

  const carrierRows = useMemo(() => {
    const map = new Map<string, { carrier: string; count: number; premium: number; received: number; booked: number }>();
    for (const s of scopedSales) {
      const key = s.carrier ?? "Unassigned";
      const cur = map.get(key) ?? { carrier: key, count: 0, premium: 0, received: 0, booked: 0 };
      cur.count += 1;
      cur.premium += s.premium;
      cur.booked += expectedCarrierRevenue(s);
      if (isRevenueCollected(s)) cur.received += expectedCarrierRevenue(s);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, [scopedSales]);

  /* ---------- table ---------- */
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedSales.filter((r) => {
      if (q && ![r.customer, r.agent, r.id, r.carrier ?? ""].some((f) => f.toLowerCase().includes(q))) return false;
      if (values["agent"] && r.agent !== values["agent"]) return false;
      if (values["paymentStatus"] && (r.paymentStatus ?? "") !== values["paymentStatus"]) return false;
      if (values["carrier"] && (r.carrier ?? "") !== values["carrier"]) return false;
      if (values["revenueReceived"] && r.revenueReceived !== values["revenueReceived"]) return false;
      return true;
    });
  }, [scopedSales, search, values]);

  const columns: Column<SaleRecord>[] = [
    {
      key: "id",
      header: "Sale",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.id}</p>
          <p className="text-xs text-muted-foreground">{fmtDay(r.saleDate)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.customer}</p>
          <p className="text-xs text-muted-foreground">{r.state ?? "—"}</p>
        </div>
      ),
    },
    { key: "agent", header: "Agent", cell: (r) => <span className="text-sm">{r.agent}</span> },
    {
      key: "carrier",
      header: "Carrier / policy",
      cell: (r) => (
        <div>
          <p className="text-sm text-foreground">{r.carrier ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{r.product ?? "—"} · {r.policyNumber ?? "no policy #"}</p>
        </div>
      ),
    },
    { key: "policyAmount", header: "Policy amount", align: "right", cell: (r) => <span className="tabular">{money(r.policyAmount)}</span> },
    { key: "premium", header: "Monthly premium", align: "right", cell: (r) => <span className="tabular font-medium">{money(r.premium)}</span> },
    { key: "paymentStatus", header: "Payment", cell: (r) => <StatusBadge status={r.paymentStatus ?? "Unknown"} /> },
    {
      key: "carrierRevenue",
      header: "Carrier revenue",
      align: "right",
      cell: (r) => (
        <div className="text-right">
          <p className={`tabular ${isRevenueCollected(r) ? "font-medium text-success" : "text-muted-foreground"}`}>
            {money(expectedCarrierRevenue(r))}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRevenueCollected(r) ? (r.revenueReceivedDate ?? "collected") : "receivable"}
          </p>
        </div>
      ),
    },
    {
      key: "commissionEligible",
      header: "Commission",
      cell: (r) => (
        <Badge variant={r.commissionEligible ? "default" : "outline"} className="text-xs">
          {r.commissionEligible ? "Eligible" : "Not eligible"}
        </Badge>
      ),
    },
  ];

  const collectionRate = carrierBooked > 0 ? carrierReceived / carrierBooked : 0;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Finance" title="Overview" />

      <PageHero
        eyebrow="Finance"
        title="Revenue Overview"
        description="Premium written, carrier revenue, commission receivable and net cash — all scoped to the period you pick."
        meta={[
          { label: "Period", value: presetLabel(sel) },
          {
            label: "Window",
            value: `${bounds.from.toLocaleDateString()} – ${bounds.to.toLocaleDateString()}`,
          },
          { label: "Sales in view", value: scopedSales.length, tone: "success" },
          { label: "Payroll rows", value: scopedWeeks.length, tone: "warning" },
        ]}
        controls={<DateRangeTabs value={sel} onChange={setSel} />}
      />


      {/* Business snapshot */}
      <section className="space-y-3">
        <SectionHead icon={<TrendingUp className="size-4" />} title="Business snapshot" subtitle="What the period produced" />
        <div className={CARD_GRID}>
          <StatCard label="Sales counted" value={salesCounted.toLocaleString()} hint={`${scopedSales.length} records written`} icon={<Receipt className="size-4" />} tone="brand" />
          <StatCard label="Monthly premium" value={money(monthlyPremium)} hint={`policy amount ${money(policyAmount)}`} icon={<DollarSign className="size-4" />} tone="info" />
          <StatCard label="Carrier revenue recv." value={money(carrierReceived)} hint={`${pct(collectionRate)} of booked collected`} icon={<PiggyBank className="size-4" />} tone="success" />
          <StatCard
            label="Net cash position"
            value={money(netCash)}
            hint={`company cost ${money(companyCost)}`}
            icon={<Wallet className="size-4" />}
            tone={netCash < 0 ? "danger" : "success"}
          />
        </div>
      </section>

      {/* Commission view */}
      <section className="space-y-3">
        <SectionHead icon={<ShieldCheck className="size-4" />} title="Commission view" subtitle="Annualized value and what is still owed to us" />
        <div className={CARD_GRID}>
          <StatCard label="Annualized premium" value={money(annualizedPremium)} hint="monthly premium × 12" icon={<TrendingUp className="size-4" />} tone="brand" />
          <StatCard label="Total commission" value={money(totalCommission)} hint="booked across carriers" icon={<Coins className="size-4" />} tone="info" />
          <StatCard label="Receivable" value={money(receivable)} hint="awaiting first payment" icon={<CircleDollarSign className="size-4" />} tone="warning" to="/commissions" />
          <StatCard
            label="Est. net contribution"
            value={money(netContribution)}
            hint="collected revenue − company cost"
            icon={<Banknote className="size-4" />}
            tone={netContribution < 0 ? "danger" : "success"}
          />
        </div>
      </section>

      {/* Operations pulse */}
      <section className="space-y-3">
        <SectionHead icon={<Gauge className="size-4" />} title="Operations pulse" subtitle="Traffic efficiency and cost of production" />
        <div className={CARD_GRID}>
          <StatCard label="Incoming calls" value={incomingCalls.toLocaleString()} hint={`${trafficSales} sales from traffic`} icon={<PhoneCall className="size-4" />} tone="default" to="/calls" />
          <StatCard label="Conversion rate" value={pct(connectRate)} hint="sales ÷ calls" tone="brand" />
          <StatCard label="Traffic cost" value={money(trafficCost)} hint="Ringba / CallGrid" tone="danger" to="/call-costs" />
          <StatCard label="Cost / sale" value={money(costPerSale)} hint="traffic cost ÷ traffic sales" tone={costPerSale > 250 ? "danger" : "warning"} />
          <StatCard label="Agent pay" value={money(agentPay)} hint="base + commission + incentive" tone="warning" to="/payroll" />
          <StatCard label="Company cost" value={money(companyCost)} hint="all-in for the period" tone="danger" to="/expenses" />
          <StatCard label="Sales / hour" value={salesPerHour.toFixed(2)} hint={`${Math.round(paidHours)} paid hours`} tone="info" />
          <StatCard label="Collection rate" value={pct(collectionRate)} hint="carrier revenue received" tone="success" />
        </div>
      </section>

      {pendingFirst.length > 0 && (
        <Card className="flex items-start gap-3 rounded-2xl border-warning/40 bg-warning/10 p-4 shadow-card">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-tan" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{pendingFirst.length} policies</span> ({money(pendingExposure)} in premium) are
            Pending First Payment — carrier revenue will not post until the customer's first draft succeeds.
          </p>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-3 xl:grid-cols-2">
        <Card className="space-y-3 rounded-2xl border-border/70 p-4 shadow-card">
          <SectionHead icon={<Banknote className="size-4" />} title="Weekly premium vs cost vs net cash" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(v: number) => money(Number(v))}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="premium" name="Premium" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Company cost" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netCash" name="Net cash" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-3 rounded-2xl border-border/70 p-4 shadow-card">
          <SectionHead icon={<TrendingUp className="size-4" />} title="Premium written vs carrier revenue received" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="revPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="revCarrier" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(v: number) => money(Number(v))}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="premium" name="Premium" stroke="var(--color-brand)" fill="url(#revPremium)" strokeWidth={2} />
                <Area type="monotone" dataKey="carrier" name="Carrier received" stroke="var(--color-success)" fill="url(#revCarrier)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-4 rounded-2xl border-border/70 p-5 shadow-card xl:col-span-2">
          <SectionHead icon={<ShieldCheck className="size-4" />} title="Revenue by carrier" subtitle="Booked vs collected" />
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-[0.68rem] tracking-[0.1em] text-muted-foreground uppercase">
                  <th className="py-2 text-left font-semibold">Carrier</th>
                  <th className="py-2 text-right font-semibold">Sales</th>
                  <th className="py-2 text-right font-semibold">Premium</th>
                  <th className="py-2 text-right font-semibold">Booked</th>
                  <th className="py-2 text-right font-semibold">Collected</th>
                  <th className="py-2 pl-4 text-left font-semibold">Collection</th>
                </tr>
              </thead>
              <tbody>
                {carrierRows.map((r) => {
                  const rate = r.booked > 0 ? (r.received / r.booked) * 100 : 0;
                  return (
                    <tr key={r.carrier} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium text-foreground">{r.carrier}</td>
                      <td className="py-2.5 text-right tabular">{r.count}</td>
                      <td className="py-2.5 text-right tabular">{money(r.premium)}</td>
                      <td className="py-2.5 text-right tabular">{money(r.booked)}</td>
                      <td className="py-2.5 text-right tabular font-medium text-success">{money(r.received)}</td>
                      <td className="w-40 py-2.5 pl-4">
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-1.5" />
                          <span className="w-10 text-right text-xs tabular text-muted-foreground">{rate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {carrierRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No sales in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 rounded-2xl border-border/70 p-5 shadow-card">
            <SectionHead icon={<AlertTriangle className="size-4" />} title="Exposure by payment status" />
            <div className="space-y-2">
              {paymentStatusRows.map((r) => (
                <div key={r.status} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">{r.count} sales</span>
                  </div>
                  <span className="tabular text-sm font-medium">{money(r.premium)}</span>
                </div>
              ))}
              {paymentStatusRows.length === 0 && <p className="text-sm text-muted-foreground">Nothing to show.</p>}
            </div>
          </Card>

          <Card className="space-y-3 rounded-2xl border-border/70 p-5 shadow-card">
            <SectionHead icon={<Receipt className="size-4" />} title="Cost stack" subtitle={`total ${money(costTotal)}`} />
            <div className="space-y-2.5">
              {costRows.map((r) => (
                <div key={r.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{r.category}</span>
                    <span className="tabular font-medium text-foreground">{money(r.amount)}</span>
                  </div>
                  <Progress value={costTotal > 0 ? (r.amount / costTotal) * 100 : 0} className="h-1.5" />
                </div>
              ))}
              {costRows.length === 0 && <p className="text-sm text-muted-foreground">No costs booked in this period.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Ledger */}
      <Card className="space-y-3 rounded-2xl border-border/70 p-4 shadow-card">
        <SectionHead icon={<DollarSign className="size-4" />} title="Revenue ledger" subtitle={`${tableRows.length} of ${scopedSales.length} sales in range`} />
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search customer, agent, carrier…"
          filters={[
            { key: "agent", label: "Agent", options: AGENT_NAMES.slice() },
            { key: "carrier", label: "Carrier", options: unique(scopedSales, (r) => r.carrier ?? "") },
            { key: "paymentStatus", label: "Payment status", options: unique(scopedSales, (r) => r.paymentStatus ?? "") },
            { key: "revenueReceived", label: "Revenue received", options: ["Yes", "No"] },
          ]}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          onReset={() => {
            setValues({});
            setSearch("");
          }}
        />
        <DataTable columns={columns} rows={tableRows} />
      </Card>
    </div>
  );
}
