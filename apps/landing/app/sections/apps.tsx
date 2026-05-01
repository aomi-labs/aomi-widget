type AppMetadata = {
  title: string;
  description: string;
  category: string;
  requiresApiKey: boolean;
  websiteUrl?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoWrapperClassName?: string;
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
  binance: {
    title: "Binance",
    description: "Centralized exchange data for prices, depth, and klines.",
    category: "CEX",
    requiresApiKey: true,
    logoSrc: "/assets/logos/binance.svg",
    logoAlt: "Binance logo",
  },
  bybit: {
    title: "Bybit",
    description: "Bybit trading context for orders, positions, and leverage workflows.",
    category: "CEX",
    requiresApiKey: true,
    logoSrc: "/assets/logos/bybit.png",
    logoAlt: "Bybit logo",
  },
  cow: {
    title: "CoW Protocol",
    description: "MEV-aware swaps routed through batch auctions.",
    category: "DEX",
    requiresApiKey: false,
    websiteUrl: "https://cow.fi/",
    logoSrc: "/assets/logos/cow.svg",
    logoAlt: "CoW Protocol logo",
  },
  defillama: {
    title: "DefiLlama",
    description: "Protocol analytics for TVL, yields, volumes, and stablecoins.",
    category: "Analytics",
    requiresApiKey: false,
    websiteUrl: "https://defillama.com/",
    logoSrc: "/assets/logos/defillama.png",
    logoAlt: "DefiLlama logo",
  },
  dune: {
    title: "Dune",
    description: "SQL-powered onchain analytics and saved query execution.",
    category: "Analytics",
    requiresApiKey: true,
    logoSrc: "/assets/logos/dune.png",
    logoAlt: "Dune logo",
  },
  dydx: {
    title: "dYdX",
    description: "Perpetuals market data, order books, and trade context.",
    category: "Perps",
    requiresApiKey: false,
    websiteUrl: "https://www.dydx.xyz/",
    logoSrc: "/assets/logos/dydx.svg",
    logoAlt: "dYdX logo",
  },
  gmx: {
    title: "GMX",
    description: "Perpetual trading context for prices, markets, and positions.",
    category: "Perps",
    requiresApiKey: false,
    websiteUrl: "https://gmx.io/",
    logoSrc: "/assets/logos/gmx.png",
    logoAlt: "GMX logo",
  },
  hyperliquid: {
    title: "Hyperliquid",
    description: "High-speed perp market data including mids and order books.",
    category: "Perps",
    requiresApiKey: false,
    websiteUrl: "https://hyperfoundation.org/",
    logoSrc: "/assets/logos/hyperliquid.png",
    logoAlt: "Hyperliquid logo",
  },
  kaito: {
    title: "Kaito",
    description: "Crypto social intelligence for trends, search, and mindshare.",
    category: "Social",
    requiresApiKey: true,
    logoSrc: "/assets/logos/kaito.png",
    logoAlt: "Kaito logo",
  },
  kalshi: {
    title: "Kalshi",
    description: "Prediction market workflows powered through Simmer.",
    category: "Prediction",
    requiresApiKey: true,
    logoSrc: "/assets/logos/kalshi.png",
    logoAlt: "Kalshi logo",
  },
  khalani: {
    title: "Khalani",
    description: "Cross-chain intent routing for quotes, builds, and submissions.",
    category: "Cross-chain",
    requiresApiKey: false,
    websiteUrl: "https://khalani.network/",
    logoSrc: "/assets/logos/khalani.png",
    logoAlt: "Khalani logo",
  },
  lifi: {
    title: "LI.FI",
    description: "Cross-chain swaps and bridge routing across ecosystems.",
    category: "Cross-chain",
    requiresApiKey: false,
    websiteUrl: "https://li.fi/",
    logoSrc: "/assets/logos/lifi.svg",
    logoAlt: "LI.FI logo",
    logoWrapperClassName: "bg-stone-900",
  },
  manifold: {
    title: "Manifold",
    description: "Prediction market search, positions, and market creation flows.",
    category: "Prediction",
    requiresApiKey: true,
    logoSrc: "/assets/logos/manifold.png",
    logoAlt: "Manifold logo",
  },
  molinar: {
    title: "Molinar",
    description: "Onchain world interactions for movement, exploration, and chat.",
    category: "Gaming",
    requiresApiKey: false,
    websiteUrl: "https://www.molinar.xyz/",
    logoSrc: "/assets/logos/molinar.svg",
    logoAlt: "Molinar logo",
  },
  morpho: {
    title: "Morpho",
    description: "Lending market and vault discovery for positions and rates.",
    category: "Lending",
    requiresApiKey: false,
    websiteUrl: "https://morpho.org/",
    logoSrc: "/assets/logos/morpho.svg",
    logoAlt: "Morpho logo",
  },
  neynar: {
    title: "Neynar",
    description: "Farcaster user lookup and social graph discovery.",
    category: "Social",
    requiresApiKey: true,
    logoSrc: "/assets/logos/neynar.svg",
    logoAlt: "Neynar logo",
  },
  okx: {
    title: "OKX",
    description: "Exchange market data for tickers, books, and candles.",
    category: "CEX",
    requiresApiKey: true,
    logoSrc: "/assets/logos/okx.png",
    logoAlt: "OKX logo",
  },
  oneinch: {
    title: "1inch",
    description: "DEX aggregation for quotes, swaps, allowances, and liquidity.",
    category: "DEX",
    requiresApiKey: true,
    logoSrc: "/assets/logos/oneinch.svg",
    logoAlt: "1inch logo",
  },
  polymarket: {
    title: "Polymarket",
    description: "Prediction market discovery, trading, and CLOB workflows.",
    category: "Prediction",
    requiresApiKey: false,
    websiteUrl: "https://polymarket.com/",
    logoSrc: "/assets/logos/polymarket.png",
    logoAlt: "Polymarket logo",
  },
  "polymarket-rewards": {
    title: "Polymarket Rewards",
    description: "Reward-oriented Polymarket workflows available in the portal.",
    category: "Prediction",
    requiresApiKey: false,
    websiteUrl: "https://polymarket.com/",
    logoSrc: "/assets/logos/polymarket-rewards.png",
    logoAlt: "Polymarket Rewards logo",
  },
  x: {
    title: "X",
    description: "Social intelligence for users, posts, search, and trends.",
    category: "Social",
    requiresApiKey: true,
    logoSrc: "/assets/logos/x.svg",
    logoAlt: "X logo",
  },
  yearn: {
    title: "Yearn",
    description: "Vault discovery and yield strategy context for deposits.",
    category: "Yield",
    requiresApiKey: false,
    websiteUrl: "https://yearn.fi/",
    logoSrc: "/assets/logos/yearn.svg",
    logoAlt: "Yearn logo",
  },
  zerox: {
    title: "0x",
    description: "DEX routing, quotes, allowances, and swap execution context.",
    category: "DEX",
    requiresApiKey: true,
    logoSrc: "/assets/logos/zerox.svg",
    logoAlt: "0x logo",
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

function getLogoInitials(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, "").charAt(0))
    .join("")
    .toUpperCase();

  return letters || title.slice(0, 2).toUpperCase();
}

function buildMonogramLogo(title: string) {
  const initials = getLogoInitials(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="#f5f1f6" />
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        fill="#2b2523"
        font-family="ui-sans-serif, system-ui, sans-serif"
        font-size="24"
        font-weight="700"
        letter-spacing="0.04em"
      >
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatWebsiteLabel(websiteUrl: string) {
  try {
    const url = new URL(websiteUrl);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "")}`;
  } catch {
    return websiteUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
  }
}

function getAppMetadata(appId: string): AppMetadata {
  const metadata = APP_METADATA[appId] ?? {
    title: humanizeAppId(appId),
    description: "Available in the Aomi portal.",
    category: "Supported App",
    requiresApiKey: false,
  };

  return {
    ...metadata,
    logoSrc: metadata.logoSrc ?? buildMonogramLogo(metadata.title),
    logoAlt: metadata.logoAlt ?? `${metadata.title} logo`,
  };
}

function isPublicApp(appId: string) {
  return APP_METADATA[appId]?.requiresApiKey === false;
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
  const appIds = sortApps(
    (await getSupportedApps()).filter(
      (appId) => isPublicApp(appId) && appId !== "default",
    ),
  );
  const description =
    "Transact on the Aomi Apps built by our team and community";

  return (
    <section
      id="apps-section"
      className="w-full bg-stone-100 pt-8 pb-24 text-stone-800"
      data-animate="up"
      data-delay="260"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4">
        <div className="max-w-6xl">
          <div className="mb-4 inline-flex w-fit items-center rounded-full border border-stone-200 bg-stone-100 pt-1 pr-3 pb-1 pl-3 ring-1 ring-stone-200">
            <span className="font-geist mt-1 mb-1 text-[10px] font-semibold tracking-wider text-stone-800 uppercase">
              Apps
            </span>
          </div>
          <h2 className="font-serif text-4xl tracking-tight lg:whitespace-nowrap md:text-5xl">
            Explore an ecosystem of{" "}
            <span className="text-stone-600 italic">
              Agentic Applications
            </span>
          </h2>
          <p className="font-geist mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 md:text-base">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[2.4rem] md:grid-cols-2 xl:grid-cols-3">
          {appIds.map((appId, index) => {
            const metadata = getAppMetadata(appId);
            const isPurpleCard = index % 2 === 1;

            return (
              <a
                key={appId}
                href={buildPortalHref(appId)}
                className={`group flex min-h-[220px] flex-col rounded-[2rem] p-6 transition-transform duration-300 hover:-translate-y-1 ${
                  isPurpleCard ? "bg-[#e3d8e6]" : "bg-white"
                }`}
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
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="font-serif text-2xl tracking-tight text-stone-900">
                      {metadata.title}
                    </h3>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full p-2 text-[11px] font-medium text-stone-500 ${metadata.logoWrapperClassName ?? ""}`}
                    >
                      <img
                        src={metadata.logoSrc}
                        alt={metadata.logoAlt ?? `${metadata.title} logo`}
                        className="h-full w-full object-contain"
                      />
                    </span>
                  </div>

                  <p className="font-geist text-sm leading-relaxed text-stone-600">
                    {metadata.description}
                  </p>

                  {metadata.websiteUrl ? (
                    <a
                      href={metadata.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-geist mt-2 w-fit text-xs text-stone-500 underline underline-offset-4 transition-colors hover:text-stone-700"
                    >
                      {formatWebsiteLabel(metadata.websiteUrl)}
                    </a>
                  ) : null}

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

          <div className="group flex min-h-[220px] flex-col rounded-[2rem] bg-white p-6 text-stone-900 transition-transform duration-300 hover:-translate-y-1">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="font-geist rounded-full bg-stone-900 px-3 py-1 text-[11px] font-medium tracking-wide text-white">
                Build
              </span>
              <span className="font-geist rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium tracking-wide text-emerald-900">
                Open access
              </span>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-serif text-2xl tracking-tight text-stone-900">
                  Build your own app
                </h3>
              </div>

              <p className="font-geist text-sm leading-relaxed text-stone-600">
                Turn your API, protocol, or product into an Aomi app with a
                wallet-aware runtime and agent-ready tool surface.
              </p>

              <a
                href="/agents/build"
                className="font-geist mt-auto w-fit pt-6 text-sm font-semibold text-stone-900 underline underline-offset-4 transition-colors hover:text-stone-700"
              >
                Build with agent
              </a>
              <a
                href="https://aomi.dev/docs/build/overview"
                className="font-geist mt-3 w-fit text-sm font-semibold text-stone-900 transition-colors hover:text-stone-700"
              >
                Open build guide
                <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
                  {"->"}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
