import { describe, expect, it } from "vitest";
import { mainnet } from "viem/chains";

import {
  describeExecutionDecision,
  getAlternativeAAMode,
  resolveCliExecutionDecision,
} from "../../src/cli/aa";
import type { AAWalletCall } from "../../src/aa";

const CALL_LIST: AAWalletCall[] = [
  {
    to: "0x1111111111111111111111111111111111111111",
    value: BigInt(1),
    chainId: 1,
  },
];

describe("CLI execution decision", () => {
  it("defaults to AA (7702) through the backend proxy", () => {
    const decision = resolveCliExecutionDecision({
      config: { secrets: {} },
      chain: mainnet,
      callList: CALL_LIST,
    });

    expect(decision).toEqual({
      execution: "aa",
      provider: "alchemy",
      aaMode: "7702",
      modeExplicit: false,
      proxy: true,
    });
    expect(describeExecutionDecision(decision)).toBe(
      "aa (alchemy, 7702, proxy)",
    );
  });

  it("respects --eoa", () => {
    const decision = resolveCliExecutionDecision({
      config: { execution: "eoa", secrets: {} },
      chain: mainnet,
      callList: CALL_LIST,
    });

    expect(decision).toEqual({ execution: "eoa" });
    expect(getAlternativeAAMode(decision)).toBeNull();
  });

  it("marks an explicit --aa-mode and offers no alternative", () => {
    const decision = resolveCliExecutionDecision({
      config: { execution: "aa", aaMode: "4337", secrets: {} },
      chain: mainnet,
      callList: CALL_LIST,
    });

    expect(decision).toMatchObject({
      execution: "aa",
      aaMode: "4337",
      modeExplicit: true,
    });
    expect(getAlternativeAAMode(decision)).toBeNull();
  });

  it("offers the alternative mode when the mode was not explicit", () => {
    const decision = resolveCliExecutionDecision({
      config: { secrets: {} },
      chain: mainnet,
      callList: CALL_LIST,
    });

    expect(getAlternativeAAMode(decision)).toMatchObject({
      execution: "aa",
      aaMode: "4337",
    });
  });

  it("ignores client-side provider keys — the proxy owns the credential", () => {
    process.env.ALCHEMY_API_KEY = "should-not-matter";
    try {
      const decision = resolveCliExecutionDecision({
        config: { secrets: {} },
        chain: mainnet,
        callList: CALL_LIST,
      });
      expect(decision).toMatchObject({ execution: "aa", proxy: true });
    } finally {
      delete process.env.ALCHEMY_API_KEY;
    }
  });
});
