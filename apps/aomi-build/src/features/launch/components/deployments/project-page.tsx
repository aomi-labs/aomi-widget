"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useProjectDetail } from "@portal/features/launch/hooks/use-project-detail";
import { ProjectHeader } from "./project-header";
import { DeploymentsTab } from "./tabs/deployments-tab";
import { EnvironmentTab } from "./tabs/environment-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { LoadingPanel, ErrorPanel } from "./ui/state-panels";

const TABS = [
  { id: "deployments", label: "Deployments" },
  { id: "environment", label: "Environment" },
  { id: "settings", label: "Settings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ProjectPage({
  sourceId,
  backHref = "/operate/deployments",
  backLabel = "Deployments",
  tabBaseHref,
  tabHref,
}: {
  sourceId: number;
  backHref?: string;
  backLabel?: string;
  tabBaseHref?: string;
  tabHref?: (tab: TabId) => string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const detail = useProjectDetail(sourceId);
  const raw = searchParams.get("tab");
  const active: TabId = TABS.some((t) => t.id === raw)
    ? (raw as TabId)
    : "deployments";

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <ProjectHeader
        source={detail.source}
        latest={detail.source?.latestDeployment ?? null}
        onRefresh={detail.reload}
        backHref={backHref}
        backLabel={backLabel}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div
          role="tablist"
          className="mb-4 flex w-fit items-center gap-1 rounded-md bg-zinc-100 p-1 text-sm"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active === tab.id}
              onClick={() =>
                router.push(
                  tabHref?.(tab.id) ??
                    (tabBaseHref
                      ? `${tabBaseHref}?tab=${tab.id}`
                      : undefined) ??
                    `/operate/deployments?project=${sourceId}&tab=${tab.id}`,
                )
              }
              className={`h-7 rounded px-2.5 text-xs font-medium ${
                active === tab.id
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {detail.loading && detail.source === null && !detail.error ? (
            <LoadingPanel label="Loading project…" />
          ) : detail.error ? (
            <ErrorPanel message={detail.error} />
          ) : active === "deployments" ? (
            <DeploymentsTab detail={detail} />
          ) : active === "environment" ? (
            <EnvironmentTab detail={detail} />
          ) : (
            <SettingsTab detail={detail} />
          )}
        </div>
      </div>
    </main>
  );
}
