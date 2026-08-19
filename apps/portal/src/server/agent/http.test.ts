import { describe, expect, it } from "vitest";

import { AgentKernelError } from "./kernel";
import {
  idempotencyKey,
  jsonBody,
  PublicHttpError,
  publicFailure,
} from "./http";

describe("public Agent HTTP boundary", () => {
  it("requires a bounded explicit idempotency key", () => {
    expect(() => idempotencyKey(new Request("https://public.test"))).toThrow(
      PublicHttpError,
    );
    expect(
      idempotencyKey(
        new Request("https://public.test", {
          headers: { "idempotency-key": "idem_123456789012" },
        }),
      ),
    ).toBe("idem_123456789012");
  });

  it("enforces the public body limit before JSON decoding", async () => {
    await expect(
      jsonBody(
        new Request("https://public.test", {
          method: "POST",
          headers: { "content-length": "70000" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 413, code: "payload_too_large" });
  });

  it("normalizes kernel failures without leaking an internal response shape", async () => {
    const payment = publicFailure(
      new AgentKernelError(
        402,
        { error: "payment_required" },
        new Headers({ "payment-required": "x402 challenge" }),
      ),
    );
    expect(payment.status).toBe(402);
    expect(payment.headers.get("payment-required")).toBe("x402 challenge");
    expect(await payment.json()).toEqual({
      error: {
        code: "payment_required",
        message: "payment_required",
        retryable: false,
      },
    });
  });
});
