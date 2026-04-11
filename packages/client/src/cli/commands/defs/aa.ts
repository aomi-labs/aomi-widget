import { defineCommand } from "citty";

const aaStatusDef = defineCommand({
  meta: { name: "status", description: "Show AA config and chain support" },
  args: {},
  async run() {
    const { aaStatusCommand } = await import("../aa");
    await aaStatusCommand();
  },
});

const aaSetDef = defineCommand({
  meta: { name: "set", description: "Set an AA configuration value" },
  args: {
    key: {
      type: "positional",
      description: "Config key: provider | mode | key | alchemy-key | pimlico-key | policy | fallback",
      required: true,
    },
    value: {
      type: "positional",
      description: "Config value",
      required: true,
    },
  },
  async run({ args }) {
    const { aaSetCommand } = await import("../aa");
    await aaSetCommand(args.key, args.value);
  },
});

const aaTestDef = defineCommand({
  meta: { name: "test", description: "Validate AA setup" },
  args: {
    chain: {
      type: "string",
      description: "Chain ID to test against",
    },
  },
  async run({ args }) {
    const { aaTestCommand } = await import("../aa");
    await aaTestCommand(args.chain ? parseInt(args.chain, 10) : undefined);
  },
});

const aaResetDef = defineCommand({
  meta: { name: "reset", description: "Clear all persisted AA config" },
  args: {},
  async run() {
    const { aaResetCommand } = await import("../aa");
    await aaResetCommand();
  },
});

export const aaDef = defineCommand({
  meta: { name: "aa", description: "Account abstraction configuration" },
  subCommands: {
    status: aaStatusDef,
    set: aaSetDef,
    test: aaTestDef,
    reset: aaResetDef,
  },
});
