import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Policy Bear Operations CRM" },
      { name: "description", content: "Daily operations snapshot for the Policy Bear floor." },
      { property: "og:title", content: "Dashboard — Policy Bear Operations CRM" },
      { property: "og:description", content: "Daily operations snapshot for the Policy Bear floor." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <PageHeader
      eyebrow="Workspace"
      title="Dashboard"
      description="Your shift, queue and priorities at a glance."
    />
  );
}
