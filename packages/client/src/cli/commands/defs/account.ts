import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const accountLoginDef = defineCommand({
  meta: {
    name: "login",
    description: "Sign in to an Aomi account",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: 'Browser auth provider ("privy" or "para")',
    },
    wallet: {
      type: "boolean",
      description: "Use native CLI SIWE with the configured EVM wallet",
    },
    "no-browser": {
      type: "boolean",
      description: "Do not open provider auth; use native CLI SIWE",
    },
  },
  async run({ args }) {
    const { accountLoginCommand } = await import("../account");
    await accountLoginCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
      wallet: args.wallet === true,
      noBrowser: args["no-browser"] === true,
    });
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
