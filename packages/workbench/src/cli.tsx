import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmInput, TextInput } from "@inkjs/ui";
import { Box, Text, render, useApp } from "ink";
import { defaultSdkRoot } from "./binaries";
import { loadRunPlan } from "./state";
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

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
} else if (args.yes || !process.stdin.isTTY) {
  await runHeadless(args);
} else {
  render(<WorkbenchApp args={args} />);
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
