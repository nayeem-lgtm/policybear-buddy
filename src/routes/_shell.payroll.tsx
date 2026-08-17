import { createFileRoute } from "@tanstack/react-router";

import { PayrollCenter } from "@/components/finance/PayrollCenter";

export const Route = createFileRoute("/_shell/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Mon–Fri payroll built from attendance: auto-counted hours, overtime, tiered commission, taxes, and daily or weekly payroll runs.",
      },
      { property: "og:title", content: "Payroll — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Mon–Fri payroll built from attendance: auto-counted hours, overtime, tiered commission, taxes, and daily or weekly payroll runs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayrollPage,
});

function PayrollPage() {
  return <PayrollCenter />;
}
