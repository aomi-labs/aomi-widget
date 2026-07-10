import { defineCommand } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

const walletDevKeyDef = defineCommand({
  meta: {
    name: "dev-key",
    description:
      "Persist a signing key and derived wallet address. " +
      "Defaults to EVM (hex key). Pass --solana for a Solana keypair (base58).",
  },
  args: {
    privateKey: {
      type: "positional",
      description:
        "Hex EVM private key (default) or Solana base58 key when --solana is set",
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
          "  aomi wallet dev-key <evm-hex-key>          # EVM (default)\n" +
          "  aomi wallet dev-key --evm <evm-hex-key>    # EVM (explicit)\n" +
          "  aomi wallet dev-key --solana <base58-key>  # Solana",
      );
    }
    const { setWalletCommand } = await import("../preferences");
    setWalletCommand(evmKey!);
  },
});

const walletListDef = defineCommand({
  meta: {
    name: "ls",
    description: "List account wallets and signing policy",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: "Filter by wallet provider",
    },
  },
  async run({ args }) {
    const { walletListCommand } = await import("../wallet-auth");
    await walletListCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
    });
  },
});

const walletSetModeDef = defineCommand({
  meta: {
    name: "set-mode",
    description: "Set per-wallet signing policy with a signed permit",
  },
  args: {
    ...globalArgs,
    address: {
      type: "positional",
      description: "Wallet address",
      required: true,
    },
    mode: {
      type: "positional",
      description: "autonomous, human_sync, or denied",
      required: true,
    },
    "chain-type": {
      type: "string",
      description: "Wallet chain type (default: evm)",
    },
  },
  async run({ args }) {
    const { walletSetModeCommand } = await import("../wallet-auth");
    await walletSetModeCommand(buildCliConfig(args), args.address, args.mode, {
      chainType:
        typeof args["chain-type"] === "string" ? args["chain-type"] : undefined,
    });
  },
});

export const walletDef = defineCommand({
  meta: { name: "wallet", description: "Wallet configuration" },
  async run({ rawArgs }) {
    const firstToken = rawArgs.find((arg) => !arg.startsWith("-"));
    if (firstToken === "set") {
      const { fatal } = await import("../../errors");
      fatal("Unknown wallet command `set`. Use `aomi wallet dev-key`.");
    }
    if (firstToken === "current") {
      const { fatal } = await import("../../errors");
      fatal("Unknown wallet command `current`. Use `aomi wallet ls`.");
    }
    if (firstToken === "whoami") {
      const { fatal } = await import("../../errors");
      fatal("Unknown wallet command `whoami`. Use `aomi account`.");
    }
  },
  subCommands: {
    "dev-key": walletDevKeyDef,
    ls: walletListDef,
    "set-mode": walletSetModeDef,
  },
});
