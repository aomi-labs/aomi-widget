import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@portal/features/launch/client", () => ({
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
vi.mock("@portal/features/launch/dashboard", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "alice",
    githubUserId: "u1",
  })),
}));

import { useProjects } from "./use-projects";
import { deploymentHistory } from "@portal/features/launch/client";

describe("useProjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads sources and never fetches history", async () => {
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(deploymentHistory).not.toHaveBeenCalled();
    if (result.current.state.status === "ready") {
      expect(result.current.state.sources).toHaveLength(1);
    }
  });
});
