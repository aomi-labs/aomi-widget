import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@build/components/control-plane/toast";
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
  loadRequiredSecrets: vi.fn(),
  setEnvVars,
  deleteEnvVar,
  secretsByApp: { demo: ["$SECRET:APP:demo::EXISTING_KEY"] },
  secretsError: null,
  requiredSecrets: null,
  requiredSecretsError: null,
} as unknown as ReturnType<
  typeof import("@build/features/launch/hooks/use-project-detail").useProjectDetail
>;

function renderTab(
  props: { detail?: typeof detail } = {},
) {
  return render(
    <ToastProvider>
      <EnvironmentTab detail={props.detail ?? detail} />
    </ToastProvider>,
  );
}

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
    renderTab();
    expect(detail.loadSecrets).toHaveBeenCalled();
    expect(detail.loadRequiredSecrets).toHaveBeenCalled();
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
    renderTab();
    expect(
      screen.getByText(/API keys and secrets for an app/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/chat users never paste API keys/i),
    ).toBeInTheDocument();
  });

  it("writes masked vault values through the single editor", async () => {
    renderTab();
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
    renderTab();

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
    renderTab({
      detail: {
        ...detail,
        secretsByApp: null,
        secretsError: "vault unavailable",
      } as typeof detail,
    });
    expect(screen.getByText("vault unavailable")).toBeInTheDocument();
  });

  it("shows builder empty copy when no vars", () => {
    renderTab({
      detail: {
        ...detail,
        secretsByApp: { demo: [] },
      } as typeof detail,
    });
    expect(screen.getByText("No variables yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Add keys your agent needs/i),
    ).toBeInTheDocument();
  });

  it("renders missing required slots with descriptions and masked inputs", () => {
    const requiredDetail = {
      ...detail,
      requiredSecrets: {
        demo: {
          slots: [
            {
              name: "DEMO_API_KEY",
              description: "Key from the demo provider.",
              required: true,
            },
          ],
          missing: ["DEMO_API_KEY"],
        },
      },
    } as typeof detail;
    renderTab({ detail: requiredDetail });
    expect(screen.getByText("Key from the demo provider.")).toBeInTheDocument();
    expect(screen.getByLabelText("DEMO_API_KEY value")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByText(/1 required secret missing/i)).toBeInTheDocument();
  });
});
