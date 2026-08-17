import { createFileRoute } from "@tanstack/react-router";

import { UsersRolesCenter } from "@/components/admin/UsersRolesCenter";

export const Route = createFileRoute("/_shell/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Invite staff, assign Admin, Manager, Agent, QA Analyst or Developer roles and review the permission matrix.",
      },
      { property: "og:title", content: "Users & Roles — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Role-based access control for every Policy Bear CRM module, with a live user directory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersRolesPage,
});

function UsersRolesPage() {
  return <UsersRolesCenter />;
}
