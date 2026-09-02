import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search:
    "state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => ({
    connectSocial: vi.fn(),
    getAccountCredential: vi.fn(),
  }),
}));

vi.mock("@aomi-labs/widget-lib/providers/para", () => ({}));
vi.mock("@aomi-labs/widget-lib/providers/privy", () => ({}));

import { DeviceAuthClient } from "./device-auth-client";

describe("DeviceAuthClient provider ownership", () => {
  beforeEach(() => {
    mocks.search =
      "state=state_1234567890abcdef&code_challenge=challenge_1234567890abcdefghijklmnop&redirect_uri=http%3A%2F%2F127.0.0.1%3A4173%2Fcallback";
    mocks.replace.mockReset();
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
});
