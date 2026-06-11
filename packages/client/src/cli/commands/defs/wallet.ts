import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const walletSetDef = defineCommand({
  meta: {
    name: "set",
    description:
      "Persist a signing key and derived wallet address. " +
      "Defaults to EVM (hex key). Pass --solana for a Solana keypair (base58).",
  },
  args: {
    privateKey: {
      type: "positional",
      description: "Hex EVM private key (default) or Solana base58 key when --solana is set",
      required: false,
    },
    evm: {
      type: "string",
      description: "EVM hex private key to persist (alternative to positional)",
      alias: ["e"],
    },
    solana: {
      type: "string",
      description: "Solana base58 secret key to persist",
      alias: ["s"],
    },
  },
  async run({ args }) {
    const solanaKey = args.solana as string | undefined;
    if (solanaKey) {
      const { setSvmWalletCommand } = await import("../preferences");
      setSvmWalletCommand(solanaKey);
      return;
    }

    // --evm flag or positional (backward-compat default = EVM)
    const evmKey = (args.evm as string | undefined) ?? args.privateKey;
    if (!evmKey) {
      const { fatal } = await import("../../errors");
      fatal(
        "Usage:\n" +
          "  aomi wallet set <evm-hex-key>          # EVM (default)\n" +
          "  aomi wallet set --evm <evm-hex-key>    # EVM (explicit)\n" +
          "  aomi wallet set --solana <base58-key>  # Solana",
      );
    }
    const { setWalletCommand } = await import("../preferences");
    setWalletCommand(evmKey!);
  },
});

const walletCurrentDef = defineCommand({
  meta: { name: "current", description: "Show the configured wallet address" },
  args: {},
  async run() {
    const { currentWalletCommand } = await import("../control");
    currentWalletCommand();
  },
});

const walletLoginDef = defineCommand({
  meta: {
    name: "login",
    description:
      "Mint a Privy browser auth URL for the active session. Defaults to EVM; pass --solana to require a Solana wallet.",
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

const walletWhoamiDef = defineCommand({
  meta: {
    name: "whoami",
    description: "Show the bound account and every linked wallet on the backend",
  },
  args: { ...globalArgs },
  async run({ args }) {
    const { whoamiCommand } = await import("../account");
    await whoamiCommand(buildCliConfig(args));
  },
});

export const walletDef = defineCommand({
  meta: { name: "wallet", description: "Wallet configuration" },
  subCommands: {
    set: walletSetDef,
    current: walletCurrentDef,
    login: walletLoginDef,
    whoami: walletWhoamiDef,
  },
});
