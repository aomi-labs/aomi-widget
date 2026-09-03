import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connected: true,
  paymentFetch: vi.fn(),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  useAomiWalletKit: () => ({
    identity: {
      isConnected: mocks.connected,
      address: "0x0000000000000000000000000000000000000001",
      chainId: 84532,
    },
    signTypedData: vi.fn(),
    switchChain: vi.fn(),
  }),
}));

vi.mock("@portal/lib/payment-fetch", () => ({
  createPortalX402Client: vi.fn(() =>
    mocks.connected ? { signer: true } : undefined,
  ),
  createPortalPaymentFetch: vi.fn(() => mocks.paymentFetch),
}));

import { CreditBank } from "./credit-bank";

function position(
  entries: Array<{
    id: number;
    amount_microusd: number;
    entry_kind: string;
    payment_method?: string | null;
    payment_provider?: string | null;
    external_payment_reference?: string | null;
    application_id?: number | null;
    created_at: number;
  }> = [],
) {
  return {
    period_utc_month: "2026-09-01",
    included: {
      limit_microusd: 50_000_000,
      used_microusd: 12_500_000,
      remaining_microusd: 37_500_000,
    },
    bank: {
      balance_microusd: -250_000,
      outstanding_debt_microusd: 250_000,
    },
    entries,
    next_before_id: null,
  };
}

describe("Credit Bank", () => {
  beforeEach(() => {
    mocks.connected = true;
    mocks.paymentFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the aligned disclosure and activity presentation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          position([
            {
              id: 9,
              amount_microusd: 5_000_000,
              entry_kind: "purchase",
              payment_method: "x402",
              payment_provider: "coinbase",
              external_payment_reference: `0x${"1".repeat(64)}`,
              created_at: 1,
            },
            {
              id: 8,
              amount_microusd: -100_000,
              entry_kind: "usage_debit",
              application_id: 4,
              created_at: 1,
            },
          ]),
        ),
      ),
    );

    render(<CreditBank />);

    expect(await screen.findByText("-25 credits")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Credit bank/ }));
    expect(screen.getByText("Keep usage moving")).toBeTruthy();
    expect(screen.getByText("Wallet top-up")).toBeTruthy();
    expect(screen.getByText(/Coinbase x402/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View receipt" })).toHaveAttribute(
      "href",
      `https://sepolia.basescan.org/tx/0x${"1".repeat(64)}`,
    );
    expect(screen.getByText("Personal usage")).toBeTruthy();
    expect(screen.getByText("+500 credits")).toBeTruthy();
    expect(screen.getByText("−10 credits")).toBeTruthy();
    expect(screen.getByText(/Application 4/)).toBeTruthy();
  });

  it("shows empty and failed loading states inside the disclosure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(position()))
      .mockResolvedValueOnce(
        new Response("account unavailable", { status: 503 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const view = render(<CreditBank />);
    await screen.findByText("-25 credits");
    fireEvent.click(screen.getByRole("button", { name: /Credit bank/ }));
    expect(screen.getByText("No purchased-credit activity yet.")).toBeTruthy();

    view.unmount();
    render(<CreditBank />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: /Credit bank/ }));
    expect(await screen.findByText(/account unavailable/)).toBeTruthy();
  });

  it("reviews and submits a one-credit wallet top-up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(position())),
    );
    mocks.paymentFetch.mockResolvedValue(
      Response.json({
        ...position(),
        bank: { balance_microusd: 10_000, outstanding_debt_microusd: 0 },
      }),
    );
    render(<CreditBank />);
    await screen.findByText("-25 credits");

    fireEvent.click(screen.getByRole("button", { name: /Credit bank/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    expect(screen.getByText("100 credits = 1.00 USDC")).toBeTruthy();

    const input = screen.getByLabelText("Top-up credits");
    fireEvent.change(input, { target: { value: "0" } });
    expect(
      screen.getByText("Choose between 1 and 100,000 credits."),
    ).toBeTruthy();
    expect(mocks.paymentFetch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Pay 0.01 USDC" }));
    await waitFor(() => expect(mocks.paymentFetch).toHaveBeenCalledOnce());
    const [path, init] = mocks.paymentFetch.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/v1/account/credits/top-up");
    expect(new Headers(init.headers).get("idempotency-key")).toBeTruthy();
    expect(JSON.parse(String(init.body))).toEqual({ amount_microusd: 10_000 });
    expect(
      await screen.findByText("1 credit added. Your bank now has 1 credit."),
    ).toBeTruthy();
  });
});
