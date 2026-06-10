import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const accountLoginDef = defineCommand({
  meta: {
    name: "login",
    description: "Mint a Privy browser auth URL for the active session",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { loginCommand } = await import("../account");
    await loginCommand(buildCliConfig(args));
  },
});

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
    login: accountLoginDef,
    whoami: accountWhoamiDef,
  },
});
