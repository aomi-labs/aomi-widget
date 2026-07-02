import { z } from "zod";

export const WORKFLOW_NAME = "aomi-app-from-scratch";

export const intakeSchema = z.object({
  sdkRoot: z.string().min(1),
  app: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, "app must be a simple package name"),
  source: z.enum(["discover", "url", "existing"]).default("discover"),
  openApiUrl: z.string().url().optional(),
  shared: z.boolean().default(false),
  includeAllOperations: z.boolean().default(false),
  force: z.boolean().default(false),
  build: z.boolean().default(true),
  primaryUserStory: z.string().default("Create and validate an Aomi app."),
  agent: z.enum(["codex", "claude", "none"]).default("codex"),
  runSmoke: z.boolean().default(false),
  smokePrompt: z.string().default("List the app capabilities in one paragraph."),
  deploy: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export type WorkbenchIntake = z.infer<typeof intakeSchema>;

export type StepStatus = "pending" | "running" | "complete" | "skipped" | "failed";

export type WorkflowStep = {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type RunPlan = {
  workflow: typeof WORKFLOW_NAME;
  runId: string;
  app: string;
  createdAt: string;
  updatedAt: string;
  smithers: {
    workflowName: typeof WORKFLOW_NAME;
    statePath: string;
    runtime: "initialized" | "unavailable";
    warning?: string;
  };
  intake: WorkbenchIntake;
  steps: WorkflowStep[];
};

export const defaultSteps: WorkflowStep[] = [
  { id: "intake", label: "Persist intake", status: "pending" },
  { id: "binaries", label: "Build fresh SDK binaries", status: "pending" },
  { id: "codegen", label: "Run deterministic aomi-build codegen", status: "pending" },
  { id: "agent", label: "Curate with Codex/Claude", status: "pending" },
  { id: "validate", label: "Run app-scoped cargo validation", status: "pending" },
  { id: "smoke", label: "Run local aomi-run smoke", status: "pending" },
  { id: "deploy", label: "Gate and deploy", status: "pending" },
];

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (
  file: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  },
) => Promise<CommandResult>;

export type ResolvedBinaries = {
  aomiBuild: string;
  aomiRun: string;
  sdkRoot: string;
  source: "fresh-cargo-build" | "stale-target-fallback" | "path-fallback";
  warning?: string;
};
