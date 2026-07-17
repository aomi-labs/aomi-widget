import type { UserSource, UserSourceLatestDeployment } from "@aomi-labs/deploy";
import { Icons, PortalIcon } from "@portal/components/icons";
import Link from "next/link";
import { StatusPill } from "./ui/status-pill";

export function ProjectHeader({
  source,
  latest,
  onRefresh,
}: {
  source: UserSource | null;
  latest: UserSourceLatestDeployment | null;
  onRefresh: () => void;
}) {
  const repoUrl = source?.repositoryLink
    ? source.repositoryLink.startsWith("http")
      ? source.repositoryLink
      : `https://github.com/${source.repositoryLink}`
    : null;
  return (
    <header className="border-border/60 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Link href="/deployments" className="text-zinc-500 hover:text-zinc-900">
          Deployments
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="truncate font-medium">
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
            <PortalIcon icon={Icons.Github} size={14} aria-hidden />
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
