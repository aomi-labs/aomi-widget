import { describe, expect, it } from "vitest";

import { printPaymentEvent } from "../../src/cli/output";
import { followSettledPaymentChallenges } from "../../src/cli/payment";

describe("CLI payment output", () => {
  it("prints the requested x402 amount, network, and recipient", () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (line: string) => lines.push(line);

    try {
      printPaymentEvent({
        type: "required",
        url: "http://unit.test/api/thread/chat",
        requirement: {
          amount: "25000",
          network: "eip155:84532",
          payTo: "0x1111111111111111111111111111111111111111",
        },
      });
    } finally {
      console.log = originalLog;
    }

    expect(lines[0]).toContain("x402 payment required");
    expect(lines[0]).toContain("amount 25000");
    expect(lines[0]).toContain("eip155:84532");
    expect(lines[0]).toContain(
      "beneficiary 0x1111111111111111111111111111111111111111",
    );
  });

  it("prints the settlement receipt when x402 payment clears", () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (line: string) => lines.push(line);

    try {
      printPaymentEvent({
        type: "settled",
        url: "http://unit.test/api/thread/chat",
        status: 200,
        receiptId: "0xreceipt",
      });
    } finally {
      console.log = originalLog;
    }

    expect(lines[0]).toContain("x402 payment settled: 0xreceipt");
  });

  it("prints the x402 rejection reason when the server supplies one", () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (line: string) => lines.push(line);

    try {
      printPaymentEvent({
        type: "rejected",
        url: "http://unit.test/api/thread/chat",
        status: 402,
        reason:
          "submitted payment requirements did not match the requested price",
      });
    } finally {
      console.log = originalLog;
    }

    expect(lines[0]).toContain("submitted payment requirements did not match");
  });

  it("starts a new payment cycle after a settled retry receives another 402", async () => {
    const requests: Array<{ body: string; hasPaymentSignature: boolean }> = [];
    const responses = [
      new Response(null, {
        status: 402,
        headers: { "Payment-Response": "partner-settlement" },
      }),
      new Response("ok", { status: 200 }),
    ];
    const fetchWithPayment: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push({
        body: await request.text(),
        hasPaymentSignature: request.headers.has("Payment-Signature"),
      });
      return responses.shift() ?? new Response(null, { status: 500 });
    };

    const fetch = followSettledPaymentChallenges(fetchWithPayment);
    const response = await fetch("http://unit.test/paid", {
      method: "POST",
      body: "original request",
    });

    expect(response.status).toBe(200);
    expect(requests).toEqual([
      { body: "original request", hasPaymentSignature: false },
      { body: "original request", hasPaymentSignature: false },
    ]);
  });

  it("does not retry a 402 that lacks a settlement receipt", async () => {
    let calls = 0;
    const fetchWithPayment: typeof fetch = async () => {
      calls += 1;
      return new Response(null, { status: 402 });
    };

    const response = await followSettledPaymentChallenges(fetchWithPayment)(
      "http://unit.test/paid",
    );

    expect(response.status).toBe(402);
    expect(calls).toBe(1);
  });
});
