// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getOrCreateError: null as Error | null,
}));

vi.mock("../src/providers/account-credentials", () => ({
  createDefaultProviderCredentialVerifiers: vi.fn(),
  isVerifiedProviderTokenCredential: vi.fn(() => true),
  providerSessionUserSeed: vi.fn(() => ({
    email: "alice@example.com",
    emailVerified: true,
    name: "Alice",
  })),
  verifyProviderCredential: vi.fn(async () => ({
    provider: "privy",
    walletAttestationProvider: "privy",
    token: {
      subject: "did:privy:alice",
      expiresAt: 1,
      email: "alice@example.com",
      emailVerified: true,
      providerMetadata: {},
    },
  })),
}));

vi.mock("../src/service/account-service", () => ({
  getOrCreateAomiUserForBetterAuthSession: vi.fn(async () => {
    if (mockState.getOrCreateError) throw mockState.getOrCreateError;
    return { id: "user-1" };
  }),
  isIdentityAlreadyLinkedError: vi.fn(
    (error: unknown) =>
      error instanceof Error &&
      error.message === "identity_already_linked_to_another_account",
  ),
  linkProviderIdentity: vi.fn(async () => ({ status: "linked" })),
  syncProviderAttestedWallets: vi.fn(async () => undefined),
}));

vi.mock("../src/db/queries", () => ({
  buildAccountResponse: vi.fn(async ({ user }) => ({
    user,
    linkedAccounts: [],
    wallets: [],
    session: null,
  })),
  findAomiUserByBetterAuthId: vi.fn(),
  findAomiUserById: vi.fn(async () => ({ id: "user-1" })),
}));

describe("exchangeProviderForExistingSession", () => {
  it("returns a handled conflict for better_auth identity collisions", async () => {
    mockState.getOrCreateError = new Error(
      "identity_already_linked_to_another_account",
    );
    const { exchangeProviderForExistingSession } =
      await import("../src/service/provider-exchange");

    await expect(
      exchangeProviderForExistingSession({
        betterAuthUserId: "ba-user-1",
        credential: {
          provider: "privy",
          providerToken: "token",
        },
      }),
    ).resolves.toEqual({
      status: "conflict",
      reason: "already_linked_to_another_account",
      signalType: "identity",
    });
  });
});
