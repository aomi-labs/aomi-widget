import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const accountWhoamiDef = defineCommand({
  meta: {
    name: "whoami",
    description: "Show the account this session is bound to on the backend",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { whoamiCommand } = await import("../account");
    await whoamiCommand(buildCliConfig(args));
  },
});

export const accountDef = defineCommand({
  meta: { name: "account", description: "Account identity" },
  subCommands: {
    whoami: accountWhoamiDef,
  },
});
