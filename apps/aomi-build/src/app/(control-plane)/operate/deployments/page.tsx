import { Suspense } from "react";
import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { OperateDeployments } from "@portal/features/launch/components/deployments";

export default function OperateDeploymentsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <OperateDeployments />
      </Suspense>
    </ErrorBoundary>
  );
}
