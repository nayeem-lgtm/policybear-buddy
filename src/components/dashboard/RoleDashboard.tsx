import { AgentDashboard } from "@/components/dashboard/AgentDashboard";
import type { Role } from "@/lib/mock-data";

export function RoleDashboard({ role, name }: { role: Role; name: string }) {
  return <AgentDashboard name={name} />;
}
