import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/crm/PageHeader";
import { RealtimeDialer } from "@/components/telephony/RealtimeDialer";

export const Route = createFileRoute("/_shell/agent-desk")({
  head: () => ({
    meta: [
      { title: "Agent Desk — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Dial out, answer queued calls, control live calls and log outcomes with the built-in Policy Bear dialer.",
      },
      { property: "og:title", content: "Agent Desk — Policy Bear CRM" },
      {
        property: "og:description",
        content: "One screen for dialing, the inbound queue, live call controls, callbacks and outcomes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentDeskPage,
});

function AgentDeskPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Sales floor"
        title="Agent desk"
        description="Everything you need for a call in one place. Dial out, take queued calls, handle live audio controls and log every outcome without leaving Policy Bear."
      />
      <RealtimeDialer />
    </div>
  );
}
