import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/crm/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ROLES, type Role } from "@/lib/mock-data";
import { DEMO_ACCOUNTS, ROUTE_ACCESS, SUPER_ROLES, canAccess } from "@/lib/rbac";

export const Route = createFileRoute("/_shell/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Manage department accounts and review the role-based access matrix for every Policy Bear CRM module.",
      },
      { property: "og:title", content: "Users & Roles — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Department accounts and the role-based access matrix for every Policy Bear CRM module.",
      },
    ],
  }),
  component: UsersRolesPage,
});

const matrixRows = ROUTE_ACCESS.filter((rule) => rule.prefix !== "/unauthorized");

function UsersRolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        description="One account per department, with role-based access enforced across every module."
        eyebrow="Administration"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DEMO_ACCOUNTS.map((account) => (
          <Card key={account.id} className="gap-2 p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {account.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{account.title}</p>
              </div>
              <Badge
                variant={SUPER_ROLES.includes(account.role) ? "default" : "secondary"}
                className="shrink-0"
              >
                {account.role}
              </Badge>
            </div>
            <dl className="mt-1 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>Department</dt>
                <dd className="text-foreground">{account.department}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Username</dt>
                <dd className="truncate font-mono text-foreground">{account.email}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Password</dt>
                <dd className="font-mono text-foreground">{account.password}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Landing page</dt>
                <dd className="text-foreground">{account.landing}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShieldCheck className="size-4 text-brand" />
          <div>
            <p className="text-sm font-semibold text-foreground">Access matrix</p>
            <p className="text-xs text-muted-foreground">
              CEO and Administrator have full access by design.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Module</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-medium">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.prefix} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-foreground">
                    {row.prefix}
                  </td>
                  {ROLES.map((role: Role) => (
                    <td key={role} className="px-3 py-2 text-center">
                      {canAccess(role, row.prefix) ? (
                        <Check className="mx-auto size-4 text-success" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/40" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
