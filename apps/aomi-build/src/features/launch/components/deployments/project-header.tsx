import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import { Github } from "lucide-react";
import { StatusPill } from "./ui/status-pill";

export function ProjectHeader({
  source,
  latest,
  onRefresh,
  backHref = "/operate/deployments",
  backLabel = "Deployments",
}: {
  source: UserSource | null;
  latest: UserSourceLatestDeployment | null;
  onRefresh: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const repoUrl = source?.repositoryLink
    ? source.repositoryLink.startsWith("http")
      ? source.repositoryLink
      : `https://github.com/${source.repositoryLink}`
    : null;
  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <a href={backHref} className="text-zinc-500 hover:text-zinc-900">
          {backLabel}
        </a>
        <span className="text-zinc-300">/</span>
        <span className="truncate font-semibold">
          {source?.repositoryLink ?? "Project"}
        </span>
        {latest?.state && <StatusPill value={latest.state} />}
      </div>
      <div className="flex items-center gap-2">
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 text-xs font-medium hover:bg-zinc-50"
          >
            <Github className="size-3.5" aria-hidden />
            GitHub
          </a>
        )}
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>
    </header>
  );
}
