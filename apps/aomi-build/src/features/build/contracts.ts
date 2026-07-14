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
    detail: "Break the work into generate / compile / test steps.",
  },
  {
    id: "generate",
    title: "Generate",
    detail: "Review tools and source as they land.",
  },
  {
    id: "compile_test",
    title: "Compile & test",
    detail: "Compile, then run a smoke test before you ship.",
  },
  {
    id: "ship",
    title: "Ship",
    detail: "Download, connect GitHub, then deploy from Projects.",
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
  nodes?: SmithersNode[];
};

export type PlanNodeStatus = "pending" | "active" | "done";

/** Internal plan step — never show engine names (Smithers/codex) in UI labels. */
export type SmithersNode = {
  id: string;
  label: string;
  /** Product-facing role chip, e.g. Planner / Generator / Tester */
  role: string;
  detail: string;
  status: PlanNodeStatus;
};

/** @deprecated use PlanNodeStatus */
export type SmithersNodeStatus = PlanNodeStatus;

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

/**
 * Stage strip source of truth — gates beat optimistic stageId / stream "ready".
 * Never highlight Ship while compile/smoke test are still open.
 */
export function resolveDisplayJourneyStage(input: {
  stageId: JourneyStageId;
  isGenerating: boolean;
  awaitingVerify: boolean;
  shipReady: boolean;
  compileDone: boolean;
  testDone: boolean;
  verifyBusy: "compile" | "test" | null;
  streamEvents: BuildStreamEvent[];
  messageCount: number;
}): JourneyStageId {
  if (input.messageCount === 0) return "describe";
  if (input.shipReady || (input.compileDone && input.testDone)) return "ship";
  if (
    input.awaitingVerify ||
    input.verifyBusy !== null ||
    (input.compileDone && !input.testDone)
  ) {
    return "compile_test";
  }
  if (input.isGenerating) {
    const active = input.streamEvents.find((e) => e.status === "active");
    if (active) {
      if (active.stage === "ready" || active.stage === "validate") {
        return "compile_test";
      }
      return STREAM_TO_JOURNEY[active.stage];
    }
    const lastDone = [...input.streamEvents]
      .reverse()
      .find((e) => e.status === "done");
    if (lastDone?.stage === "plan") return "generate";
    if (lastDone?.stage === "generate") return "compile_test";
    return "plan";
  }
  if (input.stageId === "ship" && !input.shipReady) return "compile_test";
  return input.stageId;
}

export const defaultStreamTemplate: BuildStreamEvent[] = [
  {
    time: "",
    stage: "plan",
    message: "Reading your intent and drafting a build plan.",
    status: "pending",
  },
  {
    time: "",
    stage: "generate",
    message: "Generating project files and tool wiring.",
    status: "pending",
  },
  {
    time: "",
    stage: "validate",
    message: "Ready for compile and smoke test.",
    status: "pending",
  },
  {
    time: "",
    stage: "ready",
    message: "Waiting for compile + smoke test before ship.",
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

/** Prompt-aware mock file tree so arb bots look different from generic agents. */
export function deriveGeneratedFileTree(prompt: string): BuildFileNode[] {
  const lower = prompt.toLowerCase();
  const isArb =
    lower.includes("arb") ||
    lower.includes("hyperliquid") ||
    lower.includes("binance");

  if (!isArb) return generatedFileTree;

  const exchanges: BuildFileNode[] = [];
  if (lower.includes("hyperliquid") || lower.includes("hype") || !lower.includes("binance")) {
    exchanges.push({
      path: "arb-bot/src/exchanges/hyperliquid.ts",
      type: "file",
    });
  }
  if (lower.includes("binance") || !lower.includes("hyperliquid")) {
    exchanges.push({
      path: "arb-bot/src/exchanges/binance.ts",
      type: "file",
    });
  }

  return [
    {
      path: "arb-bot",
      type: "folder",
      children: [
        { path: "arb-bot/src/agent.ts", type: "file" },
        { path: "arb-bot/src/config.ts", type: "file" },
        {
          path: "arb-bot/src/exchanges",
          type: "folder",
          children: exchanges,
        },
        { path: "arb-bot/src/risk/limits.ts", type: "file" },
        { path: "arb-bot/tests/agent.test.ts", type: "file" },
        { path: "arb-bot/aomi.toml", type: "file" },
      ],
    },
  ];
}

export const mockBuildResponse = `Tool layer is ready. Here's what was generated:

- \`src/agent.ts\` — Main agent loop with retry logic
- \`src/config.ts\` — Configuration
- \`src/handlers.ts\` — Event handlers
- \`tests/agent.test.ts\` — Unit tests

Next: **Compile**, then run a **smoke test**, then ship to Projects.`;

/** Derive mock plan nodes from the user prompt (product labels only). */
export function deriveSmithersNodes(prompt: string): SmithersNode[] {
  const lower = prompt.toLowerCase();
  const nodes: SmithersNode[] = [
    {
      id: "node_compose",
      label: "Compose plan",
      role: "Planner",
      detail: "Turn your intent into ordered build steps",
      status: "pending",
    },
  ];

  if (lower.includes("hyperliquid") || lower.includes("hype")) {
    nodes.push({
      id: "node_hype",
      label: "Hyperliquid tools",
      role: "Generator",
      detail: "Scaffold exchange client and agent tools",
      status: "pending",
    });
  }
  if (lower.includes("binance")) {
    nodes.push({
      id: "node_binance",
      label: "Binance tools",
      role: "Generator",
      detail: "Scaffold exchange client and agent tools",
      status: "pending",
    });
  }
  if (
    !lower.includes("hyperliquid") &&
    !lower.includes("hype") &&
    !lower.includes("binance")
  ) {
    nodes.push({
      id: "node_openapi",
      label: "API tools",
      role: "Generator",
      detail: "Scaffold tools from the APIs in your prompt",
      status: "pending",
    });
  }

  nodes.push({
    id: "node_run",
    label: "Smoke test",
    role: "Tester",
    detail: "Exercise the agent after compile",
    status: "pending",
  });

  return nodes;
}

export const seedBuildSessions: BuildSession[] = [
  {
    id: "run_1203_arb_bot",
    title: "Hyperliquid and Binance arb bot",
    status: "healthy",
    model: "Aomi",
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
        model: "Aomi",
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
        message: "Ready to ship — open Projects or download files.",
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
