import { Suspense } from "react";
import { ErrorBoundary } from "@build/components/shell/error-boundary";
import { OperateDeployments } from "@build/features/launch/components/deployments/operate-deployments";
import { platformParam } from "@build/features/launch/platform";

export default async function OperateDeploymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const { platform } = await searchParams;
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <OperateDeployments platform={platformParam(platform)} />
      </Suspense>
    </ErrorBoundary>
  );
}
