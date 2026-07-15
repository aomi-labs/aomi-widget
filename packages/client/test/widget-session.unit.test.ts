// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createWidgetSessionProvider } from "../src/widget-session";

const ADDRESS = "0x1111111111111111111111111111111111111111";

describe("createWidgetSessionProvider", () => {
  it("signs the Portal-issued observed-origin challenge and caches the WST", async () => {
    const signMessage = vi.fn(async () => `0x${"11".repeat(65)}`);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          nonce: "12345678",
          domain: "customer.example",
          uri: "https://customer.example",
          issued_at: "2026-07-15T00:00:00.000Z",
          expiration_time: "2026-07-15T00:05:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: "aomi_wst_session",
          token_type: "Bearer",
          expires_at: 1_800,
          user_id: "user-1",
        }),
      );
    const provider = createWidgetSessionProvider({
      baseUrl: "https://chat.aomi.dev/",
      fetch: fetchMock,
      now: () => 0,
      getSigner: async () => ({
        address: ADDRESS,
        chainId: 1,
        signMessage,
      }),
    });

    await expect(provider()).resolves.toBe("aomi_wst_session");
    await expect(provider()).resolves.toBe("aomi_wst_session");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(signMessage.mock.calls[0]?.[0]).toContain(
      "customer.example wants you to sign in",
    );
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.credentials).toBe("omit");
    }
  });

  it("revokes the in-memory session with its bearer", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          nonce: "12345678",
          domain: "customer.example",
          uri: "https://customer.example",
          issued_at: "2026-07-15T00:00:00.000Z",
          expiration_time: "2026-07-15T00:05:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: "aomi_wst_session",
          token_type: "Bearer",
          expires_at: 1_800,
          user_id: "user-1",
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const provider = createWidgetSessionProvider({
      baseUrl: "https://chat.aomi.dev",
      fetch: fetchMock,
      now: () => 0,
      getSigner: async () => ({
        address: ADDRESS,
        chainId: 1,
        signMessage: async () => `0x${"11".repeat(65)}`,
      }),
    });

    await provider();
    await provider.revoke();

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://chat.aomi.dev/api/widget/auth/session",
      expect.objectContaining({
        method: "DELETE",
        credentials: "omit",
        headers: { Authorization: "Bearer aomi_wst_session" },
      }),
    );
  });
});
