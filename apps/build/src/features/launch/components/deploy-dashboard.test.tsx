import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";
import type { SecretSlot } from "@aomi-labs/deploy";
import type { DeploymentLifecycle } from "@aomi-labs/deploy/lifecycle";

import {
  DeployDashboard,
  LifecyclePanel,
  type SecretsGateDetail,
} from "./deploy-dashboard";

vi.mock("@aomi-labs/widget-lib", () => ({
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@build/features/launch", () => ({
  fetchGitHubSession: vi.fn(async () => ({
    signedIn: true,
    githubLogin: "alice",
  })),
  fetchUserProjects: vi.fn(async () => ({
    githubLogin: "alice",
    projects: [
      {
        id: 99,
        installationId: 555,
        repositoryLink: "alice/bot",
        apps: [],
        latestDeployment: null,
      },
    ],
  })),
  hasProjectForLaunchUrlContext: vi.fn(() => true),
  launchActivate: vi.fn(),
  launchRedeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchSdkStatus: vi.fn(async () => null),
  signOutGitHub: vi.fn(),
  readLaunchUrlContext: vi.fn(() => null),
  loadLaunch: vi.fn(() => null),
  isResumingInstall: vi.fn(() => false),
  GITHUB_SIGNIN_URL: "/api/auth/github/login",
}));

vi.mock("@build/features/launch/hooks/use-project-detail", () => ({
  useProjectDetail: () => ({
    hasMissingSecrets: () => false,
    requiredSecrets: null,
    loadRequiredSecrets: vi.fn(),
  }),
}));

vi.mock("@aomi-labs/deploy/lifecycle", () => ({
  deploymentLifecycleFromProject: vi.fn(() => ({
    kind: "live",
    repo: "alice/bot",
    statusLabel: "Live",
    statusTone: "good",
    message: "The latest deployment is active.",
    appNames: ["bot"],
    releaseTags: ["apps-555-rabc-bot-deadbee"],
    chatApp: "bot",
    chatApplicationId: 77,
    deploymentId: null,
  })),
  deploymentLifecycleFromStatus: vi.fn(),
  deploymentIdFromReleaseTag: vi.fn(() => null),
  failedActivationApp: vi.fn(() => null),
  firstActivatedApp: vi.fn(() => null),
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

function makeDetail(overrides: {
  requiredSecrets: Record<
    string,
    { applicationId: number; slots: SecretSlot[]; missing: string[] }
  >;
}): SecretsGateDetail {
  return {
    hasMissingSecrets: (app: string) =>
      (overrides.requiredSecrets[app]?.missing.length ?? 0) > 0,
    requiredSecrets: overrides.requiredSecrets,
    loadRequiredSecrets: vi.fn(),
  };
}

function makeLifecycle(
  overrides: Partial<DeploymentLifecycle> = {},
): DeploymentLifecycle {
  return {
    kind: "build_ready",
    repo: "alice/bot",
    statusLabel: "Build ready",
    statusTone: "good",
    message: "Build is ready for activation.",
    appNames: ["binance"],
    releaseTags: ["apps-42-rabc-binance-deadbee"],
    ...overrides,
  };
}

describe("LifecyclePanel", () => {
  it("disables Activate while a required secret is missing", () => {
    const detail = makeDetail({
      requiredSecrets: {
        binance: {
          applicationId: 17,
          slots: [],
          missing: ["BINANCE_API_KEY"],
        },
      },
    });
    render(
      <LifecyclePanel
        detail={detail}
        projectId={42}
        lifecycle={makeLifecycle()}
        onLifecycleChange={() => {}}
        onLive={() => {}}
      />,
    );
    const button = screen.getByRole("button", { name: /activate/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/1 required secret missing/i),
    ).toBeInTheDocument();
  });

  it("enables Activate once no required secret is missing", () => {
    const detail = makeDetail({
      requiredSecrets: {
        binance: { applicationId: 17, slots: [], missing: [] },
      },
    });
    render(
      <LifecyclePanel
        detail={detail}
        projectId={42}
        lifecycle={makeLifecycle()}
        onLifecycleChange={() => {}}
        onLive={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /activate/i })).toBeEnabled();
  });
});
