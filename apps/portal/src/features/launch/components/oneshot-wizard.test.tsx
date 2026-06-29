import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OneshotWizard } from "./oneshot-wizard";
import { launchCreateRepo } from "@portal/features/launch";
import type { LaunchProgress } from "@portal/features/launch";

const noop = () => {};

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

vi.mock("@portal/lib/chat-url", () => ({
  chatAppUrl: (name: string, options?: { locked?: boolean }) =>
    `https://chat.aomi.dev?app=${name}${options?.locked ? "&lock_app=1" : ""}`,
}));

vi.mock("@portal/features/launch", () => ({
  oneshotStep: (p: LaunchProgress) => {
    if (p.live) return "live";
    if (p.deploymentId || p.deployment) return "build";
    if (p.repo) return "create";
    if (p.installationId) return "create";
    return "install";
  },
  installationStatusLabel: () => null,
  launchCreateRepo: vi.fn(),
  TEMPLATE_REPO: "aomi-labs/playground-example",
  TEMPLATE_REPO_URL: "https://github.com/aomi-labs/playground-example",
}));

function baseProgress(): LaunchProgress {
  return {};
}

describe("OneshotWizard", () => {
  const defaultProps = {
    progress: baseProgress(),
    actor: "test-user",
    beginInstall: noop,
    installing: false,
    installError: null,
    patch: noop,
  };

  it("shows install step by default", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText(/Install the Aomi GitHub App/)).toBeInTheDocument();
  });

  it("shows the install button", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText("Install on GitHub")).toBeInTheDocument();
  });

  it("shows live panel when live", () => {
    render(
      <OneshotWizard
        {...defaultProps}
        progress={{ ...baseProgress(), live: true, apps: ["my-agent"] }}
      />,
    );
    expect(screen.getByText(/Your agent is live/)).toBeInTheDocument();
    expect(screen.getByTitle("Chat with your agent")).toHaveAttribute(
      "src",
      "https://chat.aomi.dev?app=my-agent&lock_app=1",
    );
  });

  it("shows error when installError is set", () => {
    render(
      <OneshotWizard {...defaultProps} installError="Installation failed" />,
    );
    expect(screen.getByText("Installation failed")).toBeInTheDocument();
  });

  it("disables install button while installing", () => {
    render(<OneshotWizard {...defaultProps} installing />);
    expect(screen.getByText("Waiting for GitHub...")).toBeInTheDocument();
    expect(screen.getByText("Waiting for GitHub...")).toBeDisabled();
  });

  it("renders stepper with correct steps", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText("Install")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows the wizard title", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText("Deploy your agent")).toBeInTheDocument();
  });

  it("offers start over once there is progress", () => {
    const onRestart = vi.fn();

    render(
      <OneshotWizard
        {...defaultProps}
        progress={{ installationId: "1" }}
        onRestart={onRestart}
      />,
    );

    fireEvent.click(screen.getByText("Start over"));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("passes the custom repo name when creating a repo", async () => {
    vi.mocked(launchCreateRepo).mockResolvedValue({
      ok: true,
      repo: "alice/custom-playground",
      installationId: "12345",
      appSourceId: 7,
      sourceRef: "abc123",
    });
    const patch = vi.fn();

    render(
      <OneshotWizard
        {...defaultProps}
        progress={{ installationId: "12345" }}
        patch={patch}
      />,
    );

    fireEvent.change(screen.getByLabelText("Repo name"), {
      target: { value: "custom-playground" },
    });
    fireEvent.click(screen.getByText("Create repo"));

    await waitFor(() => {
      expect(launchCreateRepo).toHaveBeenCalledWith({
        installationId: "12345",
        repoName: "custom-playground",
      });
    });
  });
});
