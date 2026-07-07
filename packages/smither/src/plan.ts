import { z } from "zod";

export const WORKFLOW_NAME = "aomi-app-from-scratch";

// ---------------------------------------------------------------------------
// Phase vocabulary — the composition model
// ---------------------------------------------------------------------------
//
// A plan is no longer flags on one hardcoded pipeline: it is a composition of
// typed phases the intent agent proposes and the human edits in the preview.
// The classic flag-driven pipeline is just one canned composition
// (`classicComposition`), so flag-only CLI invocations behave exactly as
// before — including node ids, which resume depends on.

export const clarifyOptionSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "option keys are short kebab-case slugs"),
  label: z.string().min(1),
  summary: z.string().optional(),
});
export type ClarifyOption = z.infer<typeof clarifyOptionSchema>;

const phaseIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "phase ids are short kebab-case slugs");

/** Deterministic command steps. Each op maps to one step function and one
 *  output table; ops are the only things allowed to touch the shell. */
export const computeOpSchema = z.enum([
  "binaries",
  "codegen",
  "validate",
  "smoke",
  "deploy",
  "result",
]);
export type ComputeOp = z.infer<typeof computeOpSchema>;

/** LLM roles. curate/review/fix are the classic trio; research, draft-spec,
 *  and synthesize exist for spec-less targets (protocol research distilled
 *  into preambles/building blocks) and for drafting OpenAPI specs from docs. */
export const agentRoleSchema = z.enum([
  "curate",
  "review",
  "fix",
  "research",
  "draft-spec",
  "synthesize",
]);
export type AgentRole = z.infer<typeof agentRoleSchema>;

export const computePhaseSchema = z.object({
  kind: z.literal("compute"),
  id: phaseIdSchema,
  op: computeOpSchema,
  label: z.string().optional(),
});

export const agentPhaseSchema = z.object({
  kind: z.literal("agent"),
  id: phaseIdSchema,
  role: agentRoleSchema,
  /** Which CLI agent runs it. Defaults to plan.builder (plan.reviewer for
   *  role "review"). */
  agent: z.enum(["claude", "codex"]).optional(),
  /** Composer- or human-supplied focus folded into the role prompt. */
  brief: z.string().optional(),
  /** Loop-body conditional: mount only when the latest validation is red
   *  ("prev-red") or the latest eval failed ("prev-eval-fail"). */
  onlyIf: z.enum(["prev-red", "prev-eval-fail"]).optional(),
  label: z.string().optional(),
});

/** A human question the run pauses on. Renders as a select-mode Smithers
 *  approval: durable, answerable from the TUI or the browser console, and the
 *  `{selected, notes}` decision becomes context for later phases. */
export const clarifyPhaseSchema = z.object({
  kind: z.literal("clarify"),
  id: phaseIdSchema,
  question: z.string().min(1),
  summary: z.string().optional(),
  /** First option is the recommendation — headless --yes runs auto-select it. */
  options: z.array(clarifyOptionSchema).min(2).max(6),
  label: z.string().optional(),
});

export const gatePhaseSchema = z.object({
  kind: z.literal("gate"),
  id: phaseIdSchema,
  title: z.string().min(1),
  summary: z.string().optional(),
  label: z.string().optional(),
});

/** A behavioral eval: run the compiled plugin against a scenario prompt, then
 *  score the transcript against a rubric with an LLM judge. Produces a metric
 *  and a pass/fail against `threshold` — the exit signal for an `eval-pass`
 *  loop. Generalizes smoke from "did it run" to "did it do the right thing". */
export const evalPhaseSchema = z.object({
  kind: z.literal("eval"),
  id: phaseIdSchema,
  /** Prompt fed to `aomi-run` against the compiled plugin. */
  scenario: z.string().min(1),
  /** How the judge scores the transcript (0..1). */
  rubric: z.string().min(1),
  /** Pass bar; the loop exits when the latest eval's score ≥ threshold. */
  threshold: z.number().min(0).max(1).default(0.7),
  /** Judge agent. Defaults to plan.builder (claude when builder is none). */
  judge: z.enum(["claude", "codex"]).optional(),
  label: z.string().optional(),
});
export type EvalPhase = z.infer<typeof evalPhaseSchema>;

export const innerPhaseSchema = z.discriminatedUnion("kind", [
  computePhaseSchema,
  agentPhaseSchema,
  clarifyPhaseSchema,
  gatePhaseSchema,
  evalPhaseSchema,
]);
export type InnerPhase = z.infer<typeof innerPhaseSchema>;

/**
 * A bounded retry loop. `until` names the persisted exit predicate
 * (validation green, or an eval scoring at/above its threshold). `onMax`
 * governs the tail: "fail" aborts the run; "return-last" stops gracefully and
 * lets the composition continue — pair it with a following clarify/gate to
 * escalate the decision to the human instead of hard-failing.
 */
export const loopPhaseSchema = z.object({
  kind: z.literal("loop"),
  id: phaseIdSchema,
  until: z.enum(["validation-green", "eval-pass"]),
  maxRounds: z.number().int().min(1).max(6).default(3),
  /** Tail behavior. Omitted ⇒ "fail" (abort the run). "return-last" stops the
   *  loop gracefully at maxRounds so the composition can continue. */
  onMax: z.enum(["fail", "return-last"]).optional(),
  body: z.array(innerPhaseSchema).min(1),
  label: z.string().optional(),
});

/** Fan-out: every branch runs concurrently (each branch is its own sequence),
 *  and the composition waits for all branches before the next phase. For
 *  independent work — researching several protocols, building several venues —
 *  where branches don't write the same files. */
export const parallelPhaseSchema = z.object({
  kind: z.literal("parallel"),
  id: phaseIdSchema,
  branches: z.array(z.array(innerPhaseSchema).min(1)).min(2),
  /** Cap on concurrent branches. Omit for unbounded (engine still caps). */
  maxConcurrency: z.number().int().min(1).max(16).optional(),
  label: z.string().optional(),
});

export const phaseSchema = z.discriminatedUnion("kind", [
  computePhaseSchema,
  agentPhaseSchema,
  clarifyPhaseSchema,
  gatePhaseSchema,
  evalPhaseSchema,
  loopPhaseSchema,
  parallelPhaseSchema,
]);
export type Phase = z.infer<typeof phaseSchema>;

// ---------------------------------------------------------------------------
// BuildPlan
// ---------------------------------------------------------------------------

/**
 * The contract between the intent conversation and the Smithers workflow.
 * The chat distills user intent into this plan; `buildAppWorkflow` renders
 * the task graph from `resolveComposition(plan)`. Everything the workflow's
 * shape depends on lives here so the composed graph is a pure function of
 * (plan, persisted state).
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
  /** Composed phase list. Absent ⇒ `classicComposition` (the flag-driven
   *  pipeline). Present ⇒ the intent agent (edited by the human in preview)
   *  chose the shape: research-mode, draft-spec, extra clarifies, etc. */
  phases: z.array(phaseSchema).optional(),
});

export type BuildPlan = z.infer<typeof buildPlanSchema>;

/** Stable Smithers node id for an app stage. Resume depends on these never
 *  changing shape, so derive them from data only. */
export function nodeId(app: string, stage: string): string {
  return `${app}:${stage}`;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** The flag-driven pipeline as a composition. Ids match the pre-composition
 *  workflow exactly, so existing run state resumes cleanly. */
export function classicComposition(plan: BuildPlan): Phase[] {
  const phases: Phase[] = [
    { kind: "compute", id: "binaries", op: "binaries" },
    { kind: "compute", id: "codegen", op: "codegen" },
  ];
  if (plan.builder !== "none") {
    phases.push({ kind: "agent", id: "curate", role: "curate" });
    if (plan.review) {
      phases.push({ kind: "agent", id: "review", role: "review", agent: plan.reviewer });
    }
  }
  phases.push({
    kind: "loop",
    id: "validate-loop",
    until: "validation-green",
    maxRounds: plan.builder === "none" ? 1 : plan.maxFixRounds + 1,
    body:
      plan.builder === "none"
        ? [{ kind: "compute", id: "validate", op: "validate" }]
        : [
            { kind: "compute", id: "validate", op: "validate" },
            { kind: "agent", id: "fix", role: "fix", onlyIf: "prev-red" },
          ],
  });
  if (plan.smoke) {
    phases.push({ kind: "compute", id: "smoke", op: "smoke" });
  }
  if (plan.deploy) {
    if (!plan.autoApprove) {
      phases.push({
        kind: "gate",
        id: "deploy-gate",
        title: `Deploy ${plan.app} to Aomi?`,
        summary:
          "Ships the validated build via aomi-build deploy. Requires an activation token (flag, AOMI_APP_ACTIVATION_TOKEN, or ~/.config/aomi/config.toml).",
      });
    }
    phases.push({ kind: "compute", id: "deploy", op: "deploy" });
  }
  phases.push({ kind: "compute", id: "result", op: "result" });
  return phases;
}

/** The composition the workflow renders: the composed phases when the intent
 *  agent proposed them, else the classic pipeline. A trailing `result` compute
 *  phase is guaranteed so every run summarizes. */
export function resolveComposition(plan: BuildPlan): Phase[] {
  if (!plan.phases || plan.phases.length === 0) return classicComposition(plan);
  const phases = [...plan.phases];
  const hasResult = phases.some((p) => p.kind === "compute" && p.op === "result");
  if (!hasResult) phases.push({ kind: "compute", id: "result", op: "result" });
  return phases;
}

/** The inner phases a container holds (loop body / parallel branches), or the
 *  phase itself for leaves. Used to walk a composition uniformly. */
export function innerPhasesOf(phase: Phase): InnerPhase[] {
  if (phase.kind === "loop") return phase.body;
  if (phase.kind === "parallel") return phase.branches.flat();
  return [phase as InnerPhase];
}

/** Every phase in top-level order, with container inner phases spliced in
 *  place — the ordered flat list dependency checks read. */
function orderedFlat(phases: Phase[]): Array<InnerPhase | Phase> {
  const out: Array<InnerPhase | Phase> = [];
  for (const phase of phases) {
    if (phase.kind === "loop" || phase.kind === "parallel") {
      out.push(phase, ...innerPhasesOf(phase));
    } else {
      out.push(phase);
    }
  }
  return out;
}

/** Structural problems in a composed phase list — surfaced at finalize time
 *  so the TUI can bounce them back into the conversation. */
export function compositionIssues(plan: BuildPlan): string[] {
  if (!plan.phases || plan.phases.length === 0) return [];
  const issues: string[] = [];
  const phases = resolveComposition(plan);

  // id uniqueness across every phase, container and leaf alike.
  const seen = new Set<string>();
  for (const phase of phases) {
    for (const p of [phase, ...(phase.kind === "loop" || phase.kind === "parallel" ? innerPhasesOf(phase) : [])]) {
      if (seen.has(p.id)) issues.push(`phases: duplicate id "${p.id}"`);
      seen.add(p.id);
    }
  }

  // binaries must precede anything that reads the built binaries or plugin.
  const flat = orderedFlat(phases);
  const flatIndex = (pred: (p: InnerPhase | Phase) => boolean) => flat.findIndex(pred);
  const binariesAt = flatIndex((p) => p.kind === "compute" && p.op === "binaries");
  const needsBinaries: Array<{ what: string; at: number }> = [
    { what: "codegen", at: flatIndex((p) => p.kind === "compute" && p.op === "codegen") },
    { what: "smoke", at: flatIndex((p) => p.kind === "compute" && p.op === "smoke") },
    { what: "deploy", at: flatIndex((p) => p.kind === "compute" && p.op === "deploy") },
    { what: "eval", at: flatIndex((p) => p.kind === "eval") },
  ];
  for (const { what, at } of needsBinaries) {
    if (at !== -1 && (binariesAt === -1 || binariesAt > at)) {
      issues.push(`phases: "${what}" needs a "binaries" compute phase before it`);
    }
  }

  // fix only belongs inside a loop; a bare fix has no validation log to act on.
  if (phases.some((p) => p.kind === "agent" && p.role === "fix")) {
    issues.push('phases: role "fix" only makes sense inside a loop body');
  }

  // a loop's exit predicate must have the phase that produces its signal.
  for (const phase of phases) {
    if (phase.kind !== "loop") continue;
    if (
      phase.until === "validation-green" &&
      !phase.body.some((p) => p.kind === "compute" && p.op === "validate")
    ) {
      issues.push(
        `phases: loop "${phase.id}" exits on validation-green but has no "validate" compute phase in its body`,
      );
    }
    if (phase.until === "eval-pass" && !phase.body.some((p) => p.kind === "eval")) {
      issues.push(
        `phases: loop "${phase.id}" exits on eval-pass but has no "eval" phase in its body`,
      );
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Stage rail (preview / TUI / console all derive from this)
// ---------------------------------------------------------------------------

export type PlanStage = {
  id: string;
  label: string;
  kind: "compute" | "agent" | "loop" | "approval" | "clarify" | "eval" | "parallel";
  /** Clarify metadata rides along so every surface (TUI, browser console) can
   *  render the options without a second data path. */
  clarify?: { question: string; summary?: string; options: ClarifyOption[] };
  /** Set on rows that are one branch of a parallel phase, so surfaces can
   *  indent/group them under the fan-out. */
  branchOf?: string;
};

const OP_LABEL: Record<ComputeOp, string> = {
  binaries: "Sync SDK from GitHub, build aomi binaries",
  codegen: "aomi-build codegen",
  validate: "Validate (cargo fmt/clippy/test)",
  smoke: "Compile plugin, local aomi-run smoke",
  deploy: "Deploy via aomi-build",
  result: "Summarize run",
};

const ROLE_LABEL: Record<AgentRole, (agent: string) => string> = {
  curate: (a) => `Curate tools with ${a}`,
  review: (a) => `Review curation with ${a}`,
  fix: (a) => `Repair validation with ${a}`,
  research: (a) => `Research protocols with ${a}`,
  "draft-spec": (a) => `Draft OpenAPI spec with ${a}`,
  synthesize: (a) => `Synthesize preambles with ${a}`,
};

export function phaseAgent(plan: BuildPlan, phase: { role: AgentRole; agent?: "claude" | "codex" }): "claude" | "codex" {
  if (phase.agent) return phase.agent;
  if (phase.role === "review") return plan.reviewer;
  return plan.builder === "none" ? "claude" : plan.builder;
}

function stageLabel(plan: BuildPlan, phase: Phase | InnerPhase): string {
  if (phase.label) return phase.label;
  switch (phase.kind) {
    case "compute":
      if (phase.op === "codegen") {
        return plan.source === "existing"
          ? "aomi-build gen-client + gen-tool from existing spec"
          : "aomi-build new-app codegen";
      }
      return OP_LABEL[phase.op];
    case "agent":
      return ROLE_LABEL[phase.role](phaseAgent(plan, phase));
    case "clarify":
      return phase.question;
    case "gate":
      return phase.title;
    case "eval":
      return `Eval: run scenario, judge (pass ≥ ${phase.threshold})`;
    case "loop": {
      if (phase.until === "eval-pass") {
        return `Run + eval, refine (up to ${phase.maxRounds - 1} rounds)`;
      }
      const repairs = phase.body.filter((p) => p.kind === "agent").length;
      return repairs > 0
        ? `Validate, repair (up to ${phase.maxRounds - 1} rounds)`
        : "Validate (cargo fmt/clippy/test)";
    }
    case "parallel":
      return `Parallel — ${phase.branches.length} branches`;
  }
}

function stageFor(plan: BuildPlan, phase: Phase | InnerPhase, branchOf?: string): PlanStage {
  const id = (stage: string) => nodeId(plan.app, stage);
  const base = { id: id(phase.id), label: stageLabel(plan, phase), ...(branchOf ? { branchOf } : {}) };
  switch (phase.kind) {
    case "compute":
      return { ...base, kind: "compute" };
    case "agent":
      return { ...base, kind: "agent" };
    case "eval":
      return { ...base, kind: "eval" };
    case "loop":
      return { ...base, kind: "loop" };
    case "gate":
      return { ...base, kind: "approval" };
    case "parallel":
      return { ...base, kind: "parallel" };
    case "clarify":
      return {
        ...base,
        kind: "clarify",
        clarify: { question: phase.question, summary: phase.summary, options: phase.options },
      };
  }
}

/** The stage list the plan composes to — the preview screen, dry-run output,
 *  and the workflow all derive from this single source. A parallel phase emits
 *  a header row plus one row per branch leaf (each has its own node id and
 *  lights up independently); a loop stays a single row (its body collapses). */
export function stagesFor(plan: BuildPlan): PlanStage[] {
  const stages: PlanStage[] = [];
  for (const phase of resolveComposition(plan)) {
    if (phase.kind === "parallel") {
      stages.push(stageFor(plan, phase));
      for (const branch of phase.branches) {
        for (const inner of branch) stages.push(stageFor(plan, inner, phase.id));
      }
      continue;
    }
    stages.push(stageFor(plan, phase));
  }
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
  if (plan.phases && plan.phases.length > 0) {
    lines.push(`composition: ${plan.phases.length} custom phases (composed from intent)`);
  }
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
  const issues = compositionIssues(parsed.data);
  if (issues.length > 0) {
    return { plan: null, issues };
  }
  return { plan: parsed.data, issues: [] };
}
