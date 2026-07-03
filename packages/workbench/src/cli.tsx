import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmInput, Select, TextInput } from "@inkjs/ui";
import { Box, Text, render, useApp } from "ink";
import { defaultSdkRoot } from "./binaries";
import { loadRunPlan } from "./state";
import {
  executeRollback,
  planRollback,
  rollbackClientFromEnv,
  type RollbackPlanSummary,
} from "./rollback";
import { runWorkbenchWorkflow, type WorkflowEvent } from "./workflow";
import { intakeSchema, type RunPlan, type WorkbenchIntake } from "./types";

type CliArgs = {
  help: boolean;
  yes: boolean;
  overwrite: boolean;
  activationToken?: string;
  runsRoot: string;
  intake: WorkbenchIntake;
  provided: Set<string>;
};

type GatePhase =
  | "intake-app"
  | "check-existing"
  | "resume-existing"
  | "overwrite-existing"
  | "preview"
  | "approve-agent"
  | "approve-deploy"
  | "running"
  | "done";

const packageRoot = path.resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultWorkbenchRunsRoot = path.join(packageRoot, ".smithers", "runs");

function parseArgs(argv: string[]): CliArgs {
  const values = new Map<string, string | boolean>();
  const provided = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    provided.add(key);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, true);
    } else {
      values.set(key, next);
      i += 1;
    }
  }

  const app = stringValue(values, "app") ?? "";
  const openApiUrl = stringValue(values, "openapi-url");
  const source = values.has("existing")
    ? "existing"
    : openApiUrl
      ? "url"
      : "discover";

  return {
    help: Boolean(values.get("help") || values.get("h")),
    yes: Boolean(values.get("yes") || values.get("y")),
    overwrite: Boolean(values.get("overwrite")),
    activationToken: stringValue(values, "activation-token"),
    runsRoot: stringValue(values, "state-root") ?? defaultWorkbenchRunsRoot,
    intake: intakeSchema.parse({
      sdkRoot: stringValue(values, "sdk-root") ?? defaultSdkRoot(),
      app: app || "new-aomi-app",
      source,
      openApiUrl,
      shared: Boolean(values.get("shared")),
      includeAllOperations: Boolean(values.get("all")),
      force: Boolean(values.get("force")),
      build: !values.get("no-build"),
      primaryUserStory:
        stringValue(values, "user-story") ?? "Create and validate an Aomi app.",
      agent: (stringValue(values, "agent") as WorkbenchIntake["agent"]) ?? "codex",
      runSmoke: Boolean(values.get("smoke")),
      smokePrompt:
        stringValue(values, "smoke-prompt") ??
        "List the app capabilities in one paragraph.",
      deploy: Boolean(values.get("deploy")),
      dryRun: Boolean(values.get("dry-run")),
    }),
    provided,
  };
}

function stringValue(values: Map<string, string | boolean>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === "string" ? value : undefined;
}

type RollbackArgs = {
  help: boolean;
  yes: boolean;
  app: string;
  platform: string;
  deployment?: string;
  appSourceId?: number;
  backendUrl?: string;
  activationToken?: string;
};

function parseRollbackArgs(argv: string[]): RollbackArgs {
  const values = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, true);
    } else {
      values.set(key, next);
      i += 1;
    }
  }
  const source = stringValue(values, "source");
  return {
    help: Boolean(values.get("help") || values.get("h")),
    yes: Boolean(values.get("yes") || values.get("y")),
    app: stringValue(values, "app") ?? "",
    platform: stringValue(values, "platform") ?? "",
    deployment: stringValue(values, "deployment"),
    appSourceId: source && /^\d+$/.test(source) ? Number(source) : undefined,
    backendUrl: stringValue(values, "backend-url"),
    activationToken: stringValue(values, "activation-token"),
  };
}

function printHelp() {
  console.log(`Aomi Workbench

USAGE
  aomi-workbench --sdk-root ../aomi-sdk --app <name> [options]

OPTIONS
  --app <name>                App/platform name
  --sdk-root <path>           Aomi SDK checkout (default: ../aomi-sdk)
  --state-root <path>         Workbench run state root (default: packages/workbench/.smithers/runs)
  --openapi-url <url>         Fetch from a known OpenAPI URL
  --existing                  Use existing apps/<name>/openapi.yaml
  --shared                    Generate shared provider under ext/
  --all                       Expose every OpenAPI operation as a stub tool
  --force                     Overwrite generated files
  --no-build                  Skip aomi-build's cargo build step
  --user-story <text>         Primary workflow the app should support
  --agent codex|claude|none
  --smoke                     Run aomi-run --prompt after validation
  --smoke-prompt <text>       Prompt for local smoke
  --deploy                    Deploy after validation and token gate
  --activation-token <token>  Runtime deploy token; not persisted
  --dry-run                   Persist and preview the workflow without executing tools
  --overwrite                 Reset existing .smithers run state for the app
  --yes                       Accept workflow, agent, and deploy approvals

SUBCOMMANDS
  rollback                    Roll an app back to a previous deployment
    --app <name>              App to roll back (required)
    --platform <name>         Hosted platform name (required)
    --deployment <id>         Explicit deployment id (default: previous)
    --source <id>             App source id when the name exists for several sources
    --backend-url <url>       Backend base URL (or AOMI_BACKEND_URL)
    --activation-token <tok>  Activation token (or AOMI_APP_ACTIVATION_TOKEN)
    --yes                     Skip the confirm gate
`);
}

function WorkbenchApp({ args }: { args: CliArgs }) {
  const { exit } = useApp();
  const autoApprove = args.yes || args.intake.dryRun;
  const [phase, setPhase] = useState<GatePhase>(
    args.provided.has("app") || autoApprove ? "check-existing" : "intake-app",
  );
  const [intake, setIntake] = useState(args.intake);
  const [overwrite, setOverwrite] = useState(args.overwrite);
  const [agentApproved, setAgentApproved] = useState(autoApprove);
  const [deployApproved, setDeployApproved] = useState(args.intake.deploy ? args.yes : true);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [plan, setPlan] = useState<RunPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = plan;
  const existingLabel = useMemo(
    () => path.join(args.runsRoot, intake.app, "plan.json"),
    [args.runsRoot, intake.app],
  );

  useEffect(() => {
    if (phase !== "check-existing") {
      return;
    }
    let cancelled = false;
    loadRunPlan(intake.app, args.runsRoot)
      .then((existing) => {
        if (cancelled) {
          return;
        }
        if (existing && !overwrite && !autoApprove) {
          setPhase("resume-existing");
        } else {
          setPhase("preview");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setPhase("done");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [phase, intake.app, args.runsRoot, overwrite, autoApprove]);

  const startWorkflow = useCallback(() => {
    setPhase("running");
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }
    let cancelled = false;
    runWorkbenchWorkflow(intake, {
      overwrite,
      runsRoot: args.runsRoot,
      activationToken: args.activationToken,
      agentApproved,
      deployApproved,
      onEvent: (event) => {
        if (cancelled) {
          return;
        }
        setEvents((current) => [...current, event]);
        if ("plan" in event) {
          setPlan(event.plan);
        }
      },
    })
      .then(() => {
        if (!cancelled) {
          setPhase("done");
          setTimeout(exit, 10);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setPhase("done");
          setTimeout(exit, 10);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    phase,
    intake,
    overwrite,
    args.runsRoot,
    args.activationToken,
    agentApproved,
    deployApproved,
    exit,
  ]);

  useEffect(() => {
    if (phase === "preview" && autoApprove) {
      if (intake.agent !== "none") {
        setAgentApproved(true);
      }
      if (intake.deploy) {
        setDeployApproved(args.yes);
      }
      startWorkflow();
    }
  }, [phase, autoApprove, intake.agent, intake.deploy, args.yes, startWorkflow]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Aomi Workbench</Text>
      <Text color="gray">Smithers workflow: aomi-app-from-scratch</Text>
      <Text>State: {args.runsRoot}</Text>
      <Box marginTop={1} flexDirection="column">
        {phase === "intake-app" ? (
          <>
            <Text>App name</Text>
            <TextInput
              defaultValue={intake.app}
              onSubmit={(value) => {
                setIntake((current) => ({ ...current, app: value.trim() || current.app }));
                setPhase("check-existing");
              }}
            />
          </>
        ) : null}
        {phase === "resume-existing" ? (
          <>
            <Text>Existing workflow state found: {existingLabel}</Text>
            <Text>Resume existing run?</Text>
            <ConfirmInput
              defaultChoice="confirm"
              onConfirm={() => setPhase("preview")}
              onCancel={() => setPhase("overwrite-existing")}
            />
          </>
        ) : null}
        {phase === "overwrite-existing" ? (
          <>
            <Text color="yellow">Overwrite existing workflow state?</Text>
            <ConfirmInput
              defaultChoice="cancel"
              onConfirm={() => {
                setOverwrite(true);
                setPhase("preview");
              }}
              onCancel={() => {
                setError("Existing run state was left unchanged.");
                setPhase("done");
                setTimeout(exit, 10);
              }}
            />
          </>
        ) : null}
        {phase === "preview" ? (
          <Preview intake={intake} onAccept={() => {
            if (intake.agent !== "none" && !agentApproved) {
              setPhase("approve-agent");
            } else if (intake.deploy && !deployApproved) {
              setPhase("approve-deploy");
            } else {
              startWorkflow();
            }
          }} onCancel={() => {
            setError("Workflow was not approved.");
            setPhase("done");
            setTimeout(exit, 10);
          }} />
        ) : null}
        {phase === "approve-agent" ? (
          <>
            <Text>Approve {intake.agent} curation from SDK root?</Text>
            <Text color="gray">Edits are constrained to apps/{intake.app} and required ext/ files.</Text>
            <ConfirmInput
              defaultChoice="confirm"
              onConfirm={() => {
                setAgentApproved(true);
                if (intake.deploy && !deployApproved) {
                  setPhase("approve-deploy");
                } else {
                  startWorkflow();
                }
              }}
              onCancel={() => {
                setAgentApproved(false);
                startWorkflow();
              }}
            />
          </>
        ) : null}
        {phase === "approve-deploy" ? (
          <>
            <Text>Approve deploy after validation?</Text>
            <ConfirmInput
              defaultChoice="cancel"
              onConfirm={() => {
                setDeployApproved(true);
                startWorkflow();
              }}
              onCancel={() => {
                setDeployApproved(false);
                startWorkflow();
              }}
            />
          </>
        ) : null}
        {phase === "running" || phase === "done" ? (
          <Timeline plan={currentPlan} intake={intake} events={events} error={error} />
        ) : null}
      </Box>
    </Box>
  );
}

function Preview({
  intake,
  onAccept,
  onCancel,
}: {
  intake: WorkbenchIntake;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <Text bold>Workflow Preview</Text>
      <Text>SDK: {intake.sdkRoot}</Text>
      <Text>App: {intake.app}</Text>
      <Text>Source: {intake.source}{intake.openApiUrl ? ` (${intake.openApiUrl})` : ""}</Text>
      <Text>Mode: {intake.shared ? "shared provider" : "app-local"}</Text>
      <Text>Story: {intake.primaryUserStory}</Text>
      <Text>Agent: {intake.agent}</Text>
      <Text>Smoke: {intake.runSmoke ? "enabled" : "disabled"}</Text>
      <Text>Deploy: {intake.deploy ? "requested" : "disabled"}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Run this workflow?</Text>
        <ConfirmInput defaultChoice="confirm" onConfirm={onAccept} onCancel={onCancel} />
      </Box>
    </>
  );
}

function Timeline({
  plan,
  intake,
  events,
  error,
}: {
  plan: RunPlan | null;
  intake: WorkbenchIntake;
  events: WorkflowEvent[];
  error: string | null;
}) {
  return (
    <>
      <Text>SDK: {intake.sdkRoot}</Text>
      <Text>App: {intake.app}</Text>
      <Text>Agent: {intake.agent} {intake.dryRun ? "(dry-run)" : ""}</Text>
      <Box marginTop={1} flexDirection="column">
        {plan?.steps.map((step) => (
          <Text key={step.id}>
            {symbol(step.status)} {step.label}
            {step.detail ? ` - ${step.detail}` : ""}
          </Text>
        ))}
      </Box>
      {events
        .filter((event) => event.type === "warning" || event.type === "blocked")
        .map((event, index) => (
          <Text key={index} color={event.type === "warning" ? "yellow" : "red"}>
            {event.message}
          </Text>
        ))}
      {error ? <Text color="red">Failed: {error}</Text> : null}
    </>
  );
}

function symbol(status: string): string {
  if (status === "complete") {
    return "✓";
  }
  if (status === "running") {
    return "...";
  }
  if (status === "failed") {
    return "x";
  }
  if (status === "skipped") {
    return "-";
  }
  return ".";
}

type RollbackPhase =
  | { name: "loading" }
  | { name: "select"; plan: RollbackPlanSummary }
  | { name: "confirm"; plan: RollbackPlanSummary; deploymentId: string }
  | { name: "running"; deploymentId: string }
  | { name: "done"; status: string; releaseTags: string[] }
  | { name: "error"; message: string };

function RollbackApp({ args }: { args: RollbackArgs }) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<RollbackPhase>({ name: "loading" });

  useEffect(() => {
    void (async () => {
      try {
        const client = await rollbackClientFromEnv(args);
        const plan = planRollback(
          await client.listActivations({
            platform: args.platform,
            app: args.app,
            appSourceId: args.appSourceId,
          }),
        );
        if (args.deployment) {
          setPhase({ name: "confirm", plan, deploymentId: args.deployment });
        } else if (!plan.previous) {
          setPhase({
            name: "error",
            message:
              "No rollback target: only one release has ever been activated.",
          });
        } else {
          setPhase({ name: "select", plan });
        }
      } catch (error) {
        setPhase({
          name: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase.name === "error") {
      process.exitCode = 1;
      exit();
    }
    if (phase.name === "done") {
      exit();
    }
  }, [phase, exit]);

  const run = useCallback(
    (deploymentId: string) => {
      setPhase({ name: "running", deploymentId });
      void (async () => {
        try {
          const client = await rollbackClientFromEnv(args);
          const result = await executeRollback(client, {
            platform: args.platform,
            app: args.app,
            deploymentId,
          });
          if (result.ok) {
            setPhase({
              name: "done",
              status: result.status,
              releaseTags: result.releaseTags,
            });
          } else {
            setPhase({ name: "error", message: `rollback ${result.status}` });
          }
        } catch (error) {
          setPhase({ name: "error", message: rollbackErrorMessage(error) });
        }
      })();
    },
    [args],
  );

  if (phase.name === "loading") {
    return <Text>Loading activation timeline for {args.app}…</Text>;
  }
  if (phase.name === "error") {
    return <Text color="red">Failed: {phase.message}</Text>;
  }
  if (phase.name === "running") {
    return <Text>Rolling back to {phase.deploymentId}…</Text>;
  }
  if (phase.name === "done") {
    return (
      <Text color="green">
        Rollback {phase.status}: {phase.releaseTags.join(", ")}
      </Text>
    );
  }
  if (phase.name === "confirm") {
    return (
      <Box flexDirection="column" gap={0}>
        <Text>
          Roll back {args.app} to {phase.deploymentId}?
        </Text>
        <ConfirmInput
          onConfirm={() => run(phase.deploymentId)}
          onCancel={() => exit()}
        />
      </Box>
    );
  }
  const selectable = phase.plan.activations.filter((row) => !row.current);
  return (
    <Box flexDirection="column" gap={0}>
      {phase.plan.current ? (
        <Text>
          Current: {phase.plan.current.deploymentId} (
          {phase.plan.current.releaseTag})
        </Text>
      ) : null}
      <Text>Pick a rollback target for {args.app}:</Text>
      {/* No defaultValue: @inkjs/ui Select only fires onChange when the value
          changes, so a preselected value could never be confirmed. The
          previous release is the top option (timeline is newest-first). */}
      <Select
        options={selectable.map((row) => ({
          label: `${row.action} · ${row.deploymentId} · ${row.releaseTag}`,
          value: row.deploymentId,
        }))}
        onChange={(deploymentId) =>
          setPhase({ name: "confirm", plan: phase.plan, deploymentId })
        }
      />
    </Box>
  );
}

async function runRollbackHeadless(args: RollbackArgs): Promise<void> {
  const client = await rollbackClientFromEnv(args).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return null;
  });
  if (!client) {
    return;
  }
  const plan = planRollback(
    await client.listActivations({
      platform: args.platform,
      app: args.app,
      appSourceId: args.appSourceId,
    }),
  );
  const deploymentId = args.deployment ?? plan.previous?.deploymentId;
  if (!deploymentId) {
    console.error(
      "No rollback target: only one release has ever been activated.",
    );
    process.exitCode = 1;
    return;
  }
  try {
    const result = await executeRollback(client, {
      platform: args.platform,
      app: args.app,
      deploymentId,
    });
    console.log(
      `rollback ${result.status}: ${args.app} -> ${deploymentId} (${result.releaseTags.join(", ")})`,
    );
    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`rollback failed: ${rollbackErrorMessage(error)}`);
    process.exitCode = 1;
  }
}

/** Prefer the backend's structured error message over a raw stack trace. */
function rollbackErrorMessage(error: unknown): string {
  const body = (error as { body?: string })?.body;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { error?: string };
      if (parsed.error) {
        return parsed.error;
      }
    } catch {
      // fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : String(error);
}

const [subcommand, ...restArgv] = process.argv.slice(2);
if (subcommand === "rollback") {
  const rollbackArgs = parseRollbackArgs(restArgv);
  if (rollbackArgs.help) {
    printHelp();
  } else if (!rollbackArgs.app || !rollbackArgs.platform) {
    console.error("rollback requires --app and --platform");
    process.exitCode = 1;
  } else if (rollbackArgs.yes) {
    await runRollbackHeadless(rollbackArgs);
  } else if (!process.stdin.isTTY) {
    // Rollback is destructive (re-activates an older release). Unlike the
    // build workflow, there is no safe partial outcome, so a non-interactive
    // invocation must opt in explicitly rather than auto-executing.
    console.error(
      "rollback needs a TTY for the confirm prompt; pass --yes to roll back non-interactively",
    );
    process.exitCode = 1;
  } else {
    render(<RollbackApp args={rollbackArgs} />);
  }
} else {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
  } else if (args.yes || !process.stdin.isTTY) {
    await runHeadless(args);
  } else {
    render(<WorkbenchApp args={args} />);
  }
}

async function runHeadless(args: CliArgs): Promise<void> {
  const events: WorkflowEvent[] = [];
  const agentApproved = args.yes || args.intake.dryRun || args.intake.agent === "none";
  const deployApproved = args.intake.deploy ? args.yes : true;
  const plan = await runWorkbenchWorkflow(args.intake, {
    overwrite: args.overwrite,
    runsRoot: args.runsRoot,
    activationToken: args.activationToken,
    agentApproved,
    deployApproved,
    onEvent: (event) => {
      events.push(event);
      if (event.type === "warning" || event.type === "blocked") {
        console.error(event.message);
      }
    },
  });
  const failed = plan.steps.find((step) => step.status === "failed");
  const blocked = events.some((event) => event.type === "blocked");
  console.log(
    `${plan.workflow} ${failed ? "failed" : blocked ? "blocked" : "complete"}: ${plan.app}`,
  );
  for (const step of plan.steps) {
    console.log(`${symbol(step.status)} ${step.label}${step.detail ? ` - ${step.detail}` : ""}`);
  }
  if (failed || blocked) {
    process.exitCode = failed ? 1 : 2;
  }
}
