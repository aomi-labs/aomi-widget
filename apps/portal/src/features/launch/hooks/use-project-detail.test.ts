import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@portal/features/launch/client", () => ({
  deploymentSources: vi.fn(async () => ({
    sources: [
      {
        id: 7,
        installationId: 5,
        repositoryLink: "a/b",
        apps: [{ name: "my-bot" }],
        latestDeployment: null,
      },
    ],
  })),
  deploymentSdkStatus: vi.fn(async () => null),
  deploymentHistory: vi.fn(async () => ({
    deployments: [
      { deploymentId: "dep_1", apps: [], releaseTags: [], state: "recorded" },
    ],
  })),
  deploymentSecrets: vi.fn(async () => ({
    byApp: { demo: ["$SECRET:APP:demo::KEY"] },
  })),
  deploymentRollback: vi.fn(),
  deploymentDeactivate: vi.fn(async () => ({ ok: true, apps: ["my-bot"] })),
  launchPreflight: vi.fn(),
  launchDeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchActivate: vi.fn(),
  deploymentActivations: vi.fn(async () => ({
    app: "my-bot",
    currentReleaseTag: "tag-b",
    activations: [
      {
        deploymentId: "dep_b",
        releaseTag: "tag-b",
        action: "rollback",
        actor: null,
        createdAt: 2,
        current: true,
      },
      {
        deploymentId: "dep_a",
        releaseTag: "tag-a",
        action: "activate",
        actor: null,
        createdAt: 1,
        current: false,
      },
    ],
  })),
}));

import { useProjectDetail } from "./use-project-detail";
import {
  deploymentActivations,
  deploymentHistory,
  deploymentSecrets,
} from "@portal/features/launch/client";

describe("useProjectDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the source and lazily loads history once", async () => {
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    expect(deploymentHistory).not.toHaveBeenCalled();
    act(() => result.current.loadHistory());
    act(() => result.current.loadHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(deploymentHistory).toHaveBeenCalledTimes(1);
    expect(deploymentSecrets).not.toHaveBeenCalled();
  });

  it("lazily loads activations per app once", async () => {
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    expect(deploymentActivations).not.toHaveBeenCalled();
    act(() => result.current.loadActivations());
    act(() => result.current.loadActivations());
    await waitFor(() =>
      expect(result.current.activationsByApp?.["my-bot"]).toHaveLength(2),
    );
    expect(deploymentActivations).toHaveBeenCalledTimes(1);
    expect(deploymentActivations).toHaveBeenCalledWith({
      app: "my-bot",
      appSourceId: 7,
    });
  });
});
