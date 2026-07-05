import { z } from "zod";
import { WORKFLOW_NAME, intakeSchema } from "./types";

export const smithersSchemas = {
  input: intakeSchema,
  intake: z.object({
    app: z.string(),
    sdkRoot: z.string(),
    persistedPlanPath: z.string(),
  }),
  command: z.object({
    command: z.string(),
    exitCode: z.number(),
    stdout: z.string(),
    stderr: z.string(),
  }),
  result: z.object({
    app: z.string(),
    status: z.enum(["complete", "blocked", "failed"]),
    summary: z.string(),
  }),
};

export type SmithersInitResult = {
  workflowName: typeof WORKFLOW_NAME;
  statePath: string;
  runtime: "initialized" | "unavailable";
  warning?: string;
};

export type SmithersFactory = (statePath: string) => Promise<unknown>;

export async function createAomiSmithersApi(statePath: string): Promise<unknown> {
  const { createSmithers } = await import("smithers-orchestrator");
  return createSmithers(smithersSchemas, {
    readableName: "Aomi App From Scratch",
    description:
      "Build an Aomi app with deterministic Rust tooling and agent-assisted Smithers steps.",
    dbPath: statePath,
  });
}

export async function initializeAomiSmithersRun(
  statePath: string,
  factory: SmithersFactory = createAomiSmithersApi,
): Promise<SmithersInitResult> {
  try {
    await factory(statePath);
    return {
      workflowName: WORKFLOW_NAME,
      statePath,
      runtime: "initialized",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      workflowName: WORKFLOW_NAME,
      statePath,
      runtime: "unavailable",
      warning:
        message.includes("bun:") || message.includes("Bun")
          ? "Smithers runtime requires Bun; using persisted workbench plan state until run under Bun."
          : `Smithers runtime unavailable: ${message}`,
    };
  }
}

export const smithersWorkflowDescriptor = {
  name: WORKFLOW_NAME,
  description:
    "Collect intake, build fresh SDK binaries, run aomi-build, optionally invoke Codex/Claude, validate, smoke, and deploy with approval.",
};
