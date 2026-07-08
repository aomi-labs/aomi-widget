import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@build/features/launch/client", () => ({
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
  deploymentPromote: vi.fn(),
  deploymentDeactivate: vi.fn(async () => ({ ok: true, apps: ["my-bot"] })),
  launchPreflight: vi.fn(),
  launchDeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchActivate: vi.fn(),
  deploymentRecords: vi.fn(async () => ({
    app: "my-bot",
    currentReleaseTag: "tag-b",
    records: [
      {
        deploymentId: "dep_b",
        releaseTag: "tag-b",
        sdkVersion: "3.0.1",
        actor: null,
        createdAt: 2,
        current: true,
      },
      {
        deploymentId: "dep_a",
        releaseTag: "tag-a",
        sdkVersion: "3.0.1",
        actor: null,
        createdAt: 1,
        current: false,
      },
    ],
  })),
}));

import { useProjectDetail } from "./use-project-detail";
import {
  deploymentRecords,
  deploymentHistory,
  deploymentSecrets,
} from "@build/features/launch/client";

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

  it("lazily loads records per app once", async () => {
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    expect(deploymentRecords).not.toHaveBeenCalled();
    act(() => result.current.loadRecords());
    act(() => result.current.loadRecords());
    await waitFor(() =>
      expect(result.current.recordsByApp?.["my-bot"]).toHaveLength(2),
    );
    expect(deploymentRecords).toHaveBeenCalledTimes(1);
    expect(deploymentRecords).toHaveBeenCalledWith({
      app: "my-bot",
      appSourceId: 7,
    });
  });

  it("surfaces record load failures instead of silently emptying logs", async () => {
    vi.mocked(deploymentRecords).mockRejectedValueOnce(
      new Error("deployment activations failed (401)"),
    );
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    act(() => result.current.loadRecords());
    await waitFor(() =>
      expect(result.current.recordsError).toContain(
        "deployment activations failed",
      ),
    );
    expect(result.current.recordsByApp).toEqual({});
  });
});
