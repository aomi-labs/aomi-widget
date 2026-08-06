// Mock data + helpers for the Skills marketplace tab.
//
// The shape mirrors the live backend endpoint `GET /api/resource/skills`
// (`skill_summary` in aomi/crates/core/src/resource/catalog.rs): the list card
// carries `id, name, description, tags, chain_ids, injected_tools, est_tokens,
// next_step`, and the detail (`GET /api/resource/skills/:skill_id`) adds
// `tool_names`, `instructions`, and an `activation` hint.
//
// NOTE (net-new gaps this mock papers over, confirmed in the codebase walk):
//   - `name` is really just the id string (build.rs sets name == skill_id), so
//     the UI prettifies it here. Curated display names would be a manifest add.
//   - there is NO `icon` and NO formal `category` on a skill — category is
//     SYNTHESIZED from `tags` below; the tile is a generated monogram.
//   - skills have NO per-account install/enable (they enable at the app level),
//     so "Activate" here is a client-only optimistic mock, not a real write.
//
// To go live: replace `fetchSkills()` with
//   settingsApiFetch<SkillSummary[]>("/api/resource/skills")
// and add `/api/resource/skills` (+ `/:skill_id`) to the portal proxy
// allowlist in apps/portal/src/app/api/[...slug]/route.ts.

export type SkillSummary = {
  kind: "skill";
  id: string;
  /** Backend returns id here; we prettify for display via `displayName`. */
  name: string;
  description: string;
  tags: string[];
  chain_ids: number[];
  injected_tools: string[];
  est_tokens: number;
  next_step?: string | null;
};

const SKILLS: SkillSummary[] = [
  {
    kind: "skill",
    id: "aave",
    name: "aave",
    description:
      "Supply, borrow, repay, and manage health factor across Aave v3 lending markets.",
    tags: ["lending", "defi"],
    chain_ids: [1, 8453, 42161, 10, 137],
    injected_tools: ["aave_supply", "aave_borrow", "aave_repay", "aave_withdraw"],
    est_tokens: 1800,
  },
  {
    kind: "skill",
    id: "uniswap",
    name: "uniswap",
    description:
      "Swap tokens and manage concentrated-liquidity positions on Uniswap v3/v4.",
    tags: ["dex", "amm", "swap"],
    chain_ids: [1, 8453, 42161, 10],
    injected_tools: ["uniswap_quote", "uniswap_swap", "uniswap_add_liquidity"],
    est_tokens: 2100,
  },
  {
    kind: "skill",
    id: "morpho",
    name: "morpho",
    description:
      "Lend and borrow through Morpho Blue isolated markets and curated vaults.",
    tags: ["lending", "defi"],
    chain_ids: [1, 8453],
    injected_tools: ["morpho_supply", "morpho_borrow", "morpho_vault_deposit"],
    est_tokens: 1600,
  },
  {
    kind: "skill",
    id: "curve",
    name: "curve",
    description:
      "Trade stable and crypto pools and provide liquidity on Curve.",
    tags: ["dex", "stableswap"],
    chain_ids: [1, 42161, 137],
    injected_tools: ["curve_swap", "curve_add_liquidity"],
    est_tokens: 1500,
  },
  {
    kind: "skill",
    id: "lido",
    name: "lido",
    description: "Stake ETH for stETH and wrap/unwrap wstETH via Lido.",
    tags: ["staking", "liquid-staking"],
    chain_ids: [1],
    injected_tools: ["lido_stake", "lido_wrap", "lido_unwrap"],
    est_tokens: 900,
  },
  {
    kind: "skill",
    id: "pendle",
    name: "pendle",
    description:
      "Trade yield: mint PT/YT, swap, and manage maturities on Pendle.",
    tags: ["yield", "fixed-income"],
    chain_ids: [1, 42161],
    injected_tools: ["pendle_swap", "pendle_mint", "pendle_redeem"],
    est_tokens: 1700,
  },
  {
    kind: "skill",
    id: "gmx",
    name: "gmx",
    description:
      "Open and manage leveraged perpetuals and GLP positions on GMX.",
    tags: ["perps", "derivatives"],
    chain_ids: [42161, 43114],
    injected_tools: ["gmx_open_position", "gmx_close_position"],
    est_tokens: 2000,
  },
  {
    kind: "skill",
    id: "hyperliquid",
    name: "hyperliquid",
    description:
      "Trade perpetuals and manage cross-margin on the Hyperliquid L1.",
    tags: ["perps", "derivatives"],
    chain_ids: [],
    injected_tools: ["hl_place_order", "hl_cancel_order", "hl_positions"],
    est_tokens: 1900,
  },
  {
    kind: "skill",
    id: "across",
    name: "across",
    description:
      "Bridge assets across chains with intent-based fast fills on Across.",
    tags: ["bridge", "cross-chain"],
    chain_ids: [1, 8453, 42161, 10],
    injected_tools: ["across_quote", "across_bridge"],
    est_tokens: 1200,
  },
  {
    kind: "skill",
    id: "lifi",
    name: "lifi",
    description:
      "Route and execute cross-chain swaps and bridges through the LI.FI aggregator.",
    tags: ["bridge", "aggregator", "cross-chain"],
    chain_ids: [1, 8453, 42161, 10, 137],
    injected_tools: ["lifi_route", "lifi_execute"],
    est_tokens: 1600,
  },
  {
    kind: "skill",
    id: "ens",
    name: "ens",
    description: "Resolve, register, and manage ENS names and text records.",
    tags: ["identity"],
    chain_ids: [1],
    injected_tools: ["ens_resolve", "ens_register"],
    est_tokens: 800,
  },
  {
    kind: "skill",
    id: "eigenlayer",
    name: "eigenlayer",
    description:
      "Restake ETH and LSTs and delegate to operators on EigenLayer.",
    tags: ["staking", "restaking"],
    chain_ids: [1],
    injected_tools: ["eigen_deposit", "eigen_delegate", "eigen_undelegate"],
    est_tokens: 1400,
  },
  {
    kind: "skill",
    id: "yearn",
    name: "yearn",
    description: "Deposit into auto-compounding yield vaults on Yearn.",
    tags: ["yield", "vault"],
    chain_ids: [1, 42161, 10],
    injected_tools: ["yearn_deposit", "yearn_withdraw"],
    est_tokens: 1000,
  },
  {
    kind: "skill",
    id: "polymarket",
    name: "polymarket",
    description: "Browse markets and place outcome trades on Polymarket.",
    tags: ["prediction", "prediction-market"],
    chain_ids: [137],
    injected_tools: ["polymarket_markets", "polymarket_trade"],
    est_tokens: 1500,
  },
  {
    kind: "skill",
    id: "sky",
    name: "sky",
    description:
      "Open vaults, mint USDS/DAI, and manage collateralized debt positions on Sky (Maker).",
    tags: ["stablecoin", "cdp", "lending"],
    chain_ids: [1],
    injected_tools: ["sky_open_vault", "sky_mint", "sky_repay"],
    est_tokens: 1300,
  },
  {
    kind: "skill",
    id: "jupiter",
    name: "jupiter",
    description:
      "Swap SPL tokens with best-route aggregation on Jupiter (Solana).",
    tags: ["dex", "aggregator", "swap"],
    chain_ids: [101],
    injected_tools: ["jupiter_quote", "jupiter_swap"],
    est_tokens: 1400,
  },
  {
    kind: "skill",
    id: "marinade",
    name: "marinade",
    description: "Liquid-stake SOL for mSOL on Marinade (Solana).",
    tags: ["staking", "liquid-staking"],
    chain_ids: [101],
    injected_tools: ["marinade_stake", "marinade_unstake"],
    est_tokens: 900,
  },
  {
    kind: "skill",
    id: "kamino",
    name: "kamino",
    description:
      "Lend, borrow, and run leveraged vaults on Kamino (Solana).",
    tags: ["lending", "yield"],
    chain_ids: [101],
    injected_tools: ["kamino_supply", "kamino_borrow"],
    est_tokens: 1500,
  },
  {
    kind: "skill",
    id: "drift",
    name: "drift",
    description:
      "Trade perps and spot with cross-margin on Drift (Solana).",
    tags: ["perps", "derivatives"],
    chain_ids: [101],
    injected_tools: ["drift_place_order", "drift_positions"],
    est_tokens: 1700,
  },
  {
    kind: "skill",
    id: "cowswap",
    name: "cowswap",
    description:
      "Get MEV-protected swaps via batch auctions on CoW Protocol.",
    tags: ["dex", "swap"],
    chain_ids: [1, 8453, 42161],
    injected_tools: ["cow_quote", "cow_order"],
    est_tokens: 1300,
  },
];

/**
 * Stand-in for the live endpoint. Kept async + array-returning so swapping in
 * `settingsApiFetch<SkillSummary[]>("/api/resource/skills")` is a one-line change.
 */
export async function fetchSkills(): Promise<SkillSummary[]> {
  return SKILLS;
}

// --- Display helpers (what the FE/BE would do to the raw endpoint fields) ---

const NAME_OVERRIDES: Record<string, string> = {
  lifi: "LI.FI",
  gmx: "GMX",
  ens: "ENS",
  eigenlayer: "EigenLayer",
  cowswap: "CoW Swap",
  hyperliquid: "Hyperliquid",
  sky: "Sky",
};

/** Prettify the id-as-name into a display label. */
export function displayName(skill: Pick<SkillSummary, "id" | "name">): string {
  const raw = skill.id || skill.name;
  if (NAME_OVERRIDES[raw]) return NAME_OVERRIDES[raw];
  return raw
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** 1–2 char monogram for the generated icon tile. */
export function monogram(skill: Pick<SkillSummary, "id" | "name">): string {
  const name = displayName(skill).replace(/[^A-Za-z0-9]/g, "");
  return name.slice(0, 2).toUpperCase() || "?";
}

// Category is not a real field — synthesize it from the first matching tag.
const CATEGORY_BY_TAG: Record<string, string> = {
  lending: "Lending",
  borrow: "Lending",
  cdp: "Lending",
  dex: "DEX",
  amm: "DEX",
  swap: "DEX",
  stableswap: "DEX",
  aggregator: "DEX",
  staking: "Staking",
  "liquid-staking": "Staking",
  restaking: "Staking",
  yield: "Yield",
  vault: "Yield",
  "fixed-income": "Yield",
  perps: "Perps",
  derivatives: "Perps",
  bridge: "Bridge",
  "cross-chain": "Bridge",
  prediction: "Prediction",
  "prediction-market": "Prediction",
  stablecoin: "Stablecoin",
  identity: "Identity",
};

export function categoryOf(skill: Pick<SkillSummary, "tags">): string {
  for (const tag of skill.tags) {
    const category = CATEGORY_BY_TAG[tag.toLowerCase()];
    if (category) return category;
  }
  return "Other";
}

/** Literal class strings (kept static so Tailwind's JIT can't purge them). */
export const CATEGORY_STYLES: Record<string, { tile: string; dot: string }> = {
  Lending: {
    tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  DEX: {
    tile: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  Staking: {
    tile: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
  Yield: {
    tile: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  Perps: {
    tile: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  Bridge: {
    tile: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  Prediction: {
    tile: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  Stablecoin: {
    tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  Identity: {
    tile: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    dot: "bg-slate-500",
  },
  Other: {
    tile: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export function categoryStyle(category: string): { tile: string; dot: string } {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.Other;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
  101: "Solana",
};

export function chainName(id: number): string {
  return CHAIN_NAMES[id] ?? `Chain ${id}`;
}

export function chainLabels(chain_ids: number[]): string[] {
  return chain_ids.map(chainName);
}

/** "1.8k" style compact token estimate. */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${tokens}`;
}
