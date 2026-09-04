/**
 * Provenance for skill marks. Keep unsupported entries explicit so a future
 * contributor does not silently substitute an invented protocol logo.
 */
export const skillIconSources = {
  aave: "https://github.com/aave-dao/aave-brand-kit/tree/main/Logo",
  across: "https://across.to/",
  aerodrome: "https://aerodrome.finance/brand",
  arbitrum_bridge: "https://arbitrum.io/brand-kit",
  base_native: "https://base.org/brand",
  compound: "https://compound.finance/images/compound-logo.svg",
  convex: "https://www.convexfinance.com/",
  curve: "https://resources.curve.finance/glossary-branding/branding/",
  etherfi: "https://www.ether.fi/",
  jupiter: "https://developers.jup.ag/docs/resources/brand-kit",
  kamino: "https://kamino.com/assets/logo.1788494054.svg",
  lifi_swap: "https://li.fi/brand-guidelines",
  morpho: "https://morpho.org/",
  oneinch: "https://1inch.com/press-room",
  openbook: "https://github.com/openbook-dex",
  optimism_native: "https://www.optimism.io/brand",
  pendle: "https://www.pendle.finance/brand-guide/",
  raydium: "https://docs.raydium.io/resources/brand-kit",
  renzo: "https://docs.renzoprotocol.com/docs/resources/brand-kit",
  robinhood_stocks: "https://robinhood.com/us/en/about-us/",
  rocket_pool: "https://rocketpool.net/",
  sanctum: "https://www.sanctum.so/",
  squads: "https://squads.so/",
  stargate: "https://stargate.finance/",
  sushiswap: "https://www.sushi.com/",
  uniswap: "https://uniswap.org/",
  yearn: "https://yearn.fi/",
  zksync_era_native: "https://zksync.io/",
  zora: "https://zora.co/",
} as const;

/** Generic marks reused for skills whose semantics are the asset itself. */
export const skillIconGenericAliases = {
  cctp: "CircleDollarSignIcon",
  common_erc20: "CoinsIcon",
} as const;

/** Built-in skills with no confidently attributable mark in this package. */
export const skillIconFallbacks = [
  "avantis",
  "debridge",
  "drift",
  "dummy",
  "eigenlayer",
  "kelp",
  "krexa",
  "lido",
  "mantle_staked_eth",
  "marinade",
  "meteora",
] as const;
