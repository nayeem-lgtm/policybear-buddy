import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { CustomerBook, type BookTab } from "@/components/crm/CustomerBook";

const searchSchema = z.object({
  tab: z.string().optional(),
});

export const Route = createFileRoute("/_shell/customers")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Customers & Sales — Policy Bear CRM" },
      {
        name: "description",
        content:
          "One workspace for customer records, policy detail, payment method, premium and commission eligibility.",
      },
      { property: "og:title", content: "Customers & Sales — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "One workspace for customer records, policy detail, payment method, premium and commission eligibility.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/customers" });
  const active: BookTab = tab === "sales" ? "sales" : "customers";

  return (
    <CustomerBook
      tab={active}
      onTabChange={(next) => navigate({ search: { tab: next } })}
    />
  );
}
