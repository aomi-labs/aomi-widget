import { describe, expect, it } from "vitest";

import {
  ALCHEMY_CHAIN_SLUGS,
  CHAIN_NAMES,
  CHAINS_BY_ID,
  SUPPORTED_CHAINS,
  SUPPORTED_CHAIN_IDS,
} from "../src/index";

describe("supported chain metadata", () => {
  it("keeps CLI chain IDs, names, and viem chain configs in sync", () => {
    expect(SUPPORTED_CHAIN_IDS).toEqual(
      SUPPORTED_CHAINS.map((chain) => chain.id),
    );

    for (const chain of SUPPORTED_CHAINS) {
      expect(CHAIN_NAMES[chain.id]).toBe(chain.name);
      expect(CHAINS_BY_ID[chain.id]?.id).toBe(chain.id);
    }
  });

  it("includes the networks surfaced by the headless SDK and widget UI", () => {
    expect(SUPPORTED_CHAIN_IDS).toEqual(
      expect.arrayContaining([
        1, 137, 42161, 8453, 10, 11155111, 59144, 59141, 143, 10143, 31337,
      ]),
    );
  });

  it("defines Alchemy slugs for supported Alchemy-backed RPC chains", () => {
    expect(ALCHEMY_CHAIN_SLUGS[59144]).toBe("linea-mainnet");
    expect(ALCHEMY_CHAIN_SLUGS[59141]).toBe("linea-sepolia");
  });
});
