import { ErrorBoundary } from "@portal/components/shell/error-boundary";
import { NewProject } from "@portal/features/launch/components/deployments/new-project";

export default function NewProjectPage() {
  return (
    <ErrorBoundary>
      <NewProject />
    </ErrorBoundary>
  );
}
