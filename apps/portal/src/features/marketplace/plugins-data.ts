// Mock data + helpers for the Plugins marketplace (the App Keys replacement).
//
// This mirrors what the live path produces once card metadata moves server-side
// (confirmed in the codebase walk):
//   - the app catalog is `GET /api/account/apps` → `AppSpec[]`
//     (name, label, is_public, secrets, ...).
//   - `is_public` is the real gate: public apps need NO key; proprietary apps
//     (`is_public=false`) require an `Aomi-App-Key` that `allows_app` them
//     (aomi/crates/runtime/src/app/types.rs `requires_app_key`).
//   - description / category / icon are NOT on the app row today; the plan is to
//     author them into `applications.metadata` (server-owned) so this same shape
//     arrives from the endpoint. For now the copy is lifted from the landing
//     APP_METADATA map and icons come from `getAppIcon` in @aomi-labs/widget-lib.
//
// To go live: replace `fetchPlugins()` with the merge of
//   settingsApiFetch<AppSpec[]>("/api/account/apps")
// against the metadata (ideally already on `app.metadata`), and derive
// `isPublic` from `AppSpec.is_public`.

export type Plugin = {
  /** AppSpec.name */
  id: string;
  title: string;
  description: string;
  category: string;
  /** AppSpec.is_public — public apps install with no key. */
  isPublic: boolean;
  websiteUrl?: string;
  /** Deployed from the current user's own source (Personal filter). */
  personal?: boolean;
};

const PLUGINS: Plugin[] = [
  {
    id: "across",
    title: "Across",
    description: "Cross-chain bridging and swap routing across ecosystems.",
    category: "Cross-chain",
    isPublic: true,
    websiteUrl: "https://across.to/",
  },
  {
    id: "binance",
    title: "Binance",
    description: "Centralized exchange data for prices, depth, and klines.",
    category: "CEX",
    isPublic: false,
  },
  {
    id: "bybit",
    title: "Bybit",
    description:
      "Bybit trading context for orders, positions, and leverage workflows.",
    category: "CEX",
    isPublic: false,
  },
  {
    id: "cow",
    title: "CoW Protocol",
    description: "MEV-aware swaps routed through batch auctions.",
    category: "DEX",
    isPublic: true,
    websiteUrl: "https://cow.fi/",
  },
  {
    id: "defillama",
    title: "DefiLlama",
    description: "Protocol analytics for TVL, yields, volumes, and stablecoins.",
    category: "Analytics",
    isPublic: true,
    websiteUrl: "https://defillama.com/",
  },
  {
    id: "dune",
    title: "Dune",
    description: "SQL-powered onchain analytics and saved query execution.",
    category: "Analytics",
    isPublic: false,
  },
  {
    id: "dydx",
    title: "dYdX",
    description: "Perpetuals market data, order books, and trade context.",
    category: "Perps",
    isPublic: true,
    websiteUrl: "https://www.dydx.xyz/",
  },
  {
    id: "gmx",
    title: "GMX",
    description: "Perpetual trading context for prices, markets, and positions.",
    category: "Perps",
    isPublic: true,
    websiteUrl: "https://gmx.io/",
  },
  {
    id: "hyperliquid",
    title: "Hyperliquid",
    description: "High-speed perp market data including mids and order books.",
    category: "Perps",
    isPublic: true,
    websiteUrl: "https://hyperfoundation.org/",
  },
  {
    id: "kaito",
    title: "Kaito",
    description: "Crypto social intelligence for trends, search, and mindshare.",
    category: "Social",
    isPublic: false,
  },
  {
    id: "kalshi",
    title: "Kalshi",
    description: "Prediction market workflows powered through Simmer.",
    category: "Prediction",
    isPublic: false,
  },
  {
    id: "khalani",
    title: "Khalani",
    description:
      "Cross-chain intent routing for quotes, builds, and submissions.",
    category: "Cross-chain",
    isPublic: true,
    websiteUrl: "https://khalani.network/",
  },
  {
    id: "lifi",
    title: "LI.FI",
    description: "Cross-chain swaps and bridge routing across ecosystems.",
    category: "Cross-chain",
    isPublic: true,
    websiteUrl: "https://li.fi/",
  },
  {
    id: "limitless",
    title: "Limitless",
    description: "Prediction markets for crypto and stock price outcomes.",
    category: "Prediction",
    isPublic: true,
    websiteUrl: "https://limitless.exchange/",
  },
  {
    id: "manifold",
    title: "Manifold",
    description:
      "Prediction market search, positions, and market creation flows.",
    category: "Prediction",
    isPublic: false,
  },
  {
    id: "molinar",
    title: "Molinar",
    description:
      "Onchain world interactions for movement, exploration, and chat.",
    category: "Gaming",
    isPublic: true,
    websiteUrl: "https://www.molinar.xyz/",
  },
  {
    id: "morpho",
    title: "Morpho",
    description: "Lending market and vault discovery for positions and rates.",
    category: "Lending",
    isPublic: true,
    websiteUrl: "https://morpho.org/",
  },
  {
    id: "neynar",
    title: "Neynar",
    description: "Farcaster user lookup and social graph discovery.",
    category: "Social",
    isPublic: false,
  },
  {
    id: "okx",
    title: "OKX",
    description: "Exchange market data for tickers, books, and candles.",
    category: "CEX",
    isPublic: false,
  },
  {
    id: "oneinch",
    title: "1inch",
    description: "DEX aggregation for quotes, swaps, allowances, and liquidity.",
    category: "DEX",
    isPublic: false,
  },
  {
    id: "pelagos",
    title: "Pelagos",
    description: "Cross-chain execution workflows for intent-based routing.",
    category: "Cross-chain",
    isPublic: true,
    websiteUrl: "https://pelagos.network/",
  },
  {
    id: "polymarket",
    title: "Polymarket",
    description: "Prediction market discovery, trading, and CLOB workflows.",
    category: "Prediction",
    isPublic: true,
    websiteUrl: "https://polymarket.com/",
  },
  {
    id: "x",
    title: "X",
    description: "Social intelligence for users, posts, search, and trends.",
    category: "Social",
    isPublic: false,
  },
  {
    id: "yearn",
    title: "Yearn",
    description: "Vault discovery and yield strategy context for deposits.",
    category: "Yield",
    isPublic: true,
    websiteUrl: "https://yearn.fi/",
  },
  {
    id: "zerox",
    title: "0x",
    description: "DEX routing, quotes, allowances, and swap execution context.",
    category: "DEX",
    isPublic: false,
  },
  {
    id: "zora",
    title: "Zora",
    description:
      "Onchain social and creator coin workflows for posts and profiles.",
    category: "Social",
    isPublic: true,
    websiteUrl: "https://zora.co/",
  },
];

/**
 * Stand-in for the live catalog. Kept async so swapping in the real
 * `GET /api/account/apps` merge is a one-line change.
 */
export async function fetchPlugins(): Promise<Plugin[]> {
  return PLUGINS;
}

export function pluginMonogram(plugin: Pick<Plugin, "title">): string {
  return plugin.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
}

// Icon id normalization: getAppIcon keys differ slightly from app ids.
const ICON_ID_ALIASES: Record<string, string> = {
  lifi: "lifi",
  cow: "cow",
  zerox: "zerox",
  oneinch: "oneinch",
};

export function iconIdFor(plugin: Pick<Plugin, "id">): string {
  return ICON_ID_ALIASES[plugin.id] ?? plugin.id;
}

/** Dot accent per category (static strings so Tailwind can't purge them). */
const CATEGORY_DOT: Record<string, string> = {
  CEX: "bg-amber-500",
  DEX: "bg-sky-500",
  Analytics: "bg-blue-500",
  Perps: "bg-rose-500",
  Social: "bg-teal-500",
  Prediction: "bg-cyan-500",
  Gaming: "bg-emerald-500",
  Lending: "bg-emerald-500",
  Yield: "bg-amber-500",
  "Cross-chain": "bg-indigo-500",
};

export function categoryDot(category: string): string {
  return CATEGORY_DOT[category] ?? "bg-muted-foreground";
}
