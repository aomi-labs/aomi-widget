import { notFound } from "next/navigation";

import { ProjectPage } from "@build/features/launch/components/deployments/project-page";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const { sourceId } = await params;
  const { platform: rawPlatform } = await searchParams;
  const id = Number(sourceId);
  if (!Number.isSafeInteger(id)) notFound();
  const platform = typeof rawPlatform === "string" ? rawPlatform : undefined;

  return (
    <ProjectPage
      sourceId={id}
      platform={platform}
      backHref="/projects"
      backLabel="Projects"
      tabBaseHref={`/projects/${sourceId}`}
    />
  );
}
