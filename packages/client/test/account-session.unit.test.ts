import { describe, expect, it, vi } from "vitest";

import { createAccountBearerProvider } from "../src/index";

const BASE_URL = "https://api.aomi.dev";

describe("createAccountBearerProvider", () => {
  it("does not call the removed backend provider-token exchange route", async () => {
    const fetchImpl = vi.fn();
    const getProviderCredential = vi.fn(async () => ({
      provider: "privy" as const,
      providerToken: "privy-jwt",
    }));

    const provider = createAccountBearerProvider({
      baseUrl: BASE_URL,
      getProviderCredential,
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await expect(provider()).resolves.toBeUndefined();
    await expect(provider({ forceRefresh: true })).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getProviderCredential).not.toHaveBeenCalled();

    provider.dispose();
  });

  it("keeps subscribe/dispose compatibility for callers that still hold the shim", () => {
    const provider = createAccountBearerProvider({
      baseUrl: BASE_URL,
      getProviderCredential: async () => ({
        provider: "para" as const,
        providerToken: "jwt",
      }),
    });
    const listener = vi.fn();
    const unsubscribe = provider.subscribe(listener);

    unsubscribe();
    provider.dispose();

    expect(listener).not.toHaveBeenCalled();
  });
});
