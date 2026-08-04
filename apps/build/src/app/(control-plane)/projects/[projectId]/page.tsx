import { notFound } from "next/navigation";

import { ProjectPage } from "@build/features/launch/components/deployments/project-page";
import { platformHref, platformParam } from "@build/features/launch/platform";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isSafeInteger(id)) notFound();
  const platform = platformParam((await searchParams).platform);

  return (
    <ProjectPage
      projectId={id}
      platform={platform}
      backHref={platformHref("/projects", platform)}
      backLabel="Projects"
      tabBaseHref={`/projects/${projectId}`}
    />
  );
}
