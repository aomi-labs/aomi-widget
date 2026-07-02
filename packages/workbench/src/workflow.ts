import path from "node:path";
import { agentPrompt, runAgent } from "./agents";
import { resolveAomiBinaries } from "./binaries";
import {
  pluginLibraryFileName,
  newAppArgs,
  resolveActivationCredential,
  runAomiBuild,
  runAomiRun,
  runAppCargoChecks,
} from "./commands";
import {
  createRunPlan,
  loadRunPlan,
  planPath,
  resetRunPlan,
  saveRunPlan,
  runDir,
  updateStep,
} from "./state";
import { initializeAomiSmithersRun, type SmithersFactory } from "./smithers";
import { intakeSchema, type CommandRunner, type RunPlan, type WorkbenchIntake } from "./types";

export type WorkflowEvent =
  | { type: "plan"; plan: RunPlan }
  | { type: "step"; plan: RunPlan; stepId: string }
  | { type: "warning"; message: string }
  | { type: "blocked"; message: string }
  | { type: "done"; plan: RunPlan };

export type WorkflowOptions = {
  overwrite?: boolean;
  runner?: CommandRunner;
  onEvent?: (event: WorkflowEvent) => void | Promise<void>;
  runsRoot?: string;
  env?: NodeJS.ProcessEnv;
  activationToken?: string;
  activationConfigPath?: string;
  smithersFactory?: SmithersFactory;
  agentApproved?: boolean;
  deployApproved?: boolean;
};

async function emit(options: WorkflowOptions, event: WorkflowEvent) {
  await options.onEvent?.(event);
}

async function setStep(
  plan: RunPlan,
  id: string,
  patch: Parameters<typeof updateStep>[2],
  options: WorkflowOptions,
): Promise<RunPlan> {
  const next = updateStep(plan, id, patch);
  await saveRunPlan(next, options.runsRoot);
  await emit(options, { type: "step", plan: next, stepId: id });
  return next;
}

export async function prepareRunPlan(
  rawInput: unknown,
  options: WorkflowOptions = {},
): Promise<RunPlan> {
  const intake = intakeSchema.parse(rawInput);
  if (options.overwrite) {
    await resetRunPlan(intake.app, options.runsRoot);
  }
  const existing = await loadRunPlan(intake.app, options.runsRoot);
  if (existing) {
    if (!existing.smithers) {
      const smithers = await initializeAomiSmithersRun(
        path.join(runDir(intake.app, options.runsRoot), "smithers.sqlite"),
        options.smithersFactory,
      );
      const migrated = { ...existing, smithers };
      await saveRunPlan(migrated, options.runsRoot);
      return migrated;
    }
    return existing;
  }
  const smithers = await initializeAomiSmithersRun(
    path.join(runDir(intake.app, options.runsRoot), "smithers.sqlite"),
    options.smithersFactory,
  );
  const plan = createRunPlan(intake, smithers);
  await saveRunPlan(plan, options.runsRoot);
  return plan;
}

export async function runWorkbenchWorkflow(
  rawInput: unknown,
  options: WorkflowOptions = {},
): Promise<RunPlan> {
  let plan = await prepareRunPlan(rawInput, options);
  await emit(options, { type: "plan", plan });
  if (plan.smithers.warning) {
    await emit(options, { type: "warning", message: plan.smithers.warning });
  }

  plan = await setStep(
    plan,
    "intake",
    { status: "complete", detail: planPath(plan.app, options.runsRoot) },
    options,
  );

  if (plan.intake.dryRun) {
    for (const step of plan.steps.filter((step) => step.status === "pending")) {
      plan = await setStep(plan, step.id, { status: "skipped", detail: "dry-run" }, options);
    }
    await emit(options, { type: "done", plan });
    return plan;
  }

  const runner = options.runner;
  plan = await setStep(plan, "binaries", { status: "running" }, options);
  const binaries = await resolveAomiBinaries(plan.intake.sdkRoot, runner);
  if (binaries.warning) {
    await emit(options, { type: "warning", message: binaries.warning });
  }
  plan = await setStep(
    plan,
    "binaries",
    { status: "complete", detail: binaries.source },
    options,
  );

  plan = await setStep(plan, "codegen", { status: "running" }, options);
  const codegenResults =
    plan.intake.source === "existing"
      ? [
          await runAomiBuild(
            binaries,
            "gen-client",
            [
              plan.app,
              ...(plan.intake.shared ? ["--shared"] : []),
              ...(plan.intake.force ? ["--force"] : []),
            ],
            runner,
          ),
          await runAomiBuild(
            binaries,
            "gen-tool",
            [
              plan.app,
              ...(plan.intake.shared ? ["--shared"] : []),
              ...(plan.intake.includeAllOperations ? ["--all"] : []),
              ...(plan.intake.force ? ["--force"] : []),
            ],
            runner,
          ),
        ]
      : [
          await runAomiBuild(
            binaries,
            "new-app",
            newAppArgs(plan.intake).slice(1),
            runner,
          ),
        ];
  const codegen = codegenResults.find((result) => result.exitCode !== 0);
  if (codegen) {
    plan = await setStep(
      plan,
      "codegen",
      { status: "failed", detail: boundedLog(codegen.stderr || codegen.stdout) },
      options,
    );
    throw new Error(`aomi-build codegen failed: ${codegen.stderr || codegen.stdout}`);
  }
  plan = await setStep(plan, "codegen", { status: "complete" }, options);

  const selectedAgent = plan.intake.agent;
  if (selectedAgent === "none") {
    plan = await setStep(plan, "agent", { status: "skipped", detail: "agent=none" }, options);
  } else if (options.agentApproved === false) {
    const message = `${selectedAgent} curation was not approved.`;
    plan = await setStep(plan, "agent", { status: "skipped", detail: message }, options);
    await emit(options, { type: "blocked", message });
    await emit(options, { type: "done", plan });
    return plan;
  } else {
    plan = await setStep(plan, "agent", { status: "running" }, options);
    const prompt = agentPrompt({
      app: plan.app,
      sdkRoot: plan.intake.sdkRoot,
      primaryUserStory: plan.intake.primaryUserStory,
      phase: "curate-tools",
    });
    const agent = await runAgent(selectedAgent, prompt, plan.intake.sdkRoot, runner);
    if (agent.exitCode !== 0) {
      plan = await setStep(
        plan,
        "agent",
        { status: "failed", detail: boundedLog(agent.stderr || agent.stdout) },
        options,
      );
      throw new Error(`${selectedAgent} failed: ${agent.stderr || agent.stdout}`);
    }
    plan = await setStep(plan, "agent", { status: "complete" }, options);
  }

  plan = await setStep(plan, "validate", { status: "running" }, options);
  let validation = await runAppCargoChecks(plan.intake.sdkRoot, plan.app, runner);
  if (validation.exitCode !== 0) {
    const validationLog = boundedLog(validation.stderr || validation.stdout);
    if (selectedAgent !== "none" && options.agentApproved !== false) {
      const prompt = agentPrompt({
        app: plan.app,
        sdkRoot: plan.intake.sdkRoot,
        primaryUserStory: plan.intake.primaryUserStory,
        phase: "fix-validation",
        validationLog,
      });
      const fix = await runAgent(selectedAgent, prompt, plan.intake.sdkRoot, runner);
      if (fix.exitCode !== 0) {
        plan = await setStep(
          plan,
          "validate",
          { status: "failed", detail: boundedLog(fix.stderr || fix.stdout) },
          options,
        );
        throw new Error(`${selectedAgent} validation repair failed: ${fix.stderr || fix.stdout}`);
      }
      validation = await runAppCargoChecks(plan.intake.sdkRoot, plan.app, runner);
    }
    if (validation.exitCode !== 0) {
      plan = await setStep(
        plan,
        "validate",
        { status: "failed", detail: boundedLog(validation.stderr || validation.stdout) },
        options,
      );
      throw new Error(`validation failed: ${validation.stderr || validation.stdout}`);
    }
  }
  plan = await setStep(plan, "validate", { status: "complete" }, options);

  if (plan.intake.runSmoke) {
    plan = await setStep(plan, "smoke", { status: "running" }, options);
    const compile = await runAomiBuild(binaries, "compile", ["--app", plan.app], runner);
    if (compile.exitCode !== 0) {
      plan = await setStep(
        plan,
        "smoke",
        { status: "failed", detail: boundedLog(compile.stderr || compile.stdout) },
        options,
      );
      throw new Error(`compile failed before smoke: ${compile.stderr || compile.stdout}`);
    }
    const plugin = path.join(plan.intake.sdkRoot, "plugins", pluginLibraryFileName(plan.app));
    const smoke = await runAomiRun(
      binaries,
      plugin,
      ["--prompt", plan.intake.smokePrompt],
      runner,
    );
    plan = await setStep(
      plan,
      "smoke",
      {
        status: smoke.exitCode === 0 ? "complete" : "failed",
        detail: smoke.exitCode === 0 ? undefined : boundedLog(smoke.stderr || smoke.stdout),
      },
      options,
    );
    if (smoke.exitCode !== 0) {
      throw new Error(`smoke failed: ${smoke.stderr || smoke.stdout}`);
    }
  } else {
    plan = await setStep(plan, "smoke", { status: "skipped", detail: "disabled" }, options);
  }

  if (plan.intake.deploy) {
    if (!options.deployApproved) {
      const message = "Deploy was not approved.";
      plan = await setStep(plan, "deploy", { status: "skipped", detail: message }, options);
      await emit(options, { type: "blocked", message });
      await emit(options, { type: "done", plan });
      return plan;
    }
    const activation = await resolveActivationCredential({
      activationToken: options.activationToken,
      env: options.env,
      configPath: options.activationConfigPath,
    });
    if (!activation) {
      const message =
        "No activation token found. Run `aomi-build connect` or contact Aomi for an activation token, then set AOMI_APP_ACTIVATION_TOKEN before deploying.";
      plan = await setStep(plan, "deploy", { status: "skipped", detail: message }, options);
      await emit(options, { type: "blocked", message });
      await emit(options, { type: "done", plan });
      return plan;
    }
    plan = await setStep(plan, "deploy", { status: "running" }, options);
    const deployEnv =
      activation.source === "flag"
        ? { ...options.env, AOMI_APP_ACTIVATION_TOKEN: activation.token }
        : options.env;
    const deploy = await runAomiBuild(
      binaries,
      "deploy",
      ["--path", plan.intake.sdkRoot],
      runner,
      deployEnv,
    );
    plan = await setStep(
      plan,
      "deploy",
      {
        status: deploy.exitCode === 0 ? "complete" : "failed",
        detail: deploy.exitCode === 0 ? undefined : boundedLog(deploy.stderr || deploy.stdout),
      },
      options,
    );
    if (deploy.exitCode !== 0) {
      throw new Error(`deploy failed: ${deploy.stderr || deploy.stdout}`);
    }
  } else {
    plan = await setStep(plan, "deploy", { status: "skipped", detail: "disabled" }, options);
  }

  await emit(options, { type: "done", plan });
  return plan;
}

function boundedLog(log: string): string {
  return log.length > 4000 ? `${log.slice(0, 4000)}\n...truncated...` : log;
}
