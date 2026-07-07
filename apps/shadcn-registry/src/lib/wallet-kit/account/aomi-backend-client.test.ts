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
});
