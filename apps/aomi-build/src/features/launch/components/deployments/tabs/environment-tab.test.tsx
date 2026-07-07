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
} as unknown as ReturnType<
  typeof import("@build/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("EnvironmentTab", () => {
  it("loads secrets on mount and lists configured keys (names only)", () => {
    render(<EnvironmentTab detail={detail} />);
    expect(detail.loadSecrets).toHaveBeenCalled();
    // The handle prefix is stripped for display.
    expect(screen.getByText("EXISTING_KEY")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save variables/i }),
    ).toBeInTheDocument();
  });

  it("writes a var", async () => {
    render(<EnvironmentTab detail={detail} />);
    fireEvent.change(screen.getByPlaceholderText("KEY"), {
      target: { value: "API_KEY" },
    });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save variables/i }));
    await waitFor(() =>
      expect(setEnvVars).toHaveBeenCalledWith("demo", { API_KEY: "secret" }),
    );
  });

  it("removes a configured var", async () => {
    render(<EnvironmentTab detail={detail} />);
    fireEvent.click(screen.getByTitle("Remove EXISTING_KEY"));
    await waitFor(() =>
      expect(deleteEnvVar).toHaveBeenCalledWith("demo", "EXISTING_KEY"),
    );
  });
});
