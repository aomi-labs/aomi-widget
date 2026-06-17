import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAccountAccessTokenProvider } from "../src/index";
import type { AccountSessionExchangeResponse } from "../src/index";

// =============================================================================
// Helpers
// =============================================================================

function exchangeResponse(
  overrides: Partial<AccountSessionExchangeResponse> = {},
): AccountSessionExchangeResponse {
  return {
    access_token: "token-A",
    token_type: "Bearer",
    expires_at: 4600, // seconds
    user_id: "user-1",
    ...overrides,
  };
}

function okResponse(body: AccountSessionExchangeResponse) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

const BASE_URL = "https://api.aomi.dev";

describe("createAccountAccessTokenProvider", () => {
  // Cache logic keys off now(); we inject a controllable clock.
  let nowMs: number;
  const now = () => nowMs;

  beforeEach(() => {
    nowMs = 1_000_000; // 1000s — well before the 4600s default expiry
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exchanges the provider credential for an Aomi bearer with the correct contract", async () => {
    const fetchImpl = vi.fn(async () => okResponse(exchangeResponse()));
    const getProviderCredential = vi.fn(async () => ({
      provider: "privy" as const,
      providerToken: "privy-jwt",
    }));

    const provider = createAccountAccessTokenProvider({
      baseUrl: `${BASE_URL}/`, // trailing slash should be trimmed
      getProviderCredential,
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    const token = await provider();
    expect(token).toBe("token-A");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/account/exchange`);
    expect(init?.method).toBe("POST");
    // Maps camelCase providerToken -> snake_case provider_token at the boundary.
    expect(JSON.parse(init?.body as string)).toEqual({
      provider: "privy",
      provider_token: "privy-jwt",
    });

    provider.dispose();
  });

  it("caches the bearer until the refresh window and re-exchanges afterwards", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse(exchangeResponse({ access_token: "token-A" })))
      .mockResolvedValueOnce(okResponse(exchangeResponse({ access_token: "token-B" })));
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "para",
        providerToken: "para-jwt",
      }),
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    expect(await provider()).toBe("token-A");
    // Within the validity window: served from cache, no new fetch.
    expect(await provider()).toBe("token-A");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Advance past refreshAt (expires_at*1000 - 2min = 4_480_000ms).
    nowMs = 4_500_000;
    expect(await provider()).toBe("token-B");
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    provider.dispose();
  });

  it("forceRefresh bypasses a still-valid cache", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse(exchangeResponse({ access_token: "token-A" })))
      .mockResolvedValueOnce(okResponse(exchangeResponse({ access_token: "token-B" })));
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "privy",
        providerToken: "jwt",
      }),
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    expect(await provider()).toBe("token-A");
    expect(await provider({ forceRefresh: true })).toBe("token-B");
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    provider.dispose();
  });

  it("coalesces concurrent calls into a single in-flight exchange", async () => {
    let resolveExchange: (r: Response) => void = () => {};
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "para",
        providerToken: "jwt",
      }),
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    const a = provider();
    const b = provider();
    // Wait until the (single) exchange is actually in flight before resolving —
    // exchange() awaits getProviderCredential before calling fetch.
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    resolveExchange(okResponse(exchangeResponse({ access_token: "token-A" })));

    expect(await a).toBe("token-A");
    expect(await b).toBe("token-A");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    provider.dispose();
  });

  it("degrades to no token (undefined) on a non-ok exchange response", async () => {
    // The bearer is optional/additive — a failed exchange must not break the
    // caller's request, so the provider resolves undefined rather than throwing.
    const fetchImpl = vi.fn(
      async () => ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response,
    );
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "privy",
        providerToken: "bad",
      }),
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    await expect(provider()).resolves.toBeUndefined();

    provider.dispose();
  });

  it("degrades to no token when the wallet cannot mint a credential (Para 403)", async () => {
    // Mirrors Para issueJwtAsync() rejecting with 403 "user must verify
    // biometrics or external wallets" before verification is complete.
    const fetchImpl = vi.fn();
    const getProviderCredential = vi.fn(async () => {
      throw new Error("ParaApiError: user must verify biometrics or external wallets");
    });
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential,
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    await expect(provider()).resolves.toBeUndefined();
    // Never reached the exchange HTTP call.
    expect(fetchImpl).not.toHaveBeenCalled();

    provider.dispose();
  });

  it("backs off after a failure and does not re-attempt within the cooldown", async () => {
    const getProviderCredential = vi.fn(async () => {
      throw new Error("403");
    });
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential,
      fetch: vi.fn() as unknown as typeof fetch,
      now,
    });

    await expect(provider()).resolves.toBeUndefined();
    // A second passive request shortly after must not re-trigger the credential
    // fetch (otherwise every backend poll would 403 the wallet provider).
    nowMs += 1_000;
    await expect(provider()).resolves.toBeUndefined();
    expect(getProviderCredential).toHaveBeenCalledTimes(1);

    provider.dispose();
  });

  it("forceRefresh bypasses the failure backoff (used by the 401 retry path)", async () => {
    let attempt = 0;
    const getProviderCredential = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("403");
      return { provider: "para" as const, providerToken: "now-verified" };
    });
    const fetchImpl = vi.fn(async () => okResponse(exchangeResponse({ access_token: "token-A" })));
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential,
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    await expect(provider()).resolves.toBeUndefined();
    // e.g. an endpoint that needs the bearer returned 401 → wrapper retries.
    await expect(provider({ forceRefresh: true })).resolves.toBe("token-A");
    expect(getProviderCredential).toHaveBeenCalledTimes(2);

    provider.dispose();
  });

  it("proactively refreshes via the timer and notifies subscribers when the token rotates", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse(exchangeResponse({ access_token: "token-A" })))
      .mockResolvedValueOnce(okResponse(exchangeResponse({ access_token: "token-B" })));
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "para",
        providerToken: "jwt",
      }),
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    const listener = vi.fn();
    provider.subscribe(listener);

    expect(await provider()).toBe("token-A");

    // scheduleRefresh set a timer for (refreshAt - now) = 3_480_000ms.
    await vi.advanceTimersByTimeAsync(3_480_000);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Token rotated A -> B, so subscribers are notified exactly once.
    expect(listener).toHaveBeenCalledTimes(1);

    provider.dispose();
  });

  it("dispose() clears the refresh timer and detaches subscribers", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(async () => okResponse(exchangeResponse()));
    const provider = createAccountAccessTokenProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "privy",
        providerToken: "jwt",
      }),
      fetch: fetchImpl as unknown as typeof fetch,
      now,
    });

    const listener = vi.fn();
    provider.subscribe(listener);
    await provider();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    provider.dispose();
    await vi.advanceTimersByTimeAsync(10_000_000);

    // No timer-driven refresh after dispose, and no listener fired.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
