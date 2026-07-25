import { notFound } from "next/navigation";

import { ProjectPage } from "@build/features/launch/components/deployments/project-page";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const id = Number(sourceId);
  if (!Number.isSafeInteger(id)) notFound();

  return (
    <ProjectPage
      sourceId={id}
      backHref="/projects"
      backLabel="Projects"
      tabBaseHref={`/projects/${sourceId}`}
    />
  );
}
