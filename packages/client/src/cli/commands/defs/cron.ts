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
    // `list` kept so the deprecated `aomi schedule list` spelling still works.
    alias: ["list"],
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

const cronSubCommands = {
  ls: cronLsDef,
  show: cronShowDef,
  cancel: cronCancelDef,
};

export const cronDef = defineCommand({
  meta: {
    name: "cron",
    description: "Cron jobs — timers that spawn threads",
  },
  subCommands: cronSubCommands,
});

/** Deprecated alias — same subcommands as `aomi cron`, kept one release. */
export const scheduleDef = defineCommand({
  meta: {
    name: "schedule",
    description: "(deprecated) use `aomi cron`",
  },
  run({ rawArgs }) {
    // citty 0.2.2 runs the parent `run` after a matched subcommand (see
    // root.ts), so this fires on every `aomi schedule …`.
    console.error("`aomi schedule` is deprecated — use `aomi cron`.");
    if (!rawArgs.some((arg) => !arg.startsWith("-"))) {
      console.error("Run `aomi cron --help` for usage.");
    }
  },
  subCommands: cronSubCommands,
});
