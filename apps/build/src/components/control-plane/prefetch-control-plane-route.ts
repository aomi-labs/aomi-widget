"use client";

import type { QueryClient } from "@tanstack/react-query";

import {
  deploymentFeed,
  deploymentSdkStatus,
  deploymentSources,
} from "@build/features/launch/client";
import { buildQueryKeys } from "@build/features/launch/query-keys";
import { fetchIntegrationStatuses } from "@build/features/integrations/client";
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
  const detailMatch = path.match(/^\/operate\/observability\/([1-9]\d*)$/);
  if (detailMatch) {
    const applicationId = Number(detailMatch[1]);
    const project = Number(
      new URLSearchParams(href.split("?")[1]).get("project"),
    );
    if (Number.isSafeInteger(project) && project > 0) {
      void queryClient.prefetchQuery({
        queryKey: buildQueryKeys.operateDetail(
          accountKey,
          project,
          applicationId,
        ),
        queryFn: () => operateAppDetailFetch(project, applicationId),
        staleTime: 30 * 1000,
      });
      return true;
    }
  }

  if (path === "/projects") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.projects(accountKey),
      queryFn: deploymentSources,
      staleTime: 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.sdkStatus(),
      queryFn: () => deploymentSdkStatus().catch(() => null),
      staleTime: 5 * 60 * 1000,
    });
    return true;
  }

  if (path === "/overview" || path === "/operate/deployments") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.projects(accountKey),
      queryFn: deploymentSources,
      staleTime: 60 * 1000,
    });
    void queryClient.prefetchInfiniteQuery({
      queryKey: buildQueryKeys.deployments(accountKey),
      queryFn: ({ pageParam }) =>
        deploymentFeed({ limit: 50, cursor: pageParam }),
      initialPageParam: null,
      staleTime: 15 * 1000,
    });
    if (path === "/operate/deployments") return true;
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.operate(accountKey, "usage"),
      queryFn: () => operateFetch("usage"),
      staleTime: 30 * 1000,
    });
    return true;
  }

  if (path === "/integrations") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.integrations(accountKey),
      queryFn: fetchIntegrationStatuses,
      staleTime: 60 * 1000,
    });
    return true;
  }

  if (path === "/providers") {
    void queryClient.prefetchQuery({
      queryKey: buildQueryKeys.modelKeys(accountKey),
      queryFn: () => modelKeysFetch<unknown>(),
      staleTime: 60 * 1000,
    });
    return true;
  }

  const kind = OPERATE_ROUTES[path];
  if (!kind) return false;
  void queryClient.prefetchQuery({
    queryKey:
      kind === "bots"
        ? buildQueryKeys.bots(accountKey)
        : buildQueryKeys.operate(accountKey, kind),
    queryFn: () => operateFetch(kind),
    staleTime: 30 * 1000,
  });
  return true;
}
