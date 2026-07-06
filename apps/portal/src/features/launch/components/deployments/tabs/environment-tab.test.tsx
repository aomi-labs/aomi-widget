import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnvironmentTab } from "./environment-tab";

const setEnvVars = vi.fn(async () => ({ ok: true, keys: ["API_KEY"] }));

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
  secretsByApp: {},
} as unknown as ReturnType<
  typeof import("@portal/features/launch/hooks/use-project-detail").useProjectDetail
>;

describe("EnvironmentTab", () => {
  it("loads secrets on mount and renders the set-vars form", () => {
    render(<EnvironmentTab detail={detail} />);
    expect(detail.loadSecrets).toHaveBeenCalled();
    expect(screen.getByPlaceholderText("KEY")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save variables/i }),
    ).toBeInTheDocument();
  });

  it("writes a var and lists it under Saved this session", async () => {
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
    await waitFor(() =>
      expect(screen.getByText("API_KEY")).toBeInTheDocument(),
    );
  });
});
