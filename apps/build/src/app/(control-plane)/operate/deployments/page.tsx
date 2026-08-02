import { Suspense } from "react";
import { ErrorBoundary } from "@build/components/shell/error-boundary";
import { OperateDeployments } from "@build/features/launch/components/deployments/operate-deployments";

export default function OperateDeploymentsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <OperateDeployments />
      </Suspense>
    </ErrorBoundary>
  );
}
