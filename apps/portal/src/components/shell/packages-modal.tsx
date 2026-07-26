"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart as Chart,
  Check,
  X as Close,
  Filter,
  Settings as Gear,
  Loader2,
  Search,
  Shield,
  Wallet as WalletIcon,
} from "lucide-react";
import type { AomiAppDescriptor } from "@aomi-labs/client";
import { useAccountOverview } from "@portal/lib/account-overview";
import { fetchAppCatalog, setInstalledApps } from "./packages-api";

type PackageVisibility = "public" | "personal";
type PackageCategory =
  | "Featured"
  | "Markets & onchain"
  | "Productivity"
  | "More"
  | "Your packages";

interface CatalogPackage {
  /** The wire `AppSpec.name` — what install/uninstall is keyed on. */
  id: string;
  name: string;
  description: string;
  iconDomain?: string;
  iconUrl?: string;
  glyph?: "wallet" | "chart" | "shield";
  background: string;
  foreground: string;
  visibility: PackageVisibility;
  category: PackageCategory;
  /** Core apps the account depends on — always installed, not removable. */
  pinned?: boolean;
}

/**
 * Brand decoration keyed by wire app name — colors, icons, category, and copy
 * the catalog endpoint doesn't carry (AppSpec has no display metadata yet; see
 * docs/SETTINGS-REDESIGN-GAPS.md). Apps outside this map render a neutral
 * monogram tile under "More" — real, just undecorated.
 */
const DECOR: Record<
  string,
  Partial<
    Pick<
      CatalogPackage,
      | "name"
      | "description"
      | "iconDomain"
      | "iconUrl"
      | "glyph"
      | "background"
      | "foreground"
      | "category"
    >
  >
> = {
  uniswap: {
    name: "Uniswap",
    description: "Swap tokens and manage liquidity on Ethereum.",
    iconDomain: "uniswap.org",
    background: "#fff1f7",
    foreground: "#ff007a",
    category: "Featured",
  },
  jupiter: {
    name: "Jupiter",
    description: "Find and execute the best swap routes on Solana.",
    iconDomain: "jup.ag",
    background: "#effff8",
    foreground: "#144d3b",
    category: "Featured",
  },
  dune: {
    name: "Dune",
    description: "Query, chart, and explain onchain data.",
    iconDomain: "dune.com",
    background: "#fff5ee",
    foreground: "#f26f45",
    category: "Featured",
  },
  aave: {
    name: "Aave",
    description: "Lend, borrow, and monitor DeFi positions.",
    iconDomain: "aave.com",
    background: "#f3f0ff",
    foreground: "#7868e6",
    category: "Featured",
  },
  github: {
    name: "GitHub",
    description: "Triage PRs, issues, CI, and releases.",
    iconDomain: "github.com",
    background: "#f4f4f4",
    foreground: "#161616",
    category: "Featured",
  },
  coingecko: {
    name: "CoinGecko",
    description: "Track token prices, markets, and metadata.",
    iconDomain: "coingecko.com",
    background: "#f4ffe6",
    foreground: "#173300",
    category: "Markets & onchain",
  },
  etherscan: {
    name: "Etherscan",
    description: "Inspect Ethereum contracts and transactions.",
    iconDomain: "etherscan.io",
    background: "#eef8ff",
    foreground: "#4d96c7",
    category: "Markets & onchain",
  },
  birdeye: {
    name: "Birdeye",
    description: "Explore Solana tokens, markets, and wallets.",
    iconDomain: "birdeye.so",
    background: "#eef3ff",
    foreground: "#2d63e2",
    category: "Markets & onchain",
  },
  defillama: {
    name: "DefiLlama",
    description: "Compare protocols, yields, and TVL.",
    iconDomain: "defillama.com",
    background: "#e7f3fb",
    foreground: "#2777a8",
    category: "Markets & onchain",
  },
  hyperliquid: {
    name: "Hyperliquid",
    description: "Research markets and manage perp positions.",
    iconDomain: "hyperliquid.xyz",
    background: "#b8ffe2",
    foreground: "#12362b",
    category: "Markets & onchain",
  },
  solscan: {
    name: "Solscan",
    description: "Inspect Solana accounts and transactions.",
    iconDomain: "solscan.io",
    background: "#f1edff",
    foreground: "#7f5af0",
    category: "Markets & onchain",
  },
  notion: {
    name: "Notion",
    description: "Search and organize your team knowledge.",
    iconDomain: "notion.so",
    background: "#f4f4f4",
    foreground: "#151515",
    category: "Productivity",
  },
  slack: {
    name: "Slack",
    description: "Turn team conversations into coordinated work.",
    iconDomain: "slack.com",
    background: "#fff3f8",
    foreground: "#e34b86",
    category: "Productivity",
  },
  linear: {
    name: "Linear",
    description: "Create and update product work.",
    iconDomain: "linear.app",
    background: "#f1f2ff",
    foreground: "#5e6ad2",
    category: "Productivity",
  },
  default: {
    name: "Aomi Core",
    description: "The built-in wallet, chain, and account tools.",
    glyph: "wallet",
    background: "#4e7af0",
    foreground: "#ffffff",
  },
};

/** Apps the account can't function without — shown installed, not removable. */
const PINNED_APPS = new Set(["default"]);

const CATEGORY_ORDER: PackageCategory[] = [
  "Featured",
  "Markets & onchain",
  "Productivity",
  "More",
];

/** One wire row + its decoration → a renderable catalog entry. */
function toCatalogPackage(app: AomiAppDescriptor): CatalogPackage {
  const decor = DECOR[app.name.toLowerCase()] ?? {};
  const visibility: PackageVisibility =
    app.isPublic === false ? "personal" : "public";
  return {
    id: app.name,
    name: decor.name ?? app.label ?? app.name,
    description:
      decor.description ??
      (app.platform ? `From the ${app.platform} platform.` : "Aomi app."),
    iconDomain: decor.iconDomain,
    iconUrl: decor.iconUrl,
    glyph: decor.glyph,
    background: decor.background ?? "#f4f4f5",
    foreground: decor.foreground ?? "#3f3f46",
    visibility,
    category:
      visibility === "personal" ? "Your packages" : (decor.category ?? "More"),
    pinned: PINNED_APPS.has(app.name),
  };
}

interface PackagesModalProps {
  onClose: () => void;
}

export function PackagesModal({ onClose }: PackagesModalProps) {
  const account = useAccountOverview();
  const [activeView, setActiveView] = useState<PackageVisibility>("public");
  const [query, setQuery] = useState("");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [catalog, setCatalog] = useState<CatalogPackage[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  // null until either the PUT response or the account overview seeds it —
  // the PUT response is the fresher truth once any mutation has run.
  const [installedFromServer, setInstalledFromServer] = useState<string[] | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAppCatalog()
      .then((apps) => {
        if (!cancelled) setCatalog(apps.map(toCatalogPackage));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCatalogError(
            cause instanceof Error ? cause.message : "Couldn't load packages",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const installedIds = useMemo(() => {
    const fromAccount = installedFromServer ?? account?.user.apps ?? [];
    const ids = new Set(fromAccount);
    for (const pinned of PINNED_APPS) ids.add(pinned);
    return ids;
  }, [installedFromServer, account]);

  /**
   * Replace the installed set on the server. Not optimistic: the button shows
   * busy and the row flips only on the PUT response, so a rejected write can't
   * leave a phantom install.
   */
  const mutateInstalled = useCallback(
    async (packageId: string, next: string[]) => {
      setBusyId(packageId);
      setActionError(null);
      try {
        setInstalledFromServer(await setInstalledApps(next));
      } catch (cause) {
        setActionError(
          cause instanceof Error ? cause.message : "Couldn't update packages",
        );
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // "/" and ⌘K jump to search — the primary way into a catalog this size.
      const typingElsewhere =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);
      const wantsSearch =
        event.key === "/" || (event.key === "k" && (event.metaKey || event.ctrlKey));
      if (wantsSearch && !typingElsewhere) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const searching = query.trim().length > 0;
  const allPackages = useMemo(() => catalog ?? [], [catalog]);

  const visiblePackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = allPackages.filter((app) => app.visibility === activeView);

    return source.filter((app) => {
      if (installedOnly && !installedIds.has(app.id)) return false;
      if (!normalizedQuery) return true;
      return `${app.name} ${app.description}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [allPackages, activeView, query, installedOnly, installedIds]);

  const installedPackages = allPackages.filter((app) => installedIds.has(app.id));
  const categories =
    activeView === "public" ? CATEGORY_ORDER : (["Your packages"] as const);

  const install = (packageId: string) => {
    void mutateInstalled(packageId, [
      ...[...installedIds].filter((id) => id !== packageId),
      packageId,
    ]);
  };

  const uninstall = (packageId: string) => {
    void mutateInstalled(
      packageId,
      [...installedIds].filter((id) => id !== packageId),
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="packages-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-aomi-bg text-aomi-fg"
    >
      <div className="mx-auto min-h-full w-full max-w-[1120px] px-8 py-10 sm:px-12 sm:py-12">
        <header className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close packages"
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-aomi-surface-2 text-aomi-muted transition-colors hover:bg-aomi-hover hover:text-aomi-fg"
          >
            <Close size={16} />
          </button>
          <h1 id="packages-title" className="text-[32px] font-medium tracking-[-0.025em]">
            Packages
          </h1>
          <p className="mt-2 text-[17px] text-aomi-muted">
            Connect Aomi to the protocols and tools you use every day.
          </p>

          <label className="mt-8 flex h-10 items-center gap-2.5 rounded-full border border-aomi-border bg-aomi-surface px-4 transition-colors focus-within:border-aomi-muted">
            <Search size={16} className="flex-shrink-0 text-aomi-muted" />
            <span className="sr-only">Search packages</span>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search packages"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-aomi-muted"
            />
            {searching ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-aomi-muted transition-colors hover:bg-aomi-hover hover:text-aomi-fg"
              >
                <Close size={12} />
              </button>
            ) : (
              <kbd className="flex-shrink-0 rounded border border-aomi-border px-1.5 py-0.5 font-mono text-[11px] text-aomi-muted">
                /
              </kbd>
            )}
          </label>
        </header>

        {actionError && (
          <p className="mt-6 rounded-xl border border-aomi-border bg-aomi-surface px-4 py-3 text-sm text-aomi-danger">
            {actionError}
          </p>
        )}

        <section className="mt-11" aria-labelledby="installed-packages-title">
          <div className="flex items-center justify-between border-b border-aomi-border pb-4">
            <h2 id="installed-packages-title" className="text-lg font-semibold">
              Installed
              <span className="ml-2 text-sm font-normal text-aomi-muted">
                {installedPackages.length}
              </span>
            </h2>
            <button
              type="button"
              aria-label="Manage installed packages"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-aomi-muted transition-colors hover:bg-aomi-surface-2 hover:text-aomi-fg"
            >
              <Gear size={18} />
            </button>
          </div>
          {installedPackages.length === 0 ? (
            <p className="py-6 text-sm text-aomi-muted">
              Nothing installed yet — add a package from the catalog below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1 py-4">
              {installedPackages.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  title={app.description}
                  className="group flex w-[78px] flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors hover:bg-aomi-surface-2"
                >
                  <PackageIcon app={app} size="small" />
                  <span className="w-full truncate text-center text-[11px] text-aomi-muted transition-colors group-hover:text-aomi-fg">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex rounded-full border border-aomi-border bg-aomi-surface-2 p-[3px]">
            {(["public", "personal"] as PackageVisibility[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                aria-pressed={activeView === view}
                className={`rounded-full px-3.5 py-[5px] text-xs transition-colors ${
                  activeView === view
                    ? "bg-aomi-accent-strong font-medium text-aomi-on-accent"
                    : "text-aomi-muted hover:text-aomi-fg"
                }`}
              >
                {view === "public" ? "Public" : "Personal"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setInstalledOnly((v) => !v)}
            aria-pressed={installedOnly}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              installedOnly
                ? "border-transparent bg-aomi-surface-2 font-medium text-aomi-fg"
                : "border-aomi-border text-aomi-muted hover:text-aomi-fg"
            }`}
          >
            <Filter size={15} />
            Installed only
          </button>
        </div>

        <div className="pb-12 pt-7">
          {catalogError ? (
            <div className="border-t border-aomi-border py-16 text-center">
              <p className="font-medium text-aomi-danger">{catalogError}</p>
              <p className="mt-1 text-sm text-aomi-muted">
                Sign in and try again — the catalog needs your account.
              </p>
            </div>
          ) : catalog === null ? (
            <div className="flex items-center justify-center gap-2 border-t border-aomi-border py-16 text-sm text-aomi-muted">
              <Loader2 size={15} className="animate-spin" />
              Loading packages…
            </div>
          ) : visiblePackages.length === 0 ? (
            <div className="border-t border-aomi-border py-16 text-center">
              <p className="font-medium">No packages found</p>
              <p className="mt-1 text-sm text-aomi-muted">
                {installedOnly
                  ? "Nothing installed matches — try turning off “Installed only”."
                  : "Try another name or capability."}
              </p>
              {(searching || installedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setInstalledOnly(false);
                  }}
                  className="mt-4 rounded-xl border border-aomi-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-aomi-surface-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : searching || installedOnly ? (
            // Flat, counted list — category headers fragment a short result set.
            <section aria-label="Search results">
              <h2 className="border-b border-aomi-border pb-4 text-lg font-semibold">
                {visiblePackages.length} {visiblePackages.length === 1 ? "result" : "results"}
              </h2>
              <div className="grid md:grid-cols-2 md:gap-x-14">
                {visiblePackages.map((app) => (
                  <PackageRow
                    key={app.id}
                    app={app}
                    installed={installedIds.has(app.id)}
                    busy={busyId === app.id}
                    onInstall={() => install(app.id)}
                    onUninstall={() => uninstall(app.id)}
                  />
                ))}
              </div>
            </section>
          ) : (
            categories.map((category) => {
              const items = visiblePackages.filter((app) => app.category === category);
              if (items.length === 0) return null;
              const categoryId = `packages-${category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

              return (
                <section key={category} className="mb-10" aria-labelledby={categoryId}>
                  <h2
                    id={categoryId}
                    className="flex items-baseline gap-2 border-b border-aomi-border pb-4 text-lg font-semibold"
                  >
                    {category}
                    <span className="text-sm font-normal text-aomi-muted">
                      {items.length}
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 md:gap-x-14">
                    {items.map((app) => (
                      <PackageRow
                        key={app.id}
                        app={app}
                        installed={installedIds.has(app.id)}
                        busy={busyId === app.id}
                        onInstall={() => install(app.id)}
                        onUninstall={() => uninstall(app.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PackageRow({
  app,
  installed,
  busy,
  onInstall,
  onUninstall,
}: {
  app: CatalogPackage;
  installed: boolean;
  busy: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  return (
    <article className="group flex min-h-[92px] items-center gap-4 border-b border-aomi-border py-4">
      <PackageIcon app={app} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold">{app.name}</h3>
        <p className="mt-1 truncate text-sm text-aomi-muted">{app.description}</p>
      </div>
      {app.pinned ? (
        // Core apps can't be removed — state the fact without offering the
        // reversal, so the button never lies about what a click would do.
        <span className="flex w-[92px] flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-aomi-muted">
          <Check size={14} />
          Built in
        </span>
      ) : installed ? (
        // Bordered at rest so it reads as actionable without hover; the label
        // states the fact, hover reveals the reversal.
        <button
          type="button"
          onClick={onUninstall}
          disabled={busy}
          title={`Remove ${app.name}`}
          aria-label={`Remove ${app.name}`}
          className="flex w-[92px] flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-aomi-border px-3 py-2 text-sm font-medium text-aomi-muted transition-colors hover:border-danger/40 hover:bg-aomi-danger/10 hover:text-aomi-danger disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <Check size={14} className="group-hover:hidden" />
              <span className="group-hover:hidden">Installed</span>
              <span className="hidden group-hover:inline">Remove</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onInstall}
          disabled={busy}
          className="flex w-[92px] flex-shrink-0 items-center justify-center rounded-xl border border-aomi-border px-3 py-2 text-sm font-medium transition-colors hover:bg-aomi-surface-2 disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Install"}
        </button>
      )}
    </article>
  );
}

function PackageIcon({
  app,
  size = "large",
}: {
  app: CatalogPackage;
  size?: "small" | "large";
}) {
  const sizeClass = size === "small" ? "h-11 w-11 text-xs" : "h-12 w-12 text-sm";
  const glyphSize = size === "small" ? 21 : 23;
  const Glyph =
    app.glyph === "chart"
      ? Chart
      : app.glyph === "shield"
        ? Shield
        : app.glyph === "wallet"
          ? WalletIcon
          : null;

  return (
    <div
      title={app.name}
      aria-label={app.name}
      className={`flex flex-shrink-0 items-center justify-center rounded-[13px] border border-black/10 font-bold tracking-[-0.04em] ${sizeClass}`}
      style={{ backgroundColor: app.background, color: app.foreground }}
    >
      {app.iconDomain || app.iconUrl ? (
        <span
          aria-hidden="true"
          className="h-[68%] w-[68%] bg-contain bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${
              app.iconUrl ??
              `https://www.google.com/s2/favicons?domain=${app.iconDomain}&sz=128`
            }")`,
          }}
        />
      ) : Glyph ? (
        <Glyph aria-hidden="true" size={glyphSize} />
      ) : (
        // No decoration on record — a monogram beats a wrong brand icon.
        <span aria-hidden="true">{app.name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
