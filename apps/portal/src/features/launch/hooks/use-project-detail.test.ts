import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
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
  deploymentPromote: vi.fn(),
  deploymentDeactivate: vi.fn(async () => ({ ok: true, apps: ["my-bot"] })),
  launchPreflight: vi.fn(),
  launchDeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchActivate: vi.fn(),
  launchAppStatus: vi.fn(),
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
  launchPreflight,
  launchDeploy,
  launchStatus,
  launchActivate,
  launchAppStatus,
} from "@portal/features/launch/client";

describe("useProjectDetail", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  function mockReadyDeployment() {
    vi.mocked(launchPreflight).mockResolvedValue({
      appSourceId: 7,
      sourceRef: "sha-1",
      repo: "a/b",
      deployment: {},
      releaseTags: ["tag-c"],
      apps: ["my-bot"],
    });
    vi.mocked(launchDeploy).mockResolvedValue({
      appSourceId: 7,
      sourceRef: "sha-1",
      repo: "a/b",
      deployment: { id: "dep-c" },
      releaseTags: ["tag-c"],
      apps: ["my-bot"],
    });
    vi.mocked(launchStatus).mockResolvedValue({
      state: "ready",
      releaseTags: ["tag-c"],
    });
    vi.mocked(launchActivate).mockResolvedValue({
      ok: true,
      activation: {
        status: "activating",
        platform: "test",
        target: { kind: "release", value: "tag-c", promoted: [] },
        apps: [{ name: "my-bot", releaseTag: "tag-c" }],
      },
    });
  }

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

  it("surfaces history load failures and allows retry", async () => {
    vi.mocked(deploymentHistory)
      .mockRejectedValueOnce(new Error("history failed (401)"))
      .mockResolvedValueOnce({
        deployments: [
          {
            deploymentId: "dep_retry",
            apps: [],
            releaseTags: [],
            state: "recorded",
          },
        ],
      });
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));

    act(() => result.current.loadHistory());
    await waitFor(() =>
      expect(result.current.historyError).toContain("history failed"),
    );
    expect(result.current.history).toBeNull();

    act(() => result.current.loadHistory());
    await waitFor(() => expect(result.current.history).toHaveLength(1));
    expect(result.current.historyError).toBeNull();
  });

  it("surfaces secret load failures and allows retry", async () => {
    vi.mocked(deploymentSecrets)
      .mockRejectedValueOnce(new Error("vault failed (401)"))
      .mockResolvedValueOnce({
        byApp: { demo: ["$SECRET:APP:demo::KEY"] },
      });
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));

    act(() => result.current.loadSecrets());
    await waitFor(() =>
      expect(result.current.secretsError).toContain("vault failed"),
    );
    expect(result.current.secretsByApp).toBeNull();

    act(() => result.current.loadSecrets());
    await waitFor(() =>
      expect(result.current.secretsByApp?.demo).toHaveLength(1),
    );
    expect(result.current.secretsError).toBeNull();
  });

  it("keeps polling when runtime status is temporarily unavailable", async () => {
    mockReadyDeployment();
    vi.mocked(launchAppStatus)
      .mockRejectedValueOnce(new Error("app not found yet"))
      .mockResolvedValueOnce({
        ok: false,
        state: "pending",
        app: { name: "my-bot", is_active: false, loaded: false },
      })
      .mockResolvedValueOnce({
        ok: true,
        state: "live",
        app: { name: "my-bot", is_active: true, loaded: true },
      });
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    vi.useFakeTimers();

    let deployPromise!: Promise<void>;
    await act(async () => {
      deployPromise = result.current.deployNewVersion();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(launchAppStatus).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(launchAppStatus).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
      await deployPromise;
    });

    expect(result.current.deployFlow).toEqual({
      phase: "done",
      message: "New version is live.",
    });
  });

  it("requires two consecutive terminal runtime results before failing", async () => {
    mockReadyDeployment();
    vi.mocked(launchAppStatus).mockResolvedValue({
      ok: false,
      state: "pending",
      app: { name: "my-bot", is_active: false, loaded: false },
    });
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    vi.useFakeTimers();

    let deployPromise!: Promise<void>;
    await act(async () => {
      deployPromise = result.current.deployNewVersion();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(launchAppStatus).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
      await deployPromise;
    });

    expect(launchAppStatus).toHaveBeenCalledTimes(2);
    expect(result.current.deployFlow).toEqual({
      phase: "error",
      message: "Runtime check failed for my-bot.",
    });
  });

  it("fails with a timeout after the bounded runtime polling window", async () => {
    mockReadyDeployment();
    vi.mocked(launchAppStatus).mockResolvedValue({
      ok: false,
      state: "pending",
      app: { name: "my-bot", is_active: true, loaded: false },
    });
    const { result } = renderHook(() => useProjectDetail(7));
    await waitFor(() => expect(result.current.source?.id).toBe(7));
    vi.useFakeTimers();

    let deployPromise!: Promise<void>;
    await act(async () => {
      deployPromise = result.current.deployNewVersion();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(launchAppStatus).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000 * 29);
      await deployPromise;
    });

    expect(launchAppStatus).toHaveBeenCalledTimes(30);
    expect(result.current.deployFlow).toEqual({
      phase: "error",
      message:
        "Activation was accepted, but the app artifact did not become ready.",
    });
  });
});
