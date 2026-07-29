import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const CALLBACK = {
  state: "signed-state",
  access_token: "privy-access-token",
  user_id: "did:privy:alice",
  wallets: [
    {
      id: "wallet-1",
      address: "0x1234567890abcdef1234567890ABCDEF12345678",
      chain_type: "ethereum",
    },
  ],
};

describe("Privy delegation callback proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards a well-formed callback to the configured backend", async () => {
    vi.stubEnv("AOMI_PROXY_BACKEND_URL", "https://api.test.aomi.dev");
    const fetchMock = vi.fn(async () => new Response("done", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://portal.test/api/delegation/privy/callback", {
        method: "POST",
        body: JSON.stringify(CALLBACK),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "connected" });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/auth/privy/callback", "https://api.test.aomi.dev/"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects malformed browser input without contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://portal.test/api/delegation/privy/callback", {
        method: "POST",
        body: JSON.stringify({ state: "missing-token" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose an upstream callback body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("secret upstream error", { status: 403 })),
    );

    const response = await POST(
      new Request("https://portal.test/api/delegation/privy/callback", {
        method: "POST",
        body: JSON.stringify(CALLBACK),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "privy_delegation_rejected",
    });
  });
});
