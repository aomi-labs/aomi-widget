// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  buildAccountResponse: vi.fn(),
  clearAomiBetterAuthUserIds: vi.fn(),
  countLoginFactors: vi.fn(),
  createAomiUser: vi.fn(),
  deactivateAomiUser: vi.fn(),
  deleteBetterAuthSiweWallet: vi.fn(),
  findAuthIdentityById: vi.fn(),
  findAomiUserById: vi.fn(),
  findAomiUserByBetterAuthId: vi.fn(),
  findLegacyBackendUserIdByWallet: vi.fn(),
  findSignalOwner: vi.fn(),
  findWalletById: vi.fn(),
  listBetterAuthSiweWallets: vi.fn(),
  listWalletsForUser: vi.fn(),
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

describe("getOrCreateAomiUserForBetterAuthSession adoption", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("preserves an existing wallet-keyed canonical UUID on first BetterAuth SIWE login", async () => {
    const legacyUserId = "2f7d9690-10aa-49f2-9f20-067aa8cc9a17";
    const db = { tag: "transaction-client" };
    queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(db));
    queryMocks.findAomiUserByBetterAuthId.mockResolvedValue(null);
    queryMocks.listBetterAuthSiweWallets.mockResolvedValue([
      {
        betterAuthUserId: "ba-user-1",
        address: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
        chainId: 1,
        isPrimary: true,
        createdAt: new Date(),
      },
    ]);
    queryMocks.findSignalOwner.mockResolvedValue(null);
    queryMocks.findLegacyBackendUserIdByWallet.mockResolvedValue(legacyUserId);
    queryMocks.createAomiUser.mockResolvedValue({
      id: legacyUserId,
    });

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");

    const user = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: "ba-user-1",
      email: "alice@example.com",
      emailVerified: true,
      name: "Alice",
    });

    expect(user.id).toBe(legacyUserId);
    expect(queryMocks.findLegacyBackendUserIdByWallet).toHaveBeenCalledWith(
      "0xfcad0b19bb29d4674531d6f115237e16afce377c",
      db,
    );
    expect(queryMocks.createAomiUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: legacyUserId,
        db,
      }),
    );
    expect(queryMocks.upsertAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: legacyUserId,
        provider: "better_auth",
        subject: "ba-user-1",
        db,
      }),
    );
  });

  it("creates one canonical user and links both SIWE ownership signals", async () => {
    const db = { tag: "transaction-client" };
    queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(db));
    queryMocks.findSignalOwner.mockResolvedValue(null);
    queryMocks.createAomiUser.mockResolvedValue({ id: "user-1" });
    queryMocks.upsertAuthIdentity.mockResolvedValue({ id: "identity-1" });
    queryMocks.upsertWallet.mockResolvedValue({ id: "wallet-1" });

    const { getOrCreateAomiUserForSiwe } =
      await import("../src/service/account-service");

    const user = await getOrCreateAomiUserForSiwe({
      address: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
      chainId: 1,
    });

    expect(user.id).toBe("user-1");
    expect(queryMocks.createAomiUser).toHaveBeenCalledWith(
      expect.objectContaining({ db }),
    );
    expect(queryMocks.upsertAuthIdentity).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "siwe",
      subject: "eip155:*:0xfcad0b19bb29d4674531d6f115237e16afce377c",
      db,
    });
    expect(queryMocks.upsertWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        address: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
        linkedVia: "siwe",
        db,
      }),
    );
  });

  it("rejects a SIWE proof when wallet and identity signals have different owners", async () => {
    const db = { tag: "transaction-client" };
    queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(db));
    queryMocks.findSignalOwner
      .mockResolvedValueOnce("user-wallet")
      .mockResolvedValueOnce("user-identity");

    const { getOrCreateAomiUserForSiwe } =
      await import("../src/service/account-service");

    await expect(
      getOrCreateAomiUserForSiwe({
        address: "0xFCAd0B19bB29D4674531d6f115237E16AfCE377c",
        chainId: 1,
      }),
    ).rejects.toThrow("conflicting_identity_owners");
    expect(queryMocks.createAomiUser).not.toHaveBeenCalled();
  });
});
