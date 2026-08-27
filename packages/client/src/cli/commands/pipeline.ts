import { CliSession } from "../cli-session";
import { createControlClient } from "../context";
import { printJson, printPaymentEvent } from "../output";
import type { CliConfig } from "../types";

export async function pipelineAppsCommand(
  config: CliConfig,
  options: { query?: string; limit?: number },
): Promise<void> {
  const directory = await createControlClient(config).pipeline.apps.list();
  printJson(filterEntries(directory, options));
}

export async function pipelineAppCommand(
  config: CliConfig,
  app: string,
): Promise<void> {
  printJson(await createControlClient(config).pipeline.app(app).directory());
}

export async function pipelineToolsCommand(
  config: CliConfig,
  options: { query?: string; app?: string; namespace?: string; limit?: number },
): Promise<void> {
  const app = options.app?.trim() || CliSession.load()?.app || config.app || "default";
  const directory = await createControlClient(config).pipeline.app(app).operations();
  printJson(filterEntries(directory, options));
}

export async function pipelineToolCommand(
  config: CliConfig,
  operation: string,
  app?: string,
): Promise<void> {
  const owner = app?.trim() || CliSession.load()?.app || config.app || "default";
  printJson(await createControlClient(config).pipeline.app(owner).operation(operation));
}

export async function pipelineSkillsCommand(
  config: CliConfig,
  limit?: number,
): Promise<void> {
  const directory = await createControlClient(config).pipeline.skills.list();
  printJson(filterEntries(directory, { limit }));
}

export async function pipelineSkillCommand(
  config: CliConfig,
  skill: string,
): Promise<void> {
  printJson(await createControlClient(config).pipeline.skill(skill).directory());
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
  const app = options.app?.trim() || CliSession.load()?.app || config.app || "default";
  const client = createControlClient(config, {
    payment: true,
    onPayment: printPaymentEvent,
  });
  printJson(
    await client.pipeline.app(app).invoke(
      options.toolId,
      {
        ...parsePipelineArguments(options.arguments),
        sessionId: pipelineSessionId(options.sessionId),
        ...(pipelineApplicationId(options.applicationId)
          ? { applicationId: pipelineApplicationId(options.applicationId) }
          : {}),
        ...(options.platform ? { platform: options.platform } : {}),
        ...(options.skills?.length ? { skills: options.skills } : {}),
      },
      { idempotencyKey: options.idempotencyKey },
    ),
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

function filterEntries(
  directory: { entries: Array<{ name: string }> },
  options: { query?: string; namespace?: string; limit?: number },
) {
  const query = options.query?.trim().toLowerCase();
  const namespace = options.namespace?.trim().toLowerCase();
  const entries = directory.entries.filter((entry) => {
    const name = entry.name.toLowerCase();
    return (!query || name.includes(query)) && (!namespace || name.startsWith(`${namespace}.`));
  });
  return { ...directory, entries: entries.slice(0, options.limit) };
}

function pipelineSessionId(explicit?: string): string {
  return explicit?.trim() || CliSession.load()?.sessionId || crypto.randomUUID();
}

function pipelineApplicationId(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError("--application-id must be a positive integer");
  }
  return parsed;
}
