import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GitCompareArrows, PhoneIncoming, PhoneOutgoing, Target } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhone, formatTalk } from "@/lib/phone";
import { PROVIDER_LABEL, PROVIDERS } from "@/lib/telephony-shared";
import { getAttributionReport, setAttributionOverride } from "@/lib/telephony.functions";

export const Route = createFileRoute("/_shell/telephony-attribution")({
  head: () => ({
    meta: [
      { title: "Source Attribution — Policy Bear CRM" },
      {
        name: "description",
        content: "Scrub CallTools dialer activity against CallGrid inbound traffic to see which system produced each callback and sale.",
      },
      { property: "og:title", content: "Source Attribution — Policy Bear CRM" },
      {
        property: "og:description",
        content: "See which system produced each callback and sale: the dialer or inbound call tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttributionPage,
});

function AttributionPage() {
  const [days, setDays] = useState("30");
  const [view, setView] = useState<"all" | "callbacks" | "sold">("all");
  const [phone, setPhone] = useState("");
  const [overrideProvider, setOverrideProvider] = useState<"calltools" | "callgrid">("calltools");

  const fetchReport = useServerFn(getAttributionReport);
  const saveOverride = useServerFn(setAttributionOverride);
  const queryClient = useQueryClient();

  const report = useQuery({
    queryKey: ["telephony-attribution", days],
    queryFn: () => fetchReport({ data: { days: Number(days) } }),
  });

  const override = useMutation({
    mutationFn: () => saveOverride({ data: { phone, provider: overrideProvider } }),
    onSuccess: (res) => {
      toast.success(`${formatPhone(res.phone)} attributed to ${PROVIDER_LABEL[res.provider]}`);
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["telephony-attribution"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = report.data;
  const journeys = (data?.journeys ?? []).filter((j) =>
    view === "callbacks" ? j.callback_via_calltools : view === "sold" ? j.sold : true,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Source attribution & scrubbing"
        description="Every number is matched across both systems: inbound calls from CallGrid, dialer callbacks from CallTools. Sales are then credited to the system that actually produced the lead."
        actions={
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
              <SelectTrigger className="w-[11rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All journeys</SelectItem>
                <SelectItem value="callbacks">Callbacks only</SelectItem>
                <SelectItem value="sold">Sold only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CallGrid leads"
          value={data?.summary.callgrid.leads ?? "—"}
          hint={`${data?.summary.callgrid.sales ?? 0} sales · ${formatTalk(data?.summary.callgrid.talkSeconds ?? 0)} talk`}
          tone="info"
          icon={<PhoneIncoming className="size-4" />}
        />
        <StatCard
          label="CallTools leads"
          value={data?.summary.calltools.leads ?? "—"}
          hint={`${data?.summary.calltools.sales ?? 0} sales · ${formatTalk(data?.summary.calltools.talkSeconds ?? 0)} talk`}
          tone="brand"
          icon={<PhoneOutgoing className="size-4" />}
        />
        <StatCard
          label="Dialer callbacks"
          value={(data?.summary.callgrid.callbacks ?? 0) + (data?.summary.calltools.callbacks ?? 0)}
          hint="Inbound lead re-dialed in CallTools"
          tone="success"
          icon={<GitCompareArrows className="size-4" />}
        />
        <StatCard
          label="Unmatched sales"
          value={data?.unmatchedSales ?? "—"}
          hint="Sold numbers with no synced call yet"
          tone={data && data.unmatchedSales > 0 ? "warning" : "default"}
          icon={<Target className="size-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Lead journeys ({journeys.length})</h2>
          </div>
          <div className="max-h-[34rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Number</th>
                  <th className="px-3 py-2 text-left font-medium">First touch</th>
                  <th className="px-3 py-2 text-left font-medium">Inbound</th>
                  <th className="px-3 py-2 text-left font-medium">Dialed</th>
                  <th className="px-3 py-2 text-left font-medium">Callback</th>
                  <th className="px-3 py-2 text-left font-medium">Talk</th>
                  <th className="px-3 py-2 text-left font-medium">Credited</th>
                  <th className="px-3 py-2 text-left font-medium">Sold</th>
                </tr>
              </thead>
              <tbody>
                {journeys.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Nothing to scrub yet — run a telephony sync from Admin → Telephony Sync.
                    </td>
                  </tr>
                )}
                {journeys.map((j) => (
                  <tr key={j.id} className="border-t border-border/60">
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">
                      {formatPhone(j.phone_e164)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {PROVIDER_LABEL[j.first_touch_provider as "calltools" | "callgrid"] ?? "—"}
                      {j.first_touch_at ? ` · ${new Date(j.first_touch_at).toLocaleDateString()}` : ""}
                    </td>
                    <td className="px-3 py-2">{j.inbound_callgrid_count ?? 0}</td>
                    <td className="px-3 py-2">{j.outbound_calltools_count ?? 0}</td>
                    <td className="px-3 py-2">
                      {j.callback_via_calltools ? (
                        <Badge className="bg-success text-success-foreground">Yes</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatTalk(j.total_talk_seconds)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Badge variant="outline">
                        {PROVIDER_LABEL[j.attributed_provider as "calltools" | "callgrid"] ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {j.sold ? <Badge className="bg-brand text-brand-foreground">Sold</Badge> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-1 text-sm font-semibold text-foreground">How the scrub works</h2>
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              <li>Both systems' calls are normalised to one number format, so the same lead lines up across them.</li>
              <li>An inbound CallGrid call followed by a CallTools dial on the same number counts as a callback.</li>
              <li>Credit goes to the system that touched the lead first, unless an override says otherwise.</li>
              <li>Sales are matched from CRM contacts marked sold, so each sale lands on one source only.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Manual override</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="override-phone" className="text-xs">
                  Phone number
                </Label>
                <Input
                  id="override-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label className="text-xs">Credit to</Label>
                <Select value={overrideProvider} onValueChange={(v) => setOverrideProvider(v as "calltools" | "callgrid")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => override.mutate()}
                disabled={!phone || override.isPending}
              >
                Save override
              </Button>
              <p className="text-xs text-muted-foreground">
                Overrides are re-applied every sync, so the credited source stays fixed for that number.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
