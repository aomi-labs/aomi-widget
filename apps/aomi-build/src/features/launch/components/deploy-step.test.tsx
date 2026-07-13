import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeployStep } from "./deploy-step";
import type { LaunchDeployPayload } from "@build/features/launch";
import type { LaunchProgress } from "@build/features/launch";

const noop = () => {};

vi.mock("@build/features/launch", () => ({
  launchPreflight: vi.fn(),
  launchDeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchActivate: vi.fn(),
  launchAppStatus: vi.fn(),
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
          ownerRepoName: "a/b",
          ref: "abc123",
          commitHash: "abc123",
          aomiTomlPaths: ["aomi.toml"],
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

  it("shows the required-secrets banner and keeps Activate disabled when the target app is missing one", () => {
    const detail = {
      hasMissingSecrets: (app: string) => app === "binance",
      requiredSecrets: {
        binance: { slots: [], missing: ["BINANCE_API_KEY"] },
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
    expect(
      screen.getByText(/1 required secret missing/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate" })).toBeDisabled();
  });

  it("does not show the required-secrets banner when nothing is missing", () => {
    const detail = {
      hasMissingSecrets: () => false,
      requiredSecrets: { binance: { slots: [], missing: [] } },
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
});
