import { Suspense } from "react";
import { OperatePlaceholder } from "@build/features/launch/components/deployments/operate-placeholder";

export default function OperateAgentsPage() {
  return (
    <Suspense fallback={null}>
      <OperatePlaceholder
        title="Agents"
        description="Global and project-scoped agent views will land once the agent control API is available."
      />
    </Suspense>
  );
}
