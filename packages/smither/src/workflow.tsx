import path from "node:path";
import { existsSync } from "node:fs";
import type { CreateSmithersApi } from "smithers-orchestrator";
import { WORKFLOW_NAME, nodeId, type BuildPlan } from "./plan";
import {
  boundedLog,
  smitherSchemas,
  type SmitherSchemas,
  type BinariesRow,
  type CodegenRow,
  type DeploymentRow,
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
import { curatePrompt, fixPrompt, reviewPrompt } from "./prompts";
import type { CommandRunner, ResolvedBinaries } from "./types";

export type AomiSmitherApi = CreateSmithersApi<SmitherSchemas>;
export type AomiWorkflow = ReturnType<AomiSmitherApi["smithers"]>;

export async function createAomiSmither(dbPath: string): Promise<AomiSmitherApi> {
  const { createSmithers } = await import("smithers-orchestrator");
  return createSmithers(smitherSchemas, {
    readableName: "Aomi Smither",
    description:
      "Composes a Smithers workflow from user intent: deterministic Rust codegen, multi-agent curation, a validate/repair loop, local smoke, and gated deploy.",
    dbPath,
  });
}

export type WorkflowDeps = {
  runner?: CommandRunner;
  env?: NodeJS.ProcessEnv;
  activationToken?: string;
  activationConfigPath?: string;
};

/**
 * Render the app-from-scratch task graph from a BuildPlan. The graph is a pure
 * function of (plan, persisted outputs): stages mount as their dependencies'
 * rows appear, so resume re-renders straight past completed work. Node ids
 * come from `nodeId(app, stage)` and must stay stable across renders.
 */
export async function buildAppWorkflow(
  api: AomiSmitherApi,
  plan: BuildPlan,
  deps: WorkflowDeps = {},
): Promise<AomiWorkflow> {
  const { Workflow, Task, Approval, Sequence, Loop, smithers, outputs } = api;
  const runner = deps.runner ?? defaultRunner;
  const id = (stage: string) => nodeId(plan.app, stage);
  const builderAgent =
    plan.builder === "none"
      ? null
      : await makeWorkAgent(plan.builder, { cwd: plan.sdkRoot, env: deps.env });
  const reviewerAgent = plan.review
    ? await makeWorkAgent(plan.reviewer, { cwd: plan.sdkRoot, env: deps.env })
    : null;
  // One validation per loop pass; each red pass mounts one repair task.
  const maxLoopIterations = plan.builder === "none" ? 1 : plan.maxFixRounds + 1;

  return smithers((ctx) => {
    const binaries = ctx.outputMaybe(outputs.binaries, { nodeId: id("binaries") }) as
      | BinariesRow
      | undefined;
    const codegen = ctx.outputMaybe(outputs.codegen, { nodeId: id("codegen") }) as
      | CodegenRow
      | undefined;
    const curation = builderAgent
      ? ctx.outputMaybe(outputs.curation, { nodeId: id("curate") })
      : undefined;
    const review = reviewerAgent
      ? ctx.outputMaybe(outputs.review, { nodeId: id("review") })
      : undefined;
    const curateDone = builderAgent ? !!curation : !!codegen?.ok;
    const reviewDone = !reviewerAgent || !!review;
    const readyToValidate = !!codegen?.ok && curateDone && reviewDone;

    const latestValidation = ctx.latest(outputs.validation, id("validate")) as
      | ValidationRow
      | undefined;
    const green = !!latestValidation?.green;

    const smoke = plan.smoke
      ? (ctx.outputMaybe(outputs.smoke, { nodeId: id("smoke") }) as SmokeRow | undefined)
      : undefined;
    const smokeDone = !plan.smoke || !!smoke?.ok;

    const gate =
      plan.deploy && !plan.autoApprove
        ? ctx.outputMaybe(outputs.gate, { nodeId: id("deploy-gate") })
        : undefined;
    const gateApproved = plan.deploy && (plan.autoApprove || !!gate?.approved);
    const gateDenied = !!gate && !gate.approved;

    const deployment = plan.deploy
      ? (ctx.outputMaybe(outputs.deployment, { nodeId: id("deploy") }) as
          | DeploymentRow
          | undefined)
      : undefined;
    const resultReady =
      green && smokeDone && (!plan.deploy || !!deployment || gateDenied);

    return (
      <Workflow name={`${WORKFLOW_NAME}:${plan.app}`}>
        <Sequence>
          <Task
            id={id("binaries")}
            label="Sync SDK from GitHub, build aomi binaries"
            output={outputs.binaries}
            noRetry
          >
            {() => syncBinariesStep(plan, runner)}
          </Task>
          {binaries ? (
            <Task
              id={id("codegen")}
              label="aomi-build codegen"
              output={outputs.codegen}
              noRetry
            >
              {() => codegenStep(plan, toResolvedBinaries(binaries), runner)}
            </Task>
          ) : null}
          {builderAgent && codegen?.ok ? (
            <Task
              id={id("curate")}
              label={`Curate tools with ${plan.builder}`}
              output={outputs.curation}
              agent={builderAgent}
              needsApproval={!plan.autoApprove}
            >
              {curatePrompt(plan)}
            </Task>
          ) : null}
          {reviewerAgent && curation ? (
            // No `fork`: CLI agents (ClaudeCodeAgent/CodexAgent) don't persist
            // a session snapshot in smithers-orchestrator 0.26.1, so forking
            // the curate session fails with "no usable agent session snapshot".
            // The review prompt is written to work from the repo state alone.
            <Task
              id={id("review")}
              label={`Review curation with ${plan.reviewer}`}
              output={outputs.review}
              agent={reviewerAgent}
            >
              {reviewPrompt(plan)}
            </Task>
          ) : null}
          {readyToValidate ? (
            <Loop
              id={id("validate-loop")}
              until={green}
              maxIterations={maxLoopIterations}
              onMaxReached="fail"
            >
              <Sequence>
                <Task
                  id={id("validate")}
                  label="cargo fmt/clippy/test"
                  output={outputs.validation}
                  noRetry
                >
                  {() => validationStep(plan, runner)}
                </Task>
                {builderAgent && latestValidation && !latestValidation.green ? (
                  // No `fork` (see review task): the repair prompt carries the
                  // validation log, which is the context that matters.
                  <Task
                    id={id("fix")}
                    label={`Repair validation with ${plan.builder}`}
                    output={outputs.fix}
                    agent={builderAgent}
                  >
                    {fixPrompt(plan, latestValidation.log)}
                  </Task>
                ) : null}
              </Sequence>
            </Loop>
          ) : null}
          {plan.smoke && green && binaries ? (
            <Task
              id={id("smoke")}
              label="Compile plugin, local smoke"
              output={outputs.smoke}
              noRetry
            >
              {() => smokeStep(plan, toResolvedBinaries(binaries), runner)}
            </Task>
          ) : null}
          {plan.deploy && !plan.autoApprove && green && smokeDone ? (
            <Approval
              id={id("deploy-gate")}
              output={outputs.gate}
              request={{
                title: `Deploy ${plan.app} to Aomi?`,
                summary:
                  "Ships the validated build via aomi-build deploy. Requires an activation token (flag, AOMI_APP_ACTIVATION_TOKEN, or ~/.config/aomi/config.toml).",
              }}
              onDeny="continue"
            />
          ) : null}
          {gateApproved && green && smokeDone && binaries ? (
            <Task
              id={id("deploy")}
              label="Deploy via aomi-build"
              output={outputs.deployment}
              noRetry
            >
              {() => deployStep(plan, toResolvedBinaries(binaries), runner, deps)}
            </Task>
          ) : null}
          {resultReady ? (
            <Task id={id("result")} label="Summarize run" output={outputs.result} noRetry>
              {() => resultStep(plan, { gateDenied, deployment, smoke })}
            </Task>
          ) : null}
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
