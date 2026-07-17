import { describe, expect, it, vi } from "vitest";
import { createAomiBackendAccountClient } from "./aomi-backend-client";

describe("createAomiBackendAccountClient", () => {
  it("maps Better Auth APIError messages to account-friendly errors", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ message: "already_linked_to_another_account" }),
    }));
    const client = createAomiBackendAccountClient({
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.exchangeProviderCredential(
        {
          provider: "para",
          tokenKind: "session_jwt",
          providerToken: "para-jwt",
        },
        { hasAccount: true },
      ),
    ).rejects.toThrow(
      "This wallet or sign-in method is already linked to another Aomi account.",
    );
  });

  it("uses BetterAuth SIWS endpoints for browser sign-in and linking", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ nonce: "nonce" }),
    }));
    const client = createAomiBackendAccountClient({
      fetch: fetchImpl as unknown as typeof fetch,
    });

    await client.createSiwsNonce({
      walletAddress: "SolanaAddress",
      chainId: "solana:devnet",
      intent: "link",
    });
    await client.verifySiws({
      message: "message",
      signature: "signature",
      walletAddress: "SolanaAddress",
      chainId: "solana:devnet",
      intent: "link",
      label: "Phantom 1",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/api/auth/siws/nonce",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          walletAddress: "SolanaAddress",
          chainId: "solana:devnet",
          intent: "link",
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/auth/siws/verify",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          message: "message",
          signature: "signature",
          walletAddress: "SolanaAddress",
          chainId: "solana:devnet",
          intent: "link",
          label: "Phantom 1",
        }),
      }),
    );
  });
});
