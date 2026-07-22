import { describe, expect, it, vi } from "vitest";
import {
  createProviderCredentialAdapter,
  createWidgetSessionProvider,
  type WidgetAuthAdapter,
} from "../src/widget-session";

describe("createWidgetSessionProvider", () => {
  it("exchanges any provider credential without cookies or provider-specific code", async () => {
    const fetchImpl = vi.fn(async (_url, init) =>
      Response.json({
        access_token: "provider-wst",
        expires_at: 2_000_000_000,
        received: init,
      }),
    );
    const adapter = createProviderCredentialAdapter({
      provider: "fake-provider",
      environment: "TEST",
      getSubject: () => "subject-1",
      getCredential: async () => ({
        provider: "fake-provider",
        providerToken: "signed-token",
        keyId: "key-1",
      }),
    });
    const provider = createWidgetSessionProvider({
      baseUrl: "https://portal.example",
      adapter,
      fetch: fetchImpl,
      now: () => 1_900_000_000_000,
    });

    await expect(provider()).resolves.toBe("provider-wst");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://portal.example/api/widget/auth/exchange",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        body: JSON.stringify({
          provider: "fake-provider",
          environment: "TEST",
          provider_token: "signed-token",
          key_id: "key-1",
        }),
      }),
    );
  });

  it("stages a JWT credential when the provider SDK has not exposed its subject", async () => {
    const providerToken = [
      "header",
      Buffer.from(JSON.stringify({ sub: "delayed-subject" })).toString(
        "base64url",
      ),
      "signature",
    ].join(".");
    const getCredential = vi.fn().mockResolvedValue({
      provider: "para",
      providerToken,
      keyId: "key-1",
    });
    const fetchImpl = vi.fn(async () =>
      Response.json({
        access_token: "provider-wst",
        expires_at: 2_000_000_000,
      }),
    );
    const adapter = createProviderCredentialAdapter({
      provider: "para",
      environment: "BETA",
      getSubject: () => null,
      getCredential,
    });
    const provider = createWidgetSessionProvider({
      baseUrl: "https://portal.example",
      adapter,
      fetch: fetchImpl,
      now: () => 1_900_000_000_000,
    });

    await expect(provider()).resolves.toBe("provider-wst");
    await expect(provider()).resolves.toBe("provider-wst");
    expect(getCredential).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("deduplicates concurrent exchange and refreshes before expiry", async () => {
    let now = 1_900_000_000_000;
    const adapter: WidgetAuthAdapter = {
      kind: "test",
      getFingerprint: () => "subject-1",
      exchange: vi
        .fn()
        .mockResolvedValueOnce({
          accessToken: "first",
          expiresAt: now / 1000 + 120,
        })
        .mockResolvedValueOnce({
          accessToken: "second",
          expiresAt: now / 1000 + 240,
        }),
    };
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const provider = createWidgetSessionProvider({
      baseUrl: "https://portal.example",
      adapter,
      fetch: fetchImpl,
      now: () => now,
      refreshBeforeExpiryMs: 60_000,
    });

    await expect(
      Promise.all([provider(), provider(), provider()]),
    ).resolves.toEqual(["first", "first", "first"]);
    expect(adapter.exchange).toHaveBeenCalledTimes(1);
    now += 61_000;
    await expect(provider()).resolves.toBe("second");
    expect(adapter.exchange).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://portal.example/api/widget/auth/session",
      expect.objectContaining({ method: "DELETE", credentials: "omit" }),
    );
  });

  it("clears failed exchanges so a retry can succeed without an unhandled branch", async () => {
    const adapter: WidgetAuthAdapter = {
      kind: "test",
      getFingerprint: () => "subject-1",
      exchange: vi
        .fn()
        .mockRejectedValueOnce(new Error("temporary"))
        .mockResolvedValueOnce({
          accessToken: "recovered",
          expiresAt: 2_000_000_000,
        }),
    };
    const provider = createWidgetSessionProvider({
      baseUrl: "https://portal.example",
      adapter,
      now: () => 1_900_000_000_000,
    });

    await expect(provider()).rejects.toThrow("temporary");
    await expect(provider()).resolves.toBe("recovered");
  });
});
