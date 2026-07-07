import { ErrorBoundary } from "@build/components/shell/error-boundary";
import { ProjectIndex } from "@build/features/launch/components/deployments";

export default function ProjectsPage() {
  return (
    <ErrorBoundary>
      <ProjectIndex />
    </ErrorBoundary>
  );
}
