import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnvironmentTab } from "./environment-tab";

const setEnvVars = vi.fn(async () => ({ ok: true, keys: ["API_KEY"] }));
const deleteEnvVar = vi.fn(async () => ({ ok: true, removed: true }));
const writeText = vi.fn(async () => undefined);

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
  beforeEach(() => {
    setEnvVars.mockClear();
    deleteEnvVar.mockClear();
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("loads secrets on mount and lists configured keys (names only)", () => {
    render(<EnvironmentTab detail={detail} />);
    expect(detail.loadSecrets).toHaveBeenCalled();
    expect(screen.getByText("EXISTING_KEY")).toBeInTheDocument();
    expect(screen.getByText("Builder secret")).toBeInTheDocument();
    expect(screen.getByText("Runtime")).toBeInTheDocument();
    expect(screen.getByLabelText("Value hidden")).toHaveTextContent("••••");
    expect(
      screen.getByRole("button", { name: /save values/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Env")).not.toBeInTheDocument();
  });

  it("tells one vault story in the helper copy", () => {
    render(<EnvironmentTab detail={detail} />);
    expect(
      screen.getByText(/one vault for/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/chat users never paste api keys/i),
    ).toBeInTheDocument();
  });

  it("writes masked vault values through the single editor", async () => {
    render(<EnvironmentTab detail={detail} />);
    const value = screen.getByLabelText("Environment value");
    expect(value).toHaveAttribute("type", "password");

    fireEvent.change(screen.getByLabelText("Environment key"), {
      target: { value: "API_KEY" },
    });
    fireEvent.change(value, {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save values/i }));
    await waitFor(() =>
      expect(setEnvVars).toHaveBeenCalledWith("demo", {
        API_KEY: "secret",
      }),
    );
  });

  it("copies, overwrites, and deletes configured keys", async () => {
    render(<EnvironmentTab detail={detail} />);

    fireEvent.click(screen.getByTitle("Copy EXISTING_KEY"));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("EXISTING_KEY"),
    );

    fireEvent.click(screen.getByTitle("Overwrite EXISTING_KEY"));
    expect(screen.getByLabelText("Environment key")).toHaveValue(
      "EXISTING_KEY",
    );
    expect(screen.getByLabelText("Environment value")).toHaveValue("");

    fireEvent.click(screen.getByTitle("Delete EXISTING_KEY"));
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

  it("shows builder empty copy when no vars", () => {
    render(
      <EnvironmentTab
        detail={
          {
            ...detail,
            secretsByApp: { demo: [] },
          } as typeof detail
        }
      />,
    );
    expect(screen.getByText("No variables yet")).toBeInTheDocument();
    expect(
      screen.getByText(/builders set these here/i),
    ).toBeInTheDocument();
  });
});
