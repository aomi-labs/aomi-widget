import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BootstrapWizard } from "./bootstrap-wizard";
import type { PathProgress } from "@portal/lib/onboarding";

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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@portal/lib/chat-url", () => ({
  chatAppUrl: (name: string) => `https://chat.aomi.dev?app=${name}`,
}));

vi.mock("@portal/lib/onboarding", () => ({
  bootstrapStep: (p: PathProgress) => {
    if (p.live) return "live";
    if (p.deploymentId || p.deployment) return "deploy";
    if (p.installationId) return "install";
    if (p.repo) return "install";
    return "template";
  },
  installationStatusLabel: () => null,
  normalizeRepo: (v: string) => (v ? "user/repo" : null),
  TEMPLATE_GENERATE_URL: "https://github.com/aomi-labs/playground-example/generate",
  TEMPLATE_REPO_URL: "https://github.com/aomi-labs/playground-example",
}));

function baseProgress(): PathProgress {
  return {
    path: null,
    oneshot: {},
    bootstrap: {},
    pendingInstall: null,
  };
}

describe("BootstrapWizard", () => {
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

  it("shows template step by default", () => {
    render(<BootstrapWizard {...defaultProps} />);
    expect(screen.getByText(/Create your repo from the template/)).toBeInTheDocument();
  });

  it("shows the use template link", () => {
    render(<BootstrapWizard {...defaultProps} />);
    expect(screen.getByText("Use this template")).toBeInTheDocument();
  });

  it("shows the repo input", () => {
    render(<BootstrapWizard {...defaultProps} />);
    const input = screen.getByPlaceholderText("your-account/my-agent");
    expect(input).toBeInTheDocument();
  });

  it("shows live panel when live", () => {
    render(
      <BootstrapWizard
        {...defaultProps}
        progress={{ ...baseProgress(), live: true, apps: ["my-agent"] }}
      />,
    );
    expect(screen.getByText(/Your agent is live/)).toBeInTheDocument();
  });

  it("shows error when installError is set", () => {
    render(
      <BootstrapWizard
        {...defaultProps}
        installError="Auth failed"
      />,
    );
    expect(screen.getByText("Auth failed")).toBeInTheDocument();
  });

  it("renders stepper with correct steps", () => {
    render(<BootstrapWizard {...defaultProps} />);
    expect(screen.getByText("Template")).toBeInTheDocument();
    expect(screen.getByText("Install")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows the wizard title", () => {
    render(<BootstrapWizard {...defaultProps} />);
    expect(screen.getByText("Fork & customize")).toBeInTheDocument();
  });

  it("shows confirm button", () => {
    render(<BootstrapWizard {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });
});
