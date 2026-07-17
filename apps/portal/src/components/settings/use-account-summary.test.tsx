import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AccountOverviewProvider,
  useAccountOverview,
  useAccountSummary,
} from "./use-account-summary";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@portal/lib/settings-api", () => ({
  settingsApiFetch: mocks.fetch,
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => ({
    canConnect: true,
    connect: vi.fn(),
    identity: {
      address: "0x1234567890abcdef",
      isConnected: true,
    },
  }),
}));

function AccountConsumer() {
  const summary = useAccountSummary();
  const { overview } = useAccountOverview();
  return (
    <>
      <span>{summary.statusLabel}</span>
      <span>{overview?.usage?.credit_used}</span>
    </>
  );
}

describe("AccountOverviewProvider", () => {
  it("shares one account request across account consumers", async () => {
    mocks.fetch.mockResolvedValueOnce({
      user: {
        apps: [],
        created_at: 1,
        public_key: "0x1234",
        status: "active",
        tier: "pro",
        updated_at: 1,
        user_id: "user-1",
      },
      usage: {
        credit_paid: 100,
        credit_used: 25,
        input_tokens: 10,
        output_tokens: 5,
        period_utc_month: "2026-07",
      },
    });

    render(
      <AccountOverviewProvider>
        <AccountConsumer />
        <AccountConsumer />
      </AccountOverviewProvider>,
    );

    await waitFor(() => expect(screen.getAllByText("pro")).toHaveLength(2));
    expect(screen.getAllByText("25")).toHaveLength(2);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith("/api/account");
  });
});
