import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quotePlans } from "@/lib/mock-data";
import { currency, unique } from "@/lib/use-filters";
import { Send, FileCheck2, Star, Users, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_shell/quotes")({
  head: () => ({
    meta: [
      { title: "Quote Engine — Policy Bear CRM" },
      { name: "description", content: "Multi-carrier ACA quote engine with household intake and plan comparison." },
      { property: "og:title", content: "Quote Engine — Policy Bear CRM" },
      { property: "og:description", content: "Multi-carrier ACA quote engine with household intake and plan comparison." },
    ],
  }),
  component: QuotesPage,
});

interface HouseholdMember {
  id: number;
  relation: string;
  age: string;
  tobacco: boolean;
}

function QuotesPage() {
  const [zip, setZip] = useState("77042");
  const [income, setIncome] = useState("38400");
  const [members, setMembers] = useState<HouseholdMember[]>([
    { id: 1, relation: "Applicant", age: "34", tobacco: false },
  ]);
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [metalFilter, setMetalFilter] = useState("all");
  const [sort, setSort] = useState("premium-asc");
  const [compare, setCompare] = useState<string[]>([]);

  const subsidy = useMemo(() => {
    const inc = Number(income) || 0;
    return Math.max(0, Math.round((38000 - inc < 0 ? 180 : 420 - inc / 200)));
  }, [income]);

  const addMember = () =>
    setMembers((m) => [...m, { id: Date.now(), relation: "Dependent", age: "10", tobacco: false }]);
  const removeMember = (id: number) => setMembers((m) => m.filter((x) => x.id !== id));

  const carriers = unique(quotePlans, (p) => p.carrier);
  const metals = unique(quotePlans, (p) => p.metal);

  const results = useMemo(() => {
    let rows = quotePlans.filter(
      (p) =>
        (carrierFilter === "all" || p.carrier === carrierFilter) &&
        (metalFilter === "all" || p.metal === metalFilter),
    );
    rows = [...rows].sort((a, b) => {
      if (sort === "premium-asc") return a.subsidizedPremium - b.subsidizedPremium;
      if (sort === "premium-desc") return b.subsidizedPremium - a.subsidizedPremium;
      if (sort === "deductible-asc") return a.deductible - b.deductible;
      if (sort === "rating-desc") return b.rating - a.rating;
      return 0;
    });
    return rows;
  }, [carrierFilter, metalFilter, sort]);

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales"
        title="Quote Engine"
        description="Multi-carrier household quoting with live subsidy estimate and side-by-side comparison."
        actions={
          <Button size="sm" disabled={compare.length < 2}>
            Compare {compare.length > 0 ? `(${compare.length})` : ""}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Intake panel */}
        <Card className="h-fit space-y-4 p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground">Household intake</p>
          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP code</Label>
            <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="income">Annual household income</Label>
            <Input id="income" value={income} onChange={(e) => setIncome(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Household members</Label>
              <Button variant="ghost" size="sm" onClick={addMember} className="h-7 gap-1 px-2 text-xs">
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <Users className="size-3.5 shrink-0 text-muted-foreground" />
                  <Input
                    className="h-8 flex-1"
                    value={m.relation}
                    onChange={(e) =>
                      setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, relation: e.target.value } : x)))
                    }
                  />
                  <Input
                    className="h-8 w-14"
                    value={m.age}
                    onChange={(e) =>
                      setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, age: e.target.value } : x)))
                    }
                  />
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={m.tobacco}
                      onCheckedChange={(v) =>
                        setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, tobacco: v } : x)))
                      }
                    />
                  </div>
                  {members.length > 1 && (
                    <button onClick={() => removeMember(m.id)} aria-label="Remove member">
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Toggle switch marks tobacco use per member.</p>
          </div>

          <div className="rounded-md border border-brand/25 bg-brand/5 p-3">
            <p className="text-xs font-medium tracking-wide text-brand uppercase">Estimated monthly subsidy</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{currency(subsidy)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Based on {members.length} household member(s) at {zip}.</p>
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[10rem]"><SelectValue placeholder="Carrier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All carriers</SelectItem>
                {carriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={metalFilter} onValueChange={setMetalFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[9rem]"><SelectValue placeholder="Metal level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All metal levels</SelectItem>
                {metals.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-auto min-w-[10rem] ml-auto"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="premium-asc">Premium: low to high</SelectItem>
                <SelectItem value="premium-desc">Premium: high to low</SelectItem>
                <SelectItem value="deductible-asc">Deductible: low to high</SelectItem>
                <SelectItem value="rating-desc">Rating: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {results.map((p) => (
              <Card key={p.id} className="p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={compare.includes(p.id)}
                      onCheckedChange={() => toggleCompare(p.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{p.planName}</p>
                        <Badge variant="outline">{p.metal}</Badge>
                        <Badge variant="outline">{p.type}</Badge>
                        {p.hsaEligible && <Badge variant="outline">HSA eligible</Badge>}
                        {!p.autoSubmitSupported && <StatusBadge status="Not Configured" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.carrier} · {p.network} network</p>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 fill-warning text-warning" /> {p.rating.toFixed(1)}
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {p.benefitsHighlights.map((b) => (
                          <li key={b} className="rounded-full bg-surface px-2 py-0.5 text-[0.7rem] text-muted-foreground">{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-foreground">{currency(p.subsidizedPremium)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <p className="text-xs text-muted-foreground line-through">{currency(p.premium)}/mo before subsidy</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-4">
                  <div><p className="text-muted-foreground">Deductible</p><p className="font-medium text-foreground">{currency(p.deductible)}</p></div>
                  <div><p className="text-muted-foreground">MOOP</p><p className="font-medium text-foreground">{currency(p.oopMax)}</p></div>
                  <div><p className="text-muted-foreground">PCP copay</p><p className="font-medium text-foreground">{currency(p.pcpCopay)}</p></div>
                  <div><p className="text-muted-foreground">Generic Rx</p><p className="font-medium text-foreground">{currency(p.genericRx)}</p></div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5"><Send className="size-3.5" /> Send to customer</Button>
                  <Button size="sm" className="gap-1.5"><FileCheck2 className="size-3.5" /> Start application</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
