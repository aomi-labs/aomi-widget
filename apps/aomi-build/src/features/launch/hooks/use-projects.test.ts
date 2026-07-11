import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@build/features/launch/client", () => ({
  deploymentSources: vi.fn(async () => ({
    sources: [
      {
        id: 1,
        installationId: 5,
        repositoryLink: "a/b",
        apps: [],
        latestDeployment: null,
      },
    ],
  })),
  deploymentSdkStatus: vi.fn(async () => ({
    ok: true,
    serverTags: [],
    sdkStatus: { requiredVersion: "3.0.1", status: "unknown" },
  })),
  deploymentHistory: vi.fn(),
}));
vi.mock("@build/features/launch/dashboard", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "alice",
    githubUserId: "u1",
  })),
}));

import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import { useProjects } from "./use-projects";
import { deploymentHistory } from "@build/features/launch/client";
import { fetchGitHubSession } from "@build/features/launch/dashboard";

describe("useProjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads sources off the shared session and never fetches history", async () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: GitHubSessionProvider,
    });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    // The session must come from the provider — exactly one status fetch,
    // not one per hook consumer.
    expect(fetchGitHubSession).toHaveBeenCalledTimes(1);
    expect(deploymentHistory).not.toHaveBeenCalled();
    if (result.current.state.status === "ready") {
      expect(result.current.state.sources).toHaveLength(1);
    }
  });
});
