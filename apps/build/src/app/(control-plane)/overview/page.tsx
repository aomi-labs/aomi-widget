import { OverviewDashboard } from "@build/features/overview/overview-dashboard";
import { platformParam } from "@build/features/launch/platform";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string | string[] }>;
}) {
  const { platform } = await searchParams;
  return <OverviewDashboard platform={platformParam(platform)} />;
}
