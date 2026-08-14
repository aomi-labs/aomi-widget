/** Locked copy for /v2: mirrors specs/claude-design-transfer/V3-COPY-DECK.md */

export const LINKS = {
  docs: "https://aomi.dev/docs/",
  agents: "https://aomi.dev/agents.md",
  agentsBuild: "https://aomi.dev/agents/build.md",
  agentsTransact: "https://aomi.dev/agents/transact.md",
  apps: "/#apps-section",
  openApp: "https://chat.aomi.dev",
  bookCall: "/contact",
  skills: "https://github.com/aomi-labs/skills",
  github: "https://github.com/aomi-labs",
} as const;

export const nav = {
  brand: "aomi",
  links: [
    { label: "Docs", href: LINKS.docs },
    { label: "Agents", href: LINKS.agents },
    { label: "Apps", href: LINKS.apps },
  ],
  cta: { label: "Open app", href: LINKS.openApp },
} as const;

export const hero = {
  eyebrow: "EXECUTION INFRASTRUCTURE",
  headlineLine1: "Between an agent's decision",
  headlineLine2: "and its settlement.",
  support:
    "You bring the API. We bring the harness. Build, simulate, sign, broadcast. Keys stay with users.",
  primaryCta: { label: "Read the docs", href: LINKS.docs },
  secondaryCta: { label: "Book a call", href: LINKS.bookCall },
} as const;

export const why = {
  eyebrow: "WHY NOT CLAUDE + A WALLET",
  headline: "A wallet can refuse a bad payload. It cannot produce a correct one.",
  support:
    "The model decides. The wallet authorizes. Aomi constructs the transaction your API needs.",
  columns: [
    {
      label: "01 MODEL",
      title: "Decides.",
      body: "Claude, Codex, or your agent proposes intent. The model does not construct calldata, route venues, or keep session state for your users.",
      accent: false,
    },
    {
      label: "02 WALLET",
      title: "Authorizes.",
      body: "MetaMask can refuse a bad payload. Simulation in the wallet is table stakes. It still cannot build the right transaction for your API.",
      accent: false,
    },
    {
      label: "03 AOMI",
      title: "Constructs.",
      body: "Compresses the ABI-script-bash loop into one resolved, simulated, signable transaction. Hosted for your API and your users. KEYS = 0.",
      accent: true,
    },
  ],
} as const;

export const pattern = {
  eyebrow: "INTEGRATION PATTERN",
  headline: "One pattern. Repeatable per partner.",
  side: "Wrap your API as typed tools. Aomi hosts the app. Every action inherits build, simulate, sign, broadcast.",
  steps: [
    {
      n: "01",
      title: "Your API",
      body: "REST, GraphQL, or SDK the product already has.",
      accent: false,
    },
    {
      n: "02",
      title: "Tools + mandate",
      body: "Typed tools. Caps, venues, and risk bands on every action.",
      accent: false,
    },
    {
      n: "03",
      title: "Aomi App",
      body: "System prompt plus tool bundle. One shippable unit.",
      accent: false,
    },
    {
      n: "04",
      title: "Runtime. KEYS = 0",
      body: "Hosted threads, forks, scheduling. Keys never leave the user.",
      accent: true,
    },
    {
      n: "05",
      title: "Surfaces",
      body: "CLI, MCP, skills. Embed is one line, not the product.",
      accent: false,
    },
    {
      n: "06",
      title: "Simulate",
      body: "Forked chain rehearsal before anything can be signed.",
      accent: false,
    },
    {
      n: "07",
      title: "One signature",
      body: "The wallet signs the exact payload. Then broadcast.",
      accent: false,
    },
  ],
} as const;

/** Ported from design/communication/info/aomi-onchain-asset-management.html (Somm case study). */
export const caseStudy = {
  eyebrow: "IN PRODUCTION · SOMM FINANCE",
  headline: "From managed vault to agent-operated product.",
  situation:
    "Somm Finance runs an actively managed liquidity vault. Five operating endpoints, a defined risk mandate, and depositor access were limited to one surface and manual ops.",
  approach:
    "Wrap Somm's existing endpoints as tools. Encode the investment mandate as an enforced prompt. Deploy the agent into the hosted runtime. No net-new engineering.",
  outcome:
    "One agent runs the vault and serves depositors on every surface. App-level fees are priced and settled on-rails, a revenue line that did not previously exist.",
  endpoints: {
    step: "01 · the endpoints Somm already operated",
    capTitle: "The strategy stays with the manager.",
    cap: "Five endpoints: the models, data, and risk framework Somm already ran.",
    routes: [
      { method: "GET", path: "/idle-assets" },
      { method: "GET", path: "/risk-snapshot" },
      { method: "POST", path: "/assess-position" },
      { method: "GET", path: "/credit-balance" },
      { method: "POST", path: "/propose-intent" },
    ],
  },
  compose: {
    step: "02 · tools + mandate = an aomi app",
    mandateLabel: "mandate · enforced as configuration",
    mandate:
      "Manage idle treasury assets for Somm. Seek best net yield. Never exceed risk band B. Always propose before execution.",
    risk: "Never exceed risk band B.",
    tools: ["get_idle_assets()", "assess_position()", "propose_intent()"],
    appEyebrow: "aomi app",
    appName: "Somm Liquidity Manager",
    capTitle: "No net-new engineering.",
    cap: "Endpoints become tools. The mandate becomes enforced configuration.",
  },
  runtime: {
    step: "03 · deployed in the hosted runtime",
    title: "aomi · Hosted Runtime",
    keys: "KEYS HELD: 0",
    apps: ["kuroko", "orca", "somm liq. mgr"],
    rail: "aomi core · build → simulate → commit → batch ▸ blockchain client",
    capTitle: "Native to the chain.",
    cap: "One pipeline. Every chain forked in about 200ms. Zero keys held.",
  },
  surfaces: {
    step: "04 · one runtime, every surface",
    chips: [
      { label: "Somm Frontend", tone: "somm" as const },
      { label: "Telegram Bot", tone: "blue" as const },
      { label: "Discord", tone: "indigo" as const },
      { label: "Slack", tone: "green" as const },
      { label: "… iOS · web · next", tone: "muted" as const },
    ],
    note: "The same agent that operates the vault also answers depositors. Natural language on every surface, built once.",
  },
  vault: {
    step: "05 · the same runtime, operating the vault",
    url: "somm.finance",
    assistant: "Somm Assistant · powered by aomi",
    user: "Rebalance my liquidity from EtherFi to Morpho",
    approve: "Approve & Sign",
    signed: "✓ Signed · broadcasting",
    traces: [
      { label: "querying positions", result: "2,400 weETH · etherfi" },
      { label: "risk check", result: "morpho band A · +1.9%" },
    ],
    building: "building transaction · aomi core pipeline",
    rows: [
      "→ withdraw · etherfi · 2,400 weETH",
      "→ approve · weETH → morpho blue",
      "→ supply · morpho @ 91.2% util",
    ],
    batched: "batched → 1 signature · SIMULATED ✓",
    run: "runs on aomi · keys remain with the signer",
  },
} as const;

export const pipeline = {
  eyebrow: "TX PIPELINE",
  headline: "Build. Simulate. Sign. Broadcast.",
  support: "Aomi constructs a simulated, signable transaction. The wallet only signs.",
  code: [
    "# one intent, one resolved transaction",
    "$ aomi chat \"stake 50% of my USDC into the Steakhouse vault on Morpho. simulate first.\"",
    "# build      venue, route, calldata resolved",
    "# simulate   forked-state rehearsal, ~200ms",
    "# sign       wallet signs locally. KEYS = 0.",
    "# broadcast  AA where it helps, Jito where it lands",
  ],
  stages: [
    {
      n: "01",
      title: "Build",
      body: "Plain-language intent becomes the exact transaction. Venue, route, and calldata resolved before anyone sees a wallet prompt.",
    },
    {
      n: "02",
      title: "Simulate",
      body: "Forked-state rehearsal off a full node in about 200ms. Batches simulate together so approve-then-swap is valid.",
    },
    {
      n: "03",
      title: "Sign",
      body: "The existing chain checkpoint. User wallet signs locally. Aomi never holds keys.",
    },
    {
      n: "04",
      title: "Broadcast",
      body: "AA where it helps, Jito where it lands. Evidence of the path, not a hope it included.",
    },
  ],
} as const;

export const runtime = {
  eyebrow: "RUNTIME",
  headline: "One harness. Zero extra servers.",
  support: "Threads, forks, and scheduling included. You do not bring LangChain plus a server.",
  stats: [
    { value: "~200ms", label: "Simulated rehearsal" },
    { value: "KEYS = 0", label: "Signing stays local" },
    { value: "Read by default", label: "No key to read" },
    { value: "100s isolated", label: "Per-session threads" },
  ],
  props: [
    {
      title: "Stateless dispatch",
      body: "Per-session agent threads. Isolated when a hundred users hit the same app.",
    },
    {
      title: "Tool and model scheduling",
      body: "The harness runs the LLM and the tools. You do not bring LangChain plus a server.",
    },
    {
      title: "Forks off a full node",
      body: "Live-state rehearsal in about 200ms. Mandate enforced on every action.",
    },
    {
      title: "Continuous execution",
      body: "Background strategies, DCA, rebalances, liquidation guards after the desk closes.",
    },
  ],
} as const;

export const surfaces = {
  eyebrow: "SURFACES",
  headline: "Three ways in. One harness.",
  note: "CLI, MCP, or embed. Same runtime. Not a widget catalog.",
  rows: [
    {
      label: "CLI",
      title: "aomi transact",
      body: "Intent to simulated, signable transactions from the terminal.",
    },
    {
      label: "MCP",
      title: "Skills for coding agents",
      body: "npx skills add aomi-labs/skills. Claude Code, Cursor, Codex reach the same harness.",
    },
    {
      label: "EMBED",
      title: "AomiFrame",
      body: "One surface among others. Not the hero. Proof you can put the harness in a product.",
    },
  ],
} as const;

export const sector = {
  eyebrow: "IN PRODUCTION",
  headline: "Execution becomes a revenue line, not a widget demo.",
  support: "One integration above your existing signer. Partner framing, not a consumer app.",
  cards: [
    {
      label: "ASSET MANAGEMENT",
      title: "Every vault. Every chain. One harness.",
      body: "Strategy stays with the manager. Aomi runs the path from decision to settlement, in production with a live vault partner.",
    },
    {
      label: "TRADING VENUES",
      title: "Failed transactions are fees you did not earn.",
      body: "Limit, stop, DCA as background agents from the user's wallet. Best execution that can be evidenced.",
    },
    {
      label: "WALLET AND FINTECH",
      title: "Chat-to-trade is the surface. Safety is the layer.",
      body: "Sits above your existing signer. One integration. Partner framing, not a consumer app.",
    },
  ],
} as const;

export const faq = {
  badge: "FAQ",
  heading: "Frequently asked questions",
  headline: "Questions before the first signature.",
  items: [
    {
      q: "If I use Claude + MetaMask, why Aomi?",
      a: "A wallet is an authorization boundary. It can refuse a bad payload; it cannot construct the right one, host your API for your users, or keep executing on a schedule. Construction, the hosted runtime, and the evidence trail are the product. Simulation is table stakes.",
    },
    {
      q: "Why not OpenAI SDK, Claude Code SDK, or LangChain?",
      a: "Those give you the LLM call. You still bring the server, tools, threads, simulation, and wallet plumbing. Wrap your API as Aomi tools, define the prompt, ship it. You bring the API; we bring the harness.",
    },
    {
      q: "How do you stop a bad transaction?",
      a: "Every transaction is simulated against a forked chain before it can be signed. Malformed calldata, failed approvals, and unexpected reverts are caught first. Read by default. Simulate before sign. Credentials never round-trip.",
    },
    {
      q: "Does Aomi hold keys?",
      a: "No. Signing is the checkpoint the chain already has. aomi tx sign runs locally via viem. The key never reaches Aomi's runtime. Only the constructed transaction does.",
    },
    {
      q: "How is Aomi different from a personal agent trading on-chain?",
      a: "Your personal agent can send transactions on its own. A bare-metal OpenClaw asked to swap on Uniswap will pull the ABI, write a script, run via bash, and hope the calldata is right. Aomi compresses that loop into one call: a resolved, simulated, signable transaction. We do not replace your agent. Aomi is the tool it reaches for when the task crosses on-chain.",
    },
    {
      q: "How does signing work?",
      a: "Aomi never touches your wallet or your keys. Signing is the existing human-in-the-loop checkpoint every chain already has. In the CLI, aomi tx sign runs locally via viem. The key never reaches Aomi's runtime. Only the constructed transaction does.",
    },
    {
      q: "What is the integration pattern?",
      a: "Wrap your API as typed tools under a mandate. Aomi hosts the app. The runtime is KEYS = 0: hosted threads, forks, scheduling. Keys never leave the user. Surfaces are CLI, MCP, and embed. Then simulate on a forked chain, and the wallet signs the exact payload.",
    },
    {
      q: "Do I need to embed AomiFrame?",
      a: "No. Embed is one surface among others, not the product. CLI, MCP, and skills reach the same harness. AomiFrame is proof you can put the harness in a product.",
    },
    {
      q: "What is simulate-before-sign?",
      a: "Every transaction is dry-run on a forked chain before it can be signed. Forked-state rehearsal off a full node in about 200ms. Batches simulate together so approve-then-swap is valid. Simulation is table stakes. Construction is the product.",
    },
    {
      q: "Is Aomi a wallet?",
      a: "No. Aomi sits above your existing signer. A wallet can refuse a bad payload. It cannot produce a correct one. Aomi constructs the resolved, simulated, signable transaction. The wallet authorizes.",
    },
  ],
} as const;

export const install = {
  headline: "One install. The same harness.",
  support:
    "Pick your agent or surface. Claude Code, Cursor, Codex, OpenCode, CLI, MCP, and Embed all reach the same Aomi harness.",
  note: "Embed is one surface among others, not the product.",
  cta: "Read the docs",
  tools: [
    {
      id: "claude",
      label: "Claude Code",
      command: "npx skills add aomi-labs/skills",
      logo: "/assets/logos/claude.svg",
    },
    {
      id: "cursor",
      label: "Cursor",
      command: "npx skills add aomi-labs/skills",
      logo: "/assets/logos/cursor.svg",
    },
    {
      id: "codex",
      label: "Codex",
      command: "npx skills add aomi-labs/skills",
      logo: "/assets/logos/openai.svg",
    },
    {
      id: "opencode",
      label: "OpenCode",
      command: "npx skills add aomi-labs/skills",
      logo: "/assets/logos/opencode.svg",
    },
    {
      id: "cli",
      label: "CLI",
      command: "npm install -g @aomi-labs/client",
      logo: "/assets/logos/cli.svg",
    },
    {
      id: "mcp",
      label: "MCP",
      command: "npx skills add aomi-labs/skills",
      logo: "/assets/logos/mcp.svg",
    },
    {
      id: "embed",
      label: "Embed",
      command: "npx shadcn add https://aomi.dev/r/aomi-frame.json",
      logo: "/assets/logos/embed.svg",
    },
  ],
} as const;

export const footerCta = {
  headline: "You bring the API. We bring the harness.",
  support: "Build, simulate, sign, broadcast. Keys stay with your users.",
  ctas: [
    { label: "Read the docs", href: LINKS.docs, variant: "primary" as const },
    { label: "Book a call", href: LINKS.bookCall, variant: "ghost" as const },
    { label: "Open app", href: LINKS.openApp, variant: "ghost" as const },
  ],
} as const;

export const agentPanel = {
  title: "Onboard your Agent to Aomi",
  install: "$ npx skills add aomi-labs/skills",
  build: {
    title: "Build on Aomi",
    body: "Wrap your API as typed tools under a mandate. Aomi hosts the app. Every action inherits build, simulate, sign, broadcast. Keys never leave the user.",
    tellLabel: "Tell your agent",
    tell: `"Read https://aomi.dev/agents/build.md and wrap our REST API at api.acme.com as an Aomi App: tools + system prompt, hosted on the harness."`,
    linkLabel: "aomi.dev/agents/build.md",
    linkHref: LINKS.agentsBuild,
    scaffoldTitle: "Scaffold (API to App)",
    rustLabel: "Aomi App SDK (Rust)",
    rustCommands: [
      "# wrap api.acme.com as an Aomi App",
      "$ cargo new my-aomi-app --lib && cd my-aomi-app",
      "$ cargo add aomi-sdk",
    ],
    embedLabel: "Optional embed, not the hero",
    embedCommand: "npx shadcn add https://aomi.dev/r/aomi-frame.json",
    reactLabel: "Or headless React",
    reactCommand: "pnpm install @aomi-labs/react",
    surfacesNote:
      "CLI, MCP, and Embed reach the same harness. AomiFrame is one surface among others, not the product.",
  },
  transact: {
    title: "Transact with Aomi",
    body: "Run on-chain ops from one chat. Swap, send, stake, lend, bridge. Aomi builds and simulates; the wallet signs locally. KEYS = 0.",
    tellLabel: "Tell your agent",
    tell: `"Read https://aomi.dev/agents/transact.md and find the highest-APY USDC vault on Morpho across Ethereum and Base, bridge $100 of USDC there if needed, simulate the deposit, then ask me before signing."`,
    linkLabel: "aomi.dev/agents/transact.md",
    linkHref: LINKS.agentsTransact,
    installTitle: "Installation",
    installHint: "Get Aomi's TypeScript CLI client",
    installCommand: "$ npm install -g @aomi-labs/client",
    intentLabel: "State your intent",
    intentLines: [
      "# aomi builds, simulates, wallet signs locally",
      "$ aomi chat \"Stake 50% of my USDC into the Steakhouse USDC vault on Morpho. Simulate before signing.\"",
    ],
    guarantee:
      "Read by default. Simulate before sign. Credentials never round-trip. AA on by default; BYOK for L2 gas sponsorship.",
  },
  footer: {
    label: "aomi.dev/agents.md · github.com/aomi-labs/skills",
    agentsHref: LINKS.agents,
    skillsHref: LINKS.skills,
  },
} as const;

/** Paper 1M5-0 logo row: icon + label (Ethereum to MetaMask). */
export const logoCloud = [
  { name: "Ethereum", src: "/assets/logos/ethereum.png" },
  { name: "Solana", src: "/assets/logos/solana.png" },
  { name: "Morpho", src: "/assets/logos/morpho-mark.svg" },
  { name: "Polymarket", src: "/assets/logos/polymarket.png" },
  { name: "MetaMask", src: "/assets/logos/metamask.png" },
] as const;
