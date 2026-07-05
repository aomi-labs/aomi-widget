import { describe, expect, it, vi } from "vitest";

import {
  buildParaCallbackBody,
  decodeParaJwtWallets,
  formatCallbackFailure,
  formatExchangeFailure,
  postParaCallback,
  postSessionExchange,
  runParaConnect,
  type ParaAttestation,
} from "./callback";

function attestation(
  overrides: Partial<ParaAttestation> = {},
): ParaAttestation {
  return {
    paraJwt: "para-jwt",
    userId: "para-user-alice",
    keyId: "para-key-1",
    verificationToken: "one-shot-token",
    ...overrides,
  };
}

function response(status: number, body = ""): Response {
  return new Response(body, { status });
}

describe("buildParaCallbackBody", () => {
  it("assembles the backend contract keys exactly", () => {
    expect(buildParaCallbackBody("state-token", attestation())).toEqual({
      state: "state-token",
      para_jwt: "para-jwt",
      user_id: "para-user-alice",
      key_id: "para-key-1",
      verification_token: "one-shot-token",
    });
  });

  it("omits blank or missing optionals", () => {
    expect(
      buildParaCallbackBody(
        "state-token",
        attestation({ keyId: "  ", verificationToken: undefined }),
      ),
    ).toEqual({
      state: "state-token",
      para_jwt: "para-jwt",
      user_id: "para-user-alice",
    });
  });
});

describe("postParaCallback", () => {
  it("posts one fresh attestation and reports the jwt it sent", async () => {
    const attest = vi.fn(async () => attestation());
    const fetchFn = vi.fn(async () => response(200));

    const result = await postParaCallback({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      attest,
      fetchFn,
      retryDelaysMs: [0],
    });

    expect(result).toEqual({
      ok: true,
      paraJwt: "para-jwt",
      keyId: "para-key-1",
    });
    expect(attest).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example/api/auth/para/callback");
    expect(JSON.parse(String(init.body))).toEqual({
      state: "state-token",
      para_jwt: "para-jwt",
      user_id: "para-user-alice",
      key_id: "para-key-1",
      verification_token: "one-shot-token",
    });
  });

  it("retries 5xx with a fresh attestation per attempt", async () => {
    const attest = vi
      .fn(async () => attestation())
      .mockResolvedValueOnce(attestation({ paraJwt: "jwt-attempt-1" }))
      .mockResolvedValueOnce(attestation({ paraJwt: "jwt-attempt-2" }));
    const fetchFn = vi
      .fn(async () => response(200))
      .mockResolvedValueOnce(response(502, "upstream hiccup"));

    const result = await postParaCallback({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      attest,
      fetchFn,
      retryDelaysMs: [0, 0],
    });

    expect(result).toEqual({
      ok: true,
      paraJwt: "jwt-attempt-2",
      keyId: "para-key-1",
    });
    expect(attest).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      String((fetchFn.mock.calls[1] as [string, RequestInit])[1].body),
    ) as Record<string, string>;
    expect(secondBody.para_jwt).toBe("jwt-attempt-2");
  });

  it("is terminal on 4xx verification rejections", async () => {
    const attest = vi.fn(async () => attestation());
    const fetchFn = vi.fn(async () =>
      response(401, "Para callback verification failed."),
    );

    const result = await postParaCallback({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      attest,
      fetchFn,
      retryDelaysMs: [0, 0, 0],
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      detail: "Para callback verification failed.",
    });
    expect(attest).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns the final status once the retry budget is spent", async () => {
    const attest = vi.fn(async () => attestation());
    const fetchFn = vi.fn(async () => response(503, "unavailable"));

    const result = await postParaCallback({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      attest,
      fetchFn,
      retryDelaysMs: [0, 0, 0],
    });

    expect(result).toEqual({ ok: false, status: 503, detail: "unavailable" });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("fails fast without a callback URL", async () => {
    const attest = vi.fn(async () => attestation());
    const fetchFn = vi.fn(async () => response(200));

    const result = await postParaCallback({
      state: "state-token",
      callbackUrl: undefined,
      attest,
      fetchFn,
    });

    expect(result).toEqual({
      ok: false,
      status: 0,
      detail: "Missing backend callback URL.",
    });
    expect(attest).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("runParaConnect", () => {
  it("provisions the wallet before attesting, so the posted JWT covers it", async () => {
    const calls: string[] = [];
    let walletReady = false;
    const ensureWallet = vi.fn(async () => {
      calls.push("ensure-wallet");
      walletReady = true;
      return null;
    });
    // The JWT only attests wallets that exist at issue time — a pre-creation
    // token is the bug this pipeline exists to prevent.
    const attest = vi.fn(async () => {
      calls.push("attest");
      return attestation({
        paraJwt: walletReady ? "jwt-after-wallet" : "jwt-before-wallet",
      });
    });
    const fetchFn = vi.fn(async () => {
      calls.push("post");
      return response(200);
    });

    const outcome = await runParaConnect({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      ensureWallet,
      attest,
      fetchFn,
      retryDelaysMs: [0],
    });

    expect(calls).toEqual(["ensure-wallet", "attest", "post"]);
    expect(outcome).toEqual({
      ok: true,
      paraJwt: "jwt-after-wallet",
      keyId: "para-key-1",
    });
    const body = JSON.parse(
      String((fetchFn.mock.calls[0] as [string, RequestInit])[1].body),
    ) as Record<string, string>;
    expect(body.para_jwt).toBe("jwt-after-wallet");
  });

  it("is terminal on a wallet failure without attesting or posting", async () => {
    const ensureWallet = vi.fn(
      async () => "Could not create your Para EVM wallet: keygen failed",
    );
    const attest = vi.fn(async () => attestation());
    const fetchFn = vi.fn(async () => response(200));

    const outcome = await runParaConnect({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      ensureWallet,
      attest,
      fetchFn,
    });

    expect(outcome).toEqual({
      ok: false,
      stage: "wallet",
      status: 0,
      detail: "Could not create your Para EVM wallet: keygen failed",
    });
    expect(attest).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("labels backend rejections as callback-stage failures", async () => {
    const outcome = await runParaConnect({
      state: "state-token",
      callbackUrl: "https://api.example/api/auth/para/callback",
      ensureWallet: vi.fn(async () => null),
      attest: vi.fn(async () => attestation()),
      fetchFn: vi.fn(async () =>
        response(401, "Para callback verification failed."),
      ),
      retryDelaysMs: [0],
    });

    expect(outcome).toEqual({
      ok: false,
      stage: "callback",
      status: 401,
      detail: "Para callback verification failed.",
    });
  });
});

describe("formatCallbackFailure", () => {
  it("includes the truncated backend message", () => {
    expect(
      formatCallbackFailure({
        status: 400,
        detail: "  Para callback data was invalid.  ",
      }),
    ).toBe("Callback failed: 400 Para callback data was invalid.");
    expect(
      formatCallbackFailure({ status: 502, detail: "x".repeat(500) }),
    ).toBe(`Callback failed: 502 ${"x".repeat(240)}`);
  });

  it("degrades to the bare status on an empty body", () => {
    expect(formatCallbackFailure({ status: 503, detail: "" })).toBe(
      "Callback failed: 503",
    );
  });
});

describe("postSessionExchange", () => {
  it("posts the exchange contract keys exactly", async () => {
    const fetchFn = vi.fn(async () => response(200, '{"user_id":"u-1"}'));

    const result = await postSessionExchange({
      paraJwt: "para-jwt",
      keyId: "para-key-1",
      address: "0x3e14dcd053bbe0f964c3f1e82d976e7434f46dde",
      fetchFn,
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/bff/auth/exchange");
    expect(JSON.parse(String(init.body))).toEqual({
      provider: "para",
      jwt: "para-jwt",
      key_id: "para-key-1",
      address: "0x3e14dcd053bbe0f964c3f1e82d976e7434f46dde",
    });
  });

  it("omits blank or missing optionals", async () => {
    const fetchFn = vi.fn(async () => response(200));

    await postSessionExchange({ paraJwt: "para-jwt", keyId: "  ", fetchFn });

    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      provider: "para",
      jwt: "para-jwt",
    });
  });

  it("reports the status and body on rejection", async () => {
    const fetchFn = vi.fn(async () =>
      response(401, '{"error":"Invalid Para credential"}'),
    );

    const result = await postSessionExchange({ paraJwt: "para-jwt", fetchFn });

    expect(result).toEqual({
      ok: false,
      status: 401,
      detail: '{"error":"Invalid Para credential"}',
    });
  });
});

describe("formatExchangeFailure", () => {
  it("unwraps the route's JSON error body", () => {
    expect(
      formatExchangeFailure({
        status: 401,
        detail: '{"error":"Invalid Para credential"}',
      }),
    ).toBe("Aomi session setup failed: 401 Invalid Para credential");
  });

  it("keeps non-JSON bodies and degrades to the bare status when empty", () => {
    expect(formatExchangeFailure({ status: 502, detail: "bad gateway" })).toBe(
      "Aomi session setup failed: 502 bad gateway",
    );
    expect(formatExchangeFailure({ status: 500, detail: "" })).toBe(
      "Aomi session setup failed: 500",
    );
  });
});

describe("decodeParaJwtWallets", () => {
  function jwtWith(data: unknown): string {
    const payload = btoa(JSON.stringify({ sub: "para-user-alice", data }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return `header.${payload}.signature`;
  }

  it("keeps EVM and SOLANA wallets with addresses", () => {
    const token = jwtWith({
      wallets: [
        { id: "w-evm", type: "EVM", address: "0xabc" },
        { id: "w-sol", type: "SOLANA", address: "So111" },
        { id: "w-cosmos", type: "COSMOS", address: "cosmos1" },
        { id: "w-empty", type: "EVM" },
      ],
    });

    expect(decodeParaJwtWallets(token)).toEqual([
      { id: "w-evm", address: "0xabc", family: "evm" },
      { id: "w-sol", address: "So111", family: "solana" },
    ]);
  });

  it("returns no wallets for malformed tokens or missing claims", () => {
    expect(decodeParaJwtWallets("not-a-jwt")).toEqual([]);
    expect(decodeParaJwtWallets("a.%%%.c")).toEqual([]);
    expect(decodeParaJwtWallets(jwtWith({}))).toEqual([]);
  });
});
