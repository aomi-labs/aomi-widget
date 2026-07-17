import { CircleArrowUp, GitCommitHorizontal, RotateCcw } from "lucide-react";
import type { TimelineDeployment } from "../deployment-timeline";
import { formatRelativeTime } from "../format-relative-time";
import { sdkCompatibility } from "../sdk-compatibility";

/** Deployment row from DB promotion records. Lead with apps + status; id is secondary. */
export function TimelineDeploymentRow({
  deployment,
  busy,
  message,
  runtimeState,
  requiredSdk,
  secretsBlocked,
  onPromote,
  onUpgrade,
}: {
  deployment: TimelineDeployment;
  busy: boolean;
  message?: string | null;
  runtimeState?: "loaded" | "not-loaded";
  requiredSdk?: string | null;
  secretsBlocked?: boolean;
  onPromote: () => void;
  onUpgrade?: () => void;
}) {
  const { deploymentId, commit, apps, current, actor, sdkVersion, createdAt } =
    deployment;
  const title = apps.join(", ") || "Deployment";
  const absolute = new Date(createdAt * 1000).toLocaleString();
  const outdated =
    current && sdkCompatibility(sdkVersion, requiredSdk) === "outdated";

  return (
    <div
      className={`border-border grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0 ${
        outdated ? "bg-warning/10" : current ? "bg-positive/5" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-medium">{title}</div>
          {current && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                outdated || runtimeState === "not-loaded"
                  ? "bg-warning/10 text-warning"
                  : "bg-positive/10 text-positive"
              }`}
            >
              {outdated
                ? "Outdated"
                : runtimeState === "not-loaded"
                  ? "Selected, not loaded"
                  : "Current"}
            </span>
          )}
        </div>
        <div className="text-dim mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 font-mono">
            <GitCommitHorizontal className="size-3.5" aria-hidden />
            {commit ?? "unknown"}
          </span>
          {sdkVersion && (
            <span>
              sdk {sdkVersion}
              {outdated && requiredSdk ? ` · requires ${requiredSdk}` : ""}
            </span>
          )}
          {actor && <span>{actor}</span>}
          <span title={absolute}>{formatRelativeTime(createdAt)}</span>
        </div>
        <div className="text-dim mt-1 truncate font-mono text-[11px]">
          {deploymentId}
        </div>
        {message && <div className="text-dim mt-1 text-xs">{message}</div>}
        {!current && secretsBlocked && (
          <div className="mt-1 text-xs text-amber-700">
            Required secrets missing — set them in the Environment tab.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {outdated && onUpgrade && (
          <button
            type="button"
            disabled={busy}
            onClick={onUpgrade}
            className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CircleArrowUp className="size-3.5" aria-hidden />
            Upgrade to {requiredSdk}
          </button>
        )}
        {!current && (
          <button
            type="button"
            disabled={busy || secretsBlocked}
            onClick={onPromote}
            className="border-border bg-surface-1 text-foreground hover:bg-accent-hover inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
            title={
              secretsBlocked
                ? "Required secrets missing — set them in the Environment tab"
                : "Promote this deployment to live"
            }
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Promote
          </button>
        )}
      </div>
    </div>
  );
}
