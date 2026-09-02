import type { x402Client } from "@x402/core/client";
import { describe, expect, it, vi } from "vitest";

import {
  createPortalPaymentFetch,
  createPortalX402Client,
  x402EvmChainId,
} from "./payment-fetch";

const CHAT_URL = "https://chat-staging.aomi.dev/v1/agent/chat";

function paymentRequiredHeader(): string {
  return btoa(
    JSON.stringify({
      x402Version: 2,
      resource: { url: CHAT_URL },
      accepts: [],
    }),
  );
}

function paymentClient() {
  const createPaymentPayload = vi.fn(async () => ({
    x402Version: 2,
    payload: { signature: "signed" },
    accepted: {},
  }));
  return {
    client: { createPaymentPayload } as unknown as x402Client,
    createPaymentPayload,
  };
}

describe("createPortalPaymentFetch", () => {
  it("passes non-chat requests directly to the raw fetch", async () => {
    const expected = Response.json({ ok: true });
    const rawFetch = vi.fn(async () => expected);
    const fetch = createPortalPaymentFetch({ fetch: rawFetch });

    const response = await fetch("https://chat-staging.aomi.dev/api/state");

    expect(response).toBe(expected);
    expect(rawFetch).toHaveBeenCalledTimes(1);
  });

  it("settles chained x402 challenges without an unsigned replay", async () => {
    const requests: Array<{ body: string; signed: boolean }> = [];
    const mppFetch = vi.fn();
    const rawFetch: typeof globalThis.fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push({
        body: await request.clone().text(),
        signed: request.headers.has("payment-signature"),
      });
      if (requests.length <= 2) {
        return new Response(null, {
          status: 402,
          headers: {
            "payment-required": paymentRequiredHeader(),
            ...(requests.length === 1
              ? { "www-authenticate": 'Payment id="mpp-challenge"' }
              : { "payment-response": "partner-settlement" }),
          },
        });
      }
      return Response.json({ ok: true });
    };
    const { client, createPaymentPayload } = paymentClient();
    const fetch = createPortalPaymentFetch({
      fetch: rawFetch,
      mppFetch,
      x402: client,
    });

    const response = await fetch(CHAT_URL, {
      method: "POST",
      body: "original request",
    });

    expect(response.status).toBe(200);
    expect(requests).toEqual([
      { body: "original request", signed: false },
      { body: "original request", signed: true },
      { body: "original request", signed: true },
    ]);
    expect(createPaymentPayload).toHaveBeenCalledTimes(2);
    expect(mppFetch).not.toHaveBeenCalled();
  });

  it("does not route an x402 challenge to MPP without an EVM wallet", async () => {
    const challenge = new Response(null, {
      status: 402,
      headers: {
        "payment-required": paymentRequiredHeader(),
        "www-authenticate": 'Payment id="mpp-challenge"',
      },
    });
    const rawFetch = vi.fn(async () => challenge);
    const mppFetch = vi.fn();
    const fetch = createPortalPaymentFetch({ fetch: rawFetch, mppFetch });

    const response = await fetch(CHAT_URL, { method: "POST" });

    expect(response).toBe(challenge);
    expect(mppFetch).not.toHaveBeenCalled();
  });

  it("routes only MPP challenges to the MPP fetch", async () => {
    const rawFetch = vi.fn(
      async () =>
        new Response(null, {
          status: 402,
          headers: { "www-authenticate": 'Payment id="mpp-challenge"' },
        }),
    );
    const expected = Response.json({ ok: true });
    const mppFetch = vi.fn(async () => expected);
    const { client, createPaymentPayload } = paymentClient();
    const fetch = createPortalPaymentFetch({
      fetch: rawFetch,
      mppFetch,
      x402: client,
    });

    const response = await fetch(CHAT_URL, { method: "POST" });

    expect(response).toBe(expected);
    expect(mppFetch).toHaveBeenCalledTimes(1);
    expect(createPaymentPayload).not.toHaveBeenCalled();
  });

  it("returns an unrecognized 402 without invoking a payment client", async () => {
    const challenge = new Response(null, { status: 402 });
    const rawFetch = vi.fn(async () => challenge);
    const mppFetch = vi.fn();
    const { client, createPaymentPayload } = paymentClient();
    const fetch = createPortalPaymentFetch({
      fetch: rawFetch,
      mppFetch,
      x402: client,
    });

    const response = await fetch(CHAT_URL, { method: "POST" });

    expect(response).toBe(challenge);
    expect(mppFetch).not.toHaveBeenCalled();
    expect(createPaymentPayload).not.toHaveBeenCalled();
  });
});

describe("x402EvmChainId", () => {
  it("parses Base Sepolia from its CAIP-2 network", () => {
    expect(x402EvmChainId("eip155:84532")).toBe(84532);
  });

  it.each(["base-sepolia", "eip155:0", "eip155:not-a-chain"])(
    "rejects unsupported network %s",
    (network) => {
      expect(() => x402EvmChainId(network)).toThrow(
        `Unsupported x402 EVM network: ${network}`,
      );
    },
  );
});

describe("createPortalX402Client", () => {
  it("uses the shared wallet adapter to switch chains and sign", async () => {
    const signTypedData = vi.fn(async () => ({
      signature: `0x${"1".repeat(130)}`,
    }));
    const switchChain = vi.fn(async () => undefined);
    const client = createPortalX402Client({
      identity: {
        status: "connected",
        isConnected: true,
        address: "0x9cb9ec43b1Dcbe0ea37bfA9A99f2c9AAe2eBf2EB",
        chainId: 1,
      },
      signTypedData,
      switchChain,
    });

    expect(client).toBeDefined();
    await client!.createPaymentPayload({
      x402Version: 2,
      resource: { url: CHAT_URL },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:84532",
          asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          amount: "1000",
          payTo: "0x9cb9ec43b1Dcbe0ea37bfA9A99f2c9AAe2eBf2EB",
          maxTimeoutSeconds: 60,
          extra: { name: "USDC", version: "2" },
        },
      ],
    });

    expect(switchChain).toHaveBeenCalledWith(84532);
    expect(signTypedData).toHaveBeenCalledWith({
      typed_data: expect.objectContaining({
        primaryType: "TransferWithAuthorization",
      }),
    });
  });

  it("does not create a client without an EVM signer", () => {
    expect(
      createPortalX402Client({
        identity: { status: "disconnected", isConnected: false },
        signTypedData: undefined,
        switchChain: undefined,
      }),
    ).toBeUndefined();
  });
});
