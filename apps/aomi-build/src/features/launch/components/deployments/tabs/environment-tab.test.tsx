import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnvironmentTab } from "./environment-tab";
import type { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";

type Detail = ReturnType<typeof useProjectDetail>;

function makeDetail(overrides: Partial<Detail> = {}): Detail {
  return {
    source: {
      id: 1,
      installationId: 5,
      repositoryLink: "a/b",
      apps: [{ name: "binance", isActive: true, loaded: true }],
      latestDeployment: null,
    },
    loadSecrets: vi.fn(),
    loadRequiredSecrets: vi.fn(),
    setEnvVars: vi.fn(async () => ({ ok: true, keys: ["API_KEY"] })),
    deleteEnvVar: vi.fn(async () => ({ ok: true, removed: true })),
    secretsByApp: { binance: ["$SECRET:APP:binance::EXISTING_KEY"] },
    secretsError: null,
    requiredSecrets: null,
    requiredSecretsError: null,
    hasMissingSecrets: vi.fn(() => false),
    ...overrides,
  } as unknown as Detail;
}

describe("EnvironmentTab", () => {
  it("loads secrets on mount and lists configured keys (names only)", () => {
    const detail = makeDetail();
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
    const detail = makeDetail();
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
      expect(detail.setEnvVars).toHaveBeenCalledWith("binance", {
        API_KEY: "public",
        TOKEN: "secret",
      }),
    );
  });

  it("removes a configured var", async () => {
    const detail = makeDetail();
    render(<EnvironmentTab detail={detail} />);
    fireEvent.click(screen.getByTitle("Remove EXISTING_KEY"));
    await waitFor(() =>
      expect(detail.deleteEnvVar).toHaveBeenCalledWith("binance", "EXISTING_KEY"),
    );
  });

  it("shows secret load failures", () => {
    const detail = makeDetail({
      secretsByApp: null,
      secretsError: "vault unavailable",
    });
    render(<EnvironmentTab detail={detail} />);
    expect(screen.getByText("vault unavailable")).toBeInTheDocument();
  });

  it("renders each missing required slot with its description and a masked input", () => {
    const detail = makeDetail({
      requiredSecrets: {
        binance: {
          slots: [
            { name: "BINANCE_API_KEY", description: "Binance dashboard API key.", required: true },
          ],
          missing: ["BINANCE_API_KEY"],
        },
      },
    });
    render(<EnvironmentTab detail={detail} />);

    expect(screen.getByText("Binance dashboard API key.")).toBeInTheDocument();
    const input = screen.getByLabelText("BINANCE_API_KEY value");
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByDisplayValue("BINANCE_API_KEY")).toHaveAttribute("readonly");
  });

  it("shows a required banner listing the missing slots", () => {
    const detail = makeDetail({
      requiredSecrets: { binance: { slots: [], missing: ["A", "B"] } },
    });
    render(<EnvironmentTab detail={detail} />);
    expect(screen.getByText(/2 required secrets missing/i)).toBeInTheDocument();
  });
});
