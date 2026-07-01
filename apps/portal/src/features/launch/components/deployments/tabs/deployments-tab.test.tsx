import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeploymentsTab } from "./deployments-tab";

const rollback = vi.fn(async () => ({
  ok: true,
  rollback: { deploymentId: "dep_1", releaseTags: ["t1"], status: "rolled_back" },
}));

const detail = {
  source: { id: 1, repositoryLink: "a/b", apps: [], latestDeployment: null },
  loadHistory: vi.fn(),
  history: [
    {
      deploymentId: "dep_1",
      apps: [],
      releaseTags: ["t1"],
      state: "recorded",
      commitHash: "abc123",
      ciStatus: null,
    },
  ],
  rollback,
  reload: vi.fn(),
  sdk: { sdkStatus: { requiredVersion: "3.0.1" } },
} as unknown as ReturnType<
  typeof import("@portal/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("DeploymentsTab", () => {
  it("confirms before rolling back", async () => {
    render(<DeploymentsTab detail={detail} />);
    fireEvent.click(await screen.findByRole("button", { name: /rollback/i }));
    expect(rollback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /roll back/i }));
    await waitFor(() => expect(rollback).toHaveBeenCalledWith("dep_1"));
  });
});
