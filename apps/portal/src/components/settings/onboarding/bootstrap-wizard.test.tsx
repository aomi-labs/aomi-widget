import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BootstrapWizard } from "./bootstrap-wizard";
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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@portal/lib/chat-url", () => ({
  chatAppUrl: (name: string, options?: { locked?: boolean }) =>
    `https://chat.aomi.dev?app=${name}${options?.locked ? "&lock_app=1" : ""}`,
}));

vi.mock("@portal/features/launch", () => ({
  bootstrapStep: (p: LaunchProgress) => {
    if (p.live) return "live";
    if (p.deploymentId || p.deployment) return "deploy";
    if (p.installationId) return "install";
    if (p.repo) return "install";
    return "template";
  },
  installationStatusLabel: () => null,
  normalizeRepo: (v: string) =>
    v
      ?.trim()
      .replace(/^https:\/\/github.com\//, "")
      .replace(/\.git$/, "") || null,
  TEMPLATE_GENERATE_URL:
    "https://github.com/aomi-labs/playground-example/generate",
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
    expect(
      screen.getByText(/Create your repo from the template/),
    ).toBeInTheDocument();
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
    expect(screen.getByTitle("Chat with your agent")).toHaveAttribute(
      "src",
      "https://chat.aomi.dev?app=my-agent&lock_app=1",
    );
  });

  it("shows error when installError is set", () => {
    render(<BootstrapWizard {...defaultProps} installError="Auth failed" />);
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

  it("offers restart into one-shot when provided", () => {
    const onRestartInOneshot = vi.fn();

    render(
      <BootstrapWizard
        {...defaultProps}
        onRestartInOneshot={onRestartInOneshot}
      />,
    );

    fireEvent.click(screen.getByText("Restart in One-Shot"));
    expect(onRestartInOneshot).toHaveBeenCalledOnce();
  });

  it("uses a known installed source for a selected repo", async () => {
    const patch = vi.fn();

    render(
      <BootstrapWizard
        {...defaultProps}
        progress={{
          ...baseProgress(),
          repo: "phoebe-aomi/playground-example-1",
        }}
        knownSources={[
          {
            id: 814,
            installationId: 141780080,
            repositoryId: null,
            repositoryLink: "phoebe-aomi/playground-example-1",
            githubAccount: null,
            githubUserId: null,
            boundPlatformId: null,
            apps: [
              {
                id: 1,
                name: "playground-example",
                label: null,
                isActive: true,
                isPublic: false,
                appSourceId: 814,
                appReleaseTag: "apps-141780080-r2849901c35",
                targetTags: [],
                loaded: true,
              },
            ],
          },
        ]}
        patch={patch}
      />,
    );

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        expect.objectContaining({
          repo: "phoebe-aomi/playground-example-1",
          installationId: "141780080",
          installationStatus: "bound",
          appSourceId: 814,
          apps: ["playground-example"],
          releaseTags: ["apps-141780080-r2849901c35"],
          live: true,
        }),
      ),
    );
  });
});
