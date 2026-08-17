import { createFileRoute } from "@tanstack/react-router";

import { ExpenseCenter } from "@/components/finance/ExpenseCenter";

export const Route = createFileRoute("/_shell/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Policy Bear CRM" },
      {
        name: "description",
        content: "Log company expenses manually and track spend, outstanding payables and cost stack across any date range.",
      },
      { property: "og:title", content: "Expenses — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Log company expenses manually and track spend, outstanding payables and cost stack across any date range.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  return <ExpenseCenter />;
}
