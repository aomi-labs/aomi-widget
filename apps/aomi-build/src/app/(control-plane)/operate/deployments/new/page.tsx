import { NewProject } from "@build/features/launch/components/deployments/new-project";

export default function NewOperateDeploymentPage() {
  return (
    <NewProject backHref="/operate/deployments" backLabel="Deployments" />
  );
}
