import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeploymentsTab } from "./deployments-tab";

const rollback = vi.fn(async () => ({
  ok: true,
  rollback: { deploymentId: "dep_0", releaseTags: ["t0"], status: "rolled_back" },
}));

const detail = {
  source: { id: 1, repositoryLink: "a/b", apps: [{ name: "my-bot" }], latestDeployment: null },
  loadHistory: vi.fn(),
  loadActivations: vi.fn(),
  history: [
    {
      deploymentId: "dep_1",
      apps: [{ name: "my-bot", releaseTag: "t1", appReleaseTag: "t1", isActive: true }],
      releaseTags: ["t1"],
      state: "recorded",
      commitHash: "abc123",
      ciStatus: null,
    },
    {
      deploymentId: "dep_0",
      apps: [{ name: "my-bot", releaseTag: "t0", appReleaseTag: null }],
      releaseTags: ["t0"],
      state: "recorded",
      commitHash: "def456",
      ciStatus: null,
    },
  ],
  activationsByApp: {
    "my-bot": [
      {
        deploymentId: "dep_1",
        releaseTag: "t1",
        action: "rollback",
        actor: "cecilia",
        createdAt: 1750000000,
        current: true,
      },
    ],
  },
  rollback,
  reload: vi.fn(),
  sdk: { sdkStatus: { requiredVersion: "3.0.1" } },
} as unknown as ReturnType<
  typeof import("@portal/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("DeploymentsTab", () => {
  it("confirms before rolling back", async () => {
    render(<DeploymentsTab detail={detail} />);
    const rollbackButtons = await screen.findAllByRole("button", {
      name: /rollback/i,
    });
    // dep_0 is not current, so its rollback button is enabled.
    fireEvent.click(rollbackButtons[1]);
    expect(rollback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /roll back/i }));
    await waitFor(() => expect(rollback).toHaveBeenCalledWith("dep_0"));
  });

  it("marks the live deployment as current and blocks rolling back to it", async () => {
    render(<DeploymentsTab detail={detail} />);
    expect(await screen.findByText(/current/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: /rollback/i });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });

  it("renders the activation timeline", async () => {
    render(<DeploymentsTab detail={detail} />);
    expect(detail.loadActivations).toHaveBeenCalled();
    expect(await screen.findByText(/rollback · dep_1/i)).toBeInTheDocument();
    expect(screen.getByText(/cecilia/i)).toBeInTheDocument();
  });
});
