// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => ({
  providerSessionUserSeed: vi.fn(() => ({
    email: "alice@example.com",
    emailVerified: true,
    name: "Alice",
  })),
  verifyProviderCredential: vi.fn(async () => ({
    provider: "para",
    issuerEnvironment: "para:beta",
    tenantId: "project-a",
    walletAttestationProvider: "para",
    token: {
      subject: "para-user",
      expiresAt: 2_000_000_000,
      email: "alice@example.com",
      emailVerified: true,
      providerMetadata: {},
      walletAttestations: [],
    },
  })),
}));

const exchangeMocks = vi.hoisted(() => ({
  signInWithVerifiedProviderCredential: vi.fn(async () => ({
    status: "conflict",
    reason: "already_linked_to_another_account",
    signalType: "wallet",
  })),
}));

vi.mock("../src/providers", () => providerMocks);
vi.mock("../src/service/provider-exchange", () => exchangeMocks);
vi.mock("../src/db/queries", () => ({
  buildAccountResponse: vi.fn(),
}));

import { aomiProviderAuthPlugin } from "../src/better-auth/provider-plugin";

describe("provider auth plugin", () => {
  it("does not create a session when verified signals conflict", async () => {
    const createSession = vi.fn();
    const endpoint = aomiProviderAuthPlugin().endpoints
      ?.exchangeProviderToken as unknown as (ctx: unknown) => Promise<unknown>;

    await expect(
      endpoint({
        request: new Request(
          "https://chat.aomi.dev/api/auth/aomi/provider/exchange",
        ),
        body: {
          provider: "para",
          providerToken: "token",
        },
        context: {
          internalAdapter: {
            findUserByEmail: vi.fn(async () => ({
              user: {
                id: "ba-user-1",
                email: "alice@example.com",
                emailVerified: true,
                name: "Alice",
              },
            })),
            createUser: vi.fn(),
            createSession,
          },
        },
        json: vi.fn(),
      }),
    ).rejects.toMatchObject({
      body: expect.objectContaining({
        message: "already_linked_to_another_account",
      }),
    });
    expect(createSession).not.toHaveBeenCalled();
  });
});
