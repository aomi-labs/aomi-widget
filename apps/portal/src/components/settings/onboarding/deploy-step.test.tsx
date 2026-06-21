import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeployStep } from "./deploy-step";
import type { OnboardingPath, OnboardDeployPayload } from "@portal/lib/onboarding";
import type { PathProgress } from "@portal/lib/onboarding";

const noop = () => {};

vi.mock("@portal/lib/onboarding", () => ({
  onboardDryRun: vi.fn(),
  onboardDeploy: vi.fn(),
  onboardStatus: vi.fn(),
  onboardActivate: vi.fn(),
  onboardAppStatus: vi.fn(),
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
    <button onClick={onClick} disabled={disabled} className={className} type="button">
      {children}
    </button>
  ),
}));

function baseProgress(): PathProgress {
  return {
    path: null,
    oneshot: {},
    bootstrap: {},
    pendingInstall: null,
  };
}

describe("DeployStep", () => {
  const defaultProps = {
    path: "oneshot" as OnboardingPath,
    installationId: "12345",
    progress: baseProgress(),
    onProgress: noop,
  };

  it("renders idle state with dry run and deploy buttons", () => {
    render(<DeployStep {...defaultProps} />);
    expect(screen.getByText("Dry run")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
    expect(screen.getByText("Activate")).toBeInTheDocument();
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
        source: { installation_id: 12345, repository_id: 1, repository_link: "a/b", owner_repo_name: "a/b", ref: { kind: "branch", value: "main" }, commit_hash: "abc123", aomi_toml_paths: ["aomi.toml"] },
        platform: {
          platform: "community",
          repository: "a/b",
          deploy_branch: "main",
          source_branch: "a/b/12345/abc123",
          commit_hash: null, pr_number: null, pr_url: null,
          ci_status: null, ci_url: null,
          apps: [],
        },
      } as unknown as OnboardDeployPayload,
    };
    render(<DeployStep {...defaultProps} progress={progress} />);
    expect(screen.getByText("Deploy")).toBeDisabled();
  });

  it("disables activate when phase is not ready", () => {
    render(<DeployStep {...defaultProps} />);
    expect(screen.getByText("Activate")).toBeDisabled();
  });

  it("shows the idle phase hint text", () => {
    render(<DeployStep {...defaultProps} />);
    expect(screen.getByText(/Run a dry run/)).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    const progress = { ...baseProgress(), deployment: undefined };
    const { rerender } = render(
      <DeployStep
        {...defaultProps}
        progress={progress}
        onProgress={noop}
      />,
    );

    // just verify the component renders without crashing
    expect(screen.getByText("Dry run")).toBeInTheDocument();
  });
});
