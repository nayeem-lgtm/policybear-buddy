import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/crm/PageHeader";
import { DncCenter } from "@/components/compliance/DncCenter";

export const Route = createFileRoute("/_shell/dnc")({
  head: () => ({
    meta: [
      { title: "DNC & Compliance — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Manage the Do-Not-Call list, import suppression files, release numbers and search every compliance action in one audit log.",
      },
      { property: "og:title", content: "DNC & Compliance — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Do-Not-Call suppression, automatic dial blocking and a searchable compliance audit log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DncPage,
});

function DncPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="DNC & compliance"
        description="Every number here is blocked from being dialled anywhere in Policy Bear — manual dials, power dialing and campaign leads. Adds, releases, imports and blocked attempts are all written to the audit log below."
      />
      <DncCenter />
    </div>
  );
}
