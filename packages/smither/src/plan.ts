import { z } from "zod";

export const WORKFLOW_NAME = "aomi-app-from-scratch";

/**
 * The contract between the intent conversation and the Smithers workflow.
 * The chat distills user intent into this plan; `buildAppWorkflow` renders
 * the task graph from it. Everything the workflow's shape depends on lives
 * here so the composed graph is a pure function of (plan, persisted state).
 */
export const buildPlanSchema = z.object({
  app: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, "app must be a simple package name"),
  sdkRoot: z.string().min(1),
  source: z.enum(["discover", "url", "existing"]).default("discover"),
  openApiUrl: z.string().url().optional(),
  userStory: z.string().default("Create and validate an Aomi app."),
  shared: z.boolean().default(false),
  force: z.boolean().default(false),
  build: z.boolean().default(true),
  /** Agent that curates tools and repairs validation failures. */
  builder: z.enum(["claude", "codex", "none"]).default("claude"),
  /** Second agent independently reviews the builder's curation. */
  review: z.boolean().default(false),
  reviewer: z.enum(["claude", "codex"]).default("codex"),
  /** Validate/fix loop budget: 1 validation + up to N agent repair rounds. */
  maxFixRounds: z.number().int().min(0).max(5).default(2),
  smoke: z.boolean().default(false),
  smokePrompt: z.string().default("List the app capabilities in one paragraph."),
  deploy: z.boolean().default(false),
  /** Deploy from a standalone source repo instead of the SDK checkout —
   *  `aomi-build deploy` requires a pushed GitHub commit with a tracked
   *  aomi.toml, which the SDK monorepo does not provide for generated apps. */
  deployPath: z.string().optional(),
  /** Repo-relative aomi.toml to scope the deploy to one app (a deploy repo
   *  may host several apps). */
  deployAomiToml: z.string().optional(),
  /** Backend platform tag. Passed explicitly because aomi-build prefers the
   *  operator's saved config over the manifest when resolving the platform. */
  deployPlatform: z.string().optional(),
  /** Skip approval gates (headless --yes). */
  autoApprove: z.boolean().default(false),
  /** Proceed even when the SDK checkout can't be synced with GitHub. */
  allowStaleSdk: z.boolean().default(false),
});

export type BuildPlan = z.infer<typeof buildPlanSchema>;

/** Stable Smithers node id for an app stage. Resume depends on these never
 *  changing shape, so derive them from data only. */
export function nodeId(app: string, stage: string): string {
  return `${app}:${stage}`;
}

export type PlanStage = {
  id: string;
  label: string;
  kind: "compute" | "agent" | "loop" | "approval";
};

/** The stage list the plan composes to — the preview screen, dry-run output,
 *  and the workflow all derive from this single source. */
export function stagesFor(plan: BuildPlan): PlanStage[] {
  const id = (stage: string) => nodeId(plan.app, stage);
  const stages: PlanStage[] = [
    { id: id("binaries"), label: "Sync SDK from GitHub, build aomi binaries", kind: "compute" },
    {
      id: id("codegen"),
      label:
        plan.source === "existing"
          ? "aomi-build gen-client + gen-tool from existing spec"
          : "aomi-build new-app codegen",
      kind: "compute",
    },
  ];
  if (plan.builder !== "none") {
    stages.push({
      id: id("curate"),
      label: `Curate tools with ${plan.builder}`,
      kind: "agent",
    });
    if (plan.review) {
      stages.push({
        id: id("review"),
        label: `Review curation with ${plan.reviewer}`,
        kind: "agent",
      });
    }
  }
  stages.push({
    id: id("validate-loop"),
    label:
      plan.builder === "none"
        ? "Validate (cargo fmt/clippy/test)"
        : `Validate, repair with ${plan.builder} (up to ${plan.maxFixRounds} rounds)`,
    kind: "loop",
  });
  if (plan.smoke) {
    stages.push({ id: id("smoke"), label: "Compile plugin, local aomi-run smoke", kind: "compute" });
  }
  if (plan.deploy) {
    if (!plan.autoApprove) {
      stages.push({ id: id("deploy-gate"), label: "Deploy approval gate", kind: "approval" });
    }
    stages.push({ id: id("deploy"), label: "Deploy via aomi-build", kind: "compute" });
  }
  stages.push({ id: id("result"), label: "Summarize run", kind: "compute" });
  return stages;
}

/** Human-readable plan summary for the preview screen and dry-run output. */
export function describePlan(plan: BuildPlan): string[] {
  const source =
    plan.source === "url"
      ? `OpenAPI url: ${plan.openApiUrl ?? "(missing)"}`
      : plan.source === "existing"
        ? `existing spec: apps/${plan.app}/openapi.yaml`
        : "discover spec via aomi-build";
  const lines = [
    `app: ${plan.app}`,
    `sdk: ${plan.sdkRoot}${plan.allowStaleSdk ? " (stale allowed)" : " (synced from GitHub)"}`,
    `source: ${source}`,
    `story: ${plan.userStory}`,
    `builder: ${plan.builder}${plan.review ? ` · reviewed by ${plan.reviewer}` : ""}`,
    `fix rounds: ${plan.maxFixRounds}`,
    `smoke: ${plan.smoke ? plan.smokePrompt : "off"}`,
    `deploy: ${plan.deploy ? (plan.autoApprove ? "yes (auto-approved)" : "yes (gated)") : "off"}`,
  ];
  if (plan.shared) lines.push("shared: generate provider under ext/");
  if (plan.force) lines.push("force: overwrite generated files");
  return lines;
}

/** Merge a partial plan (e.g. from the intent agent or CLI flags) over
 *  current draft values, keeping only keys the schema accepts. */
export function mergePlanDraft(
  base: Partial<BuildPlan>,
  patch: Record<string, unknown>,
): Partial<BuildPlan> {
  const candidate = { ...base } as Record<string, unknown>;
  const shape = buildPlanSchema.shape as Record<string, z.ZodTypeAny>;
  for (const [key, value] of Object.entries(patch)) {
    const field = shape[key];
    if (!field || value === undefined || value === null) continue;
    const parsed = field.safeParse(value);
    if (parsed.success) candidate[key] = parsed.data;
  }
  return candidate as Partial<BuildPlan>;
}

/** Validate a draft into a runnable plan. Returns issues instead of throwing
 *  so the TUI can keep the conversation going. */
export function finalizePlan(
  draft: Partial<BuildPlan>,
): { plan: BuildPlan; issues: [] } | { plan: null; issues: string[] } {
  const parsed = buildPlanSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      plan: null,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "plan"}: ${issue.message}`),
    };
  }
  if (parsed.data.source === "url" && !parsed.data.openApiUrl) {
    return { plan: null, issues: ["openApiUrl: required when source is \"url\""] };
  }
  return { plan: parsed.data, issues: [] };
}
