import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@build/features/launch/client", () => ({
  deploymentProjects: vi.fn(async () => ({
    projects: [
      {
        id: 1,
        repositoryLink: "ceciliaz030/my-aomi-bots",
        apps: [{ name: "cecilia-test-2" }, { name: "geckoterminal" }],
      },
    ],
  })),
  deploymentSdkStatus: vi.fn(async () => null),
  deploymentFeed: vi.fn(async () => ({
    deployments: [
      {
        deploymentId: "dep_gecko",
        state: "recorded",
        deployBranch: null,
        platformRepo: null,
        commitHash: "cb7227310237",
        ciStatus: null,
        ciUrl: null,
        releaseTags: ["apps-141779906-r229e1090c5-geckoterminal-cb7227310237"],
        sdkVersion: "3.0.1",
        createdAt: 1,
        projectId: 1,
        repositoryLink: "ceciliaz030/my-aomi-bots",
        apps: [
          {
            name: "geckoterminal",
            releaseTag: "apps-141779906-r229e1090c5-geckoterminal-cb7227310237",
            isActive: true,
          },
        ],
      },
    ],
    nextCursor: null,
  })),
}));

vi.mock("@build/features/launch/dashboard", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "ceciliaz030",
  })),
}));

import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import { deploymentFeed } from "@build/features/launch/client";
import { useGlobalDeploymentRecords } from "./use-global-deployment-records";

function wrapper(client = new QueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <GitHubSessionProvider>{children}</GitHubSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("useGlobalDeploymentRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads one global feed regardless of source or app count", async () => {
    const { result } = renderHook(() => useGlobalDeploymentRecords(), {
      wrapper: wrapper(),
    });

    await waitFor(() =>
      expect(result.current.recordsState.status).toBe("ready"),
    );
    expect(deploymentFeed).toHaveBeenCalledTimes(1);
    expect(deploymentFeed).toHaveBeenCalledWith({ limit: 50, cursor: null });
    expect(
      result.current.recordsState.status === "ready"
        ? result.current.recordsState.deployments
        : [],
    ).toMatchObject([
      {
        deploymentId: "dep_gecko",
        commit: "cb7227310237",
        current: true,
        apps: ["geckoterminal"],
        createdAt: 1,
        projectId: 1,
        repositoryLink: "ceciliaz030/my-aomi-bots",
      },
    ]);
  });

  it("reuses cached records after the page hook remounts", async () => {
    const client = new QueryClient();
    const sharedWrapper = wrapper(client);
    const first = renderHook(() => useGlobalDeploymentRecords(), {
      wrapper: sharedWrapper,
    });
    await waitFor(() =>
      expect(first.result.current.recordsState.status).toBe("ready"),
    );
    first.unmount();

    const second = renderHook(() => useGlobalDeploymentRecords(), {
      wrapper: sharedWrapper,
    });
    await waitFor(() =>
      expect(second.result.current.recordsState.status).toBe("ready"),
    );
    expect(deploymentFeed).toHaveBeenCalledTimes(1);
  });
});
