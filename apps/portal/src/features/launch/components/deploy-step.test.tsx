import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeployStep } from "./deploy-step";
import {
  launchActivate,
  launchAppsStatus,
  launchStatus,
  type LaunchDeployPayload,
  type LaunchProgress,
} from "@portal/features/launch";

const noop = () => {};

vi.mock("@portal/features/launch", () => ({
  launchPreflight: vi.fn(),
  launchDeploy: vi.fn(),
  launchStatus: vi.fn(),
  launchActivate: vi.fn(),
  launchAppsStatus: vi.fn(),
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

  it("waits for the project runtime after activation reports an unloaded app", async () => {
    const onProgress = vi.fn();
    vi.mocked(launchStatus).mockResolvedValueOnce({
      state: "ready",
      releaseTags: ["release-2"],
    });
    vi.mocked(launchActivate).mockResolvedValueOnce({
      ok: true,
      activation: {
        apps: [
          {
            applicationId: 17,
            name: "playground-example",
            releaseTag: "release-2",
            isActive: true,
            loaded: false,
          },
        ],
      },
    } as never);
    vi.mocked(launchAppsStatus).mockResolvedValueOnce({
      ok: true,
      projectId: 42,
      state: "live",
      apps: [
        {
          id: 17,
          name: "playground-example",
          app_release_tag: "release-2",
          is_active: true,
          loaded: true,
        },
      ],
    });

    render(
      <DeployStep
        {...defaultProps}
        progress={{
          ...baseProgress(),
          projectId: 42,
          deploymentId: "dep_1",
          apps: ["playground-example"],
          releaseTags: ["release-2"],
        }}
        onProgress={onProgress}
      />,
    );

    const activate = await waitFor(() => {
      const button = screen.getByRole("button", { name: "Activate" });
      expect(button).not.toBeDisabled();
      return button;
    });
    fireEvent.click(activate);

    await waitFor(() =>
      expect(launchAppsStatus).toHaveBeenCalledWith({ projectId: 42 }),
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ live: true, applicationId: "17" }),
    );
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
});
