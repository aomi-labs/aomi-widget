// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  buildAccountResponse: vi.fn(),
  clearAomiBetterAuthUserIds: vi.fn(),
  countLoginFactors: vi.fn(),
  createAomiUser: vi.fn(),
  deactivateAomiUser: vi.fn(),
  deleteBetterAuthUsers: vi.fn(),
  deleteBetterAuthSiweWallet: vi.fn(),
  deleteBetterAuthSiwsWallet: vi.fn(),
  findAuthIdentityById: vi.fn(),
  findAuthIdentityForSubject: vi.fn(),
  findAomiUserById: vi.fn(),
  findProviderSubjectOwners: vi.fn(),
  findSignalOwner: vi.fn(),
  findWalletById: vi.fn(),
  listBetterAuthSiweWallets: vi.fn(),
  listBetterAuthSiwsWallets: vi.fn(),
  listBetterAuthUserIdsForAomiUser: vi.fn(),
  listWalletsForUser: vi.fn(),
  lockBetterAuthUser: vi.fn(),
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

const widgetMocks = vi.hoisted(() => ({
  deleteWidgetSessionsForProviderIdentity: vi.fn(async () => undefined),
  deleteWidgetSessionsForUser: vi.fn(async () => undefined),
}));

vi.mock("../src/db/queries", () => queryMocks);
vi.mock("../src/widget-auth/store", () => widgetMocks);

const tx = { tag: "transaction-client" };

function primeResolutionMocks() {
  queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
  queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
  queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
  queryMocks.listBetterAuthSiweWallets.mockResolvedValue([]);
  queryMocks.listBetterAuthSiwsWallets.mockResolvedValue([]);
  queryMocks.findSignalOwner.mockResolvedValue(null);
  queryMocks.findProviderSubjectOwners.mockResolvedValue([]);
  queryMocks.lockBetterAuthUser.mockResolvedValue(true);
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

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");

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

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");

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

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");

    await expect(
      getOrCreateAomiUserForBetterAuthSession({
        betterAuthUserId: "ba-user-1",
        email: "taken@example.com",
        emailVerified: true,
      }),
    ).rejects.toThrow("identity_already_linked_to_another_account");
  });

  it("rejects a carrier deleted after its session was read", async () => {
    primeResolutionMocks();
    queryMocks.lockBetterAuthUser.mockResolvedValue(false);

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");

    await expect(
      getOrCreateAomiUserForBetterAuthSession({
        betterAuthUserId: "ba-deleted",
      }),
    ).rejects.toThrow("account_session_invalid");
    expect(queryMocks.lockBetterAuthUser).toHaveBeenCalledWith(
      "ba-deleted",
      tx,
    );
  });
});

describe("Better Auth anonymous account upgrade", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("relinks both Better Auth subjects transactionally to the guest canonical UUID", async () => {
    primeResolutionMocks();
    queryMocks.createAomiUser.mockResolvedValue({ id: "guest-canonical" });
    queryMocks.findSignalOwner
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const { linkAnonymousCanonicalAccount } =
      await import("../src/service/account-service");
    await expect(
      linkAnonymousCanonicalAccount({
        anonymousBetterAuthUserId: "ba-guest",
        newBetterAuthUserId: "ba-verified",
        newEmail: "verified@example.com",
        newEmailVerified: true,
        newName: "Verified User",
      }),
    ).resolves.toBe("guest-canonical");

    expect(queryMocks.lockIdentityResolutionKeys).toHaveBeenLastCalledWith(
      ["identity:better_auth:ba-guest", "identity:better_auth:ba-verified"],
      tx,
    );
    expect(queryMocks.revokeAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "guest-canonical",
        subject: "ba-guest",
        db: tx,
      }),
    );
    expect(queryMocks.upsertAuthIdentity).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userId: "guest-canonical",
        subject: "ba-verified",
        email: "verified@example.com",
        db: tx,
      }),
    );
  });

  it("fails closed when the verified subject already owns another canonical account", async () => {
    primeResolutionMocks();
    queryMocks.createAomiUser.mockResolvedValue({ id: "guest-canonical" });
    queryMocks.findSignalOwner
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("existing-canonical");

    const { linkAnonymousCanonicalAccount } =
      await import("../src/service/account-service");
    await expect(
      linkAnonymousCanonicalAccount({
        anonymousBetterAuthUserId: "ba-guest",
        newBetterAuthUserId: "ba-verified",
      }),
    ).rejects.toThrow("anonymous_account_merge_required");
    expect(queryMocks.revokeAuthIdentity).not.toHaveBeenCalled();
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
    queryMocks.listBetterAuthUserIdsForAomiUser.mockResolvedValue([
      "ba-solo-user",
    ]);
    queryMocks.deleteBetterAuthUsers.mockResolvedValue(1);

    const { deactivateAomiAccount } =
      await import("../src/service/account-service");

    const result = await deactivateAomiAccount({ userId: "solo-user" });

    expect(result).toEqual({
      status: "deactivated",
      revokedIdentities: 1,
      revokedWallets: 0,
    });
    expect(queryMocks.deactivateAomiUser).toHaveBeenCalled();
    expect(queryMocks.deleteBetterAuthUsers).toHaveBeenCalledWith({
      betterAuthUserIds: ["ba-solo-user"],
      db: tx,
    });
    expect(widgetMocks.deleteWidgetSessionsForUser).toHaveBeenCalledWith({
      userId: "solo-user",
      db: tx,
    });
  });
});

describe("unlinkAuthIdentity revocation", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("allows removing the last provider identity and invalidates its carriers", async () => {
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
    queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
    queryMocks.findAuthIdentityById.mockResolvedValue({
      id: "para-row",
      userId: "user-a",
      provider: "para",
      issuerEnvironment: "para:beta",
      tenantId: "project-a",
      subject: "para-user",
    });
    queryMocks.revokeAuthIdentity.mockResolvedValue(true);
    queryMocks.listBetterAuthUserIdsForAomiUser.mockResolvedValue([
      "ba-user-a",
    ]);
    queryMocks.deleteBetterAuthUsers.mockResolvedValue(1);

    const { unlinkAuthIdentity } =
      await import("../src/service/account-service");

    await expect(
      unlinkAuthIdentity({ userId: "user-a", identityId: "para-row" }),
    ).resolves.toBe("revoked");
    expect(queryMocks.countLoginFactors).not.toHaveBeenCalled();
    expect(queryMocks.revokeAuthIdentity).toHaveBeenCalled();
    expect(queryMocks.deleteBetterAuthUsers).toHaveBeenCalledWith({
      betterAuthUserIds: ["ba-user-a"],
      db: tx,
    });
    expect(queryMocks.lockIdentityResolutionKeys).toHaveBeenCalledWith(
      ["aomi-login-factors:user-a"],
      tx,
    );
  });

  it("revokes a selected provider without consulting unrelated login factors", async () => {
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
    queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
    queryMocks.findAuthIdentityById.mockResolvedValue({
      id: "para-row",
      userId: "user-a",
      provider: "para",
      issuerEnvironment: "para:beta",
      tenantId: "project-a",
      subject: "para-user",
    });
    queryMocks.revokeAuthIdentity.mockResolvedValue(true);
    queryMocks.listBetterAuthUserIdsForAomiUser.mockResolvedValue([
      "ba-user-a",
    ]);
    queryMocks.deleteBetterAuthUsers.mockResolvedValue(1);

    const { unlinkAuthIdentity } =
      await import("../src/service/account-service");

    await expect(
      unlinkAuthIdentity({ userId: "user-a", identityId: "para-row" }),
    ).resolves.toBe("revoked");
    expect(queryMocks.countLoginFactors).not.toHaveBeenCalled();
    expect(queryMocks.revokeAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-a", db: tx }),
    );
    expect(queryMocks.clearAomiBetterAuthUserIds).toHaveBeenCalledWith({
      userId: "user-a",
      betterAuthUserIds: ["ba-user-a"],
      db: tx,
    });
    expect(queryMocks.deleteBetterAuthUsers).toHaveBeenCalledWith({
      betterAuthUserIds: ["ba-user-a"],
      db: tx,
    });
    expect(
      widgetMocks.deleteWidgetSessionsForProviderIdentity,
    ).toHaveBeenCalledWith({ providerIdentityId: "para-row", db: tx });
  });
});

describe("unlinkWallet last-factor handling", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not unlink a wallet when it is the last usable login method", async () => {
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
    queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
    queryMocks.findWalletById.mockResolvedValue({
      id: "wallet-1",
      userId: "user-a",
      family: "evm",
      address: "0x0000000000000000000000000000000000000001",
      linkedVia: "siwe",
    });
    queryMocks.countLoginFactors.mockResolvedValue(1);

    const { unlinkWallet } = await import("../src/service/account-service");

    await expect(
      unlinkWallet({ userId: "user-a", walletId: "wallet-1" }),
    ).resolves.toBe("last_factor");
    expect(queryMocks.revokeWallet).not.toHaveBeenCalled();
    expect(queryMocks.lockIdentityResolutionKeys).toHaveBeenCalledWith(
      ["aomi-login-factors:user-a"],
      tx,
    );
  });

  it("allows removing an embedded provider wallet without treating it as a login factor", async () => {
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
    queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
    queryMocks.findWalletById.mockResolvedValue({
      id: "wallet-embedded",
      userId: "user-a",
      family: "evm",
      address: "0x0000000000000000000000000000000000000002",
      linkedVia: "para",
    });
    queryMocks.revokeWallet.mockResolvedValue(true);

    const { unlinkWallet } = await import("../src/service/account-service");

    await expect(
      unlinkWallet({ userId: "user-a", walletId: "wallet-embedded" }),
    ).resolves.toBe("revoked");
    expect(queryMocks.countLoginFactors).not.toHaveBeenCalled();
    expect(queryMocks.revokeWallet).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: "wallet-embedded", db: tx }),
    );
  });

  it("removes a SIWE wallet's Better Auth and widget sessions when another login remains", async () => {
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(tx));
    queryMocks.lockIdentityResolutionKeys.mockResolvedValue(undefined);
    queryMocks.findWalletById.mockResolvedValue({
      id: "wallet-siwe",
      userId: "user-a",
      family: "evm",
      address: "0x0000000000000000000000000000000000000003",
      linkedVia: "siwe",
    });
    queryMocks.findAuthIdentityForSubject.mockResolvedValue({
      id: "siwe-identity",
    });
    queryMocks.countLoginFactors.mockResolvedValue(2);
    queryMocks.revokeWallet.mockResolvedValue(true);
    queryMocks.revokeAuthIdentity.mockResolvedValue(true);
    queryMocks.deleteBetterAuthSiweWallet.mockResolvedValue({
      deleted: true,
      betterAuthUserIds: ["ba-siwe-user"],
    });
    queryMocks.deleteBetterAuthUsers.mockResolvedValue(1);

    const { unlinkWallet } = await import("../src/service/account-service");

    await expect(
      unlinkWallet({ userId: "user-a", walletId: "wallet-siwe" }),
    ).resolves.toBe("revoked");
    expect(queryMocks.deleteBetterAuthUsers).toHaveBeenCalledWith({
      betterAuthUserIds: ["ba-siwe-user"],
      db: tx,
    });
    expect(
      widgetMocks.deleteWidgetSessionsForProviderIdentity,
    ).toHaveBeenCalledWith({ providerIdentityId: "siwe-identity", db: tx });
  });
});
