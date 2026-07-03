import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

function parseOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, got "${String(value)}"`);
  }
  return parsed;
}

const cronLsDef = defineCommand({
  meta: {
    name: "ls",
    description: "List cron jobs for the current account/app (~ crontab -l)",
  },
  args: {
    ...globalArgs,
    limit: {
      type: "string",
      description: "Maximum number of cron jobs to return",
    },
    offset: {
      type: "string",
      description: "Pagination offset",
    },
  },
  async run({ args }) {
    const { listSchedulesCommand } = await import("../schedule");
    await listSchedulesCommand(buildCliConfig(args), {
      limit: parseOptionalInt(args.limit),
      offset: parseOptionalInt(args.offset),
    });
  },
});

const cronShowDef = defineCommand({
  meta: {
    name: "show",
    description: "Show one cron job",
  },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Cron job id",
      required: true,
    },
  },
  async run({ args }) {
    const { showScheduleCommand } = await import("../schedule");
    await showScheduleCommand(buildCliConfig(args), String(args.id ?? ""));
  },
});

const cronCancelDef = defineCommand({
  meta: {
    name: "cancel",
    description: "Cancel one cron job",
  },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Cron job id",
      required: true,
    },
  },
  async run({ args }) {
    const { cancelScheduleCommand } = await import("../schedule");
    await cancelScheduleCommand(buildCliConfig(args), String(args.id ?? ""));
  },
});

export const cronDef = defineCommand({
  meta: {
    name: "cron",
    description: "Cron jobs — timers that spawn threads",
  },
  subCommands: {
    ls: cronLsDef,
    show: cronShowDef,
    cancel: cronCancelDef,
  },
});
