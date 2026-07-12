import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@build/features/launch/hooks/use-projects", () => ({
  useProjects: vi.fn(),
}));

import { useProjects } from "@build/features/launch/hooks/use-projects";
import { SettingsSecretsPanel } from "./settings-secrets-panel";

const useProjectsMock = vi.mocked(useProjects);

describe("SettingsSecretsPanel", () => {
  beforeEach(() => {
    replace.mockReset();
    useProjectsMock.mockReset();
  });

  it("shows New app when there are no projects", () => {
    useProjectsMock.mockReturnValue({
      state: {
        status: "ready",
        sources: [],
        sdk: null,
        github: { signedIn: true, githubLogin: "alice", githubUserId: "1" },
      },
      reload: vi.fn(),
    });

    render(<SettingsSecretsPanel />);
    expect(screen.getByText(/No projects yet/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /New app/i })).toHaveAttribute(
      "href",
      "/operate/deployments/new",
    );
  });

  it("auto-routes a single project to its Environment tab", async () => {
    useProjectsMock.mockReturnValue({
      state: {
        status: "ready",
        sources: [
          {
            id: 7,
            installationId: 1,
            repositoryLink: "alice/only-bot",
            apps: [],
            latestDeployment: null,
          },
        ],
        sdk: null,
        github: { signedIn: true, githubLogin: "alice", githubUserId: "1" },
      },
      reload: vi.fn(),
    });

    render(<SettingsSecretsPanel />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/projects/7?tab=environment"),
    );
  });

  it("lists projects that deep-link to Environment", () => {
    useProjectsMock.mockReturnValue({
      state: {
        status: "ready",
        sources: [
          {
            id: 3,
            installationId: 1,
            repositoryLink: "alice/bot",
            apps: [],
            latestDeployment: null,
          },
          {
            id: 4,
            installationId: 1,
            repositoryLink: "alice/other",
            apps: [],
            latestDeployment: null,
          },
        ],
        sdk: null,
        github: { signedIn: true, githubLogin: "alice", githubUserId: "1" },
      },
      reload: vi.fn(),
    });

    render(<SettingsSecretsPanel />);
    expect(screen.getByRole("link", { name: /alice\/bot/i })).toHaveAttribute(
      "href",
      "/projects/3?tab=environment",
    );
    expect(screen.getByRole("link", { name: /alice\/other/i })).toHaveAttribute(
      "href",
      "/projects/4?tab=environment",
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
