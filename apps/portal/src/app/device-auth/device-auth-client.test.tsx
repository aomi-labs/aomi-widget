import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search:
    "state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback",
  replace: vi.fn(),
  wallet: {
    connectSocial: vi.fn(),
  },
  getAccountCredential: vi.fn<() => Promise<unknown>>() as
    | ReturnType<typeof vi.fn<() => Promise<unknown>>>
    | undefined,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => ({
    ...mocks.wallet,
    getAccountCredential: mocks.getAccountCredential,
  }),
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
    mocks.getAccountCredential = vi.fn<() => Promise<unknown>>();
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
    mocks.getAccountCredential!.mockRejectedValue(
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

  it("keeps the CLI handoff pending while provider login takes over 30 seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(
        Response.json({
          code: "one-time-code",
          state: "state_1234567890abcdef",
        }),
      );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      mocks.search =
        "provider=para&state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback";
      mocks.wallet.connectSocial.mockResolvedValue(undefined);
      mocks.getAccountCredential = undefined;

      const view = render(<DeviceAuthClient />);
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Para" }),
      );
      await act(async () => {});

      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000);
      });

      expect(
        screen.queryByText(/para_initialization_failed/),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Continue with Para" }),
      ).toBeDisabled();

      const credential = { provider: "para", token: "provider-credential" };
      const getCredential = vi.fn(async () => credential);
      mocks.getAccountCredential = getCredential;
      view.rerender(<DeviceAuthClient />);
      await act(async () => {});

      expect(getCredential).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/auth/aomi/provider/exchange",
        expect.objectContaining({ body: JSON.stringify(credential) }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/v1/account/device-auth/grant",
        expect.any(Object),
      );
      expect(
        screen.getByText("Authentication complete. Returning to the CLI..."),
      ).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
      fetchMock.mockRestore();
      vi.useRealTimers();
    }
  });
});
