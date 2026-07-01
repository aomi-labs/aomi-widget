import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const accountLoginDef = defineCommand({
  meta: {
    name: "login",
    description: "Sign in with the configured EVM wallet",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { accountLoginCommand } = await import("../account");
    await accountLoginCommand(buildCliConfig(args));
  },
});

const accountWhoamiDef = defineCommand({
  meta: {
    name: "whoami",
    description: "Show the authenticated backend account",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { accountWhoamiCommand } = await import("../account");
    await accountWhoamiCommand(buildCliConfig(args));
  },
});

export const accountDef = defineCommand({
  meta: { name: "account", description: "Account authentication" },
  subCommands: {
    login: accountLoginDef,
    whoami: accountWhoamiDef,
  },
});
