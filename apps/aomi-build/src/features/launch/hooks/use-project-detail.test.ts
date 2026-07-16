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
  deploymentRequiredSecrets: vi.fn(async () => ({
    byApp: {},
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
  deploymentRequiredSecrets,
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

  it("exposes the missing required secrets per app", async () => {
    vi.mocked(deploymentRequiredSecrets).mockResolvedValue({
      byApp: { binance: { slots: [], missing: ["BINANCE_SECRET_KEY"] } },
    });
    const { result } = renderHook(() => useProjectDetail(42));
    act(() => result.current.loadRequiredSecrets());
    await waitFor(() => expect(result.current.requiredSecrets).not.toBeNull());
    expect(result.current.hasMissingSecrets("binance")).toBe(true);
    expect(result.current.hasMissingSecrets("hello")).toBe(false);
  });

  it("surfaces a required-secrets load failure instead of a false empty state", async () => {
    vi.mocked(deploymentRequiredSecrets).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useProjectDetail(42));
    act(() => result.current.loadRequiredSecrets());
    await waitFor(() =>
      expect(result.current.requiredSecretsError).toBe("boom"),
    );
    expect(result.current.requiredSecrets).toBeNull();
  });

  it("surfaces direct required-secret check failures for a redeploy target", async () => {
    vi.mocked(deploymentRequiredSecrets).mockRejectedValueOnce(
      new Error("manifest unavailable"),
    );
    const { result } = renderHook(() => useProjectDetail(42));

    await act(async () => {
      await expect(
        result.current.ensureRequiredSecrets(["binance"], 99),
      ).rejects.toThrow("manifest unavailable");
    });
    await waitFor(() =>
      expect(result.current.requiredSecretsError).toBe("manifest unavailable"),
    );
  });
});
