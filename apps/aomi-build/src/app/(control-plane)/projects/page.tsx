import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { ProjectIndex } from "@portal/features/launch/components/deployments";

export default function ProjectsPage() {
  return (
    <ErrorBoundary>
      <ProjectIndex />
    </ErrorBoundary>
  );
}
