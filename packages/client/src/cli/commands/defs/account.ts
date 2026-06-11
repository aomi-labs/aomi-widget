import { defineCommand } from "citty";
import { globalArgs, buildCliConfig } from "./shared";

const accountLoginDef = defineCommand({
  meta: {
    name: "login",
    description:
      "Alias for `aomi wallet login`. Defaults to EVM; pass --solana to require a Solana wallet.",
  },
  args: {
    ...globalArgs,
    evm: {
      type: "boolean",
      description: "Request the default EVM embedded-wallet flow explicitly",
    },
    solana: {
      type: "boolean",
      description: "Request a Solana embedded-wallet login flow",
    },
  },
  async run({ args }) {
    if (args.evm === true && args.solana === true) {
      const { fatal } = await import("../../errors");
      fatal("Choose only one of `--evm` or `--solana`.");
    }
    const { loginCommand } = await import("../account");
    await loginCommand(buildCliConfig(args), {
      walletFamily: args.solana === true ? "solana" : "evm",
    });
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
