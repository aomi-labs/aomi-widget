import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { DeploymentConsole } from "@portal/features/launch/components";

export default function DeploymentsPage() {
  return (
    <ErrorBoundary>
      <DeploymentConsole />
    </ErrorBoundary>
  );
}
