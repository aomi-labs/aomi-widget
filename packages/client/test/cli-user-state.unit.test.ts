import { describe, expect, it } from "vitest";

import { buildCliUserState } from "../src/cli/user-state";

describe("CLI user state builder", () => {
  it("builds chain-only user state when no public key is present", () => {
    expect(buildCliUserState(undefined, 137)).toEqual({
      chainId: 137,
    });
  });

  it("builds wallet-aware user state when both public key and chain are present", () => {
    expect(
      buildCliUserState(
        "0x9cb9ec43b1Dcbe0ea37bfA9A99f2c9AAe2eBf2EB",
        137,
      ),
    ).toEqual({
      address: "0x9cb9ec43b1Dcbe0ea37bfA9A99f2c9AAe2eBf2EB",
      isConnected: true,
      chainId: 137,
    });
  });
});
