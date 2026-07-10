import { CliSession } from "../cli-session";
import { fatal } from "../errors";
import { printDataFileLocation } from "../output";
import type { CliConfig } from "../types";

type CronListOptions = {
  app?: string;
  limit?: string;
  offset?: string;
};

function requireActiveCli(config: CliConfig): CliSession {
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active thread. Run `aomi thread new` first.");
  }
  cli!.mergeConfig(config);
  return cli!;
}

function parseOptionalInteger(
  name: string,
  value: string | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    fatal(`--${name} must be a non-negative integer.`);
  }
  return parsed;
}

function formatTimestamp(value: number): string {
  return new Date(value * 1000).toISOString();
}

export async function cronListCommand(
  config: CliConfig,
  options: CronListOptions = {},
): Promise<void> {
  const cli = requireActiveCli(config);
  const session = cli.createClientSession(config);
  try {
    const result = await session.client.listScheduledThreads(cli.sessionId, {
      app: options.app,
      limit: parseOptionalInteger("limit", options.limit),
      offset: parseOptionalInteger("offset", options.offset),
    });
    if (result.scheduled_threads.length === 0) {
      console.log("No scheduled threads.");
      printDataFileLocation();
      return;
    }
    for (const job of result.scheduled_threads) {
      const recurrence =
        job.recurrence_seconds === null || job.recurrence_seconds === undefined
          ? "one-shot"
          : `every ${job.recurrence_seconds}s`;
      console.log(
        `${job.id}  ${formatTimestamp(job.trigger_at)}  ${recurrence}  ${job.application || "(default)"}`,
      );
      console.log(`  root: ${job.root_thread_id || "(none)"}`);
      console.log(`  intent: ${job.intent}`);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export async function cronShowCommand(
  config: CliConfig,
  id: string,
): Promise<void> {
  const cli = requireActiveCli(config);
  const session = cli.createClientSession(config);
  try {
    const job = await session.client.getScheduledThread(cli.sessionId, id);
    console.log(JSON.stringify(job, null, 2));
  } finally {
    session.close();
  }
}

export async function cronCancelCommand(
  config: CliConfig,
  id: string,
): Promise<void> {
  const cli = requireActiveCli(config);
  const session = cli.createClientSession(config);
  try {
    const result = await session.client.deleteScheduledThread(
      cli.sessionId,
      id,
    );
    console.log(
      result.deleted ? `Cancelled ${id}` : `No scheduled thread ${id}`,
    );
    printDataFileLocation();
  } finally {
    session.close();
  }
}
