"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { setLastProjectId } from "@build/lib/last-project";
import { ProjectHeader } from "./project-header";
import { ChatTab } from "./tabs/chat-tab";
import { DeploymentsTab } from "./tabs/deployments-tab";
import { EnvironmentTab } from "./tabs/environment-tab";
import { HomeTab } from "./tabs/home-tab";
import { ProvidersTab } from "./tabs/providers-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { LoadingPanel, ErrorPanel } from "./ui/state-panels";

const TABS = [
  { id: "home", label: "Home" },
  { id: "deployments", label: "Deployments" },
  { id: "providers", label: "Providers" },
  { id: "environment", label: "Environment" },
  { id: "chat", label: "Chat" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ProjectPage({
  sourceId,
  platform,
  backHref = "/operate/deployments",
  backLabel = "Deployments",
  tabBaseHref,
  tabHref,
}: {
  sourceId: number;
  platform?: string;
  backHref?: string;
  backLabel?: string;
  tabBaseHref?: string;
  tabHref?: (tab: TabId) => string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const detail = useProjectDetail(sourceId, platform);
  const raw = searchParams.get("tab");
  const active: TabId = TABS.some((t) => t.id === raw)
    ? (raw as TabId)
    : "home";
  const projectTabHref = (tab: TabId) => {
    if (tabHref) return tabHref(tab);
    const params = new URLSearchParams();
    if (!tabBaseHref) params.set("project", String(sourceId));
    if (platform) params.set("platform", platform);
    params.set("tab", tab);
    return `${tabBaseHref ?? "/operate/deployments"}?${params}`;
  };
  const openEnvironment = () => router.push(projectTabHref("environment"));

  useEffect(() => {
    setLastProjectId(sourceId);
  }, [sourceId]);

  return (
    <main className="bg-background text-foreground min-h-screen">
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
          className="bg-surface-2 mb-4 flex w-fit items-center gap-1 rounded-md p-1 text-sm"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active === tab.id}
              onClick={() => router.push(projectTabHref(tab.id))}
              className={`h-7 rounded px-2.5 text-xs font-medium ${
                active === tab.id
                  ? "bg-surface-1 text-foreground shadow-sm"
                  : "text-dim"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="border-border bg-surface-1 overflow-hidden rounded-lg border">
          {detail.loading && detail.source === null && !detail.error ? (
            <LoadingPanel label="Loading project…" />
          ) : detail.error ? (
            <ErrorPanel message={detail.error} />
          ) : active === "home" ? (
            // Details is merged into Home: status cards first, repo
            // metadata (the former Details tab) below.
            <>
              <HomeTab
                detail={detail}
                tabHref={projectTabHref}
                platform={platform}
              />
              <SettingsTab detail={detail} />
            </>
          ) : active === "deployments" ? (
            <DeploymentsTab
              detail={detail}
              onOpenEnvironment={openEnvironment}
            />
          ) : active === "providers" ? (
            <ProvidersTab detail={detail} />
          ) : active === "environment" ? (
            <EnvironmentTab detail={detail} />
          ) : (
            <ChatTab detail={detail} />
          )}
        </div>
      </div>
    </main>
  );
}
