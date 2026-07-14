export type JourneyStageId =
  | "describe"
  | "plan"
  | "generate"
  | "compile_test"
  | "ship";

export type JourneyStage = {
  id: JourneyStageId;
  title: string;
  detail: string;
};

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "describe",
    title: "Describe",
    detail: "What do you want to build? Intent in, not code.",
  },
  {
    id: "plan",
    title: "Plan",
    detail: "Smithers nodes compose the work (codegen, tooling, APIs).",
  },
  {
    id: "generate",
    title: "Generate",
    detail: "Review the tool layer and source as it lands.",
  },
  {
    id: "compile_test",
    title: "Compile & test",
    detail: "Compile, then exercise with aomi-run before you commit.",
  },
  {
    id: "ship",
    title: "Ship",
    detail: "Download, init a GitHub repo, then deploy from Projects.",
  },
];

/** Local mock pipeline stages shown in the stream timeline. */
export type BuildStreamStage = "plan" | "generate" | "validate" | "ready";

export type BuildMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
};

export type BuildFileNode = {
  path: string;
  type: "file" | "folder";
  children?: BuildFileNode[];
};

export type BuildStreamEvent = {
  time: string;
  stage: BuildStreamStage;
  message: string;
  status: "done" | "active" | "pending";
};

export type BuildSessionStatus = "queued" | "running" | "healthy" | "failed";

export type BuildSession = {
  id: string;
  title: string;
  status: BuildSessionStatus;
  model: string;
  updatedAt: string;
  runtime: string;
  stageId: JourneyStageId;
  templateId?: string;
  messages: BuildMessage[];
  streamEvents: BuildStreamEvent[];
  fileTree: BuildFileNode[];
};

export type BuildTemplate = {
  id: string;
  name: string;
  description: string;
  category: "trading" | "social" | "infra" | "research";
  /** Seed text put into the intent composer when selected. */
  prompt: string;
};

/** Map mock pipeline stages → product journey stages. */
export const STREAM_TO_JOURNEY: Record<BuildStreamStage, JourneyStageId> = {
  plan: "plan",
  generate: "generate",
  validate: "compile_test",
  ready: "ship",
};

export const STREAM_STAGE_LABELS: Record<BuildStreamStage, string> = {
  plan: "Plan",
  generate: "Generate",
  validate: "Compile & test",
  ready: "Ship",
};

export const defaultStreamTemplate: BuildStreamEvent[] = [
  {
    time: "",
    stage: "plan",
    message: "Analyzing prompt and composing Smithers plan.",
    status: "pending",
  },
  {
    time: "",
    stage: "generate",
    message: "Generating project files and configuration.",
    status: "pending",
  },
  {
    time: "",
    stage: "validate",
    message: "Running compile and lint checks (local mock).",
    status: "pending",
  },
  {
    time: "",
    stage: "ready",
    message: "Artifacts ready — ship toward Projects / GitHub.",
    status: "pending",
  },
];

export const generatedFileTree: BuildFileNode[] = [
  {
    path: "aomi-agent",
    type: "folder",
    children: [
      { path: "aomi-agent/src/index.ts", type: "file" },
      { path: "aomi-agent/src/agent.ts", type: "file" },
      { path: "aomi-agent/src/config.ts", type: "file" },
      { path: "aomi-agent/src/handlers.ts", type: "file" },
      { path: "aomi-agent/tests/agent.test.ts", type: "file" },
      { path: "aomi-agent/aomi.toml", type: "file" },
      { path: "aomi-agent/package.json", type: "file" },
    ],
  },
];

export const mockBuildResponse = `Done. Here's what the local mock generated:

- \`src/agent.ts\` — Main agent loop with retry logic
- \`src/config.ts\` — Configuration management
- \`src/handlers.ts\` — Event handlers for on-chain actions
- \`tests/agent.test.ts\` — Unit tests

Checks passed in the local mock. Next: ship to Projects / GitHub — real Smithers SSE is not wired yet.`;

export const seedBuildSessions: BuildSession[] = [
  {
    id: "run_1203_arb_bot",
    title: "Hyperliquid and Binance arb bot",
    status: "healthy",
    model: "Local mock",
    updatedAt: "2m ago",
    runtime: "5m 12s",
    stageId: "ship",
    templateId: "tpl_trading_agent",
    messages: [
      {
        id: "m1",
        role: "user",
        content:
          "Build a cross-exchange arbitrage agent for Hyperliquid and Binance.",
        timestamp: "11:58",
      },
      {
        id: "m2",
        role: "assistant",
        content: `Done. Here's what I built:

- \`src/agent.ts\` — Main strategy loop with retry logic
- \`src/exchanges/hyperliquid.ts\` — Hyperliquid client
- \`src/exchanges/binance.ts\` — Binance client
- \`src/risk/limits.ts\` — Position and exposure limits
- \`tests/agent.test.ts\` — Unit tests

All checks passed. Ready to ship toward Projects.`,
        timestamp: "12:03",
        model: "Local mock",
      },
    ],
    streamEvents: [
      {
        time: "12:02:04",
        stage: "plan",
        message: "Analyzing prompt and selecting trading template.",
        status: "done",
      },
      {
        time: "12:02:21",
        stage: "generate",
        message: "Generating strategy, wallet service, and execution loop.",
        status: "done",
      },
      {
        time: "12:02:44",
        stage: "validate",
        message: "Running compile and lint checks against generated files.",
        status: "done",
      },
      {
        time: "12:03:02",
        stage: "ready",
        message: "Artifacts ready. Ship toward Projects / GitHub.",
        status: "done",
      },
    ],
    fileTree: [
      {
        path: "arb-bot",
        type: "folder",
        children: [
          { path: "arb-bot/src/agent.ts", type: "file" },
          { path: "arb-bot/src/config.ts", type: "file" },
          {
            path: "arb-bot/src/exchanges",
            type: "folder",
            children: [
              { path: "arb-bot/src/exchanges/hyperliquid.ts", type: "file" },
              { path: "arb-bot/src/exchanges/binance.ts", type: "file" },
            ],
          },
          { path: "arb-bot/src/risk/limits.ts", type: "file" },
          { path: "arb-bot/tests/agent.test.ts", type: "file" },
          { path: "arb-bot/aomi.toml", type: "file" },
        ],
      },
    ],
  },
];
