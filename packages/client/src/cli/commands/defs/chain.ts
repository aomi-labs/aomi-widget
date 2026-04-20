import { defineCommand } from "citty";

const chainListDef = defineCommand({
  meta: { name: "list", description: "List supported chains" },
  args: {},
  async run() {
    const { chainsCommand } = await import("../control");
    chainsCommand();
  },
});

const chainSetDef = defineCommand({
  meta: { name: "set", description: "Persist the active chain ID" },
  args: {
    id: {
      type: "positional",
      description: "Chain ID",
      required: true,
    },
  },
  async run({ args }) {
    const { setChainCommand } = await import("../preferences");
    setChainCommand(args.id);
  },
});

const chainCurrentDef = defineCommand({
  meta: { name: "current", description: "Show the active chain ID" },
  args: {},
  async run() {
    const { currentChainCommand } = await import("../control");
    currentChainCommand();
  },
});

export const chainDef = defineCommand({
  meta: { name: "chain", description: "Chain information" },
  subCommands: {
    list: chainListDef,
    set: chainSetDef,
    current: chainCurrentDef,
  },
});
