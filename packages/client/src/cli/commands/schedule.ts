import type { AomiScheduledThread } from "../../types";
import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

function effectiveApp(config: CliConfig, cli: CliSession): string {
  return config.app ?? cli.app ?? "default";
}

function formatTimestamp(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  return new Date(seconds * 1000).toISOString();
}

function printIntent(intent: AomiScheduledThread): void {
  console.log(
    `${intent.id} | ${intent.application} | ${formatTimestamp(intent.trigger_at)}`,
  );
  console.log(`  authorized: ${intent.requires_authorization ? "yes" : "no"}`);
  if (intent.recurrence_seconds) {
    console.log(`  recurrence: ${intent.recurrence_seconds}s`);
  }
  if (intent.last_attempted_at) {
    console.log(
      `  last attempted: ${formatTimestamp(intent.last_attempted_at)}`,
    );
  }
  console.log(`  intent: ${intent.intent}`);
}

export async function listSchedulesCommand(
  config: CliConfig,
  options?: { limit?: number; offset?: number },
): Promise<void> {
  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const app = effectiveApp(config, cli);
  const session = cli.createClientSession(config);
  try {
    const response = await session.client.listScheduledThreads(cli.sessionId, {
      app,
      limit: options?.limit,
      offset: options?.offset,
    });
    console.log(
      `Scheduled intents for app "${app}": ${response.scheduled_threads.length}`,
    );
    for (const intent of response.scheduled_threads) {
      printIntent(intent);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export async function showScheduleCommand(
  config: CliConfig,
  id: string,
): Promise<void> {
  const scheduleId = id.trim();
  if (!scheduleId) fatal("Usage: aomi schedule show <id>");

  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    const intent = await session.client.getScheduledThread(
      cli.sessionId,
      scheduleId,
    );
    printIntent(intent);
    console.log(`  root thread: ${intent.root_thread_id}`);
    console.log(`  created: ${formatTimestamp(intent.created_at)}`);
    console.log(`  updated: ${formatTimestamp(intent.updated_at)}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export async function cancelScheduleCommand(
  config: CliConfig,
  id: string,
): Promise<void> {
  const scheduleId = id.trim();
  if (!scheduleId) fatal("Usage: aomi schedule cancel <id>");

  const cli = CliSession.loadOrCreate(config);
  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    const response = await session.client.cancelScheduledThread(
      cli.sessionId,
      scheduleId,
    );
    console.log(
      response.deleted
        ? `Canceled ${scheduleId}.`
        : `${scheduleId} was not found.`,
    );
    printDataFileLocation();
  } finally {
    session.close();
  }
}
