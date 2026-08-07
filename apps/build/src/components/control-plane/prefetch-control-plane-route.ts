"use client";

import type { QueryClient } from "@tanstack/react-query";

import {
  deploymentFeed,
  deploymentSdkStatus,
  deploymentProjects,
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
  projectId: number,
) {
  void queryClient.prefetchQuery({
    queryKey: buildQueryKeys.projectSource(accountKey, projectId),
    queryFn: () => deploymentProjects(undefined, projectId),
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
    queryKey: buildQueryKeys.operate(accountKey, "usage", projectId),
    queryFn: () => operateFetch("usage", { projectId }),
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
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.applicationDetail(accountKey, applicationId),
      queryFn: () => operateAppDetailFetch(applicationId),
      staleTime: buildQueryStaleTime.operate,
      retry: false,
    });
    return true;
  }

  const projectMatch = path.match(/^\/projects\/([1-9]\d*)$/);
  if (projectMatch) {
    prefetchProjectDetail(queryClient, accountKey, Number(projectMatch[1]));
    return true;
  }

  if (path === "/projects") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.projects(accountKey),
      queryFn: () => deploymentProjects(),
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
      queryFn: () => deploymentProjects(),
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
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.bots(accountKey),
      queryFn: () => operateFetch("bots"),
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
  const projectId = Number(searchParams.get("project"));
  const scopedProjectId =
    Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
  void queryClient.prefetchQuery({
    queryKey:
      kind === "bots"
        ? buildQueryKeys.bots(accountKey)
        : buildQueryKeys.operate(accountKey, kind, scopedProjectId),
    queryFn: () =>
      kind === "bots"
        ? operateFetch(kind)
        : operateFetch(kind, { projectId: scopedProjectId }),
    staleTime: buildQueryStaleTime.operate,
    retry: false,
  });
  return true;
}
