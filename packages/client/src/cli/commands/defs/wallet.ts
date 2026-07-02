import { defineCommand, type ArgsDef } from "citty";
import { buildCliConfig, globalArgs } from "./shared";

/** Shared arg shape for `wallet dev-key` and its deprecated `wallet set` alias. */
const devKeyArgs = {
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
    alias: ["s", "svm"],
  },
} satisfies ArgsDef;

async function runDevKey(args: Record<string, unknown>): Promise<void> {
  const solanaKey = args.solana as string | undefined;
  if (solanaKey) {
    const { setSvmWalletCommand } = await import("../preferences");
    setSvmWalletCommand(solanaKey);
    return;
  }

  // --evm flag or positional (backward-compat default = EVM)
  const evmKey =
    (args.evm as string | undefined) ?? (args.privateKey as string | undefined);
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
}

const walletDevKeyDef = defineCommand({
  meta: {
    name: "dev-key",
    description:
      "Persist a local dev signing key and derived wallet address. " +
      "Defaults to EVM (hex key). Pass --solana for a Solana keypair (base58).",
  },
  args: { ...devKeyArgs },
  async run({ args }) {
    await runDevKey(args);
  },
});

const walletSetDef = defineCommand({
  meta: {
    name: "set",
    description: "(deprecated) use `aomi wallet dev-key`",
  },
  args: { ...devKeyArgs },
  async run({ args }) {
    console.error("`aomi wallet set` is deprecated — use `aomi wallet dev-key`.");
    await runDevKey(args);
  },
});

const walletLsDef = defineCommand({
  meta: {
    name: "ls",
    description:
      "List the account's wallets (keys) with signing mode, grant, and capability",
  },
  args: {
    ...globalArgs,
    provider: {
      type: "string",
      description: 'Only show wallets from this provider (e.g. "privy")',
    },
  },
  async run({ args }) {
    const { walletLsCommand } = await import("../wallet-policy");
    await walletLsCommand(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : undefined,
    });
  },
});

const walletSetModeDef = defineCommand({
  meta: {
    name: "set-mode",
    description:
      "Change a wallet's signing mode with a signed EIP-712 permit " +
      "(challenge → sign → commit)",
  },
  args: {
    ...globalArgs,
    address: {
      type: "positional",
      description: "Wallet address (as shown by `aomi wallet ls`)",
      required: true,
    },
    mode: {
      type: "positional",
      description: "autonomous | human_sync | denied",
      required: true,
    },
    "local-key": {
      type: "string",
      description:
        "Hex private key that signs the permit (default: the stored dev key)",
    },
  },
  async run({ args }) {
    const { setWalletModeCommand } = await import("../wallet-policy");
    await setWalletModeCommand(buildCliConfig(args), {
      address: String(args.address ?? ""),
      mode: String(args.mode ?? ""),
      localKey:
        typeof args["local-key"] === "string" ? args["local-key"] : undefined,
    });
  },
});

const walletLoginDef = defineCommand({
  meta: {
    name: "login",
    description: "(deprecated) use `aomi login --provider privy`",
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
    console.error(
      "`aomi wallet login` is deprecated — use `aomi login --provider privy`.",
    );
    if (args.evm === true && args.solana === true) {
      const { fatal } = await import("../../errors");
      fatal("Choose only one of `--evm` or `--solana`.");
    }
    const { walletLoginCommand } = await import("../account");
    await walletLoginCommand(buildCliConfig(args), {
      walletFamily: args.solana === true ? "solana" : "evm",
    });
  },
});

export const walletDef = defineCommand({
  meta: {
    name: "wallet",
    description: "Wallet keys — signing policy and capability",
  },
  subCommands: {
    ls: walletLsDef,
    "set-mode": walletSetModeDef,
    "dev-key": walletDevKeyDef,
    set: walletSetDef,
    login: walletLoginDef,
  },
});
