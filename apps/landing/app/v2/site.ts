import { LINKS } from "./copy";

export const V2 = "/v2";

export type NavItem = {
  id: string;
  title: string;
  job: string;
  href: string;
  body: string;
  external?: boolean;
  placeholder?: boolean;
};

export type NavMenu = {
  id: string;
  label: string;
  items: readonly NavItem[];
};

export const products = [
  {
    id: "widget",
    title: "Widget",
    job: "Embed chat-to-transaction in your product",
    href: `${V2}/products/widget`,
    body: "Mount the same Aomi execution surface used by chat.aomi.dev inside your own product. Bring your auth, wallet presentation, and application identity; Aomi runs the agent loop and hands exact, simulated payloads to the user's signer.",
  },
  {
    id: "cli-mcp",
    title: "Agentic Toolings",
    job: "Skills, MCP, and CLI for the agents you already use",
    href: `${V2}/products/cli-mcp`,
    body: "Teach coding agents the Aomi workflow with Skills, connect hosted account sessions over MCP, or operate directly from the CLI. Three entry points share one guarded execution harness without pretending they install as one bundle.",
  },
  {
    id: "api",
    title: "REST APIs",
    job: "Agents APIs that orchestrate subagents building transactions from intent. Pipeline API that exposes the underlying tool layer directly to integrators.",
    href: `${V2}/products/api`,
    body: "Integrator Transact. Agents API lets an outer model (Claude) keep judgment and orchestrate Aomi subagents in parallel. Pipeline API exposes the same guarded stage → simulate → commit lifecycle as raw tools, with no Aomi inference.",
  },
  {
    id: "console",
    title: "Plugin SDK",
    job: "Rust SDK and tooling for building applications on Aomi's hosted platform",
    href: `${V2}/products/console`,
    body: "Aomi Build at build.aomi.dev. Ship prompt + tools as an App into the shared runtime. Aomi orchestrates the model↔tool loop; those loops transact over the same pipeline as Transact.",
  },
] as const satisfies readonly NavItem[];

export const solutions = [
  {
    id: "fintech",
    title: "Fintech",
    job: "Policy-controlled operations for tokenized assets and treasuries",
    href: `${V2}/solutions/fintech`,
    body: "Launch governed treasury, vault, and RWA workflows inside the product customers already trust. Keep strategy, custody, approval roles, and reporting in the existing operating model while Aomi turns mandates into simulated, signable Actions.",
  },
  {
    id: "defi",
    title: "DeFi",
    job: "Intent-to-transaction flows for protocols and frontends",
    href: `${V2}/solutions/defi`,
    body: "Help users discover and execute DeFi opportunities without making them reason through routes, approvals, bridges, and contract calls. Embed the Widget, expose protocol tools as an Aomi App, or integrate the guarded APIs directly.",
  },
  {
    id: "trading",
    title: "Trading",
    job: "Plug-in execution rails for platform-owned trading agents",
    href: `${V2}/solutions/trading`,
    body: "Keep market data, models, venue connectors, route selection, risk judgment, and customer UX in your harness. Pass the selected ActionSpec to Pipeline API for construction, typed simulation and guards, sealed signing, and verified settlement.",
  },
  {
    id: "nft",
    title: "NFT",
    job: "Trusted conversational commerce for digital collectibles",
    href: `${V2}/solutions/nft`,
    body: "Give collectors a guided path from discovery to a verified listing, transparent total cost, and safe purchase. Marketplaces keep inventory and policy while Aomi powers conversational discovery and exact-item execution.",
  },
  {
    id: "wallets",
    title: "Wallets",
    job: "A non-custodial execution layer above the existing signer",
    href: `${V2}/solutions/wallets`,
    body: "Add intent-driven swaps, transfers, bridging, yield, and application actions above the account and signer users already trust. Use the full Widget or render Agent API Actions in your own interface; keys never move to Aomi.",
  },
] as const satisfies readonly NavItem[];

export const resources = [
  {
    id: "about",
    title: "About",
    job: "Backed by Anagram and Nascent",
    href: `${V2}/about`,
    body: "Aomi is execution infrastructure for agentic finance: a language-to-transaction pipeline and a hosted platform for crypto agents. Backed by Anagram and Nascent.",
  },
  {
    id: "research",
    title: "Research",
    job: "Execution harnesses, auth, and onchain evals",
    href: `${V2}/research`,
    body: "Notes and benchmarks from Aomi Labs on execution harnesses, hybrid authentication, and measuring frontier models on real onchain tasks.",
  },
  {
    id: "news",
    title: "News",
    job: "Announcements and press",
    href: `${V2}/news`,
    body: "News and announcements will live here.",
    placeholder: true,
  },
  {
    id: "contact",
    title: "Contact",
    job: "Talk to us",
    href: `${V2}/contact`,
    body: "Reach the team about Transact, Build, or a solutions engagement.",
  },
] as const satisfies readonly NavItem[];

export const developers = [
  {
    id: "docs",
    title: "Documentation",
    job: "How to transact and how to build",
    href: "/docs",
    body: "Guides for Transact and Build.",
  },
  {
    id: "agents",
    title: "Agents",
    job: "agents.md for coding agents",
    href: "/agents.md",
    body: "Machine-readable instructions so coding agents can transact or wrap an API as an Aomi App.",
  },
] as const satisfies readonly NavItem[];

export const pricing = {
  id: "pricing",
  title: "Pricing",
  job: "One page for Transact and Build",
  href: `${V2}/pricing`,
  body: "Pricing copy comes later. Usage-based rails already exist on the solutions briefs: sandbox, hosted runtime, and basis points on executed flow.",
  placeholder: true,
} as const satisfies NavItem;

export const menus = [
  { id: "products", label: "Products", items: products },
  { id: "solutions", label: "Solutions", items: solutions },
  { id: "resource", label: "Resource", items: resources },
  { id: "developers", label: "Developers", items: developers },
] as const satisfies readonly NavMenu[];

export const rightCtas = [
  {
    id: "console",
    label: "Console",
    href: LINKS.console,
    variant: "ghost" as const,
    external: true,
  },
  {
    id: "app",
    label: "App",
    href: LINKS.openApp,
    variant: "primary" as const,
    external: true,
  },
] as const;

export const productBySlug = Object.fromEntries(
  products.map((item) => [item.id, item]),
) as Record<(typeof products)[number]["id"], NavItem>;

export const solutionBySlug = Object.fromEntries(
  solutions.map((item) => [item.id, item]),
) as Record<(typeof solutions)[number]["id"], NavItem>;

export const resourceBySlug = Object.fromEntries(
  resources.map((item) => [item.id, item]),
) as Record<(typeof resources)[number]["id"], NavItem>;
