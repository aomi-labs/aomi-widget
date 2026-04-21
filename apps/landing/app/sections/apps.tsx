type AppMetadata = {
  title: string;
  description: string;
  category: string;
  requiresApiKey: boolean;
};

const CHAT_PORTAL_URL = "https://chat.aomi.dev";
const LOCAL_CHAT_PORTAL_URL = "http://localhost:3200";
const RESOLVED_CHAT_PORTAL_URL =
  process.env.NEXT_PUBLIC_CHAT_PORTAL_URL ??
  (process.env.NODE_ENV === "development"
    ? LOCAL_CHAT_PORTAL_URL
    : CHAT_PORTAL_URL);
const APP_DEEP_LINKS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_APP_DEEP_LINKS === "true" ||
  (process.env.NEXT_PUBLIC_ENABLE_APP_DEEP_LINKS == null &&
    process.env.NODE_ENV === "development");

const APP_METADATA: Record<string, AppMetadata> = {
  default: {
    title: "Default",
    description: "General-purpose onchain agent with built-in web search.",
    category: "General",
    requiresApiKey: false,
  },
  binance: {
    title: "Binance",
    description: "Centralized exchange data for prices, depth, and klines.",
    category: "CEX",
    requiresApiKey: true,
  },
  bybit: {
    title: "Bybit",
    description: "Bybit trading context for orders, positions, and leverage workflows.",
    category: "CEX",
    requiresApiKey: true,
  },
  cow: {
    title: "CoW Protocol",
    description: "MEV-aware swaps routed through batch auctions.",
    category: "DEX",
    requiresApiKey: false,
  },
  defillama: {
    title: "DefiLlama",
    description: "Protocol analytics for TVL, yields, volumes, and stablecoins.",
    category: "Analytics",
    requiresApiKey: false,
  },
  dune: {
    title: "Dune",
    description: "SQL-powered onchain analytics and saved query execution.",
    category: "Analytics",
    requiresApiKey: true,
  },
  dydx: {
    title: "dYdX",
    description: "Perpetuals market data, order books, and trade context.",
    category: "Perps",
    requiresApiKey: false,
  },
  gmx: {
    title: "GMX",
    description: "Perpetual trading context for prices, markets, and positions.",
    category: "Perps",
    requiresApiKey: false,
  },
  hyperliquid: {
    title: "Hyperliquid",
    description: "High-speed perp market data including mids and order books.",
    category: "Perps",
    requiresApiKey: false,
  },
  kaito: {
    title: "Kaito",
    description: "Crypto social intelligence for trends, search, and mindshare.",
    category: "Social",
    requiresApiKey: true,
  },
  kalshi: {
    title: "Kalshi",
    description: "Prediction market workflows powered through Simmer.",
    category: "Prediction",
    requiresApiKey: true,
  },
  khalani: {
    title: "Khalani",
    description: "Cross-chain intent routing for quotes, builds, and submissions.",
    category: "Cross-chain",
    requiresApiKey: false,
  },
  lifi: {
    title: "LI.FI",
    description: "Cross-chain swaps and bridge routing across ecosystems.",
    category: "Cross-chain",
    requiresApiKey: false,
  },
  manifold: {
    title: "Manifold",
    description: "Prediction market search, positions, and market creation flows.",
    category: "Prediction",
    requiresApiKey: true,
  },
  molinar: {
    title: "Molinar",
    description: "Onchain world interactions for movement, exploration, and chat.",
    category: "Gaming",
    requiresApiKey: false,
  },
  morpho: {
    title: "Morpho",
    description: "Lending market and vault discovery for positions and rates.",
    category: "Lending",
    requiresApiKey: false,
  },
  neynar: {
    title: "Neynar",
    description: "Farcaster user lookup and social graph discovery.",
    category: "Social",
    requiresApiKey: true,
  },
  okx: {
    title: "OKX",
    description: "Exchange market data for tickers, books, and candles.",
    category: "CEX",
    requiresApiKey: true,
  },
  oneinch: {
    title: "1inch",
    description: "DEX aggregation for quotes, swaps, allowances, and liquidity.",
    category: "DEX",
    requiresApiKey: true,
  },
  polymarket: {
    title: "Polymarket",
    description: "Prediction market discovery, trading, and CLOB workflows.",
    category: "Prediction",
    requiresApiKey: false,
  },
  "polymarket-rewards": {
    title: "Polymarket Rewards",
    description: "Reward-oriented Polymarket workflows available in the portal.",
    category: "Prediction",
    requiresApiKey: false,
  },
  x: {
    title: "X",
    description: "Social intelligence for users, posts, search, and trends.",
    category: "Social",
    requiresApiKey: true,
  },
  yearn: {
    title: "Yearn",
    description: "Vault discovery and yield strategy context for deposits.",
    category: "Yield",
    requiresApiKey: false,
  },
  zerox: {
    title: "0x",
    description: "DEX routing, quotes, allowances, and swap execution context.",
    category: "DEX",
    requiresApiKey: true,
  },
};

const FALLBACK_APP_IDS = Object.keys(APP_METADATA);

function humanizeAppId(appId: string) {
  return appId
    .split("-")
    .map((part) => {
      if (!part) return part;
      if (part === "defillama") return "DefiLlama";
      if (part === "dydx") return "dYdX";
      if (part === "lifi") return "LI.FI";
      return `${part[0].toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}

function getAppMetadata(appId: string): AppMetadata {
  return (
    APP_METADATA[appId] ?? {
      title: humanizeAppId(appId),
      description: "Available in the Aomi portal.",
      category: "Supported App",
      requiresApiKey: false,
    }
  );
}

async function getSupportedApps() {
  try {
    const response = await fetch("https://api.aomi.dev/api/control/apps", {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to load apps: ${response.status}`);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected app payload.");
    }

    return data.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  } catch {
    return FALLBACK_APP_IDS;
  }
}

function sortApps(appIds: string[]) {
  return [...new Set(appIds)].sort((left, right) => {
    if (left === "default") return -1;
    if (right === "default") return 1;

    const leftMeta = getAppMetadata(left);
    const rightMeta = getAppMetadata(right);

    if (leftMeta.requiresApiKey !== rightMeta.requiresApiKey) {
      return Number(leftMeta.requiresApiKey) - Number(rightMeta.requiresApiKey);
    }

    return leftMeta.title.localeCompare(rightMeta.title);
  });
}

function buildPortalHref(appId: string) {
  if (!APP_DEEP_LINKS_ENABLED) {
    return RESOLVED_CHAT_PORTAL_URL;
  }

  const url = new URL(RESOLVED_CHAT_PORTAL_URL);
  url.searchParams.set("app", appId);
  return url.toString();
}

export async function Apps() {
  const appIds = sortApps(await getSupportedApps());
  const description = APP_DEEP_LINKS_ENABLED
    ? "Choose an app below and jump into the portal with that app passed into chat. Some apps are open by default, while others prompt for an API key after launch."
    : "Choose an app below and jump into the portal to continue from there. The live portal does not yet support app preselection by URL, so app selection still happens inside chat. Some apps are open by default, while others prompt for an API key after launch.";

  return (
    <section
      id="apps-section"
      className="w-full bg-stone-100 px-4 pt-8 pb-24 text-stone-800"
      data-animate="up"
      data-delay="260"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex w-fit items-center rounded-full border border-stone-200 bg-white px-3 py-1 shadow-sm">
            <span className="font-geist text-[10px] font-semibold tracking-[0.24em] text-stone-700 uppercase">
              Apps
            </span>
          </div>
          <h2 className="font-serif text-4xl tracking-tight md:text-5xl">
            Explore every app we support
          </h2>
          <p className="font-geist mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 md:text-base">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appIds.map((appId) => {
            const metadata = getAppMetadata(appId);

            return (
              <a
                key={appId}
                href={buildPortalHref(appId)}
                className="group flex min-h-[220px] flex-col rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(28,25,23,0.06)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(28,25,23,0.1)]"
              >
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="font-geist rounded-full bg-stone-900 px-3 py-1 text-[11px] font-medium tracking-wide text-white">
                    {metadata.category}
                  </span>
                  <span
                    className={`font-geist rounded-full px-3 py-1 text-[11px] font-medium tracking-wide ${
                      metadata.requiresApiKey
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {metadata.requiresApiKey ? "API key" : "Open access"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="font-serif text-2xl tracking-tight text-stone-900">
                      {metadata.title}
                    </h3>
                    <span className="font-geist rounded-full border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-500">
                      {appId}
                    </span>
                  </div>

                  <p className="font-geist text-sm leading-relaxed text-stone-600">
                    {metadata.description}
                  </p>

                  <div className="font-geist mt-4 text-xs text-stone-500">
                    Select <span className="font-medium text-stone-700">{appId}</span>{" "}
                    in the portal app picker after launch.
                  </div>

                  <div className="font-geist mt-auto pt-6 text-sm font-semibold text-stone-900">
                    Open portal
                    <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
                      {"->"}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
