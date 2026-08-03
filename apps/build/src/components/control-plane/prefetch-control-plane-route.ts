"use client";

import type { QueryClient } from "@tanstack/react-query";

import {
  deploymentFeed,
  deploymentSdkStatus,
  deploymentSources,
} from "@build/features/launch/client";
import {
  buildQueryKeys,
  buildQueryStaleTime,
} from "@build/features/launch/query-keys";
import {
  modelKeysFetch,
  operateAppDetailFetch,
  operateFetch,
  type OperateKind,
} from "@build/features/operate/client";

const OPERATE_ROUTES: Record<string, OperateKind> = {
  "/operate/bots": "bots",
  "/operate/logs": "logs",
  "/operate/observability": "observability",
  "/operate/transactions": "transactions",
  "/operate/usage": "usage",
};

/**
 * Warm everything a project detail page reads: the server-filtered
 * single-source read it renders from, the SDK status behind the "outdated"
 * badge, and the Home tab's usage peek. Called on sidebar/row hover and again
 * on page mount, so the three reads run in parallel instead of waterfalling
 * behind the source read.
 */
export function prefetchProjectDetail(
  queryClient: QueryClient,
  accountKey: string,
  sourceId: number,
  platform?: string | null,
) {
  void queryClient.prefetchQuery({
    queryKey: buildQueryKeys.projectSource(accountKey, sourceId, platform),
    queryFn: () => deploymentSources(platform ?? undefined, sourceId),
    staleTime: buildQueryStaleTime.projects,
    retry: false,
  });
  void queryClient.prefetchQuery({
    queryKey: buildQueryKeys.sdkStatus(),
    queryFn: () => deploymentSdkStatus().catch(() => null),
    staleTime: buildQueryStaleTime.sdkStatus,
    retry: false,
  });
  void queryClient.prefetchQuery({
    queryKey: buildQueryKeys.operate(accountKey, "usage", sourceId, platform),
    queryFn: () => operateFetch("usage", { sourceId, platform }),
    staleTime: buildQueryStaleTime.operate,
    retry: false,
  });
}

/**
 * Warm only the route a user shows intent to open. This keeps the persistent
 * sidebar from eagerly downloading every control-plane route and API payload
 * while still hiding latency between hover/focus and click.
 */
export function prefetchControlPlaneRoute(
  queryClient: QueryClient,
  href: string,
  accountKey: string | null,
): boolean {
  if (!accountKey) return false;
  const path = href.split("?")[0];
  const searchParams = new URLSearchParams(href.split("?")[1]);
  const detailMatch = path.match(/^\/operate\/observability\/([1-9]\d*)$/);
  if (detailMatch) {
    const applicationId = Number(detailMatch[1]);
    const project = Number(searchParams.get("project"));
    const platform = searchParams.get("platform");
    if (Number.isSafeInteger(project) && project > 0) {
      void queryClient.prefetchQuery({
        queryKey: buildQueryKeys.operateDetail(
          accountKey,
          project,
          applicationId,
          platform,
        ),
        queryFn: () => operateAppDetailFetch(project, applicationId, platform),
        staleTime: buildQueryStaleTime.operate,
        retry: false,
      });
      return true;
    }
  }

  const projectMatch = path.match(/^\/projects\/([1-9]\d*)$/);
  if (projectMatch) {
    prefetchProjectDetail(
      queryClient,
      accountKey,
      Number(projectMatch[1]),
      searchParams.get("platform"),
    );
    return true;
  }

  if (path === "/projects") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.projects(accountKey),
      queryFn: () => deploymentSources(),
      staleTime: buildQueryStaleTime.projects,
      retry: false,
    });
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.sdkStatus(),
      queryFn: () => deploymentSdkStatus().catch(() => null),
      staleTime: buildQueryStaleTime.sdkStatus,
      retry: false,
    });
    return true;
  }

  if (path === "/overview" || path === "/operate/deployments") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.projects(accountKey),
      queryFn: () => deploymentSources(),
      staleTime: buildQueryStaleTime.projects,
      retry: false,
    });
    void queryClient.prefetchInfiniteQuery({
      queryKey: buildQueryKeys.deployments(accountKey),
      queryFn: ({ pageParam }) =>
        deploymentFeed({ limit: 50, cursor: pageParam }),
      initialPageParam: null,
      staleTime: buildQueryStaleTime.deployments,
      retry: false,
    });
    if (path === "/operate/deployments") return true;
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.operate(accountKey, "usage"),
      queryFn: () => operateFetch("usage"),
      staleTime: buildQueryStaleTime.operate,
      retry: false,
    });
    return true;
  }

  if (path === "/integrations") {
    // The bot list is builder-wide, but the apps it can be pointed at come
    // from platform-bound sources — so the read is platform-scoped and the
    // key has to say which one, or a partner-platform visit warms Community.
    const platform = searchParams.get("platform");
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.bots(accountKey, platform),
      queryFn: () => operateFetch("bots", { platform }),
      staleTime: buildQueryStaleTime.operate,
      retry: false,
    });
    return true;
  }

  if (path === "/providers") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.modelKeys(accountKey),
      queryFn: () => modelKeysFetch<unknown>(),
      staleTime: buildQueryStaleTime.modelKeys,
      retry: false,
    });
    return true;
  }

  const kind = OPERATE_ROUTES[path];
  if (!kind) return false;
  const sourceId = Number(searchParams.get("project"));
  const scopedSourceId =
    Number.isSafeInteger(sourceId) && sourceId > 0 ? sourceId : null;
  const platform = searchParams.get("platform");
  void queryClient.prefetchQuery({
    queryKey:
      kind === "bots"
        ? buildQueryKeys.bots(accountKey, platform)
        : buildQueryKeys.operate(accountKey, kind, scopedSourceId, platform),
    queryFn: () =>
      operateFetch(kind, {
        sourceId: scopedSourceId,
        platform,
      }),
    staleTime: buildQueryStaleTime.operate,
    retry: false,
  });
  return true;
}
