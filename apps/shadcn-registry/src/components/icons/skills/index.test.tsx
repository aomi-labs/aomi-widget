import { describe, expect, it } from "vitest";

import { getSkillIcon, JupiterSkillIcon, normalizeSkillId } from "./index";
import {
  skillIconFallbacks,
  skillIconGenericAliases,
  skillIconSources,
} from "./source-manifest";

const BUILT_IN_SKILL_IDS = [
  "aave",
  "across",
  "aerodrome",
  "arbitrum_bridge",
  "avantis",
  "base_native",
  "cctp",
  "common_erc20",
  "compound",
  "convex",
  "curve",
  "debridge",
  "drift",
  "dummy",
  "eigenlayer",
  "etherfi",
  "jupiter",
  "kamino",
  "kelp",
  "krexa",
  "lido",
  "lifi_swap",
  "mantle_staked_eth",
  "marinade",
  "meteora",
  "morpho",
  "oneinch",
  "openbook",
  "optimism_native",
  "pendle",
  "raydium",
  "renzo",
  "robinhood_stocks",
  "rocket_pool",
  "sanctum",
  "squads",
  "stargate",
  "sushiswap",
  "uniswap",
  "yearn",
  "zksync_era_native",
  "zora",
] as const;

describe("skill icon mapping", () => {
  it("normalizes wire IDs without changing their identity", () => {
    expect(normalizeSkillId("  Rocket-Pool ")).toBe("rocket_pool");
    expect(getSkillIcon("  Rocket-Pool ")).toBeDefined();
  });

  it("returns official marks for mapped built-in skills", () => {
    const mappedIds = [
      "aave",
      "across",
      "aerodrome",
      "arbitrum_bridge",
      "base_native",
      "compound",
      "convex",
      "curve",
      "etherfi",
      "jupiter",
      "kamino",
      "lifi_swap",
      "morpho",
      "oneinch",
      "openbook",
      "optimism_native",
      "pendle",
      "raydium",
      "renzo",
      "robinhood_stocks",
      "rocket_pool",
      "sanctum",
      "squads",
      "stargate",
      "sushiswap",
      "uniswap",
      "yearn",
      "zksync_era_native",
      "zora",
    ];

    for (const skillId of mappedIds) {
      expect(getSkillIcon(skillId), skillId).toBeDefined();
    }
    expect(getSkillIcon("jupiter")).toBe(JupiterSkillIcon);
  });

  it("reuses generic asset marks for generic token skills", () => {
    expect(getSkillIcon("cctp")).toBeDefined();
    expect(getSkillIcon("common_erc20")).toBeDefined();
    expect(getSkillIcon("common-erc20")).toBeDefined();
  });

  it("leaves unsupported and dynamic IDs to the caller fallback", () => {
    for (const skillId of skillIconFallbacks) {
      expect(getSkillIcon(skillId)).toBeUndefined();
    }
    expect(getSkillIcon("custom-user-skill")).toBeUndefined();
    expect(getSkillIcon(null)).toBeUndefined();
    expect(getSkillIcon(undefined)).toBeUndefined();
  });

  it("partitions every built-in ID exactly once in the icon manifest", () => {
    const manifestIds = [
      ...Object.keys(skillIconSources),
      ...Object.keys(skillIconGenericAliases),
      ...skillIconFallbacks,
    ];

    expect(new Set(manifestIds).size).toBe(BUILT_IN_SKILL_IDS.length);
    expect(new Set(manifestIds)).toEqual(new Set(BUILT_IN_SKILL_IDS));
    expect(manifestIds).toHaveLength(42);
  });
});
