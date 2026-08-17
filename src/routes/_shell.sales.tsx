import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";

/** Sales now lives inside the merged Customers & Sales book. Keep the old URL alive. */
export const Route = createFileRoute("/_shell/sales")({
  component: SalesRoute,
});

function SalesRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.replace(/\/$/, "") !== "/sales") return <Outlet />;
  return <Navigate to="/customers" search={{ tab: "sales" }} replace />;
}
