import { ErrorBoundary } from "@build/components/shell/error-boundary";
import { ProjectIndex } from "@build/features/launch/components/deployments/project-index";

export default function ProjectsPage() {
  return (
    <ErrorBoundary>
      <ProjectIndex />
    </ErrorBoundary>
  );
}
