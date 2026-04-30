/**
 * Model and app metadata for UI display.
 * Maps raw backend strings to vendor info, display names, and icons.
 */

// =============================================================================
// Vendor definitions
// =============================================================================

export type VendorInfo = {
  id: string;
  label: string;
  /** 1-2 letter abbreviation for the avatar fallback */
  abbr: string;
};

const VENDORS: Record<string, VendorInfo> = {
  anthropic: { id: "anthropic", label: "Anthropic", abbr: "A" },
  openai: { id: "openai", label: "OpenAI", abbr: "O" },
  google: { id: "google", label: "Google", abbr: "G" },
  meta: { id: "meta", label: "Meta", abbr: "M" },
  mistral: { id: "mistral", label: "Mistral", abbr: "Mi" },
  deepseek: { id: "deepseek", label: "DeepSeek", abbr: "D" },
  xai: { id: "xai", label: "xAI", abbr: "X" },
  cohere: { id: "cohere", label: "Cohere", abbr: "C" },
  glm: { id: "glm", label: "GLM", abbr: "G" },
  moonshot: { id: "moonshot", label: "Moonshot AI", abbr: "K" },
  unknown: { id: "unknown", label: "Other", abbr: "?" },
};

// =============================================================================
// Vendor detection from model string
// =============================================================================

const VENDOR_PATTERNS: [RegExp, string][] = [
  [/^claude/i, "anthropic"],
  [/^gpt|^o[1-9]|^chatgpt|^dall-e/i, "openai"],
  [/^gemini|^palm/i, "google"],
  [/^llama|^meta-llama/i, "meta"],
  [/^mistral|^mixtral|^codestral|^pixtral/i, "mistral"],
  [/^deepseek/i, "deepseek"],
  [/^grok/i, "xai"],
  [/^command/i, "cohere"],
  [/^glm|^chatglm|^zai|^z\.ai|^zhipu/i, "glm"],
  [/^kimi|^moonshot/i, "moonshot"],
];

export function getVendorForModel(model: string): VendorInfo {
  const lower = model.toLowerCase();
  for (const [pattern, vendorId] of VENDOR_PATTERNS) {
    if (pattern.test(lower)) {
      return VENDORS[vendorId]!;
    }
  }
  return VENDORS.unknown!;
}

// =============================================================================
// Group models by vendor, sorted
// =============================================================================

export type ModelGroup = {
  vendor: VendorInfo;
  models: string[];
};

export function groupModelsByVendor(models: string[]): ModelGroup[] {
  const grouped = new Map<string, string[]>();

  for (const model of models) {
    const vendor = getVendorForModel(model);
    const existing = grouped.get(vendor.id) ?? [];
    existing.push(model);
    grouped.set(vendor.id, existing);
  }

  // Sort vendor groups alphabetically by label
  return Array.from(grouped.entries())
    .map(([vendorId, vendorModels]) => ({
      vendor: VENDORS[vendorId] ?? VENDORS.unknown!,
      models: [...vendorModels].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      ),
    }))
    .sort((a, b) => {
      if (a.vendor.id === "unknown") return 1;
      if (b.vendor.id === "unknown") return -1;
      return a.vendor.label.localeCompare(b.vendor.label);
    });
}

// =============================================================================
// Auto mode
// =============================================================================

/** The display label shown in the trigger when auto mode is active. */
export const AUTO_MODE_LABEL = "Auto";

/**
 * Resolve the actual backend model for auto mode.
 * Picks the cheapest performant model from the available list.
 */
export function resolveAutoModel(models: string[]): string | null {
  const preferred = [
    /^claude-4\.5-haiku/i,
    /^claude.*haiku/i,
    /^gpt-4o-mini/i,
    /^gemini.*flash/i,
  ];
  for (const pattern of preferred) {
    const match = models.find((m) => pattern.test(m));
    if (match) return match;
  }
  return models[0] ?? null;
}

// =============================================================================
// App metadata
// =============================================================================

export type AppInfo = {
  /** Raw app id sent to backend */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** 1-2 letter abbreviation for avatar fallback */
  abbr: string;
  category: AppCategoryInfo;
};

export type AppCategoryInfo = {
  id: string;
  label: string;
  order: number;
};

export type AppGroup = {
  category: AppCategoryInfo;
  apps: AppInfo[];
};

const APP_CATEGORIES: Record<string, AppCategoryInfo> = {
  all: { id: "all", label: "All", order: 0 },
  cex: { id: "cex", label: "Centralized Exchanges", order: 10 },
  dex: { id: "dex", label: "DEX & Swaps", order: 20 },
  analytics: { id: "analytics", label: "Analytics", order: 30 },
  perps: { id: "perps", label: "Perps", order: 40 },
  social: { id: "social", label: "Social", order: 50 },
  prediction: { id: "prediction", label: "Prediction Markets", order: 60 },
  yield: { id: "yield", label: "Lending & Yield", order: 70 },
  gaming: { id: "gaming", label: "Gaming", order: 80 },
  wallets: { id: "wallets", label: "Wallets", order: 90 },
  custom: { id: "custom", label: "Other", order: 100 },
};

const APP_DISPLAY_NAMES: Record<
  string,
  { displayName: string; abbr: string; category: AppCategoryInfo }
> = {
  default: {
    displayName: "All Apps",
    abbr: "All",
    category: APP_CATEGORIES.all!,
  },
  binance: {
    displayName: "Binance",
    abbr: "B",
    category: APP_CATEGORIES.cex!,
  },
  bybit: {
    displayName: "Bybit",
    abbr: "B",
    category: APP_CATEGORIES.cex!,
  },
  cow: {
    displayName: "CoW Protocol",
    abbr: "CoW",
    category: APP_CATEGORIES.dex!,
  },
  defillama: {
    displayName: "DefiLlama",
    abbr: "DL",
    category: APP_CATEGORIES.analytics!,
  },
  dune: {
    displayName: "Dune",
    abbr: "D",
    category: APP_CATEGORIES.analytics!,
  },
  dydx: {
    displayName: "dYdX",
    abbr: "dY",
    category: APP_CATEGORIES.perps!,
  },
  gmx: {
    displayName: "GMX",
    abbr: "G",
    category: APP_CATEGORIES.perps!,
  },
  hyperliquid: {
    displayName: "Hyperliquid",
    abbr: "HL",
    category: APP_CATEGORIES.perps!,
  },
  kaito: {
    displayName: "Kaito",
    abbr: "K",
    category: APP_CATEGORIES.social!,
  },
  kalshi: {
    displayName: "Kalshi",
    abbr: "K",
    category: APP_CATEGORIES.prediction!,
  },
  khalani: {
    displayName: "Khalani",
    abbr: "K",
    category: APP_CATEGORIES.dex!,
  },
  lifi: {
    displayName: "LI.FI",
    abbr: "LI",
    category: APP_CATEGORIES.dex!,
  },
  manifold: {
    displayName: "Manifold",
    abbr: "M",
    category: APP_CATEGORIES.prediction!,
  },
  molinar: {
    displayName: "Molinar",
    abbr: "Mo",
    category: APP_CATEGORIES.gaming!,
  },
  morpho: {
    displayName: "Morpho",
    abbr: "M",
    category: APP_CATEGORIES.yield!,
  },
  neynar: {
    displayName: "Neynar",
    abbr: "N",
    category: APP_CATEGORIES.social!,
  },
  okx: {
    displayName: "OKX",
    abbr: "OK",
    category: APP_CATEGORIES.cex!,
  },
  oneinch: {
    displayName: "1inch",
    abbr: "1i",
    category: APP_CATEGORIES.dex!,
  },
  para: {
    displayName: "Para",
    abbr: "P",
    category: APP_CATEGORIES.wallets!,
  },
  "para-consumer": {
    displayName: "Para Consumer",
    abbr: "P",
    category: APP_CATEGORIES.custom!,
  },
  polymarket: {
    displayName: "Polymarket",
    abbr: "P",
    category: APP_CATEGORIES.prediction!,
  },
  "polymarket-rewards": {
    displayName: "Polymarket Rewards",
    abbr: "PR",
    category: APP_CATEGORIES.prediction!,
  },
  x: {
    displayName: "X",
    abbr: "X",
    category: APP_CATEGORIES.social!,
  },
  yearn: {
    displayName: "Yearn",
    abbr: "Y",
    category: APP_CATEGORIES.yield!,
  },
  zerox: {
    displayName: "0x",
    abbr: "0x",
    category: APP_CATEGORIES.dex!,
  },
};

const APP_ALIASES: Record<string, string> = {
  "1inch": "oneinch",
  "0x": "zerox",
  "li-fi": "lifi",
  "li.fi": "lifi",
  "dune-analytics": "dune",
  getpara: "para",
  "para-customer": "para",
  "para_consumer": "para-consumer",
  polymarket_rewards: "polymarket-rewards",
  twitter: "x",
};

function normalizeAppId(appId: string): string {
  return appId.trim().toLowerCase();
}

function titleizeAppId(appId: string): string {
  return appId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAppInfo(appId: string): AppInfo {
  const normalized = normalizeAppId(appId);
  const canonicalId = APP_ALIASES[normalized] ?? normalized;
  const known = APP_DISPLAY_NAMES[canonicalId];
  if (known) {
    return { id: appId, ...known };
  }
  const displayName = titleizeAppId(appId);
  return {
    id: appId,
    displayName,
    abbr: appId.charAt(0).toUpperCase(),
    category: APP_CATEGORIES.custom!,
  };
}

export function groupAppsByCategory(apps: string[]): AppGroup[] {
  const grouped = new Map<string, AppInfo[]>();

  for (const app of apps) {
    const info = getAppInfo(app);
    const existing = grouped.get(info.category.id) ?? [];
    existing.push(info);
    grouped.set(info.category.id, existing);
  }

  return Array.from(grouped.values())
    .map((groupApps) => ({
      category: groupApps[0]?.category ?? APP_CATEGORIES.custom!,
      apps: groupApps.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    }))
    .sort(
      (a, b) =>
        a.category.order - b.category.order ||
        a.category.label.localeCompare(b.category.label),
    );
}
