import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@build/features/launch/client", () => ({
  deploymentSources: vi.fn(async () => ({
    sources: [
      {
        id: 1,
        repositoryLink: "ceciliaz030/my-aomi-bots",
        apps: [{ name: "cecilia-test-2" }, { name: "geckoterminal" }],
      },
    ],
  })),
  deploymentSdkStatus: vi.fn(async () => null),
  deploymentHistory: vi.fn(async () => ({
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
        apps: [
          {
            name: "geckoterminal",
            releaseTag: "apps-141779906-r229e1090c5-geckoterminal-cb7227310237",
            isActive: true,
          },
        ],
      },
    ],
  })),
}));

vi.mock("@build/features/launch/dashboard", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "ceciliaz030",
  })),
}));

import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import { deploymentHistory } from "@build/features/launch/client";
import { useGlobalDeploymentRecords } from "./use-global-deployment-records";

describe("useGlobalDeploymentRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads one history call per source, not one per app", async () => {
    const { result } = renderHook(() => useGlobalDeploymentRecords(), {
      wrapper: GitHubSessionProvider,
    });

    await waitFor(() =>
      expect(result.current.recordsState.status).toBe("ready"),
    );
    // One source with two apps must cost exactly one request.
    expect(deploymentHistory).toHaveBeenCalledTimes(1);
    expect(deploymentHistory).toHaveBeenCalledWith({
      appSourceId: 1,
      limit: 20,
    });
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
        sourceId: 1,
        repositoryLink: "ceciliaz030/my-aomi-bots",
      },
    ]);
  });
});
