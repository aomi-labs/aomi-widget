import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OneshotWizard } from "./oneshot-wizard";
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
    <button onClick={onClick} disabled={disabled} className={className} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@portal/lib/chat-url", () => ({
  chatAppUrl: (name: string) => `https://chat.aomi.dev?app=${name}`,
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
  TEMPLATE_REPO_URL: "https://github.com/aomi-labs/playground-example",
}));

function baseProgress(): LaunchProgress {
  return {
    path: null,
    oneshot: {},
    bootstrap: {},
    pendingInstall: null,
  };
}

describe("OneshotWizard", () => {
  const defaultProps = {
    progress: baseProgress(),
    actor: "test-user",
    onBack: noop,
    beginInstall: noop,
    beginAuthorize: noop,
    installing: false,
    installError: null,
    patch: noop,
  };

  it("shows install step by default", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText(/Install the Aomi GitHub App/)).toBeInTheDocument();
  });

  it("shows install buttons", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText("Install on GitHub")).toBeInTheDocument();
    expect(screen.getByText("Already installed?")).toBeInTheDocument();
  });

  it("shows live panel when live", () => {
    render(
      <OneshotWizard
        {...defaultProps}
        progress={{ ...baseProgress(), live: true, apps: ["my-agent"] }}
      />,
    );
    expect(screen.getByText(/Your agent is live/)).toBeInTheDocument();
  });

  it("shows error when installError is set", () => {
    render(
      <OneshotWizard
        {...defaultProps}
        installError="Installation failed"
      />,
    );
    expect(screen.getByText("Installation failed")).toBeInTheDocument();
  });

  it("disables install button while installing", () => {
    render(
      <OneshotWizard
        {...defaultProps}
        installing
      />,
    );
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

  it("shows the back button", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("shows the wizard title", () => {
    render(<OneshotWizard {...defaultProps} />);
    expect(screen.getByText("One-click")).toBeInTheDocument();
  });
});
