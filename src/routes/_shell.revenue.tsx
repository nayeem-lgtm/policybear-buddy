import { createFileRoute } from "@tanstack/react-router";

import { RevenueCenter } from "@/components/finance/RevenueCenter";

export const Route = createFileRoute("/_shell/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue & Cash Position — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Premium written, carrier revenue received, commission receivable and net cash position with Today to custom date filters.",
      },
      { property: "og:title", content: "Revenue & Cash Position — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Premium written, carrier revenue received, commission receivable and net cash position with Today to custom date filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevenuePage,
});

function RevenuePage() {
  return <RevenueCenter />;
}
