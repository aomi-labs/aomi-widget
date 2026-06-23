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

const accountAuthListDef = defineCommand({
  meta: {
    name: "list",
    description: "List backend-authorized wallets for the current account/app",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: 'Authorization provider (default: "privy")',
    },
  },
  async run({ args }) {
    const { listAuthorizationsCommand } = await import("../authorizations");
    await listAuthorizationsCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
    });
  },
});

const accountAuthCurrentDef = defineCommand({
  meta: {
    name: "current",
    description: "Show the locally selected authorized wallet for this app",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { currentAuthorizationCommand } = await import("../authorizations");
    await currentAuthorizationCommand(buildCliConfig(args));
  },
});

const accountAuthUseDef = defineCommand({
  meta: {
    name: "use",
    description: "Select an authorized wallet ref for future chat turns",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: 'Authorization provider used for validation (default: "privy")',
    },
    wallet: {
      type: "positional",
      description: "Wallet ref from `aomi account auth list`",
      required: true,
    },
  },
  async run({ args }) {
    const { useAuthorizationCommand } = await import("../authorizations");
    await useAuthorizationCommand(buildCliConfig(args), String(args.wallet ?? ""), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
    });
  },
});

const accountAuthClearDef = defineCommand({
  meta: {
    name: "clear",
    description: "Clear the locally selected authorized wallet for this app",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { clearAuthorizationCommand } = await import("../authorizations");
    await clearAuthorizationCommand(buildCliConfig(args));
  },
});

const accountAuthDef = defineCommand({
  meta: {
    name: "auth",
    description: "Authorized wallet selection",
  },
  subCommands: {
    list: accountAuthListDef,
    current: accountAuthCurrentDef,
    use: accountAuthUseDef,
    clear: accountAuthClearDef,
  },
});

export const accountDef = defineCommand({
  meta: { name: "account", description: "Account identity" },
  subCommands: {
    login: accountLoginDef,
    whoami: accountWhoamiDef,
    auth: accountAuthDef,
  },
});
