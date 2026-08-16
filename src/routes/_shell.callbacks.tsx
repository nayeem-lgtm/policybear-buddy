import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CallbackBook } from "@/components/callbacks/CallbackBook";

const searchSchema = z.object({
  view: z.enum(["queue", "calendar"]).optional(),
});

export const Route = createFileRoute("/_shell/callbacks")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Callback Book — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Priority callback queue and week/day calendar in one workspace: call now, reschedule, reassign and complete follow-ups.",
      },
      { property: "og:title", content: "Callback Book — Policy Bear CRM" },
      {
        property: "og:description",
        content:
          "Priority callback queue and week/day calendar in one workspace with live countdowns and one-click dialing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CallbacksPage,
});

function CallbacksPage() {
  const { view } = Route.useSearch();
  return <CallbackBook initialView={view ?? "queue"} />;
}
