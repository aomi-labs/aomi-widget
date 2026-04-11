import { defineCommand } from "citty";

const chainListDef = defineCommand({
  meta: { name: "list", description: "List supported chains" },
  args: {},
  async run() {
    const { chainsCommand } = await import("../control");
    chainsCommand();
  },
});

export const chainDef = defineCommand({
  meta: { name: "chain", description: "Chain information" },
  subCommands: {
    list: chainListDef,
  },
});
