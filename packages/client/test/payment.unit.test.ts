import type { x402Client } from "@x402/core/client";
import { describe, expect, it, vi } from "vitest";

import { wrapFetchWithPaymentChallenges } from "../src/payment";

const PAID_URL = "https://unit.test/paid";

function paymentRequiredHeader(): string {
  return btoa(
    JSON.stringify({
      x402Version: 2,
      resource: { url: PAID_URL },
      accepts: [],
    }),
  );
}

function challenge(settled = false): Response {
  return new Response(null, {
    status: 402,
    headers: {
      "payment-required": paymentRequiredHeader(),
      ...(settled ? { "payment-response": "settlement-receipt" } : {}),
    },
  });
}

function paymentClient(
  createPaymentPayload = vi.fn(async () => ({
    x402Version: 2,
    payload: { signature: "signed" },
    accepted: {},
  })),
) {
  return {
    client: { createPaymentPayload } as unknown as x402Client,
    createPaymentPayload,
  };
}

describe("wrapFetchWithPaymentChallenges", () => {
  it("settles partner and platform challenges without an unsigned replay", async () => {
    const responses = [
      challenge(),
      challenge(true),
      Response.json({ ok: true }),
    ];
    const requests: Array<{ body: string; signed: boolean }> = [];
    const rawFetch: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push({
        body: await request.clone().text(),
        signed: request.headers.has("payment-signature"),
      });
      return responses.shift() ?? new Response(null, { status: 500 });
    };
    const { client, createPaymentPayload } = paymentClient();

    const response = await wrapFetchWithPaymentChallenges(rawFetch, client)(
      PAID_URL,
      { method: "POST", body: "original request" },
    );

    expect(response.status).toBe(200);
    expect(requests).toEqual([
      { body: "original request", signed: false },
      { body: "original request", signed: true },
      { body: "original request", signed: true },
    ]);
    expect(createPaymentPayload).toHaveBeenCalledTimes(2);
  });

  it("returns a rejected settlement without attempting another payment", async () => {
    const responses = [challenge(), challenge()];
    const rawFetch = vi.fn(
      async () => responses.shift() ?? new Response(null, { status: 500 }),
    );
    const { client, createPaymentPayload } = paymentClient();

    const response = await wrapFetchWithPaymentChallenges(
      rawFetch,
      client,
    )(PAID_URL);

    expect(response.status).toBe(402);
    expect(rawFetch).toHaveBeenCalledTimes(2);
    expect(createPaymentPayload).toHaveBeenCalledTimes(1);
  });

  it("returns a facilitator failure without retrying", async () => {
    const responses = [challenge(), new Response(null, { status: 500 })];
    const rawFetch = vi.fn(
      async () => responses.shift() ?? new Response(null, { status: 500 }),
    );
    const { client, createPaymentPayload } = paymentClient();

    const response = await wrapFetchWithPaymentChallenges(
      rawFetch,
      client,
    )(PAID_URL);

    expect(response.status).toBe(500);
    expect(rawFetch).toHaveBeenCalledTimes(2);
    expect(createPaymentPayload).toHaveBeenCalledTimes(1);
  });

  it("propagates a malformed challenge", async () => {
    const rawFetch = vi.fn(
      async () =>
        new Response(null, {
          status: 402,
          headers: { "payment-required": "not-base64" },
        }),
    );
    const { client } = paymentClient();

    await expect(
      wrapFetchWithPaymentChallenges(rawFetch, client)(PAID_URL),
    ).rejects.toThrow("Failed to parse payment requirements");
    expect(rawFetch).toHaveBeenCalledTimes(1);
  });

  it("propagates wallet rejection without sending a signed retry", async () => {
    const rawFetch = vi.fn(async () => challenge());
    const createPaymentPayload = vi.fn(async () => {
      throw new Error("User rejected payment");
    });
    const { client } = paymentClient(createPaymentPayload);

    await expect(
      wrapFetchWithPaymentChallenges(rawFetch, client)(PAID_URL),
    ).rejects.toThrow("User rejected payment");
    expect(rawFetch).toHaveBeenCalledTimes(1);
  });

  it("fails after four sequential settled challenges", async () => {
    let calls = 0;
    const rawFetch = vi.fn(async () => {
      calls += 1;
      return challenge(calls > 1);
    });
    const { client, createPaymentPayload } = paymentClient();

    await expect(
      wrapFetchWithPaymentChallenges(rawFetch, client)(PAID_URL),
    ).rejects.toThrow("Exceeded 4 sequential x402 payment challenges");
    expect(rawFetch).toHaveBeenCalledTimes(5);
    expect(createPaymentPayload).toHaveBeenCalledTimes(4);
  });
});
