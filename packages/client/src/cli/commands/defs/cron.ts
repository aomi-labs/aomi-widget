import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const cronListDef = defineCommand({
  meta: { name: "ls", description: "List scheduled threads" },
  args: {
    ...globalArgs,
    app: {
      type: "string",
      description: "Filter by app",
    },
    limit: {
      type: "string",
      description: "Maximum rows to return",
    },
    offset: {
      type: "string",
      description: "Rows to skip",
    },
  },
  async run({ args }) {
    const { cronListCommand } = await import("../cron");
    await cronListCommand(buildCliConfig(args), {
      app: typeof args.app === "string" ? args.app : undefined,
      limit: typeof args.limit === "string" ? args.limit : undefined,
      offset: typeof args.offset === "string" ? args.offset : undefined,
    });
  },
});

const cronShowDef = defineCommand({
  meta: { name: "show", description: "Show a scheduled thread" },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Cron job id",
      required: true,
    },
  },
  async run({ args }) {
    const { cronShowCommand } = await import("../cron");
    await cronShowCommand(buildCliConfig(args), args.id);
  },
});

const cronCancelDef = defineCommand({
  meta: { name: "cancel", description: "Cancel a scheduled thread" },
  args: {
    ...globalArgs,
    id: {
      type: "positional",
      description: "Cron job id",
      required: true,
    },
  },
  async run({ args }) {
    const { cronCancelCommand } = await import("../cron");
    await cronCancelCommand(buildCliConfig(args), args.id);
  },
});

export const cronDef = defineCommand({
  meta: { name: "cron", description: "Scheduled thread management" },
  subCommands: {
    ls: cronListDef,
    show: cronShowDef,
    cancel: cronCancelDef,
  },
});
