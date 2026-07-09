import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnvironmentTab } from "./environment-tab";

const setEnvVars = vi.fn(async () => ({ ok: true, keys: ["API_KEY"] }));
const deleteEnvVar = vi.fn(async () => ({ ok: true, removed: true }));

const detail = {
  source: {
    id: 1,
    installationId: 5,
    repositoryLink: "a/b",
    apps: [{ name: "demo", isActive: true, loaded: true }],
    latestDeployment: null,
  },
  loadSecrets: vi.fn(),
  setEnvVars,
  deleteEnvVar,
  secretsByApp: { demo: ["$SECRET:APP:demo::EXISTING_KEY"] },
  secretsError: null,
} as unknown as ReturnType<
  typeof import("@build/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("EnvironmentTab", () => {
  it("loads secrets on mount and lists configured keys (names only)", () => {
    render(<EnvironmentTab detail={detail} />);
    expect(detail.loadSecrets).toHaveBeenCalled();
    // The handle prefix is stripped for display.
    expect(screen.getByText("EXISTING_KEY")).toBeInTheDocument();
    expect(screen.getByText("Env")).toBeInTheDocument();
    expect(screen.getAllByText("Secret").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /save values/i }),
    ).toBeInTheDocument();
  });

  it("writes plain env and masked secret values", async () => {
    render(<EnvironmentTab detail={detail} />);
    const envValue = screen.getByLabelText("Environment variables value");
    const secretValue = screen.getByLabelText("Secrets value");
    expect(envValue).toHaveAttribute("type", "text");
    expect(secretValue).toHaveAttribute("type", "password");

    fireEvent.change(screen.getByLabelText("Environment variables key"), {
      target: { value: "API_KEY" },
    });
    fireEvent.change(envValue, {
      target: { value: "public" },
    });
    fireEvent.change(screen.getByLabelText("Secrets key"), {
      target: { value: "TOKEN" },
    });
    fireEvent.change(secretValue, {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save values/i }));
    await waitFor(() =>
      expect(setEnvVars).toHaveBeenCalledWith("demo", {
        API_KEY: "public",
        TOKEN: "secret",
      }),
    );
  });

  it("removes a configured var", async () => {
    render(<EnvironmentTab detail={detail} />);
    fireEvent.click(screen.getByTitle("Remove EXISTING_KEY"));
    await waitFor(() =>
      expect(deleteEnvVar).toHaveBeenCalledWith("demo", "EXISTING_KEY"),
    );
  });

  it("shows secret load failures", () => {
    render(
      <EnvironmentTab
        detail={
          {
            ...detail,
            secretsByApp: null,
            secretsError: "vault unavailable",
          } as typeof detail
        }
      />,
    );
    expect(screen.getByText("vault unavailable")).toBeInTheDocument();
  });
});
