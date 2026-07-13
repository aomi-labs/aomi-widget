// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getOrCreateError: null as Error | null,
  syncResolution: { status: "noop" } as
    | { status: "linked" }
    | { status: "noop" }
    | {
        status: "conflict";
        reason: "already_linked_to_another_account";
        signalType: "wallet" | "identity" | "email";
      },
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
      walletAttestations: [
        {
          provider: "privy",
          providerWalletId: "wallet-1",
          family: "evm",
          address: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
          chainScope: null,
        },
      ],
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
  syncProviderAttestedWallets: vi.fn(async () => mockState.syncResolution),
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
  withTransaction: vi.fn(async (fn) => fn({})),
}));

describe("exchangeProviderForExistingSession", () => {
  beforeEach(() => {
    mockState.getOrCreateError = null;
    mockState.syncResolution = { status: "noop" };
  });

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

  it("returns a handled conflict when an attested provider wallet belongs to another account", async () => {
    mockState.syncResolution = {
      status: "conflict",
      reason: "already_linked_to_another_account",
      signalType: "wallet",
    };
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
      signalType: "wallet",
    });
  });

  it("uses verified provider signals to adopt the existing canonical account", async () => {
    const accountService = await import("../src/service/account-service");
    const { exchangeProviderForExistingSession } =
      await import("../src/service/provider-exchange");

    await exchangeProviderForExistingSession({
      betterAuthUserId: "ba-user-1",
      credential: {
        provider: "privy",
        providerToken: "token",
      },
    });

    expect(
      accountService.getOrCreateAomiUserForBetterAuthSession,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        accessSignals: [
          {
            type: "identity",
            provider: "privy",
            subject: "did:privy:alice",
          },
          { type: "email", email: "alice@example.com" },
          {
            type: "wallet",
            family: "evm",
            normalizedAddress: "0xfcad0b19bb29d4674531d6f115237e16afce377c",
            chainScope: null,
          },
        ],
      }),
    );
  });

  it("exposes the same adoption signals to new-session provider exchange", async () => {
    const { providerAccessSignals } =
      await import("../src/service/provider-exchange");

    expect(
      providerAccessSignals({
        provider: "para",
        walletAttestationProvider: "para",
        token: {
          subject: "para-user-1",
          expiresAt: 1,
          email: "Returning.User@Example.com ",
          emailVerified: true,
          providerMetadata: {},
          walletAttestations: [
            {
              provider: "para",
              providerWalletId: "wallet-1",
              family: "evm",
              address: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
              chainScope: null,
            },
          ],
        },
      }),
    ).toEqual([
      { type: "identity", provider: "para", subject: "para-user-1" },
      { type: "email", email: "returning.user@example.com" },
      {
        type: "wallet",
        family: "evm",
        normalizedAddress: "0xfcad0b19bb29d4674531d6f115237e16afce377c",
        chainScope: null,
      },
    ]);
  });
});
