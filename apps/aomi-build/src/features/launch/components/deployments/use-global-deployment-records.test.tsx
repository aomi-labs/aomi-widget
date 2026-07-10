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
  deploymentRecords: vi.fn(async ({ app }: { app: string }) => {
    if (app === "cecilia-test-2") {
      throw new Error("unknown app `cecilia-test-2`");
    }
    return {
      app,
      currentReleaseTag:
        "apps-141779906-r229e1090c5-geckoterminal-cb7227310237",
      records: [
        {
          deploymentId: "dep_gecko",
          releaseTag: "apps-141779906-r229e1090c5-geckoterminal-cb7227310237",
          actor: null,
          createdAt: 1,
          current: true,
          sdkVersion: "3.0.1",
        },
      ],
    };
  }),
}));

vi.mock("@build/features/launch/dashboard", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "ceciliaz030",
  })),
}));

import { deploymentRecords } from "@build/features/launch/client";
import { useGlobalDeploymentRecords } from "./use-global-deployment-records";

describe("useGlobalDeploymentRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ignores stale apps that no longer have deployment records", async () => {
    const { result } = renderHook(() => useGlobalDeploymentRecords());

    await waitFor(() =>
      expect(result.current.recordsState.status).toBe("ready"),
    );
    expect(deploymentRecords).toHaveBeenCalledTimes(2);
    expect(
      result.current.recordsState.status === "ready"
        ? result.current.recordsState.deployments
        : [],
    ).toMatchObject([
      {
        deploymentId: "dep_gecko",
        sourceId: 1,
        repositoryLink: "ceciliaz030/my-aomi-bots",
      },
    ]);
  });
});
