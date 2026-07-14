// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  buildAccountResponse: vi.fn(),
  clearAomiBetterAuthUserIds: vi.fn(),
  countLoginFactors: vi.fn(),
  createAomiUserForBetterAuth: vi.fn(),
  deactivateAomiUser: vi.fn(),
  deleteAomiUserIfAuthOnlyShell: vi.fn(),
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
    queryMocks.createAomiUserForBetterAuth.mockResolvedValue({
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
    expect(queryMocks.createAomiUserForBetterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: legacyUserId,
        betterAuthUserId: "ba-user-1",
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

  it("recovers a failed provider login shell onto the established wallet owner", async () => {
    const shellUser = { id: "shell-user" };
    const walletOwner = { id: "wallet-owner" };
    const db = { tag: "transaction-client" };
    queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(db));
    queryMocks.listBetterAuthSiweWallets.mockResolvedValue([]);
    queryMocks.findAomiUserByBetterAuthId.mockResolvedValue(shellUser);
    queryMocks.findSignalOwner.mockImplementation(async (signal) => {
      if (signal.type === "wallet") return walletOwner.id;
      if (signal.type === "email") return shellUser.id;
      return null;
    });
    queryMocks.findAomiUserById.mockResolvedValue(walletOwner);
    queryMocks.deleteAomiUserIfAuthOnlyShell.mockResolvedValue(true);

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");
    const user = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: "ba-user-1",
      email: "alice@example.com",
      emailVerified: true,
      accessSignals: [
        { type: "email", email: "alice@example.com" },
        {
          type: "wallet",
          family: "evm",
          normalizedAddress: "0xfcad0b19bb29d4674531d6f115237e16afce377c",
          chainScope: null,
        },
      ],
    });

    expect(user).toBe(walletOwner);
    expect(queryMocks.findSignalOwner.mock.calls[0]?.[0]).toMatchObject({
      type: "wallet",
    });
    expect(queryMocks.deleteAomiUserIfAuthOnlyShell).toHaveBeenCalledWith(
      shellUser.id,
      db,
    );
    expect(queryMocks.upsertAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: walletOwner.id,
        provider: "better_auth",
        subject: "ba-user-1",
        db,
      }),
    );
  });

  it("does not move a BetterAuth mapping when the current account is not empty", async () => {
    const currentUser = { id: "current-user" };
    const walletOwner = { id: "wallet-owner" };
    const db = { tag: "transaction-client" };
    queryMocks.runAomiAuthSchema.mockResolvedValue(undefined);
    queryMocks.withTransaction.mockImplementation(async (fn) => fn(db));
    queryMocks.listBetterAuthSiweWallets.mockResolvedValue([]);
    queryMocks.findAomiUserByBetterAuthId.mockResolvedValue(currentUser);
    queryMocks.findSignalOwner.mockResolvedValue(walletOwner.id);
    queryMocks.findAomiUserById.mockResolvedValue(walletOwner);
    queryMocks.deleteAomiUserIfAuthOnlyShell.mockResolvedValue(false);

    const { getOrCreateAomiUserForBetterAuthSession } =
      await import("../src/service/account-service");
    const user = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: "ba-user-1",
      accessSignals: [
        { type: "identity", provider: "para", subject: "para-user" },
      ],
    });

    expect(user).toBe(currentUser);
    expect(queryMocks.upsertAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: currentUser.id }),
    );
  });
});
