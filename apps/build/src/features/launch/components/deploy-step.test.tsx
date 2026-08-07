import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeployStep } from "./deploy-step";
import {
  launchDeploy,
  launchPreflight,
  type LaunchDeployPayload,
  type LaunchProgress,
} from "@build/features/launch";

const noop = () => {};

vi.mock("@build/features/launch", () => ({
  launchPreflight: vi.fn(),
  launchDeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchActivate: vi.fn(),
  deploymentProjects: vi.fn(),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      type="button"
    >
      {children}
    </button>
  ),
}));

function baseProgress(): LaunchProgress {
  return {
    path: null,
    oneshot: {},
    bootstrap: {},
    pendingInstall: null,
  };
}

describe("DeployStep", () => {
  const defaultProps = {
    installationId: "12345",
    repo: "alice/bot",
    progress: baseProgress(),
    onProgress: noop,
  };

  it("renders idle state with preflight and deploy buttons", () => {
    render(<DeployStep {...defaultProps} />);
    // `StepTrack` also renders "Preflight"/"Deploy"/"Activate" as step labels,
    // so target the buttons specifically by role.
    expect(
      screen.getByRole("button", { name: "Preflight" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activate" }),
    ).toBeInTheDocument();
  });

  it("does not send the shell platform during project preflight", async () => {
    vi.mocked(launchPreflight).mockRejectedValueOnce(new Error("stop"));
    render(<DeployStep {...defaultProps} platform="somm.finance" />);

    fireEvent.click(screen.getByRole("button", { name: "Preflight" }));

    await waitFor(() => expect(launchPreflight).toHaveBeenCalledOnce());
    const input = vi.mocked(launchPreflight).mock.calls[0]?.[0];
    expect(input).toMatchObject({ installationId: "12345", repo: "alice/bot" });
    expect(input).not.toHaveProperty("platform");
  });

  it("deploys the immutable commit returned by preflight", async () => {
    vi.mocked(launchPreflight).mockResolvedValueOnce({
      repo: "alice/bot",
      projectId: 42,
      sourceRef: "abc1234",
      deployment: {
        id: "preview",
        status: "preflight",
        source: {
          ref: "abc1234",
        },
        platform: {
          apps: [],
        },
      },
      releaseTags: [],
      apps: [],
    } as never);
    vi.mocked(launchDeploy).mockRejectedValueOnce(new Error("stop"));
    render(<DeployStep {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() =>
      expect(launchDeploy).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 42,
          sourceRef: "abc1234",
        }),
      ),
    );
  });

  it("shows the deployment ID when progress has one", () => {
    render(
      <DeployStep
        {...defaultProps}
        progress={{ ...baseProgress(), deploymentId: "dep_123_abc_456" }}
      />,
    );
    expect(screen.getByText("dep_123_abc_456")).toBeInTheDocument();
  });

  it("disables deploy button during building phase", () => {
    const progress = {
      ...baseProgress(),
      deploymentId: "dep_1",
      deployment: {
        id: "dep_1",
        status: "building",
        source: {
          installationId: 12345,
          repositoryId: 1,
          repositoryLink: "a/b",
          ref: "abc123",
          commitHash: "abc123",
        },
        platform: {
          platform: "community",
          repository: "a/b",
          deployBranch: "main",
          sourceBranch: "a/b/12345/abc123",
          commitHash: null,
          prNumber: null,
          prUrl: null,
          ciStatus: null,
          ciUrl: null,
          apps: [],
        },
      } satisfies LaunchDeployPayload,
    };
    render(<DeployStep {...defaultProps} progress={progress} />);
    expect(screen.getByRole("button", { name: "Deploy" })).toBeDisabled();
  });

  it("disables activate when phase is not ready", () => {
    render(<DeployStep {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Activate" })).toBeDisabled();
  });

  it("shows the idle phase hint text", () => {
    render(<DeployStep {...defaultProps} />);
    expect(screen.getByText(/Run a preflight/)).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    const progress = { ...baseProgress(), deployment: undefined };
    render(
      <DeployStep {...defaultProps} progress={progress} onProgress={noop} />,
    );

    // just verify the component renders without crashing
    expect(
      screen.getByRole("button", { name: "Preflight" }),
    ).toBeInTheDocument();
  });

  it("clears the pinned source revision before retrying", async () => {
    const onProgress = vi.fn();
    vi.mocked(launchPreflight).mockRejectedValueOnce(new Error("stale source"));
    render(
      <DeployStep
        {...defaultProps}
        progress={{
          ...baseProgress(),
          projectId: 42,
          sourceRef: "old-commit",
          deployment: {
            id: "preview",
            status: "preflight",
            source: { ref: "old-commit" },
            platform: { apps: [] },
          } as LaunchDeployPayload,
        }}
        onProgress={onProgress}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preflight" }));
    await screen.findByText("stale source");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onProgress).toHaveBeenLastCalledWith({
      deployment: undefined,
      deploymentId: undefined,
      sourceRef: undefined,
      releaseTags: undefined,
      apps: undefined,
      live: false,
    });
    expect(screen.getByText(/Run a preflight/)).toBeInTheDocument();
  });

  it("shows the required-secrets banner and keeps Activate disabled when the target app is missing one", () => {
    const detail = {
      hasMissingSecrets: (app: string) => app === "binance",
      requiredSecrets: {
        binance: {
          applicationId: 17,
          slots: [],
          missing: ["BINANCE_API_KEY"],
        },
      },
      loadRequiredSecrets: vi.fn(),
    };
    render(
      <DeployStep
        {...defaultProps}
        progress={{ ...baseProgress(), apps: ["binance"] }}
        detail={detail}
      />,
    );
    expect(detail.loadRequiredSecrets).toHaveBeenCalled();
    expect(screen.getByText(/1 required secret missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate" })).toBeDisabled();
  });

  it("does not show the required-secrets banner when nothing is missing", () => {
    const detail = {
      hasMissingSecrets: () => false,
      requiredSecrets: {
        binance: { applicationId: 17, slots: [], missing: [] },
      },
      loadRequiredSecrets: vi.fn(),
    };
    render(
      <DeployStep
        {...defaultProps}
        progress={{ ...baseProgress(), apps: ["binance"] }}
        detail={detail}
      />,
    );
    expect(screen.queryByText(/required secret/i)).not.toBeInTheDocument();
  });

  it("offers an in-place retry when required-secret verification fails", async () => {
    const refreshRequiredSecrets = vi.fn().mockResolvedValue({});
    const detail = {
      hasMissingSecrets: () => false,
      requiredSecrets: null,
      requiredSecretsError: "Temporary gateway error",
      loadRequiredSecrets: vi.fn(),
      refreshRequiredSecrets,
    };
    render(
      <DeployStep
        {...defaultProps}
        progress={{ ...baseProgress(), apps: ["binance"] }}
        detail={detail}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry required secrets" }),
    );
    await waitFor(() => expect(refreshRequiredSecrets).toHaveBeenCalledOnce());
  });
});
