import { notFound } from "next/navigation";
import { AppDetailPage } from "@build/features/operate/app-detail-page";

type PageProps = {
  params: Promise<{ application: string }>;
  searchParams: Promise<{ project?: string }>;
};

export default async function OperateObservabilityDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ application }, query] = await Promise.all([params, searchParams]);
  const applicationId = Number(application);
  const projectId = Number(query.project);
  if (
    !Number.isSafeInteger(applicationId) ||
    applicationId <= 0 ||
    !Number.isSafeInteger(projectId) ||
    projectId <= 0
  ) {
    notFound();
  }

  return <AppDetailPage applicationId={applicationId} project={projectId} />;
}
