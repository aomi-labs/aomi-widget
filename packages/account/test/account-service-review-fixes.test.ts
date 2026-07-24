// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  buildAccountResponse: vi.fn(),
  clearAomiBetterAuthUserIds: vi.fn(),
  countLoginFactors: vi.fn(),
  createAomiUser: vi.fn(),
  deactivateAomiUser: vi.fn(),
  deleteBetterAuthSiweWallet: vi.fn(),
  deleteBetterAuthSiwsWallet: vi.fn(),
  findAuthIdentityById: vi.fn(),
  findAomiUserById: vi.fn(),
  findProviderSubjectOwners: vi.fn(),
  findSignalOwner: vi.fn(),
  findWalletById: vi.fn(),
  listBetterAuthSiweWallets: vi.fn(),
  listBetterAuthSiwsWallets: vi.fn(),
  listWalletsForUser: vi.fn(),
  lockIdentityResolutionKeys: vi.fn(),
  logAccountEvent: vi.fn(),
  revokeAllAuthIdentitiesForUser: vi.fn(),
  revokeAllWalletsForUser: vi.fn(),
  revokeAuthIdentity: vi.fn(),
  revokeWallet: vi.fn(),
  runAomiAuthSchema: vi.fn(),
  touchAomiUser: vi.fn(),
  updateAuthIdentityLabel: vi.fn(),
  updateAomiUserProfile: vi.fn(),
  updateWalletLabel: vi.fn(),
  upsertAuthIdentity: vi.fn(),
  upsertEmailIdentity: vi.fn(),
  upsertWallet: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("../src/db/queries", () => queryMocks);

const tx = { tag: "transaction-client" };

function primeResolutionMocks() {
  queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
  queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
  queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
  queryMocks.listBetterAuthSiweWallets.mockResolvedValue([]);
  queryMocks.listBetterAuthSiwsWallets.mockResolvedValue([]);
  queryMocks.findSignalOwner.mockResolvedValue(null);
  queryMocks.findProviderSubjectOwners.mockResolvedValue([]);
  queryMocks.createAomiUser.mockResolvedValue({ id: "new-user" });
  queryMocks.upsertAuthIdentity.mockResolvedValue({ id: "ba-identity" });
}

describe("getOrCreateAomiUserForBetterAuthSession email atomicity", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("writes the verified-email identity inside the resolution transaction", async () => {
    primeResolutionMocks();
    queryMocks.upsertEmailIdentity.mockResolvedValue({ id: "email-row" });

    const { getOrCreateAomiUserForBetterAuthSession } = await import(
      "../src/service/account-service"
    );

    const user = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: "ba-user-1",
      email: "alice@example.com",
      emailVerified: true,
      name: "Alice",
    });

    expect(user.id).toBe("new-user");
    // Same tx client the resolver locked/created under — proves the email
    // identity commits atomically with the new user rather than in a separate
    // transaction that could orphan it.
    expect(queryMocks.upsertEmailIdentity).toHaveBeenCalledWith({
      userId: "new-user",
      email: "alice@example.com",
      db: tx,
    });
  });

  it("does not write an email identity when the email is unverified", async () => {
    primeResolutionMocks();

    const { getOrCreateAomiUserForBetterAuthSession } = await import(
      "../src/service/account-service"
    );

    await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: "ba-user-1",
      email: "alice@example.com",
      emailVerified: false,
    });

    expect(queryMocks.upsertEmailIdentity).not.toHaveBeenCalled();
  });

  it("propagates a cross-user email conflict so the transaction rolls back", async () => {
    primeResolutionMocks();
    queryMocks.upsertEmailIdentity.mockRejectedValue(
      new Error("identity_already_linked_to_another_account"),
    );

    const { getOrCreateAomiUserForBetterAuthSession } = await import(
      "../src/service/account-service"
    );

    await expect(
      getOrCreateAomiUserForBetterAuthSession({
        betterAuthUserId: "ba-user-1",
        email: "taken@example.com",
        emailVerified: true,
      }),
    ).rejects.toThrow("identity_already_linked_to_another_account");
  });
});

describe("deactivateAomiAccount last-factor handling", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("deletes a single-factor account instead of blocking on last_factor", async () => {
    queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
    queryMocks.findAomiUserById.mockResolvedValue({
      id: "solo-user",
      betterAuthUserId: null,
    });
    // A Para-only / SIWE-only user has exactly one login factor.
    queryMocks.countLoginFactors.mockResolvedValue(1);
    queryMocks.revokeAllAuthIdentitiesForUser.mockResolvedValue(1);
    queryMocks.revokeAllWalletsForUser.mockResolvedValue(0);
    queryMocks.deactivateAomiUser.mockResolvedValue(true);

    const { deactivateAomiAccount } = await import(
      "../src/service/account-service"
    );

    const result = await deactivateAomiAccount({ userId: "solo-user" });

    expect(result).toEqual({
      status: "deactivated",
      revokedIdentities: 1,
      revokedWallets: 0,
    });
    expect(queryMocks.deactivateAomiUser).toHaveBeenCalled();
  });
});
