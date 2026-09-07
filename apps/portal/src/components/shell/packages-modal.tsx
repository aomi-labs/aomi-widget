"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AppWindow,
  CandlestickChart,
  Check,
  CircleCheck,
  Code2,
  Compass,
  FlaskConical,
  Landmark,
  Library,
  Loader2,
  MessageCircle,
  Plus,
  Repeat2,
  Search,
  Sprout,
  WandSparkles,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import { ModalBackdrop } from "@/components/ui/modal-backdrop";
import { requestCapabilityMention } from "@/components/assistant-ui/capability-composer";
import {
  conciseSkillDescription,
  skillLabel,
  useSkillCatalog,
  type SkillSummary,
} from "@/lib/capabilities/skill-catalog";
import {
  seedAccountOverview,
  useAccountOverview,
} from "@portal/lib/account-overview";
import {
  ChainMarks,
  LibraryDetailPanel,
  SkillIdentity,
  type LibrarySelection,
} from "./library-detail-panel";
import { PackageIcon } from "./package-row";
import {
  ARC_TESTNET_CHAIN_ID,
  isPackageAvailableOnChain,
  PINNED_APPS,
  type CatalogPackage,
} from "./packages-catalog";
import { setInstalledApps } from "./packages-api";
import { usePackageCatalog } from "./use-package-catalog";
import { directoryModalType } from "./directory-modal-type";

interface PackagesModalProps {
  onClose: () => void;
}

type LibraryView =
  | "discover"
  | "installed"
  | "apps"
  | "skills"
  | LibraryCategory;
type LibraryCategory =
  | "lending"
  | "cross-chain"
  | "staking"
  | "trading"
  | "research"
  | "wallets"
  | "developer";

const NAV_ITEMS: { id: LibraryView; label: string; icon: LucideIcon }[] = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "installed", label: "Installed", icon: CircleCheck },
  { id: "apps", label: "Apps", icon: AppWindow },
  { id: "skills", label: "Skills", icon: WandSparkles },
];

const CATEGORIES: { id: LibraryCategory; label: string; icon: LucideIcon }[] = [
  { id: "lending", label: "Lending", icon: Landmark },
  { id: "cross-chain", label: "Swap & bridge", icon: Repeat2 },
  { id: "staking", label: "Staking", icon: Sprout },
  { id: "trading", label: "Trading", icon: CandlestickChart },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "wallets", label: "Tokens & wallets", icon: WalletCards },
  { id: "developer", label: "Developer", icon: Code2 },
];

const FEATURED = [
  "skill:aave",
  "skill:across",
  "skill:aerodrome",
  "skill:lifi_swap",
  "app:defillama",
  "app:dune",
  "app:hyperliquid",
  "skill:common_erc20",
];

function selectionKey(selection: LibrarySelection): string {
  return `${selection.kind}:${selection.item.id}`;
}

function selectionName(selection: LibrarySelection): string {
  return selection.kind === "app"
    ? selection.item.name
    : skillLabel(selection.item);
}

function selectionDescription(selection: LibrarySelection): string {
  return selection.kind === "app"
    ? selection.item.description
    : conciseSkillDescription(selection.item.description);
}

function selectionChains(selection: LibrarySelection): number[] {
  return selection.item.chainIds;
}

export function inferLibraryCategory(
  selection: LibrarySelection,
): LibraryCategory | null {
  const tags = selection.kind === "skill" ? selection.item.tags.join(" ") : "";
  const text =
    `${selection.item.id} ${selectionName(selection)} ${selection.item.description} ${tags}`.toLowerCase();
  if (
    /bridge|cross[- ]chain|cctp|stargate|across|debridge|swap|uniswap|sushi|curve|aerodrome|jupiter|oneinch|lifi|raydium|meteora|sanctum/u.test(
      text,
    )
  ) {
    return "cross-chain";
  }
  if (/lend|borrow|repay|collateral|aave|compound|morpho|kamino/u.test(text)) {
    return "lending";
  }
  if (
    /stake|restake|yield|liquidity|lido|etherfi|kelp|renzo|rocket|pendle|yearn|eigenlayer|convex/u.test(
      text,
    )
  ) {
    return "staking";
  }
  if (
    /perp|market|trade|order|stock|prediction|hyperliquid|dydx|gmx|kalshi|polymarket|limitless/u.test(
      text,
    )
  ) {
    return "trading";
  }
  if (
    /wallet|payment|allowance|transfer|balance|erc[-_ ]?20|token/u.test(text)
  ) {
    return "wallets";
  }
  if (
    /query|analytics|research|data|chart|explain|portfolio|inspect/u.test(text)
  ) {
    return "research";
  }
  if (
    /deploy|developer|contract|nft|multisig|account abstraction|orchestrat|automat/u.test(
      text,
    )
  ) {
    return "developer";
  }
  return null;
}

function SearchField({
  query,
  onQueryChange,
  searchRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="border-aomi-border bg-aomi-surface focus-within:border-aomi-muted flex h-10 min-w-0 items-center gap-2.5 rounded-xl border px-3.5">
      <Search className="text-aomi-muted size-4 shrink-0" />
      <input
        ref={searchRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        aria-label="Search library"
        placeholder="Search apps and skills"
        className="placeholder:text-aomi-muted min-w-0 flex-1 bg-transparent text-[14px] outline-none"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onQueryChange("")}
          className="text-aomi-muted hover:bg-aomi-hover flex size-5 items-center justify-center rounded-full"
        >
          <X className="size-3" />
        </button>
      ) : (
        <kbd className="border-aomi-border text-aomi-muted rounded-md border px-1.5 py-0.5 font-mono text-[9px]">
          /
        </kbd>
      )}
    </label>
  );
}

function SidebarButton({
  label,
  icon: Icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 transition-colors ${directoryModalType.navigation} ${
        active
          ? "bg-aomi-surface-2 font-medium"
          : "text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg"
      }`}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {count !== undefined ? (
        <span className="font-mono text-[10px]">{count}</span>
      ) : null}
    </button>
  );
}

function KindLabel({ kind }: { kind: LibrarySelection["kind"] }) {
  return (
    <span className="bg-aomi-surface-2 text-aomi-muted rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]">
      {kind}
    </span>
  );
}

function AppAction({
  app,
  installed,
  busy,
  disabled,
  activeChainId,
  onInstall,
}: {
  app: CatalogPackage;
  installed: boolean;
  busy: boolean;
  disabled: boolean;
  activeChainId?: number;
  onInstall: () => void;
}) {
  const available = isPackageAvailableOnChain(app, activeChainId);
  if (installed) {
    return (
      <span className="text-aomi-muted flex h-8 w-[62px] shrink-0 items-center justify-center gap-1.5 text-[12px] font-medium">
        <Check className="size-3.5" /> Added
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onInstall}
      disabled={disabled || !available}
      aria-label={
        available ? `Add ${app.name}` : `Switch network to add ${app.name}`
      }
      className="border-aomi-border hover:bg-aomi-hover flex h-8 w-[62px] shrink-0 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors disabled:opacity-40"
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <>
          <Plus className="size-3.5" /> Add
        </>
      )}
    </button>
  );
}

function CatalogRow({
  selection,
  selected,
  installed,
  busy,
  disabled,
  activeChainId,
  onSelect,
  onInstall,
  onTry,
}: {
  selection: LibrarySelection;
  selected: boolean;
  installed: boolean;
  busy: boolean;
  disabled: boolean;
  activeChainId?: number;
  onSelect: () => void;
  onInstall: () => void;
  onTry: () => void;
}) {
  const app = selection.kind === "app" ? selection.item : null;
  const arcOnly =
    app?.chainIds.length === 1 && app.chainIds[0] === ARC_TESTNET_CHAIN_ID;
  return (
    <article
      className={`flex min-h-[58px] items-center gap-2 rounded-xl px-2 transition-colors ${selected ? "bg-aomi-surface-2" : "hover:bg-aomi-hover"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${selectionName(selection)} details`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
      >
        {selection.kind === "app" ? (
          <PackageIcon app={selection.item} size="small" />
        ) : (
          <SkillIdentity skillId={selection.item.id} />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold">
              {selectionName(selection)}
            </span>
            <KindLabel kind={selection.kind} />
            {arcOnly ? (
              <span className="text-aomi-muted shrink-0 text-[10px]">
                Arc only
              </span>
            ) : null}
          </span>
          <span className="text-aomi-muted mt-0.5 block truncate text-[12px]">
            {selectionDescription(selection)}
          </span>
        </span>
      </button>
      <ChainMarks chainIds={selectionChains(selection)} />
      {app ? (
        <AppAction
          app={app}
          installed={installed}
          busy={busy}
          disabled={disabled}
          activeChainId={activeChainId}
          onInstall={onInstall}
        />
      ) : (
        <button
          type="button"
          onClick={onTry}
          aria-label={`Try ${selectionName(selection)}`}
          className="border-aomi-border hover:bg-aomi-hover flex h-8 w-[62px] shrink-0 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors"
        >
          <MessageCircle className="size-3.5" /> Try
        </button>
      )}
    </article>
  );
}

function EmptyList() {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center text-center">
      <Search className="text-aomi-muted size-5" />
      <p className="mt-3 text-[13px] font-medium">No capabilities found</p>
      <p className="text-aomi-muted mt-1 text-xs">
        Try another search or section.
      </p>
    </div>
  );
}

export function PackagesModal({ onClose }: PackagesModalProps) {
  const activeChainId = useAomiWalletKit().identity.chainId;
  const account = useAccountOverview();
  const {
    catalog,
    error: catalogError,
    retry: retryApps,
  } = usePackageCatalog();
  const {
    skills,
    error: skillsError,
    retry: retrySkills,
    loading: skillsLoading,
  } = useSkillCatalog();
  const [view, setView] = useState<LibraryView>("discover");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LibrarySelection | null>(null);
  const [installedFromServer, setInstalledFromServer] = useState<{
    userId: string;
    apps: string[];
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const accountUserId = account?.user.user_id;
  const installedBaseline =
    installedFromServer && installedFromServer.userId === accountUserId
      ? installedFromServer.apps
      : (account?.user.apps ?? null);
  const installedReady = installedBaseline !== null;
  const installedIds = useMemo(() => {
    const ids = new Set(installedBaseline ?? []);
    for (const pinned of PINNED_APPS) ids.add(pinned);
    return ids;
  }, [installedBaseline]);

  const mutateInstalled = useCallback(
    async (packageId: string, next: string[]) => {
      if (
        !installedReady ||
        !account ||
        !accountUserId ||
        mutationInFlight.current
      )
        return;
      mutationInFlight.current = true;
      setBusyId(packageId);
      setActionError(null);
      try {
        const apps = await setInstalledApps(next);
        setInstalledFromServer({ userId: accountUserId, apps });
        seedAccountOverview({ ...account, user: { ...account.user, apps } });
      } catch (cause) {
        setActionError(
          cause instanceof Error ? cause.message : "Couldn’t update apps",
        );
      } finally {
        mutationInFlight.current = false;
        setBusyId(null);
      }
    },
    [account, accountUserId, installedReady],
  );

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
  const trySkill = (skill: SkillSummary) => {
    requestCapabilityMention({ kind: "skill", id: skill.id });
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      const typingElsewhere =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);
      const wantsSearch =
        event.key === "/" ||
        (event.key === "k" && (event.metaKey || event.ctrlKey));
      if (wantsSearch && !typingElsewhere) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const appEntries = useMemo<LibrarySelection[]>(
    () => (catalog ?? []).map((item) => ({ kind: "app", item })),
    [catalog],
  );
  const skillEntries = useMemo<LibrarySelection[]>(
    () => (skills ?? []).map((item) => ({ kind: "skill", item })),
    [skills],
  );
  const allEntries = useMemo(
    () => [...appEntries, ...skillEntries],
    [appEntries, skillEntries],
  );
  const categoryCounts = useMemo(
    () =>
      new Map(
        CATEGORIES.map((category) => [
          category.id,
          allEntries.filter(
            (entry) => inferLibraryCategory(entry) === category.id,
          ).length,
        ]),
      ),
    [allEntries],
  );

  const visible = useMemo(() => {
    let source = allEntries;
    if (view === "installed")
      source = appEntries.filter((entry) => installedIds.has(entry.item.id));
    else if (view === "apps") source = appEntries;
    else if (view === "skills") source = skillEntries;
    else if (view !== "discover")
      source = allEntries.filter(
        (entry) => inferLibraryCategory(entry) === view,
      );

    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? source.filter((entry) =>
          `${selectionName(entry)} ${entry.item.description} ${entry.kind === "skill" ? entry.item.tags.join(" ") : entry.item.searchTerms.join(" ")}`
            .toLowerCase()
            .includes(needle),
        )
      : source;
    return [...filtered].sort((left, right) => {
      if (view !== "discover")
        return selectionName(left).localeCompare(selectionName(right));
      const leftRank = FEATURED.indexOf(selectionKey(left));
      const rightRank = FEATURED.indexOf(selectionKey(right));
      return (
        (leftRank < 0 ? FEATURED.length : leftRank) -
          (rightRank < 0 ? FEATURED.length : rightRank) ||
        selectionName(left).localeCompare(selectionName(right))
      );
    });
  }, [allEntries, appEntries, installedIds, query, skillEntries, view]);

  const activeSelection =
    selected &&
    visible.some((entry) => selectionKey(entry) === selectionKey(selected))
      ? selected
      : (visible[0] ?? null);
  const selectedInstalled =
    activeSelection?.kind === "app" &&
    installedIds.has(activeSelection.item.id);
  const listTitle = query.trim()
    ? "Results"
    : view === "discover"
      ? "Recommended"
      : view === "installed"
        ? "Installed"
        : view === "apps"
          ? "Apps"
          : view === "skills"
            ? "Skills"
            : (CATEGORIES.find((category) => category.id === view)?.label ??
              "Library");
  const waiting =
    view === "apps" || view === "installed"
      ? catalog === null
      : view === "skills"
        ? skillsLoading
        : catalog === null || skillsLoading;
  const loadError =
    view === "apps" || view === "installed"
      ? catalogError
      : view === "skills"
        ? skillsError
        : (catalogError ?? skillsError);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ zIndex: 60 }}
    >
      <ModalBackdrop aria-label="Dismiss library" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        className="border-aomi-border bg-aomi-raised text-aomi-fg relative overflow-hidden rounded-[22px] border shadow-[0_24px_70px_rgba(0,0,0,0.08)]"
        style={{ width: 1080, height: 620, maxWidth: "96%", maxHeight: "92%" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close library"
          className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg absolute right-4 top-4 z-20 flex size-7 items-center justify-center rounded-full transition-colors"
        >
          <X className="size-3.5" />
        </button>
        <div className="grid h-full min-h-0 md:grid-cols-[185px_minmax(0,1fr)_300px]">
          <aside className="border-aomi-border bg-aomi-bg/40 min-h-0 overflow-y-auto border-r p-3">
            <div className="flex items-center gap-2 px-2.5 py-3">
              <Library className="text-aomi-accent size-4" />
              <h1
                id="library-title"
                className={`flex-1 ${directoryModalType.modalTitle}`}
              >
                Library
              </h1>
            </div>
            <nav className="mt-3 space-y-0.5" aria-label="Library sections">
              {NAV_ITEMS.map((item) => (
                <SidebarButton
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={view === item.id}
                  onClick={() => {
                    setView(item.id);
                    setSelected(null);
                  }}
                  count={
                    item.id === "discover"
                      ? allEntries.length
                      : item.id === "installed"
                        ? appEntries.filter((entry) =>
                            installedIds.has(entry.item.id),
                          ).length
                        : item.id === "apps"
                          ? appEntries.length
                          : skillEntries.length
                  }
                />
              ))}
            </nav>
            <div className="border-aomi-border mt-5 border-t pt-4">
              <span className="text-aomi-muted px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                Categories
              </span>
              <nav className="mt-2 space-y-0.5" aria-label="Library categories">
                {CATEGORIES.map((category) => (
                  <SidebarButton
                    key={category.id}
                    label={category.label}
                    icon={category.icon}
                    active={view === category.id}
                    onClick={() => {
                      setView(category.id);
                      setSelected(null);
                    }}
                    count={categoryCounts.get(category.id)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col p-4">
            <SearchField
              query={query}
              onQueryChange={setQuery}
              searchRef={searchRef}
            />
            {actionError ? (
              <p className="bg-aomi-surface-2 text-aomi-danger mt-3 rounded-xl px-3 py-2 text-xs">
                {actionError}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between px-1">
              <h2 className={directoryModalType.sectionTitle}>{listTitle}</h2>
              <span className="text-aomi-muted font-mono text-[10px]">
                {visible.length}
              </span>
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {loadError ? (
                <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center text-xs">
                  <p className="text-aomi-muted">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      retryApps();
                      retrySkills();
                    }}
                    className="bg-aomi-fg text-aomi-bg rounded-full px-4 py-2 font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : waiting ? (
                <div className="text-aomi-muted flex min-h-44 items-center justify-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin" /> Loading library…
                </div>
              ) : visible.length === 0 ? (
                <EmptyList />
              ) : (
                <div className="space-y-0.5">
                  {visible.map((entry) => (
                    <CatalogRow
                      key={selectionKey(entry)}
                      selection={entry}
                      selected={
                        activeSelection
                          ? selectionKey(activeSelection) ===
                            selectionKey(entry)
                          : false
                      }
                      installed={
                        entry.kind === "app" && installedIds.has(entry.item.id)
                      }
                      busy={entry.kind === "app" && busyId === entry.item.id}
                      disabled={!installedReady || busyId !== null}
                      activeChainId={activeChainId}
                      onSelect={() => setSelected(entry)}
                      onInstall={() =>
                        entry.kind === "app" && install(entry.item.id)
                      }
                      onTry={() =>
                        entry.kind === "skill" && trySkill(entry.item)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </main>

          <LibraryDetailPanel
            selection={activeSelection}
            installed={selectedInstalled}
            installedReady={installedReady}
            busy={
              activeSelection?.kind === "app" &&
              busyId === activeSelection.item.id
            }
            activeChainId={activeChainId}
            onInstall={install}
            onUninstall={uninstall}
            onTrySkill={trySkill}
          />
        </div>
      </div>
    </div>
  );
}
