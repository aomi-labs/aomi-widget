import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@portal/features/launch/client", () => ({
  deploymentSources: vi.fn(async () => ({
    sources: [
      {
        id: 7,
        installationId: 5,
        repositoryLink: "a/b",
        apps: [],
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
}));

import { useProjectDetail } from "./use-project-detail";
import {
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
});
