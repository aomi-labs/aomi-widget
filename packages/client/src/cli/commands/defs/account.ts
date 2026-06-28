import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const accountLoginDef = defineCommand({
  meta: {
    name: "login",
    description: "Alias for `aomi wallet login` (SIWE with your wallet key).",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { walletLoginCommand } = await import("../account");
    await walletLoginCommand(buildCliConfig(args));
  },
});

const accountWhoamiDef = defineCommand({
  meta: {
    name: "whoami",
    description: "Alias for `aomi wallet whoami`",
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
    login: accountLoginDef,
    whoami: accountWhoamiDef,
  },
});
