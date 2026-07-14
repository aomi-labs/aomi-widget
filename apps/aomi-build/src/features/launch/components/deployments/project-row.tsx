import type { UserSource } from "@aomi-labs/deploy";
import { projectDeploymentStatus } from "./project-deployment-status";
import { StatusDot } from "./ui/status-dot";
import { SdkBadge } from "./ui/sdk-badge";

export function ProjectRow({
  source,
  requiredSdk,
  href,
}: {
  source: UserSource;
  requiredSdk?: string | null;
  href?: string;
}) {
  const status = projectDeploymentStatus(source);
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
      href={href ?? `/projects/${source.id}`}
      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent-hover"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-xs font-medium">
        {(source.repositoryLink ?? "A").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {source.repositoryLink ?? "Unknown repository"}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-dim">
          <StatusDot state={status.dotState} />
          <span>{status.label}</span>
          <span aria-hidden>·</span>
          <span>{appLabel}</span>
        </div>
      </div>
      <SdkBadge stamped={stamped} required={requiredSdk} />
    </a>
  );
}
