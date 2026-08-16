import { createFileRoute, redirect } from "@tanstack/react-router";

/** The calendar now lives inside the merged Callback Book. Keep the old URL alive. */
export const Route = createFileRoute("/_shell/callbacks/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/callbacks", search: { view: "calendar" } });
  },
});
