"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { UserDeployment, UserDeploymentsCursor } from "@aomi-labs/deploy";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import { deploymentFeed } from "@build/features/launch/client";
import {
  commitFromDeploymentId,
  type TimelineDeployment,
} from "./deployment-timeline";
import { useProjects } from "../../hooks/use-projects";
import {
  buildQueryKeys,
  buildQueryStaleTime,
  githubAccountKey,
} from "../../query-keys";

export type GlobalDeployment = TimelineDeployment & {
  sourceId: number;
  repositoryLink: string | null;
};

type RecordsState =
  | { status: "idle" | "loading" }
  | { status: "ready"; deployments: GlobalDeployment[] }
  | { status: "error"; error: string; deployments: GlobalDeployment[] };

function globalDeployment(deployment: UserDeployment): GlobalDeployment | null {
  if (!deployment.deploymentId) return null;
  return {
    deploymentId: deployment.deploymentId,
    commit:
      deployment.commitHash ?? commitFromDeploymentId(deployment.deploymentId),
    apps: deployment.apps.map((app) => app.name),
    releaseTags: deployment.releaseTags,
    current: deployment.apps.some((app) => app.isActive),
    actor: null,
    sdkVersion: deployment.sdkVersion ?? null,
    createdAt: deployment.createdAt ?? 0,
    sourceId: deployment.sourceId,
    repositoryLink: deployment.repositoryLink,
  };
}

export function useGlobalDeploymentRecords() {
  const { state: projectsState, reload: reloadProjects } = useProjects();
  const { account } = useGitHubSession();
  const accountKey = githubAccountKey(account.githubLogin);
  const feed = useInfiniteQuery({
    queryKey: buildQueryKeys.deployments(accountKey ?? "unavailable"),
    queryFn: ({ pageParam }) =>
      deploymentFeed({ limit: 50, cursor: pageParam }),
    initialPageParam: null as UserDeploymentsCursor | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: account.signedIn && accountKey !== null,
    staleTime: buildQueryStaleTime.deployments,
  });

  const sources = useMemo(
    () => (projectsState.status === "ready" ? projectsState.sources : []),
    [projectsState],
  );

  const deployments = useMemo(
    () =>
      (feed.data?.pages ?? [])
        .flatMap((page) => page.deployments)
        .map(globalDeployment)
        .filter((deployment): deployment is GlobalDeployment =>
          Boolean(deployment),
        ),
    [feed.data],
  );
  const recordsState = useMemo<RecordsState>(() => {
    if (feed.isPending) return { status: "loading" };
    if (feed.error && deployments.length === 0) {
      return {
        status: "error",
        error:
          feed.error instanceof Error
            ? feed.error.message
            : "Failed to load deployment records",
        deployments: [],
      };
    }
    return { status: "ready", deployments };
  }, [deployments, feed.error, feed.isPending]);

  const reload = useCallback(() => {
    reloadProjects();
    void feed.refetch();
  }, [feed, reloadProjects]);

  return {
    projectsState,
    recordsState,
    sources,
    reload,
    loadMore: () => void feed.fetchNextPage(),
    hasMore: feed.hasNextPage,
    loadingMore: feed.isFetchingNextPage,
  };
}
