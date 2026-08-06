import { notFound } from "next/navigation";

import { ProjectPage } from "@build/features/launch/components/deployments/project-page";
import { platformHref, platformParam } from "@build/features/launch/platform";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const { sourceId } = await params;
  const id = Number(sourceId);
  if (!Number.isSafeInteger(id)) notFound();
  const platform = platformParam((await searchParams).platform);

  return (
    <ProjectPage
      sourceId={id}
      platform={platform}
      backHref={platformHref("/projects", platform)}
      backLabel="Projects"
      tabBaseHref={`/projects/${sourceId}`}
    />
  );
}
