import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbAomiUser } from "./types";

const mocks = vi.hoisted(() => ({
  findAomiUserById: vi.fn(),
  mint: vi.fn(),
}));

vi.mock("./db/queries", () => ({
  findAomiUserById: mocks.findAomiUserById,
}));

vi.mock("./topology", () => ({
  portalService: () => ({ mint: mocks.mint }),
}));

import {
  ACCOUNT_BEARER_TTL_SECONDS,
  AUDIENCE,
  mintAccountBearer,
} from "./bearer";

const USER: DbAomiUser = {
  id: "canonical-user-123",
  betterAuthUserId: "better-auth-123",
  displayName: null,
  primaryEmail: null,
  avatarUrl: null,
  metadata: {},
  deactivatedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

describe("mintAccountBearer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies the canonical account immediately before signing", async () => {
    mocks.findAomiUserById.mockResolvedValue(USER);
    mocks.mint.mockResolvedValue({
      accessToken: "signed-bearer",
      expiresAt: 1_000,
    });

    await expect(mintAccountBearer(USER.id)).resolves.toEqual({
      bearer: "signed-bearer",
      expiresAt: 1_000,
    });
    expect(mocks.findAomiUserById).toHaveBeenCalledWith(USER.id);
    expect(mocks.mint).toHaveBeenCalledWith({
      role: "user",
      subject: USER.id,
      audience: AUDIENCE,
      ttlSeconds: ACCOUNT_BEARER_TTL_SECONDS,
    });
  });

  it("refuses to sign a missing or deactivated account", async () => {
    mocks.findAomiUserById.mockResolvedValue(null);

    await expect(mintAccountBearer(USER.id)).rejects.toThrow(
      "Cannot mint AccountBearer: canonical user does not exist or is deactivated",
    );
    expect(mocks.mint).not.toHaveBeenCalled();
  });
});
