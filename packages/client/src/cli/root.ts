import { defineCommand } from "citty";
import { chatDef } from "./commands/defs/chat";
import { txDef } from "./commands/defs/tx";
import { threadDef } from "./commands/defs/thread";
import { modelDef } from "./commands/defs/model";
import { appDef } from "./commands/defs/app";
import { chainDef } from "./commands/defs/chain";
import { walletDef } from "./commands/defs/wallet";
import { accountDef } from "./commands/defs/account";
import { configDef } from "./commands/defs/config";
import { secretDef } from "./commands/defs/secret";
import { cronDef } from "./commands/defs/cron";
import { deployDef } from "./commands/defs/deploy";
import { buildCliConfig, globalArgs } from "./commands/defs/shared";
import packageJson from "../../package.json";

const SUBCOMMAND_NAMES = new Set([
  "chat",
  "tx",
  "thread",
  "model",
  "app",
  "chain",
  "wallet",
  "account",
  "login",
  "logout",
  "cron",
  "config",
  "secret",
  "deploy",
]);

const loginDef = defineCommand({
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
    evm: {
      type: "boolean",
      description: "Request an EVM provider wallet",
    },
    solana: {
      type: "boolean",
      description: "Request a Solana provider wallet",
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
    const { accountLoginCommand } = await import("./commands/account");
    if (args.evm === true && args.solana === true) {
      const { fatal } = await import("./errors");
      fatal("Choose only one of `--evm` or `--solana`.");
    }
    await accountLoginCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
      wallet: args.wallet === true,
      noBrowser: args["no-browser"] === true,
      walletFamily:
        args.solana === true ? "solana" : args.evm === true ? "evm" : undefined,
    });
  },
});

const logoutDef = defineCommand({
  meta: {
    name: "logout",
    description: "Sign out and clear the CLI auth session",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: 'Provider to sign out locally ("privy" or "para")',
    },
  },
  async run({ args }) {
    const { logoutCommand } = await import("./commands/account");
    await logoutCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
    });
  },
});

export const root = defineCommand({
  meta: {
    name: "aomi",
    version: packageJson.version,
    description: "CLI client for Aomi on-chain agent",
  },
  args: {
    ...globalArgs,
    prompt: {
      type: "string",
      alias: "p",
      description: "Send a single prompt and exit",
    },
    "show-tool": {
      type: "boolean",
      description: "Show tool output while chatting from root mode",
    },
    "provider-key": {
      type: "string",
      description: "Use your own provider API key. Format: PROVIDER:KEY",
    },
  },
  async run({ args, rawArgs }) {
    // citty 0.2.2 quirk: when a subCommand is matched, it runs the subcommand
    // AND still falls through to the parent's `run`. Bail out here if rawArgs
    // contain a known subcommand token — otherwise every `aomi wallet dev-key …`
    // or `aomi tx sign …` would spuriously try to start the REPL and exit 1
    // on non-TTY.
    const firstToken = rawArgs.find((arg) => !arg.startsWith("-"));
    if (firstToken && SUBCOMMAND_NAMES.has(firstToken)) {
      return;
    }
    const { runRootCli } = await import("./repl");
    await runRootCli(args);
  },
  subCommands: {
    chat: chatDef,
    tx: txDef,
    thread: threadDef,
    model: modelDef,
    app: appDef,
    chain: chainDef,
    wallet: walletDef,
    account: accountDef,
    login: loginDef,
    logout: logoutDef,
    cron: cronDef,
    config: configDef,
    secret: secretDef,
    deploy: deployDef,
  },
});
