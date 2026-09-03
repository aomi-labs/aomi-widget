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
  createPortalX402Client: vi.fn(() => ({ signer: true })),
  createPortalPaymentFetch: vi.fn(() => mocks.paymentFetch),
}));

import { CreditBank } from "./credit-bank";

function position(
  entries: Array<{
    id: number;
    amount_microusd: number;
    entry_kind: string;
    created_at: number;
  }> = [],
  nextBeforeId: number | null = null,
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
    next_before_id: nextBeforeId,
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

  it("renders debt and paginates activity with the server cursor", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          position(
            [
              {
                id: 9,
                amount_microusd: 5_000_000,
                entry_kind: "purchase",
                created_at: 1,
              },
            ],
            9,
          ),
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          position([
            {
              id: 8,
              amount_microusd: -100_000,
              entry_kind: "usage_debit",
              created_at: 1,
            },
          ]),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<CreditBank />);

    expect(await screen.findByText("-25 cr")).toBeTruthy();
    expect(screen.getByText("25 cr")).toBeTruthy();
    expect(screen.getByText("+500 cr")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("-10 cr")).toBeTruthy();
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("before_id=9");
  });

  it("shows empty and failed loading states", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(position()))
      .mockResolvedValueOnce(new Response("account unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const view = render(<CreditBank />);
    expect(await screen.findByText("No Credit Bank activity yet.")).toBeTruthy();

    view.unmount();
    render(<CreditBank />);
    expect(await screen.findByText(/account unavailable/)).toBeTruthy();
  });

  it("validates the amount and sends a wallet-backed top-up", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(position())));
    mocks.paymentFetch.mockResolvedValue(Response.json(position()));
    render(<CreditBank />);
    await screen.findByText("No Credit Bank activity yet.");

    const input = screen.getByLabelText("Credits to top up");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Top up" }));
    expect(
      await screen.findByText(/Choose between 100 and 100,000 credits/),
    ).toBeTruthy();
    expect(mocks.paymentFetch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Top up" }));
    await waitFor(() => expect(mocks.paymentFetch).toHaveBeenCalledOnce());
    const [path, init] = mocks.paymentFetch.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/v1/account/credits/top-up");
    expect(new Headers(init.headers).get("idempotency-key")).toBeTruthy();
    expect(JSON.parse(String(init.body))).toEqual({
      amount_microusd: 5_000_000,
    });
  });
});
