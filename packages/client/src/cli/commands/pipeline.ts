import { CliSession } from "../cli-session";
import { createControlClient } from "../context";
import { printJson, printPaymentEvent } from "../output";
import type { CliConfig } from "../types";

export async function pipelineAppsCommand(
  config: CliConfig,
  options: { query?: string; limit?: number },
): Promise<void> {
  const pipeline = createControlClient(config).pipeline;
  printJson(
    options.query
      ? await pipeline.searchApps({ q: options.query, limit: options.limit })
      : await pipeline.listApps({ limit: options.limit }),
  );
}

export async function pipelineAppCommand(
  config: CliConfig,
  app: string,
): Promise<void> {
  printJson(await createControlClient(config).pipeline.getApp(app));
}

export async function pipelineToolsCommand(
  config: CliConfig,
  options: {
    query?: string;
    app?: string;
    namespace?: string;
    limit?: number;
  },
): Promise<void> {
  const pipeline = createControlClient(config).pipeline;
  printJson(
    options.query
      ? await pipeline.searchTools({
          q: options.query,
          app: options.app,
          limit: options.limit,
        })
      : await pipeline.listTools({
          app: options.app,
          namespace: options.namespace,
          limit: options.limit,
        }),
  );
}

export async function pipelineToolCommand(
  config: CliConfig,
  toolId: string,
  app?: string,
): Promise<void> {
  printJson(
    await createControlClient(config).pipeline.getTool(toolId, { app }),
  );
}

export async function pipelineSkillsCommand(
  config: CliConfig,
  limit?: number,
): Promise<void> {
  printJson(await createControlClient(config).pipeline.listSkills({ limit }));
}

export async function pipelineSkillCommand(
  config: CliConfig,
  skillId: string,
): Promise<void> {
  printJson(await createControlClient(config).pipeline.getSkill(skillId));
}

export async function pipelineCallCommand(
  config: CliConfig,
  options: {
    toolId: string;
    sessionId?: string;
    arguments?: string;
    app?: string;
    applicationId?: string;
    platform?: string;
    skills?: string[];
    idempotencyKey: string;
  },
): Promise<void> {
  const result = await createControlClient(config, {
    payment: true,
    onPayment: printPaymentEvent,
  }).pipeline.callTool(
    {
      sessionId: pipelineSessionId(options.sessionId),
      toolId: options.toolId,
      arguments: parseArguments(options.arguments),
      app: options.app?.trim() || "default",
      applicationId: pipelineApplicationId(options.applicationId),
      platform: options.platform?.trim() || undefined,
      skills: options.skills ?? [],
    },
    { idempotencyKey: options.idempotencyKey },
  );
  printJson(result);
}

export async function pipelineRunCommand(
  config: CliConfig,
  options: {
    sessionId?: string;
    program: string;
    app?: string;
    applicationId?: string;
    platform?: string;
    skills?: string[];
    idempotencyKey: string;
  },
): Promise<void> {
  const result = await createControlClient(config, {
    payment: true,
    onPayment: printPaymentEvent,
  }).pipeline.run(
    {
      sessionId: pipelineSessionId(options.sessionId),
      program: options.program,
      app: options.app?.trim() || "default",
      applicationId: pipelineApplicationId(options.applicationId),
      platform: options.platform?.trim() || undefined,
      skills: options.skills ?? [],
    },
    { idempotencyKey: options.idempotencyKey },
  );
  printJson(result);
}

function pipelineSessionId(explicit?: string): string {
  return (
    explicit?.trim() || CliSession.load()?.sessionId || crypto.randomUUID()
  );
}

export function parsePipelineArguments(
  input?: string,
): Record<string, unknown> {
  if (!input?.trim()) return {};
  const value = JSON.parse(input) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("--arguments must be a JSON object");
  }
  return value as Record<string, unknown>;
}

const parseArguments = parsePipelineArguments;

function pipelineApplicationId(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError("--application-id must be a positive integer");
  }
  return parsed;
}
