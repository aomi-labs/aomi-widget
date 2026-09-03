import { describe, expect, it, vi } from "vitest";

import { AomiClient } from "../src";

const position = {
  period_utc_month: "2026-09-01",
  included: {
    limit_microusd: 50_000_000,
    used_microusd: 5_250_000,
    remaining_microusd: 44_750_000,
  },
  bank: { balance_microusd: 1_500_000, outstanding_debt_microusd: 0 },
  entries: [],
  next_before_id: null,
};

describe("account credits", () => {
  it("reads a paginated credit position through the account transport", async () => {
    const fetchImpl = vi.fn(async () => Response.json(position));
    const client = new AomiClient({
      baseUrl: "https://api.test",
      fetch: fetchImpl as typeof fetch,
      guest: false,
    });

    await expect(
      client.account.credits.get({ limit: 10, beforeId: 42 }),
    ).resolves.toEqual(position);

    const request = new Request(fetchImpl.mock.calls[0]![0]);
    expect(request.url).toBe(
      "https://api.test/v1/account/credits?limit=10&before_id=42",
    );
  });

  it("submits an exact microusd top-up with a stable retry key", async () => {
    const paymentResponse = btoa(
      JSON.stringify({ transaction: "0xtx", network: "eip155:84532" }),
    );
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        expect(request.method).toBe("POST");
        expect(request.headers.get("idempotency-key")).toBe("topup-1");
        expect(request.headers.get("x-aomi-csrf")).toBe("1");
        expect(await request.json()).toEqual({ amount_microusd: 1_250_000 });
        return Response.json(position, {
          headers: { "payment-response": paymentResponse },
        });
      },
    );
    const client = new AomiClient({
      baseUrl: "https://api.test",
      fetch: fetchImpl as typeof fetch,
      guest: false,
    });

    await expect(
      client.account.credits.topUp({
        credits: 125,
        idempotencyKey: "topup-1",
      }),
    ).resolves.toEqual({
      ...position,
      receipt: { transaction: "0xtx", network: "eip155:84532" },
    });
  });

  it("rejects imprecise or out-of-range top-ups before requesting", async () => {
    const fetchImpl = vi.fn();
    const client = new AomiClient({
      baseUrl: "https://api.test",
      fetch: fetchImpl as typeof fetch,
      guest: false,
    });

    await expect(
      client.account.credits.topUp({ credits: 99.5 }),
    ).rejects.toThrow("between 100 and 100,000 credits");
    await expect(
      client.account.credits.topUp({ amountMicrousd: 10_000.5 }),
    ).rejects.toThrow("whole, safe microusd");
    await expect(
      client.account.credits.topUp({ credits: 100.00001 }),
    ).rejects.toThrow("whole, safe microusd");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
