// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const accountMocks = vi.hoisted(() => ({
  getOrCreateAomiUserForBetterAuthSession: vi.fn(),
  syncBetterAuthWalletsForUser: vi.fn(),
}));

vi.mock("@aomi-labs/account/account", () => accountMocks);

import { resolveMcpCanonicalUser } from "./session";

describe("resolveMcpCanonicalUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountMocks.getOrCreateAomiUserForBetterAuthSession.mockResolvedValue({
      id: "canonical-user-1",
    });
    accountMocks.syncBetterAuthWalletsForUser.mockResolvedValue(undefined);
  });

  it("materializes SIWE wallets into public_keys before MCP tools run", async () => {
    await expect(
      resolveMcpCanonicalUser({ betterAuthUserId: "ba-user-1" }),
    ).resolves.toEqual({ id: "canonical-user-1" });

    expect(
      accountMocks.getOrCreateAomiUserForBetterAuthSession,
    ).toHaveBeenCalledWith({
      betterAuthUserId: "ba-user-1",
    });
    expect(accountMocks.syncBetterAuthWalletsForUser).toHaveBeenCalledWith({
      aomiUserId: "canonical-user-1",
      betterAuthUserId: "ba-user-1",
    });
  });
});
