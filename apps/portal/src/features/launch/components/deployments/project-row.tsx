import type { UserSource } from "@aomi-labs/deploy";
import { StatusDot } from "./ui/status-dot";
import { SdkBadge } from "./ui/sdk-badge";

export function ProjectRow({
  source,
  requiredSdk,
}: {
  source: UserSource;
  requiredSdk?: string | null;
}) {
  const live = source.apps.filter((a) => a.isActive && a.loaded).length;
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
          <StatusDot state={source.latestDeployment?.state ?? "none"} />
          <span>{live} live app(s)</span>
        </div>
      </div>
      <SdkBadge stamped={stamped} required={requiredSdk} />
    </a>
  );
}
