import { notFound } from "next/navigation";
import { AppDetailPage } from "@build/features/operate/app-detail-page";
import { appFixture } from "@build/features/operate/fixtures";

type PageProps = {
  params: Promise<{ application: string }>;
  searchParams: Promise<{ fixture?: string; project?: string }>;
};

export default async function OperateObservabilityDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ application }, query] = await Promise.all([params, searchParams]);
  const app = appFixture(query.fixture ?? application);
  if (!app) notFound();
  const projectId = Number(query.project);
  const project =
    Number.isSafeInteger(projectId) && projectId > 0 ? String(projectId) : null;

  return (
    <AppDetailPage app={app} application={application} project={project} />
  );
}
