import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/crm/PageHeader";
import { AgentWorkspace } from "@/components/telephony/AgentWorkspace";

export const Route = createFileRoute("/_shell/agent-desk")({
  head: () => ({
    meta: [
      { title: "Agent Desk — Policy Bear CRM" },
      {
        name: "description",
        content:
          "Dial, set your status, wrap up calls and work your callbacks — all connected to CallTools from inside Policy Bear.",
      },
      { property: "og:title", content: "Agent Desk — Policy Bear CRM" },
      {
        property: "og:description",
        content: "One screen for dialing, presence, live calls and call outcomes, synced with CallTools.",
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
        description="Everything you need for a call in one place. Your status, dialing, outcomes and callbacks stay in step with CallTools automatically."
      />
      <AgentWorkspace />
    </div>
  );
}
