import { NewProject } from "@build/features/launch/components/deployments/new-project";

export default async function NewOperateDeploymentPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const { platform: rawPlatform } = await searchParams;
  const platform = typeof rawPlatform === "string" ? rawPlatform.trim() : "";
  return (
    <NewProject
      platform={platform || undefined}
      backHref={
        platform
          ? `/projects?platform=${encodeURIComponent(platform)}`
          : "/operate/deployments"
      }
      backLabel={platform ? "Projects" : "Deployments"}
    />
  );
}
