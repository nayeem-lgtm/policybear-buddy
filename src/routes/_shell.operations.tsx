import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/crm/PageHeader";
import { AdminCommandCenter } from "@/components/dashboard/AdminCommandCenter";

export const Route = createFileRoute("/_shell/operations")({
  head: () => ({
    meta: [
      { title: "Admin Overview — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Company-wide admin cockpit: calls, sales, QA issues, commission, callbacks, leave approvals, payroll and profit.",
      },
      { property: "og:title", content: "Admin Overview — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Company-wide admin cockpit: calls, sales, QA issues, commission, callbacks, leave approvals, payroll and profit.",
      },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Admin Overview"
        description="Everything the company did — production, quality, money, people and the approvals waiting on you."
      />
      <AdminCommandCenter />
    </div>
  );
}
