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
import { SettingsTab } from "./tabs/settings-tab";
import { LoadingPanel, ErrorPanel } from "./ui/state-panels";

const TABS = [
  { id: "home", label: "Home" },
  { id: "deployments", label: "Deployments" },
  { id: "chat", label: "Chat" },
  { id: "environment", label: "Environment" },
  { id: "settings", label: "Details" },
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
    : "home";
  const openEnvironment = () =>
    router.push(
      tabHref?.("environment") ??
        (tabBaseHref
          ? `${tabBaseHref}?tab=environment`
          : `/operate/deployments?project=${sourceId}&tab=environment`),
    );

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
            <HomeTab detail={detail} tabBaseHref={tabBaseHref} />
          ) : active === "deployments" ? (
            <DeploymentsTab
              detail={detail}
              onOpenEnvironment={openEnvironment}
            />
          ) : active === "chat" ? (
            <ChatTab detail={detail} />
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
