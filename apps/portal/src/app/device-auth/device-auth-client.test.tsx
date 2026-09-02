import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search:
    "state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback",
  replace: vi.fn(),
  wallet: {
    connectSocial: vi.fn(),
    getAccountCredential: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => mocks.wallet,
}));

vi.mock("@portal/lib/device-auth-provider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@portal/lib/device-auth-provider")>();
  return {
    ...actual,
    providerConfigurationFailure: () => null,
    classifyProviderInitializationFailure: () => ({
      code: "para_initialization_failed",
      message: "Para authentication could not start.",
    }),
  };
});

vi.mock("@aomi-labs/widget-lib/providers/para", () => ({}));
vi.mock("@aomi-labs/widget-lib/providers/privy", () => ({}));

import { DeviceAuthClient } from "./device-auth-client";

describe("DeviceAuthClient provider ownership", () => {
  beforeEach(() => {
    mocks.search =
      "state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback";
    mocks.replace.mockReset();
    mocks.wallet.connectSocial.mockReset();
    mocks.wallet.getAccountCredential.mockReset();
  });

  it("navigates with the selected provider instead of nesting a provider", () => {
    render(<DeviceAuthClient />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Para" }));

    expect(mocks.replace).toHaveBeenCalledOnce();
    const destination = String(mocks.replace.mock.calls[0]?.[0]);
    expect(destination).toContain("/device-auth?");
    expect(
      new URL(destination, "https://portal.example").searchParams.get(
        "provider",
      ),
    ).toBe("para");
  });

  it("never renders a raw provider error after connect", async () => {
    mocks.search =
      "provider=para&state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback";
    mocks.wallet.connectSocial.mockResolvedValue(undefined);
    mocks.wallet.getAccountCredential.mockRejectedValue(
      new Error("private provider response containing a credential"),
    );

    render(<DeviceAuthClient />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Para" }));

    expect(
      await screen.findByText(/para_initialization_failed/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/private provider response/),
    ).not.toBeInTheDocument();
  });
});
