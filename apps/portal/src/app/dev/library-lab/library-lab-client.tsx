"use client";

import type { FC, ReactNode, SVGProps } from "react";
import {
  AppWindow,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Braces,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Command,
  Compass,
  Grid2X2,
  LayoutGrid,
  Library as LibraryIcon,
  ListFilter,
  MoreHorizontal,
  Plus,
  Route,
  Search,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

import { getAppIcon, getChainIcon, getSkillIcon } from "@/components/icons";

type CatalogKind = "app" | "skill";

type CatalogItem = {
  id: string;
  name: string;
  kind: CatalogKind;
  description: string;
  chains: number[];
  installed?: boolean;
  meta?: string;
};

const ITEMS: CatalogItem[] = [
  {
    id: "default",
    name: "Aomi Core",
    kind: "app",
    description: "Wallet, chain, and account essentials.",
    chains: [1, 8453, 42161],
    installed: true,
    meta: "Built in",
  },
  {
    id: "dune",
    name: "Dune",
    kind: "app",
    description: "Query and explain onchain data.",
    chains: [],
    installed: true,
    meta: "Analytics",
  },
  {
    id: "defillama",
    name: "DefiLlama",
    kind: "app",
    description: "Compare protocols, yields, and TVL.",
    chains: [],
    meta: "Research",
  },
  {
    id: "hyperliquid",
    name: "Hyperliquid",
    kind: "app",
    description: "Research markets and perp positions.",
    chains: [],
    meta: "Markets",
  },
  {
    id: "aave",
    name: "Aave",
    kind: "skill",
    description: "Supply, borrow, repay, or withdraw on Aave V3.",
    chains: [1, 10, 137, 8453, 42161],
    meta: "Lending",
  },
  {
    id: "across",
    name: "Across",
    kind: "skill",
    description: "Bridge tokens across EVM networks.",
    chains: [1, 10, 8453, 42161],
    meta: "Bridge",
  },
  {
    id: "aerodrome",
    name: "Aerodrome",
    kind: "skill",
    description: "Swap and manage liquidity on Base.",
    chains: [8453],
    meta: "Exchange",
  },
  {
    id: "common_erc20",
    name: "ERC-20",
    kind: "skill",
    description: "Inspect balances, allowances, and token transfers.",
    chains: [1, 10, 137, 8453, 42161],
    meta: "Tokens",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "skill",
    description: "Find the best routes for Solana swaps.",
    chains: [],
    meta: "Solana",
  },
  {
    id: "lifi_swap",
    name: "LI.FI Swap",
    kind: "skill",
    description: "Route same-chain EVM token swaps.",
    chains: [1, 10, 137, 8453, 42161],
    meta: "Swap",
  },
  {
    id: "morpho",
    name: "Morpho",
    kind: "skill",
    description: "Lend and borrow through Morpho markets.",
    chains: [1, 8453],
    meta: "Lending",
  },
  {
    id: "uniswap",
    name: "Uniswap",
    kind: "skill",
    description: "Swap tokens through Uniswap V2 or V3.",
    chains: [1, 10, 137, 8453, 42161],
    meta: "Exchange",
  },
];

const APPS = ITEMS.filter((item) => item.kind === "app");
const SKILLS = ITEMS.filter((item) => item.kind === "skill");
const INSTALLED = ITEMS.filter((item) => item.installed);

type IconComponent = FC<SVGProps<SVGSVGElement>>;

function identityIcon(item: CatalogItem): IconComponent {
  return (
    (item.kind === "app" ? getAppIcon(item.id) : getSkillIcon(item.id)) ??
    (item.kind === "app" ? AppWindow : WandSparkles)
  );
}

function BrandMark({
  item,
  size = "md",
}: {
  item: CatalogItem;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = identityIcon(item);
  const shell =
    size === "sm"
      ? "size-8 rounded-[10px]"
      : size === "lg"
        ? "size-12 rounded-[15px]"
        : "size-10 rounded-xl";
  const icon =
    size === "sm" ? "size-4" : size === "lg" ? "size-5" : "size-[18px]";

  return (
    <span
      className={`border-aomi-overlay-border bg-aomi-raised text-aomi-accent flex shrink-0 items-center justify-center border ${shell}`}
    >
      <Icon className={icon} />
    </span>
  );
}

function ChainMarks({ chains }: { chains: number[] }) {
  if (chains.length === 0) {
    return <span className="text-aomi-muted text-[10px]">All networks</span>;
  }

  return (
    <span
      className="flex items-center -space-x-1"
      aria-label="Supported chains"
    >
      {chains.slice(0, 3).map((chainId) => {
        const Icon = getChainIcon(chainId);
        return (
          <span
            key={chainId}
            className="border-aomi-raised bg-aomi-surface-2 flex size-[18px] items-center justify-center rounded-full border"
          >
            {Icon ? <Icon className="size-2.5" /> : null}
          </span>
        );
      })}
      {chains.length > 3 ? (
        <span className="border-aomi-raised bg-aomi-surface-2 text-aomi-muted flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-1 text-[8px] font-medium">
          +{chains.length - 3}
        </span>
      ) : null}
    </span>
  );
}

function KindLabel({ kind }: { kind: CatalogKind }) {
  return (
    <span className="bg-aomi-surface-2 text-aomi-muted rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]">
      {kind}
    </span>
  );
}

function SearchField({ placeholder = "Search apps and skills" }) {
  return (
    <label className="border-aomi-border bg-aomi-surface flex h-10 min-w-0 items-center gap-2.5 rounded-xl border px-3.5">
      <Search className="text-aomi-muted size-4 shrink-0" />
      <input
        className="placeholder:text-aomi-muted min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <kbd className="border-aomi-border text-aomi-muted rounded-md border px-1.5 py-0.5 font-mono text-[9px]">
        /
      </kbd>
    </label>
  );
}

function AddControl({ installed = false }: { installed?: boolean }) {
  return installed ? (
    <span className="text-aomi-muted flex h-8 items-center gap-1.5 px-2 text-[11px] font-medium">
      <Check className="size-3.5" />
      Added
    </span>
  ) : (
    <button
      type="button"
      className="border-aomi-border hover:bg-aomi-hover flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors"
    >
      <Plus className="size-3.5" />
      Add
    </button>
  );
}

function CatalogRow({
  item,
  compact = false,
  selected = false,
  showKind = true,
}: {
  item: CatalogItem;
  compact?: boolean;
  selected?: boolean;
  showKind?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 text-left ${
        compact ? "min-h-14 py-2" : "min-h-[70px] py-3"
      } ${selected ? "bg-aomi-surface-2" : "hover:bg-aomi-hover"}`}
    >
      <BrandMark item={item} size={compact ? "sm" : "md"} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold">
            {item.name}
          </span>
          {showKind ? <KindLabel kind={item.kind} /> : null}
        </span>
        <span className="text-aomi-muted mt-0.5 block truncate text-[11px]">
          {item.description}
        </span>
      </span>
      <ChainMarks chains={item.chains} />
      <AddControl installed={item.installed} />
    </div>
  );
}

function CatalogCard({ item }: { item: CatalogItem }) {
  return (
    <article className="border-aomi-border bg-aomi-raised hover:bg-aomi-hover flex min-h-40 flex-col rounded-2xl border p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <BrandMark item={item} size="lg" />
        <div className="flex items-center gap-2">
          <ChainMarks chains={item.chains} />
          <KindLabel kind={item.kind} />
        </div>
      </div>
      <h3 className="mt-4 text-[14px] font-semibold">{item.name}</h3>
      <p className="text-aomi-muted mt-1 line-clamp-2 text-[11px] leading-[17px]">
        {item.description}
      </p>
      <div className="mt-auto flex items-end justify-between pt-4">
        <span className="text-aomi-muted text-[10px]">{item.meta}</span>
        <AddControl installed={item.installed} />
      </div>
    </article>
  );
}

function FilterPill({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "bg-aomi-fg text-aomi-bg"
          : "text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Window({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-aomi-border bg-aomi-raised text-aomi-fg overflow-hidden rounded-[22px] border shadow-[0_24px_70px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function WindowHeader({
  title = "Library",
  subtitle,
  action = true,
}: {
  title?: string;
  subtitle?: string;
  action?: boolean;
}) {
  return (
    <header className="border-aomi-border flex min-h-[66px] items-center gap-3 border-b px-5">
      <span className="bg-aomi-accent-subtle text-aomi-accent flex size-9 items-center justify-center rounded-xl">
        <LibraryIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        {subtitle ? (
          <span className="text-aomi-muted mt-0.5 block text-[11px]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {action ? (
        <button
          type="button"
          aria-label="Close preview"
          className="bg-aomi-surface-2 text-aomi-muted flex size-8 items-center justify-center rounded-full"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </header>
  );
}

function Direction({
  id,
  number,
  name,
  note,
  children,
}: {
  id: string;
  number: string;
  name: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-start gap-3">
        <span className="border-aomi-border bg-aomi-raised text-aomi-muted flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]">
          {number}
        </span>
        <div>
          <h2 className="text-[15px] font-semibold">{name}</h2>
          <p className="text-aomi-muted mt-0.5 max-w-2xl text-[12px] leading-5">
            {note}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function UnifiedCatalog() {
  return (
    <Window>
      <WindowHeader subtitle="Apps and skills that extend what Aomi can do" />
      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <SearchField />
          <div className="bg-aomi-surface flex items-center rounded-xl p-1">
            <FilterPill active>Everything</FilterPill>
            <FilterPill>Apps</FilterPill>
            <FilterPill>Skills</FilterPill>
          </div>
        </div>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[12px] font-semibold">Ready to use</h3>
              <p className="text-aomi-muted mt-0.5 text-[10px]">
                Installed capabilities
              </p>
            </div>
            <button className="text-aomi-muted text-[11px]" type="button">
              Manage
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {INSTALLED.map((item) => (
              <CatalogRow key={item.id} item={item} compact showKind={false} />
            ))}
          </div>
        </section>
        <section className="border-aomi-border border-t pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold">Explore</h3>
            <span className="text-aomi-muted text-[10px]">52 capabilities</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[ITEMS[4], ITEMS[6], ITEMS[2], ITEMS[9], ITEMS[10], ITEMS[3]].map(
              (item) => (
                <CatalogCard key={item.id} item={item} />
              ),
            )}
          </div>
        </section>
      </div>
    </Window>
  );
}

function InstalledFirst() {
  return (
    <Window className="p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-[22px] font-semibold tracking-[-0.02em]">
            Library
          </h3>
          <p className="text-aomi-muted mt-1 text-[12px]">
            Give Aomi new tools and domain knowledge.
          </p>
        </div>
        <div className="w-full sm:w-[310px]">
          <SearchField placeholder="Find a capability" />
        </div>
      </div>
      <section className="mt-7">
        <div className="flex items-center gap-1 text-[12px] font-semibold">
          Installed <ChevronRight className="size-3.5" />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {INSTALLED.map((item) => (
            <button
              key={item.id}
              type="button"
              className="hover:bg-aomi-hover flex w-[72px] flex-col items-center gap-2 rounded-xl py-2"
            >
              <BrandMark item={item} size="md" />
              <span className="w-full truncate text-[10px]">{item.name}</span>
            </button>
          ))}
          <button
            type="button"
            className="hover:bg-aomi-hover flex w-[72px] flex-col items-center gap-2 rounded-xl py-2"
          >
            <span className="border-aomi-border text-aomi-muted flex size-10 items-center justify-center rounded-xl border border-dashed">
              <Plus className="size-4" />
            </span>
            <span className="text-aomi-muted text-[10px]">Add more</span>
          </button>
        </div>
      </section>
      <div className="mt-6 flex gap-1">
        <FilterPill active>Public</FilterPill>
        <FilterPill>Personal</FilterPill>
      </div>
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[12px] font-semibold">Popular</h4>
          <button type="button" className="text-aomi-muted text-[10px]">
            View all
          </button>
        </div>
        <div className="grid gap-x-8 md:grid-cols-2">
          {[ITEMS[2], ITEMS[4], ITEMS[3], ITEMS[5], ITEMS[7], ITEMS[8]].map(
            (item) => (
              <div key={item.id} className="border-aomi-border border-b py-1">
                <CatalogRow item={item} compact />
              </div>
            ),
          )}
        </div>
      </section>
    </Window>
  );
}

function SidebarDirectory() {
  const selected = ITEMS[4];
  return (
    <Window className="min-h-[540px]">
      <div className="grid min-h-[540px] md:grid-cols-[185px_1fr_280px]">
        <aside className="border-aomi-border bg-aomi-bg/40 border-r p-3">
          <div className="flex items-center gap-2 px-2.5 py-3 text-[14px] font-semibold">
            <LibraryIcon className="text-aomi-accent size-4" /> Library
          </div>
          <nav className="mt-3 space-y-0.5">
            {[
              [Compass, "Discover", true, "52"],
              [CircleCheck, "Installed", false, "2"],
              [AppWindow, "Apps", false, "10"],
              [WandSparkles, "Skills", false, "42"],
            ].map(([Icon, label, active, count]) => {
              const NavIcon = Icon as typeof Compass;
              return (
                <button
                  key={String(label)}
                  type="button"
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] ${
                    active ? "bg-aomi-surface-2 font-medium" : "text-aomi-muted"
                  }`}
                >
                  <NavIcon className="size-3.5" />
                  <span className="flex-1 text-left">{String(label)}</span>
                  <span className="font-mono text-[9px]">{String(count)}</span>
                </button>
              );
            })}
          </nav>
          <div className="border-aomi-border mt-5 border-t pt-4">
            <span className="text-aomi-muted px-2.5 text-[9px] font-semibold uppercase tracking-[0.12em]">
              Categories
            </span>
            {["DeFi", "Research", "Automation", "Developer"].map((label) => (
              <button
                key={label}
                type="button"
                className="text-aomi-muted hover:text-aomi-fg mt-1 block h-8 w-full rounded-lg px-2.5 text-left text-[11px]"
              >
                {label}
              </button>
            ))}
          </div>
        </aside>
        <main className="min-w-0 p-4">
          <SearchField />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] font-semibold">Recommended</span>
            <button
              className="text-aomi-muted flex items-center gap-1 text-[10px]"
              type="button"
            >
              <ListFilter className="size-3" /> Filters
            </button>
          </div>
          <div className="mt-2 space-y-0.5">
            {[ITEMS[4], ITEMS[5], ITEMS[6], ITEMS[9], ITEMS[2]].map((item) => (
              <CatalogRow
                key={item.id}
                item={item}
                compact
                selected={item.id === selected.id}
              />
            ))}
          </div>
        </main>
        <aside className="border-aomi-border border-l p-5">
          <BrandMark item={selected} size="lg" />
          <div className="mt-4 flex items-center gap-2">
            <h3 className="text-[16px] font-semibold">{selected.name}</h3>
            <KindLabel kind={selected.kind} />
          </div>
          <p className="text-aomi-muted mt-2 text-[11px] leading-[18px]">
            {selected.description} Aomi uses it only when your request needs an
            Aave action.
          </p>
          <div className="border-aomi-border mt-5 border-t pt-4">
            <span className="text-aomi-muted text-[9px] font-semibold uppercase tracking-[0.12em]">
              Works on
            </span>
            <div className="mt-2 flex items-center gap-2">
              <ChainMarks chains={selected.chains} />
              <span className="text-aomi-muted text-[10px]">5 networks</span>
            </div>
          </div>
          <div className="border-aomi-border mt-5 border-t pt-4">
            <span className="text-aomi-muted text-[9px] font-semibold uppercase tracking-[0.12em]">
              Good for
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Supply", "Borrow", "Repay", "Withdraw"].map((tag) => (
                <span
                  key={tag}
                  className="bg-aomi-surface-2 rounded-full px-2 py-1 text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="bg-aomi-fg text-aomi-bg mt-6 h-9 w-full rounded-lg text-[12px] font-medium"
          >
            Add skill
          </button>
        </aside>
      </div>
    </Window>
  );
}

function CompactOverlay() {
  return (
    <div className="flex justify-center py-6">
      <Window className="w-full max-w-[650px]">
        <WindowHeader title="Add to Aomi" subtitle="Choose an app or skill" />
        <div className="p-3">
          <SearchField placeholder="Search the library" />
          <div className="mt-3 flex items-center gap-1 px-1">
            <FilterPill active>Suggested</FilterPill>
            <FilterPill>Apps</FilterPill>
            <FilterPill>Skills</FilterPill>
            <button
              type="button"
              className="text-aomi-muted ml-auto flex size-8 items-center justify-center rounded-lg"
            >
              <Grid2X2 className="size-3.5" />
            </button>
          </div>
          <div className="border-aomi-border mt-3 border-t pt-2">
            <div className="text-aomi-muted px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em]">
              Recommended for you
            </div>
            {[ITEMS[4], ITEMS[5], ITEMS[2], ITEMS[9]].map((item) => (
              <CatalogRow key={item.id} item={item} compact />
            ))}
          </div>
          <div className="border-aomi-border mt-2 flex items-center justify-between border-t px-3 pt-3">
            <span className="text-aomi-muted text-[10px]">
              ↑↓ navigate&nbsp;&nbsp; ↵ add
            </span>
            <button type="button" className="text-aomi-muted text-[10px]">
              Browse all 52
            </button>
          </div>
        </div>
      </Window>
    </div>
  );
}

const TASKS = [
  {
    icon: Route,
    title: "Move value",
    text: "Swap, bridge, and send",
    count: 14,
  },
  {
    icon: BarChart3,
    title: "Research",
    text: "Markets and onchain data",
    count: 9,
  },
  { icon: Zap, title: "Earn", text: "Lending, staking, and yield", count: 12 },
  { icon: Braces, title: "Build", text: "Contracts and automation", count: 8 },
];

function TaskFirst() {
  return (
    <Window>
      <WindowHeader subtitle="Start with what you want Aomi to do" />
      <div className="p-5">
        <SearchField placeholder="What do you want to do?" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TASKS.map(({ icon: Icon, title, text, count }, index) => (
            <button
              key={title}
              type="button"
              className={`border-aomi-border flex min-h-28 flex-col rounded-2xl border p-4 text-left ${
                index === 0 ? "bg-aomi-accent-subtle" : "hover:bg-aomi-hover"
              }`}
            >
              <span className="bg-aomi-raised text-aomi-accent flex size-8 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </span>
              <span className="mt-3 text-[12px] font-semibold">{title}</span>
              <span className="text-aomi-muted mt-0.5 text-[10px]">{text}</span>
              <span className="text-aomi-muted mt-auto pt-2 font-mono text-[9px]">
                {count} options
              </span>
            </button>
          ))}
        </div>
        <div className="border-aomi-border mt-5 grid border-t pt-5 md:grid-cols-[180px_1fr]">
          <div className="pr-5">
            <span className="text-[12px] font-semibold">Move value</span>
            <p className="text-aomi-muted mt-1 text-[10px] leading-4">
              Combine routing apps with protocol skills for safer execution.
            </p>
            <div className="mt-4 space-y-1">
              {["Swap", "Bridge", "Send", "Batch transfer"].map(
                (label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`block h-8 w-full rounded-lg px-2.5 text-left text-[11px] ${index === 0 ? "bg-aomi-surface-2 font-medium" : "text-aomi-muted"}`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="border-aomi-border mt-4 space-y-1 border-t pt-3 md:mt-0 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            {[ITEMS[9], ITEMS[11], ITEMS[6]].map((item) => (
              <CatalogRow key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      </div>
    </Window>
  );
}

function DualLane() {
  return (
    <Window>
      <WindowHeader subtitle="Browse tools and knowledge side by side" />
      <div className="p-5">
        <SearchField />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Apps",
              icon: Boxes,
              note: "Connected services and live data",
              items: APPS.slice(0, 4),
            },
            {
              title: "Skills",
              icon: Sparkles,
              note: "Protocol knowledge and actions",
              items: SKILLS.slice(0, 4),
            },
          ].map(({ title, icon: Icon, note, items }) => (
            <section
              key={title}
              className="border-aomi-border bg-aomi-bg/35 rounded-2xl border p-3"
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="bg-aomi-raised text-aomi-accent flex size-8 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold">
                    {title}
                  </span>
                  <span className="text-aomi-muted block truncate text-[10px]">
                    {note}
                  </span>
                </span>
                <button type="button" className="text-aomi-muted text-[10px]">
                  See all
                </button>
              </div>
              <div className="mt-2 space-y-0.5">
                {items.map((item) => (
                  <CatalogRow
                    key={item.id}
                    item={item}
                    compact
                    showKind={false}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Window>
  );
}

function SkillExplorer() {
  return (
    <Window>
      <WindowHeader
        title="Skills"
        subtitle="Teach Aomi how to work with protocols"
      />
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <SearchField placeholder="Search skills" />
          <div className="border-aomi-border bg-aomi-surface flex items-center rounded-xl border p-1">
            <FilterPill active>All chains</FilterPill>
            <FilterPill>Ethereum</FilterPill>
            <FilterPill>Base</FilterPill>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.slice(0, 6).map((item, index) => (
            <article
              key={item.id}
              className={`border-aomi-border flex min-h-[148px] flex-col rounded-2xl border p-4 ${
                index === 0
                  ? "ring-aomi-accent/35 bg-aomi-accent-subtle ring-1"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <BrandMark item={item} />
                <ChainMarks chains={item.chains} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[13px] font-semibold">{item.name}</span>
                <span className="text-aomi-muted text-[9px]">{item.meta}</span>
              </div>
              <p className="text-aomi-muted mt-1 line-clamp-2 text-[10px] leading-4">
                {item.description}
              </p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-aomi-muted flex items-center gap-1 text-[9px]">
                  <Clock3 className="size-3" /> Used when relevant
                </span>
                <Plus className="text-aomi-muted size-3.5" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Window>
  );
}

function CommandLibrary() {
  const selected = ITEMS[5];
  return (
    <Window className="mx-auto max-w-[790px]">
      <div className="border-aomi-border flex h-14 items-center gap-3 border-b px-4">
        <Command className="text-aomi-muted size-4" />
        <span className="text-[13px] font-semibold">Capability command</span>
        <span className="text-aomi-muted text-[10px]">Add context to Aomi</span>
        <button
          type="button"
          className="text-aomi-muted bg-aomi-surface-2 ml-auto flex size-8 items-center justify-center rounded-full"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="border-aomi-border border-b p-3">
        <SearchField placeholder="Search or describe what you need" />
      </div>
      <div className="grid min-h-[430px] md:grid-cols-[1fr_270px]">
        <main className="min-w-0 p-3">
          <div className="text-aomi-muted flex items-center px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em]">
            Best matches
            <span className="ml-auto font-mono font-normal normal-case tracking-normal">
              6 results
            </span>
          </div>
          {[ITEMS[5], ITEMS[9], ITEMS[4], ITEMS[2], ITEMS[7]].map(
            (item, index) => (
              <div
                key={item.id}
                className={index === 0 ? "bg-aomi-surface-2 rounded-xl" : ""}
              >
                <CatalogRow item={item} compact selected={index === 0} />
              </div>
            ),
          )}
          <div className="border-aomi-border text-aomi-muted mt-2 flex items-center justify-between border-t px-3 pt-3 text-[9px]">
            <span>↑↓ move&nbsp;&nbsp; ↵ inspect&nbsp;&nbsp; ⌘↵ add</span>
            <span>Esc close</span>
          </div>
        </main>
        <aside className="border-aomi-border bg-aomi-bg/30 border-l p-5">
          <div className="flex items-start justify-between">
            <BrandMark item={selected} size="lg" />
            <button
              type="button"
              className="text-aomi-muted flex size-7 items-center justify-center rounded-lg"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold">Across</h3>
          <p className="text-aomi-muted mt-1 text-[10px]">
            Skill · Cross-chain
          </p>
          <p className="text-aomi-muted mt-4 text-[11px] leading-[18px]">
            Bridge ERC-20 tokens between supported networks with route and fee
            awareness.
          </p>
          <div className="border-aomi-border mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-aomi-muted text-[10px]">Supported on</span>
            <ChainMarks chains={selected.chains} />
          </div>
          <button
            type="button"
            className="bg-aomi-fg text-aomi-bg mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-medium"
          >
            <Plus className="size-3.5" /> Add to Aomi
          </button>
        </aside>
      </div>
    </Window>
  );
}

const DIRECTIONS = [
  ["unified", "01", "Unified catalog"],
  ["installed", "02", "Installed first"],
  ["directory", "03", "Sidebar directory"],
  ["compact", "04", "Compact overlay"],
  ["tasks", "05", "Task first"],
  ["lanes", "06", "Apps + skills lanes"],
  ["skills", "07", "Skill explorer"],
  ["command", "08", "Command library"],
] as const;

export function LibraryLabClient() {
  return (
    <div className="bg-aomi-bg text-aomi-fg h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-10 md:px-8">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-aomi-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
              <Sparkles className="size-3.5" /> Design lab
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
              Library directions
            </h1>
            <p className="text-aomi-muted mt-2 max-w-xl text-[13px] leading-5">
              Eight fixture-backed structures using the same Aomi components,
              identity marks, type scale, and surface language. The production
              Library is unchanged.
            </p>
          </div>
          <div className="border-aomi-border bg-aomi-raised flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px]">
            <LayoutGrid className="text-aomi-accent size-3.5" />8 directions ·
            apps + skills
          </div>
        </header>

        <nav className="border-aomi-border bg-aomi-bg/90 sticky top-0 z-30 mb-10 flex gap-1 overflow-x-auto border-y py-2 backdrop-blur-xl">
          {DIRECTIONS.map(([id, number, name]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] transition-colors"
            >
              <span className="font-mono text-[9px]">{number}</span> {name}
            </a>
          ))}
        </nav>

        <div className="space-y-16">
          <Direction
            id="unified"
            number="01"
            name="Unified catalog"
            note="A calm default home: installed capabilities first, then one mixed catalog. Type and chain context stay visible without splitting the product into two modes."
          >
            <UnifiedCatalog />
          </Direction>
          <Direction
            id="installed"
            number="02"
            name="Installed first"
            note="The most familiar marketplace pattern. Spacious, light on chrome, and optimized for quickly seeing what is already available before browsing more."
          >
            <InstalledFirst />
          </Direction>
          <Direction
            id="directory"
            number="03"
            name="Sidebar directory"
            note="Best for a growing catalog. Navigation, scanning, and details remain visible at once; it borrows the Settings hierarchy and account-menu density."
          >
            <SidebarDirectory />
          </Direction>
          <Direction
            id="compact"
            number="04"
            name="Compact overlay"
            note="A focused add-capability flow rather than a destination. It matches the composer picker and account dropdown, with keyboard hints and almost no decorative chrome."
          >
            <CompactOverlay />
          </Direction>
          <Direction
            id="tasks"
            number="05"
            name="Task first"
            note="Users begin with an intent—move value, research, earn, or build—then see the apps and skills that serve it. This makes the app/skill distinction secondary."
          >
            <TaskFirst />
          </Direction>
          <Direction
            id="lanes"
            number="06"
            name="Apps + skills lanes"
            note="One search and one Library, but the two capability types retain a clear mental model. Useful if installation and skill activation remain meaningfully different."
          >
            <DualLane />
          </Direction>
          <Direction
            id="skills"
            number="07"
            name="Skill explorer"
            note="A visual, chain-aware grid for protocol skills. The denser card anatomy makes network coverage and semantic category easy to compare."
          >
            <SkillExplorer />
          </Direction>
          <Direction
            id="command"
            number="08"
            name="Command library"
            note="Search-first and keyboard-friendly. It combines the best compact rows with a deliberate inspector, making it useful from both the header and the composer."
          >
            <CommandLibrary />
          </Direction>
        </div>

        <footer className="border-aomi-border text-aomi-muted mt-16 flex items-center justify-between border-t pt-5 text-[10px]">
          <span>Dev-only static catalog fixtures · no install mutations</span>
          <a
            href="#unified"
            className="hover:text-aomi-fg flex items-center gap-1"
          >
            Back to top <ArrowUpRight className="size-3" />
          </a>
        </footer>
      </div>
    </div>
  );
}
