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

const scheduleListDef = defineCommand({
  meta: {
    name: "list",
    description: "List scheduled intents for the current account/app",
  },
  args: {
    ...globalArgs,
    limit: {
      type: "string",
      description: "Maximum number of scheduled intents to return",
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

const scheduleShowDef = defineCommand({
  meta: {
    name: "show",
    description: "Show one scheduled intent",
  },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Scheduled intent id",
      required: true,
    },
  },
  async run({ args }) {
    const { showScheduleCommand } = await import("../schedule");
    await showScheduleCommand(buildCliConfig(args), String(args.id ?? ""));
  },
});

const scheduleCancelDef = defineCommand({
  meta: {
    name: "cancel",
    description: "Cancel one scheduled intent",
  },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Scheduled intent id",
      required: true,
    },
  },
  async run({ args }) {
    const { cancelScheduleCommand } = await import("../schedule");
    await cancelScheduleCommand(buildCliConfig(args), String(args.id ?? ""));
  },
});

export const scheduleDef = defineCommand({
  meta: {
    name: "schedule",
    description: "Inspect and manage scheduled intents",
  },
  subCommands: {
    list: scheduleListDef,
    show: scheduleShowDef,
    cancel: scheduleCancelDef,
  },
});
