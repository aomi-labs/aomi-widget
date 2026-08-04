import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { ProjectPage } from "@portal/features/launch/components/deployments";

export default async function ProjectRoute({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const id = Number(projectId);
  return (
    <ErrorBoundary>
      {Number.isSafeInteger(id) ? (
        <ProjectPage projectId={id} />
      ) : (
        <div className="p-6 text-sm text-red-600">Invalid project id.</div>
      )}
    </ErrorBoundary>
  );
}
