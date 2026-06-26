import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";

import { DeployDashboard } from "./deploy-dashboard";

vi.mock("@aomi-labs/widget-lib", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@portal/features/launch", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "alice",
  })),
  fetchUserSources: vi.fn(async () => ({
    githubLogin: "alice",
    sources: [
      {
        id: 99,
        installationId: 555,
        repositoryLink: "alice/bot",
        apps: [],
        latestDeployment: null,
      },
    ],
  })),
  hasSourceForLaunchUrlContext: vi.fn(() => true),
  deploymentIdFromReleaseTag: vi.fn(() => null),
  lifecycleFromLaunchStatus: vi.fn(),
  launchActivate: vi.fn(),
  launchRedeploy: vi.fn(),
  launchStatus: vi.fn(),
  signOutGitHub: vi.fn(),
  readLaunchUrlContext: vi.fn(() => null),
  loadLaunch: vi.fn(() => null),
  isResumingInstall: vi.fn(() => false),
  sourceLifecycle: vi.fn(() => ({
    kind: "live",
    repo: "alice/bot",
    statusLabel: "Live",
    statusTone: "good",
    message: "The latest deployment is active.",
    appNames: ["bot"],
    releaseTags: ["apps-555-rabc-bot-deadbee"],
    chatApp: "bot",
    chatApplicationId: 77,
  })),
  GITHUB_SIGNIN_URL: "/api/auth/github/login",
}));

describe("DeployDashboard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders live chat hrefs from NEXT_PUBLIC_CHAT_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAT_URL", "https://chat-staging.aomi.dev");

    render(<DeployDashboard />);

    await waitFor(() =>
      expect(screen.getByTitle("Chat with bot")).toBeInTheDocument(),
    );
    expect(screen.getByTitle("Chat with bot")).toHaveAttribute(
      "src",
      "https://chat-staging.aomi.dev?app=bot&application_id=77&lock_app=1",
    );
  });
});
