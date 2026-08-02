import { NewProject } from "@build/features/launch/components/deployments/new-project";
import { platformHref, platformParam } from "@build/features/launch/platform";

export default async function NewOperateDeploymentPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const platform = platformParam((await searchParams).platform);
  return (
    <NewProject
      platform={platform}
      backHref={
        platform ? platformHref("/projects", platform) : "/operate/deployments"
      }
      backLabel={platform ? "Projects" : "Deployments"}
    />
  );
}
