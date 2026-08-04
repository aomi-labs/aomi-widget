import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@build/features/launch/hooks/use-projects", () => ({
  useProjects: vi.fn(),
}));

import { useProjects } from "@build/features/launch/hooks/use-projects";
import { SettingsSecretsPanel } from "./settings-secrets-panel";

const useProjectsMock = vi.mocked(useProjects);

describe("SettingsSecretsPanel", () => {
  beforeEach(() => {
    useProjectsMock.mockReset();
  });

  it("shows New app when there are no projects", () => {
    useProjectsMock.mockReturnValue({
      state: {
        status: "ready",
        projects: [],
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

  it("stays on Settings for a single project with an Environment CTA", () => {
    useProjectsMock.mockReturnValue({
      state: {
        status: "ready",
        projects: [
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

    expect(screen.getByText(/Per-project secrets/i)).toBeTruthy();
    expect(screen.getByText(/alice\/only-bot/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Open Environment/i }),
    ).toHaveAttribute("href", "/projects/7?tab=environment");
  });

  it("lists projects that deep-link to Environment", () => {
    useProjectsMock.mockReturnValue({
      state: {
        status: "ready",
        projects: [
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
  });
});
