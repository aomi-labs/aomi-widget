import type { UserProject } from "@aomi-labs/deploy";
import { StatusDot } from "./ui/status-dot";
import { SdkBadge } from "./ui/sdk-badge";

export function ProjectRow({
  source,
  requiredSdk,
}: {
  source: UserProject;
  requiredSdk?: string | null;
}) {
  const activeApps = source.apps.filter((app) => app.isActive).length;
  const hasDeployment =
    source.latestDeployment !== null ||
    source.apps.some((app) => app.appReleaseTag != null);
  const deploymentState =
    activeApps > 0
      ? (source.latestDeployment?.state ?? "live")
      : hasDeployment
        ? "deactivated"
        : "none";
  const deploymentLabel =
    activeApps > 0
      ? "Live deployment"
      : hasDeployment
        ? "Deactivated"
        : "No deployment";
  const appLabel =
    source.apps.length === 0
      ? "No apps"
      : source.apps.length === 1
        ? source.apps[0]?.name
        : `${source.apps.length} apps`;
  const stamped =
    source.sdkVersion ??
    source.latestDeployment?.sdkVersion ??
    source.latestDeployment?.apps.find((app) => app.sdkVersion)?.sdkVersion ??
    null;
  return (
    <a
      href={`/deployments/${source.id}`}
      className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-xs font-medium">
        {(source.repositoryLink ?? "A").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {source.repositoryLink ?? "Unknown repository"}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          <StatusDot state={deploymentState} />
          <span>{deploymentLabel}</span>
          <span aria-hidden>·</span>
          <span>{appLabel}</span>
        </div>
      </div>
      <SdkBadge stamped={stamped} required={requiredSdk} />
    </a>
  );
}
