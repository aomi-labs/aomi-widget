import path from "node:path";
import { existsSync } from "node:fs";
import { Fragment, type ReactNode } from "react";
import type { CreateSmithersApi } from "smithers-orchestrator";
import {
  WORKFLOW_NAME,
  nodeId,
  phaseAgent,
  resolveComposition,
  type BuildPlan,
  type InnerPhase,
  type Phase,
} from "./plan";
import {
  boundedLog,
  smitherSchemas,
  type SmitherSchemas,
  type BinariesRow,
  type ClarifyRow,
  type CodegenRow,
  type DeploymentRow,
  type GateRow,
  type ResultRow,
  type SmokeRow,
  type ValidationRow,
} from "./schemas";
import { defaultRunner, resolveFreshAomiBinaries } from "./binaries";
import {
  newAppArgs,
  pluginLibraryFileName,
  resolveActivationCredential,
  runAomiBuild,
  runAomiRun,
  runAppCargoChecks,
} from "./commands";
import { makeWorkAgent } from "./agents";
import { rolePrompt, type PromptContext } from "./prompts";
import type { CommandRunner, ResolvedBinaries } from "./types";

export type AomiSmitherApi = CreateSmithersApi<SmitherSchemas>;
export type AomiWorkflow = ReturnType<AomiSmitherApi["smithers"]>;

export async function createAomiSmither(dbPath: string): Promise<AomiSmitherApi> {
  const { createSmithers } = await import("smithers-orchestrator");
  return createSmithers(smitherSchemas, {
    readableName: "Aomi Smither",
    description:
      "Composes a Smithers workflow from user intent: deterministic Rust codegen, multi-agent curation, clarify pauses, validate/repair loops, local smoke, and gated deploy.",
    dbPath,
  });
}

export type WorkflowDeps = {
  runner?: CommandRunner;
  env?: NodeJS.ProcessEnv;
  activationToken?: string;
  activationConfigPath?: string;
};

/** Output table for a phase. Classic roles keep their bespoke tables (node
 *  ids and resume depend on it); composed roles share `agentWork`. */
function outputKeyFor(phase: InnerPhase | Phase): keyof SmitherSchemas {
  switch (phase.kind) {
    case "compute":
      switch (phase.op) {
        case "binaries":
          return "binaries";
        case "codegen":
          return "codegen";
        case "validate":
          return "validation";
        case "smoke":
          return "smoke";
        case "deploy":
          return "deployment";
        case "result":
          return "result";
      }
      break;
    case "agent":
      switch (phase.role) {
        case "curate":
          return "curation";
        case "review":
          return "review";
        case "fix":
          return "fix";
        default:
          return "agentWork";
      }
    case "clarify":
      return "clarify";
    case "gate":
      return "gate";
    case "loop":
      return "validation";
  }
}

type PhaseState = {
  phase: Phase;
  done: boolean;
  /** settled = done, or a decided-but-denied gate, or skipped downstream of a
   *  denied gate. The result phase mounts on settled; everything else on done. */
  settled: boolean;
  skipped: boolean;
};

/**
 * Render the task graph from `resolveComposition(plan)`. The graph is a pure
 * function of (plan, persisted outputs): phase N mounts when phases 0..N-1 are
 * done, so resume re-renders straight past completed work. Node ids come from
 * `nodeId(app, phase.id)` and must stay stable across renders.
 */
export async function buildAppWorkflow(
  api: AomiSmitherApi,
  plan: BuildPlan,
  deps: WorkflowDeps = {},
): Promise<AomiWorkflow> {
  const { Workflow, Task, Approval, Sequence, Loop, smithers, outputs } = api;
  const runner = deps.runner ?? defaultRunner;
  const id = (stage: string) => nodeId(plan.app, stage);
  const composition = resolveComposition(plan);

  // One CLI agent instance per distinct agent named anywhere in the composition.
  const agentNames = new Set<"claude" | "codex">();
  for (const phase of composition) {
    for (const p of phase.kind === "loop" ? phase.body : [phase]) {
      if (p.kind === "agent") agentNames.add(phaseAgent(plan, p));
    }
  }
  const agents = new Map<"claude" | "codex", Awaited<ReturnType<typeof makeWorkAgent>>>();
  for (const name of agentNames) {
    agents.set(name, await makeWorkAgent(name, { cwd: plan.sdkRoot, env: deps.env }));
  }

  return smithers((ctx) => {
    const row = <K extends keyof SmitherSchemas>(key: K, phaseId: string) =>
      ctx.outputMaybe(outputs[key as keyof typeof outputs], { nodeId: id(phaseId) }) as
        | Record<string, unknown>
        | undefined;

    // --- well-known rows the step functions depend on -----------------------
    const findCompute = (op: string): InnerPhase | undefined => {
      for (const phase of composition) {
        for (const p of phase.kind === "loop" ? phase.body : [phase]) {
          if (p.kind === "compute" && p.op === op) return p;
        }
      }
      return undefined;
    };
    const binariesPhase = findCompute("binaries");
    const binaries = binariesPhase
      ? (row("binaries", binariesPhase.id) as BinariesRow | undefined)
      : undefined;

    const latestValidationFor = (loop: Extract<Phase, { kind: "loop" }>) => {
      const validate = loop.body.find((p) => p.kind === "compute" && p.op === "validate");
      return validate
        ? (ctx.latest(outputs.validation, id(validate.id)) as ValidationRow | undefined)
        : undefined;
    };

    // --- clarify answers become prompt context for later agent phases -------
    const clarifications: NonNullable<PromptContext["clarifications"]> = [];
    for (const phase of composition) {
      if (phase.kind !== "clarify") continue;
      if (plan.autoApprove) {
        clarifications.push({
          question: phase.question,
          selected: phase.options[0].key,
          notes: "auto-selected (--yes)",
        });
        continue;
      }
      const decision = row("clarify", phase.id) as ClarifyRow | undefined;
      if (decision) {
        clarifications.push({
          question: phase.question,
          selected: decision.selected,
          notes: decision.notes,
        });
      }
    }

    // --- walk the composition: done/settled per phase ------------------------
    const states: PhaseState[] = [];
    let denialUpstream = false;
    let gateDenied = false;
    for (const phase of composition) {
      const isResult = phase.kind === "compute" && phase.op === "result";
      if (denialUpstream && !isResult) {
        states.push({ phase, done: false, settled: true, skipped: true });
        continue;
      }
      let done = false;
      switch (phase.kind) {
        case "compute": {
          const r = row(outputKeyFor(phase), phase.id);
          done =
            !!r &&
            (phase.op === "codegen" || phase.op === "smoke"
              ? (r as { ok?: boolean }).ok === true
              : true);
          break;
        }
        case "agent":
          done = !!row(outputKeyFor(phase), phase.id);
          break;
        case "clarify":
          done = plan.autoApprove || !!row("clarify", phase.id);
          break;
        case "gate": {
          const decision = row("gate", phase.id) as GateRow | undefined;
          done = !!decision?.approved;
          if (decision && !decision.approved) {
            denialUpstream = true;
            gateDenied = true;
          }
          break;
        }
        case "loop":
          done = !!latestValidationFor(phase)?.green;
          break;
      }
      states.push({
        phase,
        done,
        settled: done || (phase.kind === "gate" && denialUpstream),
        skipped: false,
      });
    }

    const mountable = (index: number): boolean => {
      const state = states[index];
      if (state.skipped) return false;
      const isResult = state.phase.kind === "compute" && state.phase.op === "result";
      return states
        .slice(0, index)
        .every((prev) => (isResult ? prev.settled : prev.done));
    };

    // --- render one phase ----------------------------------------------------
    const smokePhase = findCompute("smoke");
    const smoke = smokePhase ? (row("smoke", smokePhase.id) as SmokeRow | undefined) : undefined;
    const deployPhase = findCompute("deploy");
    const deployment = deployPhase
      ? (row("deployment", deployPhase.id) as DeploymentRow | undefined)
      : undefined;

    const renderInner = (
      phase: InnerPhase,
      loopContext?: { latestValidation: ValidationRow | undefined },
    ): ReactNode => {
      switch (phase.kind) {
        case "compute":
          return renderCompute(phase);
        case "agent": {
          if (phase.onlyIf === "prev-red") {
            const validation = loopContext?.latestValidation;
            if (!validation || validation.green) return null;
          }
          const agent = agents.get(phaseAgent(plan, phase));
          if (!agent) return null;
          const context: PromptContext & { validationLog?: string } = {
            brief: phase.brief,
            clarifications,
            validationLog: loopContext?.latestValidation?.log,
          };
          return (
            <Task
              id={id(phase.id)}
              label={phase.label ?? `${phase.role} (${phaseAgent(plan, phase)})`}
              output={outputs[outputKeyFor(phase) as "curation"]}
              agent={agent}
              needsApproval={phase.role === "curate" && !plan.autoApprove}
            >
              {rolePrompt(phase.role, plan, context)}
            </Task>
          );
        }
        case "clarify": {
          if (plan.autoApprove) return null;
          return (
            <Approval
              id={id(phase.id)}
              mode="select"
              options={phase.options.map((o) => ({
                key: o.key,
                label: o.label,
                ...(o.summary ? { summary: o.summary } : {}),
              }))}
              output={outputs.clarify}
              request={{
                title: phase.question,
                ...(phase.summary ? { summary: phase.summary } : {}),
                // Mirror the options into request metadata so every surface
                // (TUI events, gateway console) can render them from the
                // request alone.
                metadata: { clarify: true, options: phase.options },
              }}
              onDeny="continue"
            />
          );
        }
        case "gate":
          return (
            <Approval
              id={id(phase.id)}
              output={outputs.gate}
              request={{
                title: phase.title,
                ...(phase.summary ? { summary: phase.summary } : {}),
              }}
              onDeny="continue"
            />
          );
      }
    };

    const renderCompute = (phase: Extract<InnerPhase, { kind: "compute" }>): ReactNode => {
      const label = phase.label;
      switch (phase.op) {
        case "binaries":
          return (
            <Task
              id={id(phase.id)}
              label={label ?? "Sync SDK from GitHub, build aomi binaries"}
              output={outputs.binaries}
              noRetry
            >
              {() => syncBinariesStep(plan, runner)}
            </Task>
          );
        case "codegen":
          return binaries ? (
            <Task id={id(phase.id)} label={label ?? "aomi-build codegen"} output={outputs.codegen} noRetry>
              {() => codegenStep(plan, toResolvedBinaries(binaries), runner)}
            </Task>
          ) : null;
        case "validate":
          return (
            <Task
              id={id(phase.id)}
              label={label ?? "cargo fmt/clippy/test"}
              output={outputs.validation}
              noRetry
            >
              {() => validationStep(plan, runner)}
            </Task>
          );
        case "smoke":
          return binaries ? (
            <Task
              id={id(phase.id)}
              label={label ?? "Compile plugin, local smoke"}
              output={outputs.smoke}
              noRetry
            >
              {() => smokeStep(plan, toResolvedBinaries(binaries), runner)}
            </Task>
          ) : null;
        case "deploy":
          return binaries ? (
            <Task id={id(phase.id)} label={label ?? "Deploy via aomi-build"} output={outputs.deployment} noRetry>
              {() => deployStep(plan, toResolvedBinaries(binaries), runner, deps)}
            </Task>
          ) : null;
        case "result":
          return (
            <Task id={id(phase.id)} label={label ?? "Summarize run"} output={outputs.result} noRetry>
              {() => resultStep(plan, { gateDenied, deployment, smoke })}
            </Task>
          );
      }
    };

    const renderPhase = (phase: Phase, index: number): ReactNode => {
      if (!mountable(index)) return null;
      if (phase.kind === "loop") {
        const latestValidation = latestValidationFor(phase);
        const green = !!latestValidation?.green;
        return (
          <Loop
            id={id(phase.id)}
            until={green}
            maxIterations={phase.maxRounds}
            onMaxReached="fail"
          >
            <Sequence>
              {phase.body.map((inner) => (
                <Fragment key={inner.id}>
                  {renderInner(inner, { latestValidation })}
                </Fragment>
              ))}
            </Sequence>
          </Loop>
        );
      }
      return renderInner(phase);
    };

    return (
      <Workflow name={`${WORKFLOW_NAME}:${plan.app}`}>
        <Sequence>
          {composition.map((phase, index) => (
            <Fragment key={phase.id}>{renderPhase(phase, index)}</Fragment>
          ))}
        </Sequence>
      </Workflow>
    );
  });
}

function toResolvedBinaries(row: BinariesRow): ResolvedBinaries {
  return {
    aomiBuild: row.aomiBuild,
    aomiRun: row.aomiRun,
    sdkRoot: row.sdkRoot,
    source: row.source as ResolvedBinaries["source"],
    ...(row.warning ? { warning: row.warning } : {}),
  };
}

async function syncBinariesStep(
  plan: BuildPlan,
  runner: CommandRunner,
): Promise<BinariesRow> {
  const resolved = await resolveFreshAomiBinaries(plan.sdkRoot, runner, {
    allowStale: plan.allowStaleSdk,
  });
  return {
    aomiBuild: resolved.aomiBuild,
    aomiRun: resolved.aomiRun,
    sdkRoot: resolved.sdkRoot,
    source: resolved.source,
    headSha: resolved.freshness.headSha ?? "",
    syncAction: resolved.freshness.action,
    warning: resolved.warning ?? "",
  };
}

async function codegenStep(
  plan: BuildPlan,
  binaries: ResolvedBinaries,
  runner: CommandRunner,
): Promise<CodegenRow> {
  // Idempotence: a re-run (e.g. a deploy-only pass) must not clobber sources
  // an agent already curated. gen-* only runs when the app has no sources yet.
  if (plan.source === "existing" && !plan.force) {
    const toolPath = path.join(plan.sdkRoot, "apps", plan.app, "src", "tool.rs");
    if (existsSync(toolPath)) {
      return {
        ok: true,
        log: `kept existing generated + curated sources (apps/${plan.app}/src); pass --force to regenerate`,
      };
    }
  }
  const results =
    plan.source === "existing"
      ? [
          await runAomiBuild(
            binaries,
            "gen-client",
            [plan.app, ...(plan.shared ? ["--shared"] : []), ...(plan.force ? ["--force"] : [])],
            runner,
          ),
          await runAomiBuild(
            binaries,
            "gen-tool",
            [
              plan.app,
              ...(plan.shared ? ["--shared"] : []),
              // Always `--all`: the interactive operation picker cannot run
              // under the workflow runner (no TTY); the curation agent prunes.
              "--all",
              ...(plan.force ? ["--force"] : []),
            ],
            runner,
          ),
        ]
      : [
          await runAomiBuild(
            binaries,
            "new-app",
            newAppArgs({
              app: plan.app,
              source: plan.source,
              openApiUrl: plan.openApiUrl,
              shared: plan.shared,
              includeAllOperations: true,
              force: plan.force,
              build: plan.build,
            }).slice(1),
            runner,
          ),
        ];
  const failed = results.find((result) => result.exitCode !== 0);
  if (failed) {
    const output = failed.stderr || failed.stdout;
    const hint = output.includes("Pass --force to overwrite")
      ? "\nHint: aomi-smither --overwrite only resets .smithers run state. Add --force to overwrite existing generated app files, or use --existing to reuse the current spec."
      : "";
    throw new Error(`aomi-build codegen failed: ${boundedLog(output)}${hint}`);
  }
  return {
    ok: true,
    log: boundedLog(results.map((result) => result.stdout).join("\n")),
  };
}

async function validationStep(
  plan: BuildPlan,
  runner: CommandRunner,
): Promise<ValidationRow> {
  const result = await runAppCargoChecks(plan.sdkRoot, plan.app, runner);
  return {
    green: result.exitCode === 0,
    log: boundedLog(result.stderr || result.stdout),
  };
}

async function smokeStep(
  plan: BuildPlan,
  binaries: ResolvedBinaries,
  runner: CommandRunner,
): Promise<SmokeRow> {
  const compile = await runAomiBuild(binaries, "compile", ["--app", plan.app], runner);
  if (compile.exitCode !== 0) {
    throw new Error(
      `compile failed before smoke: ${boundedLog(compile.stderr || compile.stdout)}`,
    );
  }
  const plugin = path.join(plan.sdkRoot, "plugins", pluginLibraryFileName(plan.app));
  const smoke = await runAomiRun(binaries, plugin, ["--prompt", plan.smokePrompt], runner);
  if (smoke.exitCode !== 0) {
    throw new Error(`smoke failed: ${boundedLog(smoke.stderr || smoke.stdout)}`);
  }
  return { ok: true, log: boundedLog(smoke.stdout) };
}

async function deployStep(
  plan: BuildPlan,
  binaries: ResolvedBinaries,
  runner: CommandRunner,
  deps: WorkflowDeps,
): Promise<DeploymentRow> {
  const activation = await resolveActivationCredential({
    activationToken: deps.activationToken,
    env: deps.env,
    configPath: deps.activationConfigPath,
  });
  if (!activation) {
    throw new Error(
      "No activation token found. Run `aomi-build connect` or contact Aomi for an activation token, then set AOMI_APP_ACTIVATION_TOKEN before deploying.",
    );
  }
  const deployEnv =
    activation.source === "flag"
      ? { ...deps.env, AOMI_APP_ACTIVATION_TOKEN: activation.token }
      : deps.env;
  const deploy = await runAomiBuild(
    binaries,
    "deploy",
    [
      "--path",
      plan.deployPath ?? plan.sdkRoot,
      ...(plan.deployAomiToml ? ["--aomi-toml", plan.deployAomiToml] : []),
      ...(plan.deployPlatform ? ["--platform", plan.deployPlatform] : []),
      "--json",
    ],
    runner,
    deployEnv,
  );
  if (deploy.exitCode !== 0) {
    throw new Error(`deploy failed: ${boundedLog(deploy.stderr || deploy.stdout)}`);
  }
  return { ok: true, log: boundedLog(deploy.stdout) };
}

function resultStep(
  plan: BuildPlan,
  state: {
    gateDenied: boolean;
    deployment: DeploymentRow | undefined;
    smoke: SmokeRow | undefined;
  },
): ResultRow {
  if (state.gateDenied) {
    return {
      status: "deploy-denied",
      summary: `${plan.app} validated${plan.smoke ? " and smoked" : ""}; deploy was denied at the gate.`,
    };
  }
  const shipped = plan.deploy && state.deployment?.ok;
  return {
    status: "complete",
    summary: `${plan.app} ${shipped ? "built, validated, and deployed" : "built and validated"}${plan.smoke && state.smoke?.ok ? " (smoke passed)" : ""}.`,
  };
}
